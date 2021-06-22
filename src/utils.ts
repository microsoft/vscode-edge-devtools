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
    isJsDebugProxiedCDPConnection: boolean;
}
export interface IStringDictionary<T> {
    [name: string]: T;
}

export interface IRequestCDPProxyResult {
    host: string;
    port: number;
    path: string;
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
    'webpack://*': '${webRoot}/*',
};
export const SETTINGS_DEFAULT_WEB_ROOT = '${workspaceFolder}';
export const SETTINGS_DEFAULT_SOURCE_MAPS = true;
export const SETTINGS_DEFAULT_EDGE_DEBUGGER_PORT = 2015;
export const SETTINGS_DEFAULT_ATTACH_TIMEOUT = 10000;
export const SETTINGS_DEFAULT_ATTACH_INTERVAL = 200;

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

/** enum {string} */
export const buttonCode: Record<string, string> = {
    launchBrowserInstance: '0',
    launchProject: '1',
    viewDocumentation: '2',
    configureLaunchJson: '3',
    generateLaunchJson: '4',
    refreshTargetList: '5',
    attachToTarget: '6',
    openSettings: '7',
    viewChangelog: '8',
    closeTarget: '9',
    emptyTargetListLaunchBrowserInstance: '10',
};

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
 * Get the session id for the currently active VSCode debugging session
 */
export function getActiveDebugSessionId(): string|undefined {
    // Attempt to attach to active CDP target
    const session = vscode.debug.activeDebugSession;
    return session ? session.id : undefined;
}

/**
 * Create the target websocket url for attaching to the shared CDP instance exposed by
 * the JavaScript Debugging Extension for VSCode.
 * https://github.com/microsoft/vscode-js-debug/blob/main/CDP_SHARE.md
 *
 * @param debugSessionId The session id of the active VSCode debugging session
 */
export async function getJsDebugCDPProxyWebsocketUrl(debugSessionId: string): Promise<string|Error|undefined> {
    try {
        const addr: IRequestCDPProxyResult|undefined = await vscode.commands.executeCommand(
        'extension.js-debug.requestCDPProxy',
        debugSessionId,
        );
        if (addr) {
            return `ws://${addr.host}:${addr.port}${addr.path || ''}`;
        }
    } catch (e) {
        if (e instanceof Error) {
            return e;
        }
        // Throw remaining unhandled exceptions
        throw e;
    }
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
        isJsDebugProxiedCDPConnection: false,
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
 * Verifies if a given path points to a local resource.
 * @param path the path to be tested
 * @returns True if the path points to a local resource false otherwise.
 */
export function isLocalResource(path: string): boolean {
    try {
        const pathURL = new URL(path);
        if (pathURL.protocol && !pathURL.protocol.includes('http')) {
            return true;
        }
    } catch {
        return false;
    }

    return false;
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

type ExtensionSettings = [string, boolean | string | {[key: string]: string} | undefined];

export function reportExtensionSettings(telemetryReporter: Readonly<TelemetryReporter>): void {
    const extensionSettingsList = Object.entries(vscode.workspace.getConfiguration(SETTINGS_STORE_NAME)).splice(4) as Array<ExtensionSettings>;
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const changedSettingsMap: Map<string, string> = new Map<string, string>();
    for (const currentSetting of extensionSettingsList) {
        const settingName: string = currentSetting[0];
        const settingValue: boolean | string | {[key: string]: string} | undefined = currentSetting[1];
        const settingInspect = settings.inspect(settingName);
        if (settingInspect) {
            const defaultValue = settingInspect.defaultValue;
            if (settingValue !== undefined && settingValue !== defaultValue) {
                if (defaultValue && typeof defaultValue === 'object' && typeof settingValue === 'object') {
                    for (const [key, value] of Object.entries(defaultValue)) {
                        if (settingValue[key] !== value) {
                            changedSettingsMap.set(settingName, JSON.stringify(settingValue));
                            break;
                        }
                    }
                } else {
                    changedSettingsMap.set(settingName, settingValue.toString());
                }
            }
        }
    }
    const changedSettingsObject = {};
    Object.assign(changedSettingsObject, ...[...changedSettingsMap.entries()].map(([k, v]) => ({[k]: v})));
    telemetryReporter.sendTelemetryEvent('user/settingsChangedAtLaunch', changedSettingsObject);
}

export function reportChangedExtensionSetting(event: vscode.ConfigurationChangeEvent, telemetryReporter: Readonly<TelemetryReporter>): void {
    const extensionSettingsList = Object.entries(vscode.workspace.getConfiguration(SETTINGS_STORE_NAME)).splice(4) as Array<ExtensionSettings>;
    for (const currentSetting of extensionSettingsList) {
        const settingName: string = currentSetting[0];
        const settingValue: boolean | string | {[key: string]: string} | undefined = currentSetting[1];
        if (event.affectsConfiguration(`${SETTINGS_STORE_NAME}.${settingName}`)) {
            if (settingName !== undefined) {
                if (settingValue !== undefined) {
                    const telemetryObject: {[key: string]: string}  = {};
                    const objString = typeof settingValue !== 'object' ? settingValue.toString() : JSON.stringify(settingValue);
                    telemetryObject[settingName] = objString;
                    telemetryReporter.sendTelemetryEvent('user/settingsChanged', telemetryObject);
                }
            }
        }
    }
}

export function reportUrlType(url: string, telemetryReporter: Readonly<TelemetryReporter>): void {
    const localhostPattern = /^https?:\/\/localhost:/;
    const ipPattern = /(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;
    const filePattern = /^file:\/\//;
    let urlType;
    if (localhostPattern.exec(url) || ipPattern.exec(url)) {
        urlType = 'localhost';
    } else if (filePattern.exec(url)) {
        urlType = 'file';
    } else {
        urlType = 'other';
    }
    telemetryReporter.sendTelemetryEvent('user/browserNavigation', { 'urlType': urlType });
}

export async function reportFileExtensionTypes(telemetryReporter: Readonly<TelemetryReporter>): Promise<void> {
    const files = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**');
    const extensionMap: Map<string, number> = new Map<string, number>();
    for (const file of files) {
        const extension: string | undefined = file.path.split('.').pop();
        if (extension) {
            const currentValue = extensionMap.get(extension);
            if (currentValue) {
                extensionMap.set(extension, currentValue + 1);
            } else {
                extensionMap.set(extension, 1);
            }
        }
    }
    extensionMap.set('total', files.length);

    // Creates Object from map
    const fileTypes: {[key: string]: number} = {};
    Object.assign(fileTypes, ...[...extensionMap.entries()].map(([k, v]) => ({[k]: v})));
    telemetryReporter.sendTelemetryEvent('workspace/metadata', undefined, fileTypes);
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
