// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fse from 'fs-extra';
import * as http from 'http';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import * as url from 'url';
import * as vscode from 'vscode';
import * as debugCore from 'vscode-chrome-debug-core';
import TelemetryReporter from 'vscode-extension-telemetry';
import packageJson from '../package.json';
import { DebugTelemetryReporter } from './debugTelemetryReporter';

import puppeteer from 'puppeteer-core';

export type BrowserFlavor = 'Default' | 'Stable' | 'Beta' | 'Dev' | 'Canary';

interface IBrowserPath {
    debianLinux: string;
    windows: {
        primary: string;
        secondary: string;
    };
    osx: string;
}

export interface IDevToolsSettings {
    hostname: string;
    port: number;
    useHttps: boolean;
    defaultUrl: string;
    userDataDir: string;
    timeout: number;
}

export interface IUserConfig {
    url: string;
    urlFilter: string;
    browserFlavor: BrowserFlavor;
    hostname: string;
    port: number;
    useHttps: boolean;
    userDataDir: string | boolean;
    webRoot: string;
    pathMapping: IStringDictionary<string>;
    sourceMapPathOverrides: IStringDictionary<string>;
    sourceMaps: boolean;
    timeout: number;
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

export type Platform = 'Windows' | 'OSX' | 'Linux';

export const SETTINGS_STORE_NAME = 'vscode-edge-devtools';
export const SETTINGS_DEFAULT_USE_HTTPS = false;
export const SETTINGS_DEFAULT_HOSTNAME = 'localhost';
export const SETTINGS_DEFAULT_PORT = 9222;
export const SETTINGS_DEFAULT_URL = path.resolve(path.join(__dirname, 'startpage', 'index.html'));
export const SETTINGS_WEBVIEW_NAME = 'Edge DevTools';
export const SETTINGS_PREF_NAME = 'devtools-preferences';
export const SETTINGS_PREF_DEFAULTS = {
    screencastEnabled: false,
    uiTheme: '"dark"',
};
export const SETTINGS_VIEW_NAME = 'vscode-edge-devtools-view';
export const SETTINGS_DEFAULT_PATH_MAPPING: IStringDictionary<string> = {
    '/': '${workspaceFolder}',
};
export const SETTINGS_DEFAULT_PATH_OVERRIDES: IStringDictionary<string> = {
    'meteor://💻app/*': '${webRoot}/*',
    'webpack:///*': '*',
    'webpack:///./*': '${webRoot}/*',
    'webpack:///./~/*': '${webRoot}/node_modules/*',
    'webpack:///src/*': '${webRoot}/*',
};
export const SETTINGS_DEFAULT_WEB_ROOT = '${workspaceFolder}';
export const SETTINGS_DEFAULT_SOURCE_MAPS = true;
export const SETTINGS_DEFAULT_EDGE_DEBUGGER_PORT = 2015;
export const SETTINGS_DEFAULT_ATTACH_TIMEOUT = 10000;
export const SETTINGS_DEFAULT_ATTACH_INTERVAL = 200;
export const providedDebugConfig: vscode.DebugConfiguration = {
    name: 'Launch Microsoft Edge and open the Edge DevTools',
    request: 'launch',
    type: `${SETTINGS_STORE_NAME}.debug`,
    url: 'http://localhost:8080',
};

const WIN_APP_DATA = process.env.LOCALAPPDATA || '/';
const msEdgeBrowserMapping: Map<BrowserFlavor, IBrowserPath> = new Map<BrowserFlavor, IBrowserPath>();

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
 *
 * @param uri The uri to request
 * @param options The options that should be used for the request
 */
export function fetchUri(uri: string, options: https.RequestOptions = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(uri);
        const get = (parsedUrl.protocol === 'https:' ? https.get : http.get);
        options = {
            rejectUnauthorized: false,
            ...parsedUrl,
            ...options,
        } as http.RequestOptions;

        get(options, response => {
            let responseData = '';
            response.on('data', chunk => {
                responseData += chunk;
            });
            response.on('end', () => {
                // Sometimes the 'error' event is not fired. Double check here.
                if (response.statusCode === 200) {
                    resolve(responseData);
                } else {
                    reject(new Error(responseData.trim()));
                }
            });
        }).on('error', e => {
            reject(e);
        });
    });
}

/**
 * Replace the json target payload's websocket address with the ones used to attach.
 * This makes sure that even on a remote machine with custom port forwarding, we will always connect to the address
 * specified in the options rather than what the remote Edge is actually using on the other machine.
 * If a websocket address is not found, the target will be returned unchanged.
 *
 * @param remoteAddress The address of the remote instance of Edge
 * @param remotePort The port used by the remote instance of Edge
 * @param target The target object from the json/list payload
 */
export function fixRemoteWebSocket(
    remoteAddress: string,
    remotePort: number,
    target: IRemoteTargetJson): IRemoteTargetJson {
    if (target.webSocketDebuggerUrl) {
        const re = /ws:\/\/([^/]+)\/?/;
        const addressMatch = re.exec(target.webSocketDebuggerUrl);
        if (addressMatch) {
            const replaceAddress = `${remoteAddress}:${remotePort}`;
            target.webSocketDebuggerUrl = target.webSocketDebuggerUrl.replace(addressMatch[1], replaceAddress);
        }
    }
    return target;
}

/**
 * Query the list endpoint and return the parsed Json result which is the list of targets
 *
 * @param hostname The remote hostname
 * @param port The remote port
 */
export async function getListOfTargets(hostname: string, port: number, useHttps: boolean): Promise<IRemoteTargetJson[]> {
    const checkDiscoveryEndpoint = (uri: string) => {
        return fetchUri(uri, { headers: { Host: 'localhost' } });
    };

    const protocol = (useHttps ? 'https' : 'http');

    let jsonResponse = '';
    for (const endpoint of ['/json/list', '/json']) {
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
        result = JSON.parse(jsonResponse) as IRemoteTargetJson[];
    } catch {
        result = [];
    }
    return result;
}

/**
 * Get the remote endpoint settings from the vscode configuration
 *
 * @param config The settings specified by a launch config, if any
 */
export function getRemoteEndpointSettings(config: Partial<IUserConfig> = {}): IDevToolsSettings {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const hostname: string = config.hostname || settings.get('hostname') || SETTINGS_DEFAULT_HOSTNAME;
    const port: number = config.port || settings.get('port') || SETTINGS_DEFAULT_PORT;
    const useHttps: boolean = config.useHttps || settings.get('useHttps') || SETTINGS_DEFAULT_USE_HTTPS;
    const defaultUrl: string = config.url || settings.get('defaultUrl') || SETTINGS_DEFAULT_URL;
    const timeout: number = config.timeout || settings.get('timeout') || SETTINGS_DEFAULT_ATTACH_TIMEOUT;

    // Check to see if we need to use a user data directory, which will force Edge to launch with a new manager process.
    // We generate a temp directory if the user opted in explicitly with 'true' (which is the default),
    // Or if it is not defined and they are not using a custom browser path (such as electron).
    // This matches the behavior of the chrome and edge debug extensions.
    const browserPathSet = config.browserFlavor || 'Default';
    let userDataDir: string | boolean | undefined;
    if (typeof config.userDataDir !== 'undefined') {
        userDataDir = config.userDataDir;
    } else {
        const settingsUserDataDir: string | boolean | undefined = settings.get('userDataDir');
        if (typeof settingsUserDataDir !== 'undefined') {
            userDataDir = settingsUserDataDir;
        }
    }

    if (userDataDir === true || (typeof userDataDir === 'undefined' && browserPathSet === 'Default')) {
        // Generate a temp directory
        userDataDir = path.join(os.tmpdir(), `vscode-edge-devtools-userdatadir_${port}`);
    } else if (!userDataDir) {
        // Explicit opt-out
        userDataDir = '';
    }

    return { hostname, port, useHttps, defaultUrl, userDataDir, timeout };
}

/**
 * Create a telemetry reporter that can be used for this extension
 *
 * @param context The vscode context
 */
export function createTelemetryReporter(_context: vscode.ExtensionContext): Readonly<TelemetryReporter> {
    if (packageJson && vscode.env.machineId !== 'someValue.machineId') {
        // Use the real telemetry reporter
        return new TelemetryReporter(packageJson.name, packageJson.version, packageJson.aiKey);
    }
        // Fallback to a fake telemetry reporter
        return new DebugTelemetryReporter();

}

/**
 * Get the current machine platform
 */
export function getPlatform(): Platform {
    const platform = os.platform();
    return platform === 'darwin' ? 'OSX' :
        platform === 'win32' ? 'Windows' :
            'Linux';
}

/**
 * Gets the browser path for the specified browser flavor.
 *
 * @param config The settings specified by a launch config, if any
 */
export async function getBrowserPath(config: Partial<IUserConfig> = {}): Promise<string> {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const flavor: BrowserFlavor | undefined = config.browserFlavor || settings.get('browserFlavor');

    switch (getPlatform()) {
        case 'Windows': {
           return await verifyFlavorPath(flavor, 'Windows');
        }
        case 'OSX': {
            return await verifyFlavorPath(flavor, 'OSX');
        }
        case 'Linux': {
            return await verifyFlavorPath(flavor, 'Linux');
        }
    }
}

/**
 * Gets a supported debug config and updates the status of the launch.json file associated with the current workspace
 * @returns {vscode.DebugConfiguration | string | null}
 */
 export function getLaunchJson(): vscode.DebugConfiguration | string | null {
    // Check if there is a folder open
    if (!vscode.workspace.workspaceFolders) {
        void vscode.commands.executeCommand('setContext', 'launchJsonStatus', 'None');
        return null;
    }

    // Check if there's a launch.json file
    const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    const filePath = `${workspaceUri.fsPath}/.vscode/launch.json`;
    if (fse.pathExistsSync(filePath)) {
        // Check if there is a supported debug config
        const launchJson = vscode.workspace.getConfiguration('launch', workspaceUri);
        const configs = launchJson.get('configurations') as vscode.DebugConfiguration[];
        for (const config of configs) {
            if (config.type === 'vscode-edge-devtools.debug' || config.type === 'msedge' || config.type === 'edge') {
                void vscode.commands.executeCommand('setContext', 'launchJsonStatus', 'Supported');

                // Get the compound to start localhost+launch Edge if it exists
                const compounds = launchJson.get('compounds') as {name: string, configurations: string[]}[] || [];
                for (const compound of compounds) {
                    if (compound.configurations.includes(config.name)) {
                        void vscode.commands.executeCommand('setContext', 'watchServerStatus', 'Supported');
                        return compound.name;
                    }
                }
                void vscode.commands.executeCommand('setContext', 'watchServerStatus', 'Unsupported');
                return config;
            }
        }
        void vscode.commands.executeCommand('setContext', 'launchJsonStatus', 'Unsupported');
        return null;
    }
    void vscode.commands.executeCommand('setContext', 'launchJsonStatus', 'None');
    return null;
}

/**
 * Add a template for a supported debug configuration to launch.json
 * @returns {void}
 */
export async function configureLaunchJson(): Promise<void> {
    if (!vscode.workspace.workspaceFolders) {
        void vscode.window.showErrorMessage('Cannot configure launch.json for an empty workspace. Please open a folder in the editor.');
        return;
    }

    // Create ./.vscode/launch.json if it doesn't already exist
    const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    const relativePath = '/.vscode/launch.json';
    fse.ensureFileSync(workspaceUri.fsPath + relativePath);

    // Append debug config and update workspace configuration
    const launchJson = vscode.workspace.getConfiguration('launch', workspaceUri);
    const configs = launchJson.get('configurations') as vscode.DebugConfiguration[];
    configs.push(providedDebugConfig);
    await launchJson.update('configurations', configs) as unknown as Promise<void>;

    // Configure watch server
    await configureWatchServer(providedDebugConfig.name);

    // Insert instruction comment
    let launchText = fse.readFileSync(workspaceUri.fsPath + relativePath).toString();
    const re = new RegExp(`(${providedDebugConfig.type})(.|\n|\r)*(${providedDebugConfig.url}")`, 'm');
    const match = re.exec(launchText);
    const instructions = ' // Provide your project\'s url to finish configuring';
    launchText = launchText.replace(re, `${match ? match[0] : ''}${instructions}`);
    fse.writeFileSync(workspaceUri.fsPath + relativePath, launchText);

    // Open launch.json in editor
    void vscode.commands.executeCommand('vscode.open', vscode.Uri.joinPath(workspaceUri, relativePath));
}

export async function configureWatchServer(debugConfigName: string): Promise<void> {
    if (!vscode.workspace.workspaceFolders) {
        void vscode.window.showErrorMessage('Cannot configure launch.json for an empty workspace. Please open a folder in the editor.');
        return;
    }
    const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    if (!fse.pathExistsSync(`${workspaceUri.fsPath}/.vscode/launch.json`)) {
        void vscode.window.showErrorMessage('launch.json does not exist.');
        return;
    }

    // Add launch config
    const launchJson = vscode.workspace.getConfiguration('launch', workspaceUri);
    const configs = launchJson.get('configurations') as vscode.DebugConfiguration[];
    configs.push({
        name: 'Start localhost server',
        type: 'node',
        request: 'launch',
        runtimeExecutable: 'live-server',
        port: 8080,
        args: ['--no-browser'],
    });
    await launchJson.update('configurations', configs) as unknown as Promise<void>;

    // Add compound config
    const compounds = launchJson.get('compounds') as Record<string, unknown>[];
    compounds.push({
        name: 'Launch Watch Server and Launch and Attach Edge',
        configurations: [
            'Start localhost server',
            debugConfigName,
        ],
    });
    await launchJson.update('compounds', compounds) as unknown as Promise<void>;
}

/**
 * Launch the specified browser with remote debugging enabled
 *
 * @param browserPath The path of the browser to launch
 * @param port The port on which to enable remote debugging
 * @param targetUrl The url of the page to open
 * @param userDataDir The user data directory for the launched instance
 */
export async function launchBrowser(browserPath: string, port: number, targetUrl: string, userDataDir?: string): Promise<puppeteer.Browser> {
    const args = [
        '--no-first-run',
        '--no-default-browser-check',
        `--remote-debugging-port=${port}`,
        targetUrl,
    ];

    const headless: boolean = isHeadlessEnabled();

    if (userDataDir) {
        args.unshift(`--user-data-dir=${userDataDir}`);
    }

    const browserInstance = await puppeteer.launch({executablePath: browserPath, args, headless});
    return browserInstance;
}

/**
 * Open a new tab in the browser specified via endpoint
 *
 * @param hostname The hostname of the browser
 * @param port The port of the browser
 * @param tabUrl The url to open, if any
 */
export async function openNewTab(hostname: string, port: number, tabUrl?: string): Promise<IRemoteTargetJson | undefined> {
    try {
        const json = await fetchUri(`http://${hostname}:${port}/json/new?${tabUrl ? tabUrl : ''}`);
        const target: IRemoteTargetJson | undefined = JSON.parse(json) as IRemoteTargetJson | undefined;
        return target;
    } catch {
        return undefined;
    }
}

/**
 * Remove a '/' from the end of the specified string if it exists
 *
 * @param uri The string from which to remove the trailing slash (if any)
 */
export function removeTrailingSlash(uri: string): string {
    return (uri.endsWith('/') ? uri.slice(0, -1) : uri);
}

/**
 * Get the configuration settings that should be used at runtime.
 * The order of precedence is launch.json > extension settings > default values.
 *
 * @param config A user specified config from launch.json
 */
export function getRuntimeConfig(config: Partial<IUserConfig> = {}): IRuntimeConfig {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const pathMapping = config.pathMapping || settings.get('pathMapping') || SETTINGS_DEFAULT_PATH_MAPPING;
    const sourceMapPathOverrides =
        config.sourceMapPathOverrides || settings.get('sourceMapPathOverrides') || SETTINGS_DEFAULT_PATH_OVERRIDES;
    const webRoot = config.webRoot || settings.get('webRoot') || SETTINGS_DEFAULT_WEB_ROOT;

    let sourceMaps = SETTINGS_DEFAULT_SOURCE_MAPS;
    if (typeof config.sourceMaps !== 'undefined') {
        sourceMaps = config.sourceMaps;
    } else {
        const settingsSourceMaps: boolean | undefined = settings.get('sourceMaps');
        if (typeof settingsSourceMaps !== 'undefined') {
            sourceMaps = settingsSourceMaps;
        }
    }

    // Resolve the paths with the webRoot set by the user
    const resolvedOverrides: IStringDictionary<string> = {};
    for (const pattern in sourceMapPathOverrides) {
        if (sourceMapPathOverrides.hasOwnProperty(pattern)) {
            const replacePattern = replaceWebRootInSourceMapPathOverridesEntry(webRoot, pattern);
            const replacePatternValue = replaceWebRootInSourceMapPathOverridesEntry(
                webRoot, sourceMapPathOverrides[pattern]);

            resolvedOverrides[replacePattern] = replaceWorkSpaceFolderPlaceholder(replacePatternValue);
        }
    }

    // replace workspaceFolder with local paths
    const resolvedMappingOverrides: IStringDictionary<string> = {};
    for (const customPathMapped in pathMapping) {
        if (pathMapping.hasOwnProperty(customPathMapped)) {
            resolvedMappingOverrides[customPathMapped] =
                replaceWorkSpaceFolderPlaceholder(pathMapping[customPathMapped]);
        }
    }

    const resolvedWebRoot = replaceWorkSpaceFolderPlaceholder(webRoot);
    return {
        pathMapping: resolvedMappingOverrides,
        sourceMapPathOverrides: resolvedOverrides,
        sourceMaps,
        webRoot: resolvedWebRoot,
    };
}

/**
 * Find '${webRoot}' in a string and replace it with the specified value only if it is at the start.
 *
 * @param webRoot The value to use for replacement.
 * @param entry The path containing the '${webRoot}' string that we will replace.
 */
export function replaceWebRootInSourceMapPathOverridesEntry(webRoot: string, entry: string): string {
    if (webRoot) {
        const webRootIndex = entry.indexOf('${webRoot}');
        if (webRootIndex === 0) {
            return entry.replace('${webRoot}', webRoot);
        }
    }
    return entry;
}

/**
 * Walk through the list of mappings and find one that matches the sourcePath.
 * Once a match is found, replace the pattern in the value side of the mapping with
 * the rest of the path.
 *
 * @param sourcePath The source path to convert
 * @param pathMapping The list of mappings from source map to authored file path
 */
export function applyPathMapping(
    sourcePath: string,
    pathMapping: IStringDictionary<string>): string {
    const forwardSlashSourcePath = sourcePath.replace(/\\/g, '/');

    // Sort the overrides by length, large to small
    const sortedOverrideKeys = Object.keys(pathMapping)
        .sort((a, b) => b.length - a.length);

    // Iterate the key/values, only apply the first one that matches.
    for (const leftPattern of sortedOverrideKeys) {
        const rightPattern = pathMapping[leftPattern];

        const asterisks = leftPattern.match(/\*/g) || [];
        if (asterisks.length > 1) {
            continue;
        }

        const replacePatternAsterisks = rightPattern.match(/\*/g) || [];
        if (replacePatternAsterisks.length > asterisks.length) {
            continue;
        }

        // Does it match?
        const escapedLeftPattern = debugCore.utils.escapeRegexSpecialChars(leftPattern, '/*');
        const leftRegexSegment = escapedLeftPattern
            .replace(/\*/g, '(.*)')
            .replace(/\\\\/g, '/');
        const leftRegex = new RegExp(`^${leftRegexSegment}$`, 'i');
        const overridePatternMatches = leftRegex.exec(forwardSlashSourcePath);
        if (!overridePatternMatches) {
            continue;
        }

        // Grab the value of the wildcard from the match above, replace the wildcard in the
        // replacement pattern, and return the result.
        const wildcardValue = overridePatternMatches[1];
        let mappedPath = rightPattern.replace(/\*/g, wildcardValue);
        mappedPath = debugCore.utils.properJoin(mappedPath); // Fix any ..'s
        mappedPath = replaceWorkSpaceFolderPlaceholder(mappedPath);
        return mappedPath;
    }

    return sourcePath;
}

/**
 * Verifies if the headless checkbox in extension settings is enabled.
 */
function isHeadlessEnabled() {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const headless: boolean = settings.get('headless') || false;
    return headless;
}

/**
 * Replaces the workspaceFolder placeholder in a specified path, returns the
 * given path with file disk path.
 *
 * @param customPath The path that will be replaced.
 */
function replaceWorkSpaceFolderPlaceholder(customPath: string) {
    let parsedPath = customPath;
    if (vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders[0].uri.toString()) {
        /**
         * vscode can have several workspaceFolders, the first one is the
         * one currently open by the user.
         */
        parsedPath = vscode.workspace.workspaceFolders[0].uri.toString();
        const replacedPath = customPath.replace('${workspaceFolder}', parsedPath);
        return debugCore.utils.canonicalizeUrl(replacedPath);
    }
        return parsedPath;

}

/**
 * Verifies and returns if the browser for the current session exists in the
 * desired flavor and platform. Providing a "default" flavor will scan for the
 * first browser available in the following order:
 * stable > beta > dev > canary
 * For windows it will try: program files > local app data
 *
 * @param flavor the desired browser flavor
 * @param platform the desired platform
 * @returns a promise with the path to the browser or an empty string if not found.
 */
async function verifyFlavorPath(flavor: BrowserFlavor | undefined, platform: Platform): Promise<string> {
    let item = msEdgeBrowserMapping.get(flavor || 'Default');
    if (!item) {
        // if no flavor is specified search for any path present.
        for (item of msEdgeBrowserMapping.values()) {
            const result = await findFlavorPath(item);
            if (result) {
                return result;
            }
        }
    }

    return await findFlavorPath(item);

    // Verifies if the path exists in disk.
    async function findFlavorPath(browserPath: IBrowserPath | undefined) {
        if (!browserPath) {
            return '';
        }

        if (await fse.pathExists(browserPath.windows.primary) &&
            (platform === 'Windows' || flavor === 'Default')) {
            return browserPath.windows.primary;
        } if (await fse.pathExists(browserPath.windows.secondary) &&
            (platform === 'Windows' || flavor === 'Default')) {
            return browserPath.windows.secondary;
        } if (await fse.pathExists(browserPath.osx) &&
            (platform === 'OSX' || flavor === 'Default')) {
            return browserPath.osx;
        }  if (await fse.pathExists(browserPath.debianLinux) &&
            (platform === 'Linux' || flavor === 'Default')) {
            return browserPath.debianLinux;
    }

        return '';
    }
}

(function initialize() {
    // insertion order matters.
    msEdgeBrowserMapping.set('Stable', {
        debianLinux: '/opt/microsoft/msedge/msedge',
        osx: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        windows: {
            primary: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            secondary: path.join(WIN_APP_DATA, 'Microsoft\\Edge\\Application\\msedge.exe'),
        },
    });
    msEdgeBrowserMapping.set('Beta', {
        debianLinux: '/opt/microsoft/msedge-beta/msedge',
        osx: '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
        windows: {
            primary: 'C:\\Program Files (x86)\\Microsoft\\Edge Beta\\Application\\msedge.exe',
            secondary: path.join(WIN_APP_DATA, 'Microsoft\\Edge Beta\\Application\\msedge.exe'),
        },
    });
    msEdgeBrowserMapping.set('Dev', {
        debianLinux: '/opt/microsoft/msedge-dev/msedge',
        osx: '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
        windows: {
            primary: 'C:\\Program Files (x86)\\Microsoft\\Edge Dev\\Application\\msedge.exe',
            secondary: path.join(WIN_APP_DATA, 'Microsoft\\Edge Dev\\Application\\msedge.exe'),
        },
    });
    msEdgeBrowserMapping.set('Canary', {
        debianLinux: '/opt/microsoft/msedge-canary/msedge',
        osx: '/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary',
        windows: {
            primary: 'C:\\Program Files (x86)\\Microsoft\\Edge SxS\\Application\\msedge.exe',
            secondary: path.join(WIN_APP_DATA, 'Microsoft\\Edge SxS\\Application\\msedge.exe'),
        },
    });
})();
