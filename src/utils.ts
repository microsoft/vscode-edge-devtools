// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as cp from "child_process";
import * as fse from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as os from "os";
import * as path from "path";
import * as url from "url";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import packageJson from "../package.json";
import DebugTelemetryReporter from "./debugTelemetryReporter";

export interface IDevToolsSettings {
    hostname: string;
    port: number;
    useHttps: boolean;
    defaultUrl: string;
    userDataDir: string;
}

export interface IUserConfig {
    url: string;
    browserPath: string;
    hostname: string;
    port: number;
    useHttps: boolean;
    userDataDir: string | boolean;
    webRoot: string;
    pathMapping: IStringDictionary<string>;
    sourceMapPathOverrides: IStringDictionary<string>;
    sourceMaps: boolean;
}

export interface IRuntimeConfig {
    pathMapping: IStringDictionary<string>;
    sourceMapPathOverrides: IStringDictionary<string>;
    sourceMaps: boolean;
    webRoot: string;
}
export interface IStringDictionary<T> {
    [name: string]: T;
}

export type Platform = "Windows" | "OSX" | "Linux";

export const SETTINGS_STORE_NAME = "vscode-edge-devtools";
export const SETTINGS_DEFAULT_USE_HTTPS = false;
export const SETTINGS_DEFAULT_HOSTNAME = "localhost";
export const SETTINGS_DEFAULT_PORT = 9222;
export const SETTINGS_DEFAULT_URL = "about:blank";
export const SETTINGS_WEBVIEW_NAME = "Elements";
export const SETTINGS_PREF_NAME = "devtools-preferences";
export const SETTINGS_PREF_DEFAULTS = {
    screencastEnabled: false,
    uiTheme: '"dark"',
};
export const SETTINGS_VIEW_NAME = "vscode-edge-devtools-view";
export const SETTINGS_DEFAULT_PATH_MAPPING: IStringDictionary<string> = {
    "/": "${workspaceFolder}",
};
export const SETTINGS_DEFAULT_PATH_OVERRIDES: IStringDictionary<string> = {
    "meteor://💻app/*": "${webRoot}/*",
    "webpack:///*": "*",
    "webpack:///./*": "${webRoot}/*",
    "webpack:///./~/*": "${webRoot}/node_modules/*",
    "webpack:///src/*": "${webRoot}/*",
};
export const SETTINGS_DEFAULT_WEB_ROOT: string = "${workspaceFolder}";
export const SETTINGS_DEFAULT_SOURCE_MAPS: boolean = true;

const WIN_APP_DATA = process.env.LOCALAPPDATA || "/";
const WIN_MSEDGE_PATHS = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",        // Stable
    path.join(WIN_APP_DATA, "Microsoft\\Edge\\Application\\msedge.exe"),        // Stable localappdata
    "C:\\Program Files (x86)\\Microsoft\\Edge Beta\\Application\\msedge.exe",   // Beta
    path.join(WIN_APP_DATA, "Microsoft\\Edge Beta\\Application\\msedge.exe"),   // Beta localappdata
    "C:\\Program Files (x86)\\Microsoft\\Edge Dev\\Application\\msedge.exe",    // Dev
    path.join(WIN_APP_DATA, "Microsoft\\Edge Dev\\Application\\msedge.exe"),    // Dev localappdata
    "C:\\Program Files (x86)\\Microsoft\\Edge SxS\\Application\\msedge.exe",    // Canary
    path.join(WIN_APP_DATA, "Microsoft\\Edge SxS\\Application\\msedge.exe"),    // Canary localappdata
];
const OSX_MSEDGE_PATHS = [
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta",
    "/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev",
    "/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary",
];

export interface IRemoteTargetJson {
    [index: string]: string;
    description: string;
    devtoolsFrontendUrl: string;
    faviconUrl: string;
    id: string;
    title: string;
    type: string;
    url: string;
    webSocketDebuggerUrl: string;
}

/**
 * Fetch the response for the given uri.
 * @param uri The uri to request
 * @param options The options that should be used for the request
 */
export function fetchUri(uri: string, options: https.RequestOptions = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(uri);
        const get = (parsedUrl.protocol === "https:" ? https.get : http.get);
        options = {
            rejectUnauthorized: false,
            ...parsedUrl,
            ...options,
        } as http.RequestOptions;

        get(options, (response) => {
            let responseData = "";
            response.on("data", (chunk) => {
                responseData += chunk.toString();
            });
            response.on("end", () => {
                // Sometimes the 'error' event is not fired. Double check here.
                if (response.statusCode === 200) {
                    resolve(responseData);
                } else {
                    reject(new Error(responseData.trim()));
                }
            });
        }).on("error", (e) => {
            reject(e);
        });
    });
}

/**
 * Replace the json target payload's websocket address with the ones used to attach.
 * This makes sure that even on a remote machine with custom port forwarding, we will always connect to the address
 * specified in the options rather than what the remote Edge is actually using on the other machine.
 * If a websocket address is not found, the target will be returned unchanged.
 * @param remoteAddress The address of the remote instance of Edge
 * @param remotePort The port used by the remote instance of Edge
 * @param target The target object from the json/list payload
 */
export function fixRemoteWebSocket(
    remoteAddress: string,
    remotePort: number,
    target: IRemoteTargetJson): IRemoteTargetJson {
    if (target.webSocketDebuggerUrl) {
        const addressMatch = target.webSocketDebuggerUrl.match(/ws:\/\/([^/]+)\/?/);
        if (addressMatch) {
            const replaceAddress = `${remoteAddress}:${remotePort}`;
            target.webSocketDebuggerUrl = target.webSocketDebuggerUrl.replace(addressMatch[1], replaceAddress);
        }
    }
    return target;
}

/**
 * Query the list endpoint and return the parsed Json result which is the list of targets
 * @param hostname The remote hostname
 * @param port The remote port
 */
export async function getListOfTargets(hostname: string, port: number, useHttps: boolean): Promise<any[]> {
    const checkDiscoveryEndpoint = (uri: string) => {
        return fetchUri(uri, { headers: { Host: "localhost" } });
    };

    const protocol = (useHttps ? "https" : "http");

    let jsonResponse = "";
    for (const endpoint of ["/json/list", "/json"]) {
        try {
            jsonResponse = await checkDiscoveryEndpoint(`${protocol}://${hostname}:${port}${endpoint}`);
            if (jsonResponse) {
                break;
            }
        } catch {
            // Do nothing
        }
    }

    let result: IRemoteTargetJson[];
    try {
        result = JSON.parse(jsonResponse);
    } catch {
        result = [];
    }
    return result;
}

/**
 * Get the remote endpoint settings from the vscode configuration
 * @param config The settings specified by a launch config, if any
 */
export function getRemoteEndpointSettings(config: Partial<IUserConfig> = {}): IDevToolsSettings {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const hostname: string = config.hostname || settings.get("hostname") || SETTINGS_DEFAULT_HOSTNAME;
    const port: number = config.port || settings.get("port") || SETTINGS_DEFAULT_PORT;
    const useHttps: boolean = config.useHttps || settings.get("useHttps") || SETTINGS_DEFAULT_USE_HTTPS;
    const defaultUrl: string = config.url || settings.get("defaultUrl") || SETTINGS_DEFAULT_URL;

    // Check to see if we need to use a user data directory, which will force Edge to launch with a new manager process.
    // We generate a temp directory if the user opted in explicitly with 'true' (which is the default),
    // Or if it is not defined and they are not using a custom browser path (such as electron).
    // This matches the behavior of the chrome and edge debug extensions.
    const browserPath = config.browserPath || settings.get("browserPath") || "";
    let userDataDir: string | boolean | undefined;
    if (typeof config.userDataDir !== "undefined") {
        userDataDir = config.userDataDir;
    } else {
        const settingsUserDataDir: string | boolean | undefined = settings.get("userDataDir");
        if (typeof settingsUserDataDir !== "undefined") {
            userDataDir = settingsUserDataDir;
        }
    }

    if (userDataDir === true || (typeof userDataDir === "undefined" && !browserPath)) {
        // Generate a temp directory
        userDataDir = path.join(os.tmpdir(), `vscode-edge-devtools-userdatadir_${port}`);
    } else if (!userDataDir) {
        // Explicit opt-out
        userDataDir = "";
    }

    return { hostname, port, useHttps, defaultUrl, userDataDir };
}

/**
 * Create a telemetry reporter that can be used for this extension
 * @param context The vscode context
 */
export function createTelemetryReporter(context: vscode.ExtensionContext): Readonly<TelemetryReporter> {
    if (packageJson && vscode.env.machineId !== "someValue.machineId") {
        // Use the real telemetry reporter
        return new TelemetryReporter(packageJson.name, packageJson.version, packageJson.aiKey);
    } else {
        // Fallback to a fake telemetry reporter
        return new DebugTelemetryReporter();
    }
}

/**
 * Get the current machine platform
 */
export function getPlatform(): Platform {
    const platform = os.platform();
    return platform === "darwin" ? "OSX" :
        platform === "win32" ? "Windows" :
            "Linux";
}

/**
 * Get the path to the first valid browser for the current session
 * The search order is: launchConfig > vscode setting > platform default
 * For each platform the order is: stable > beta > dev > canary
 * For windows we will try: program files > local app data
 * @param config The settings specified by a launch config, if any
 */
export async function getBrowserPath(config: Partial<IUserConfig> = {}) {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const browserPath = config.browserPath || settings.get("browserPath") || "";

    if (!browserPath) {
        const platform = getPlatform();
        const searchPaths = platform === "Windows" ? WIN_MSEDGE_PATHS :
            platform === "OSX" ? OSX_MSEDGE_PATHS :
                [];

        // Find the first one that exists
        for (const p of searchPaths) {
            if (await fse.pathExists(p)) {
                return p;
            }
        }
    }

    // Only return it if it exists
    return (await fse.pathExists(browserPath) ? browserPath : "");
}

/**
 * Launch the specified browser with remote debugging enabled
 * @param browserPath The path of the browser to launch
 * @param port The port on which to enable remote debugging
 * @param targetUrl The url of the page to open
 * @param userDataDir The user data directory for the launched instance
 */
export function launchBrowser(browserPath: string, port: number, targetUrl: string, userDataDir?: string) {
    const args = [
        "--no-first-run",
        "--no-default-browser-check",
        `--remote-debugging-port=${port}`,
        targetUrl,
    ];
    if (userDataDir) {
        args.unshift(`--user-data-dir=${userDataDir}`);
    }

    const proc = cp.spawn(browserPath, args, {
        detached: true,
        stdio: "ignore",
    });

    proc.unref();
}

/**
 * Open a new tab in the browser specified via endpoint
 * @param hostname The hostname of the browser
 * @param port The port of the browser
 * @param tabUrl The url to open, if any
 */
export async function openNewTab(hostname: string, port: number, tabUrl?: string) {
    try {
        const json = await fetchUri(`http://${hostname}:${port}/json/new?${tabUrl}`);
        const target: IRemoteTargetJson | undefined = JSON.parse(json);
        return target;
    } catch {
        return undefined;
    }
}

/**
 * Remove a '/' from the end of the specified string if it exists
 * @param uri The string from which to remove the trailing slash (if any)
 */
export function removeTrailingSlash(uri: string) {
    return (uri.endsWith("/") ? uri.slice(0, -1) : uri);
}

/**
 * Get the configuration settings that should be used at runtime.
 * The order of precedence is launch.json > extension settings > default values.
 * @param config A user specified config from launch.json
 */
export function getRuntimeConfig(config: Partial<IUserConfig> = {}): IRuntimeConfig {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const pathMapping = config.pathMapping || settings.get("pathMapping") || SETTINGS_DEFAULT_PATH_MAPPING;
    const sourceMapPathOverrides =
        config.sourceMapPathOverrides || settings.get("sourceMapPathOverrides") || SETTINGS_DEFAULT_PATH_OVERRIDES;
    const webRoot = config.webRoot || settings.get("webRoot") || SETTINGS_DEFAULT_WEB_ROOT;

    let sourceMaps = SETTINGS_DEFAULT_SOURCE_MAPS;
    if (typeof config.sourceMaps !== "undefined") {
        sourceMaps = config.sourceMaps;
    } else {
        const settingsSourceMaps: boolean | undefined = settings.get("sourceMaps");
        if (typeof settingsSourceMaps !== "undefined") {
            sourceMaps = settingsSourceMaps;
        }
    }

    return {
        pathMapping,
        sourceMapPathOverrides,
        sourceMaps,
        webRoot,
    };
}
