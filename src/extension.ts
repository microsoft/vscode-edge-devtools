// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Browser, Target } from 'puppeteer-core';
import * as vscode from 'vscode';
import * as debugCore from 'vscode-chrome-debug-core';
import TelemetryReporter from 'vscode-extension-telemetry';
import { CDPTarget } from './cdpTarget';
import { CDPTargetsProvider } from './cdpTargetsProvider';
import { DevToolsPanel } from './devtoolsPanel';
import { LaunchDebugProvider } from './launchDebugProvider';
import {
    buttonCode,
    createTelemetryReporter,
    fixRemoteWebSocket,
    getBrowserPath,
    getListOfTargets,
    getRemoteEndpointSettings,
    getRuntimeConfig,
    IRemoteTargetJson,
    IUserConfig,
    launchBrowser,
    openNewTab,
    SETTINGS_DEFAULT_ATTACH_INTERVAL,
    SETTINGS_DEFAULT_URL,
    SETTINGS_STORE_NAME,
    SETTINGS_VIEW_NAME,
    getActiveDebugSessionId,
    getJsDebugCDPProxyWebsocketUrl,
    reportFileExtensionTypes,
    reportChangedExtensionSetting,
    reportExtensionSettings,
    reportUrlType,
} from './utils';
import { LaunchConfigManager } from './launchConfigManager';

let telemetryReporter: Readonly<TelemetryReporter>;
let browserInstance: Browser;
let cdpTargetsProvider: CDPTargetsProvider;


export function activate(context: vscode.ExtensionContext): void {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    // Check if launch.json exists and has supported config to populate side pane welcome message
    LaunchConfigManager.instance.updateLaunchConfig();
    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_STORE_NAME}.attach`, (): void => {
        void attach(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_STORE_NAME}.launch`, (): void => {
        void launch(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_STORE_NAME}.attachToCurrentDebugTarget`, (debugSessionId): void => {
        void attachToCurrentDebugTarget(context, debugSessionId);
    }));

    // Register the launch provider
    vscode.debug.registerDebugConfigurationProvider(`${SETTINGS_STORE_NAME}.debug`,
        new LaunchDebugProvider(context, telemetryReporter, attach, launch));

    // Register the Microsoft Edge debugger types
    vscode.debug.registerDebugConfigurationProvider('edge',
        new LaunchDebugProvider(context, telemetryReporter, attach, launch));
    vscode.debug.registerDebugConfigurationProvider('msedge',
        new LaunchDebugProvider(context, telemetryReporter, attach, launch));

    // Register the side-panel view and its commands
    cdpTargetsProvider = new CDPTargetsProvider(context, telemetryReporter);
    context.subscriptions.push(vscode.window.registerTreeDataProvider(
        `${SETTINGS_VIEW_NAME}.targets`,
        cdpTargetsProvider));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.launch`,
        async (fromEmptyTargetView?: boolean) => {
            if (fromEmptyTargetView) {
                telemetryReporter.sendTelemetryEvent('user/buttonPress', { 'VSCode.buttonCode': buttonCode.emptyTargetListLaunchBrowserInstance });
            } else {
                telemetryReporter.sendTelemetryEvent('user/buttonPress', { 'VSCode.buttonCode': buttonCode.launchBrowserInstance });
            }
            await launch(context);
            cdpTargetsProvider.refresh();
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.refresh`,
        () => {
            telemetryReporter.sendTelemetryEvent('user/buttonPress', { 'VSCode.buttonCode': buttonCode.refreshTargetList });
            cdpTargetsProvider.refresh();
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.attach`,
        (target?: CDPTarget) => {
            if (!target){
                telemetryReporter.sendTelemetryEvent('command/attach/noTarget');
                return;
            }
            telemetryReporter.sendTelemetryEvent('user/buttonPress', { 'VSCode.buttonCode': buttonCode.attachToTarget });
            telemetryReporter.sendTelemetryEvent('view/devtools');
            const runtimeConfig = getRuntimeConfig();
            DevToolsPanel.createOrShow(context, telemetryReporter, target.websocketUrl, runtimeConfig);
        }));
    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_VIEW_NAME}.openSettings`, () => {
        telemetryReporter.sendTelemetryEvent('user/buttonPress', { 'VSCode.buttonCode': buttonCode.openSettings });
        void vscode.commands.executeCommand('workbench.action.openSettings', `${SETTINGS_STORE_NAME}`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_VIEW_NAME}.viewChangelog`, () => {
        telemetryReporter.sendTelemetryEvent('user/buttonPress', { 'VSCode.buttonCode': buttonCode.viewChangelog });
        void vscode.env.openExternal(vscode.Uri.parse('https://github.com/microsoft/vscode-edge-devtools/blob/master/CHANGELOG.md'));
    }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.close-instance`,
        async (target?: CDPTarget) => {
            if (!target) {
                telemetryReporter.sendTelemetryEvent('command/close/noTarget');
                return;
            }
            telemetryReporter.sendTelemetryEvent('user/buttonPress', { 'VSCode.buttonCode': buttonCode.closeTarget });
            // disable buttons for this target
            target.contextValue = 'cdpTargetClosing';
            cdpTargetsProvider.changeDataEvent.fire(target);

            // update with the latest information, in case user has navigated to a different page via browser.
            cdpTargetsProvider.refresh();
            const normalizedPath = new URL(target.description).toString();
            if (browserInstance) {
                const browserPages = await browserInstance.pages();
                for (const page of browserPages) {
                    // URL needs to be accessed through the target as the page could be handling errors in a different way.
                    // e.g redirecting to chrome-error: protocol
                    if (!page.isClosed() && (normalizedPath === page.target().url())) {
                        // fire and forget
                        void page.close();
                        break;
                    }
                }

                // display the latest information to user.
                cdpTargetsProvider.refresh();
            }
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.copyItem`,
        (target: CDPTarget) => vscode.env.clipboard.writeText(target.tooltip)));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.configureLaunchJson`,
        () => {
            telemetryReporter.sendTelemetryEvent('user/buttonPress', {
                'VSCode.buttonCode': LaunchConfigManager.instance.getLaunchConfig() === 'None' ? buttonCode.generateLaunchJson : buttonCode.configureLaunchJson,
            });
            void LaunchConfigManager.instance.configureLaunchJson();
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.launchProject`,
        () => {
            telemetryReporter.sendTelemetryEvent('user/buttonPress', { 'VSCode.buttonCode': buttonCode.launchProject });
            LaunchConfigManager.instance.updateLaunchConfig();
            if (vscode.workspace.workspaceFolders && LaunchConfigManager.instance.isValidLaunchConfig) {
                void vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], LaunchConfigManager.instance.getLaunchConfig());
                cdpTargetsProvider.refresh();
            }
        }));
    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_VIEW_NAME}.viewDocumentation`, () => {
            telemetryReporter.sendTelemetryEvent('user/buttonPress', { 'VSCode.buttonCode': buttonCode.viewDocumentation });
            void vscode.env.openExternal(vscode.Uri.parse('https://github.com/microsoft/vscode-edge-devtools/blob/master/README.md'));
        }));
    void vscode.commands.executeCommand('setContext', 'titleCommandsRegistered', true);
    void reportFileExtensionTypes(telemetryReporter);
    reportExtensionSettings(telemetryReporter);
    vscode.workspace.onDidChangeConfiguration(event => reportChangedExtensionSetting(event, telemetryReporter));
}

export async function attach(
    context: vscode.ExtensionContext, attachUrl?: string, config?: Partial<IUserConfig>, useRetry?: boolean): Promise<void> {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    const telemetryProps = { viaConfig: `${!!config}`, withTargetUrl: `${!!attachUrl}` };
    const { hostname, port, useHttps, timeout } = getRemoteEndpointSettings(config);

    // Get the attach target and keep trying until reaching timeout
    const startTime = Date.now();
    do {
        let responseArray: IRemoteTargetJson[] | undefined;
        try {
            // Keep trying to attach to the list endpoint until timeout
            responseArray = await debugCore.utils.retryAsync(
                () => getListOfTargets(hostname, port, useHttps),
                timeout,
                /* intervalDelay=*/ SETTINGS_DEFAULT_ATTACH_INTERVAL) as IRemoteTargetJson[];
        } catch {
            // Timeout so make sure we error out with no json result
            responseArray = undefined;
        }

        if (Array.isArray(responseArray)) {
            // Try to match the given target with the list of targets we received from the endpoint
            let targetWebsocketUrl = '';
            if (attachUrl) {
                // Match the targets using the edge debug adapter logic
                let matchedTargets: debugCore.chromeConnection.ITarget[] | undefined;
                try {
                    matchedTargets = debugCore.chromeUtils.getMatchingTargets(responseArray as unknown as debugCore.chromeConnection.ITarget[], attachUrl);
                } catch {
                    matchedTargets = undefined;
                }

                if (matchedTargets && matchedTargets.length > 0 && matchedTargets[0].webSocketDebuggerUrl) {
                    const actualTarget = fixRemoteWebSocket(hostname, port, matchedTargets[0] as unknown as IRemoteTargetJson);
                    targetWebsocketUrl = actualTarget.webSocketDebuggerUrl;
                } else if (!useRetry) {
                    void vscode.window.showErrorMessage(`Couldn't attach to ${attachUrl}.`);
                }
            }

            if (targetWebsocketUrl) {
                // Auto connect to found target
                useRetry = false;
                const runtimeConfig = getRuntimeConfig(config);
                DevToolsPanel.createOrShow(context, telemetryReporter, targetWebsocketUrl, runtimeConfig);
            } else if (useRetry) {
                // Wait for a little bit until we retry
                await new Promise<void>(resolve => {
                    setTimeout(() => {
                        resolve();
                    }, SETTINGS_DEFAULT_ATTACH_INTERVAL);
                });
            } else {
                // Create the list of items to show with fixed websocket addresses
                const items = responseArray.map((i: IRemoteTargetJson) => {
                    i = fixRemoteWebSocket(hostname, port, i);
                    return {
                        description: i.url,
                        detail: i.webSocketDebuggerUrl,
                        label: i.title,
                    } as vscode.QuickPickItem;
                });

                // Show the target list and allow the user to select one
                const selection = await vscode.window.showQuickPick(items);
                if (selection && selection.detail) {
                    const runtimeConfig = getRuntimeConfig(config);
                    DevToolsPanel.createOrShow(context, telemetryReporter, selection.detail, runtimeConfig);
                }
            }
        } else {
            telemetryReporter.sendTelemetryEvent('command/attach/error/no_json_array', telemetryProps);
        }
    } while (useRetry && Date.now() - startTime < timeout);
}

export async function attachToCurrentDebugTarget(context: vscode.ExtensionContext, debugSessionId?: string): Promise<void> {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    telemetryReporter.sendTelemetryEvent('command/attachToCurrentDebugTarget');
    const sessionId = debugSessionId || getActiveDebugSessionId();

    if (!sessionId) {
        const errorMessage = 'No active debug session';
        telemetryReporter.sendTelemetryErrorEvent('command/attachToCurrentDebugTarget/devtools', {message: errorMessage});
        void vscode.window.showErrorMessage(errorMessage);
        return;
    }

    const targetWebsocketUrl = await getJsDebugCDPProxyWebsocketUrl(sessionId);

    if (targetWebsocketUrl instanceof Error) {
        telemetryReporter.sendTelemetryErrorEvent('command/attachToCurrentDebugTarget/devtools', {message: targetWebsocketUrl.message});
        void vscode.window.showErrorMessage(targetWebsocketUrl.message);
    } else if (targetWebsocketUrl) {
        // Auto connect to found target
        telemetryReporter.sendTelemetryEvent('command/attachToCurrentDebugTarget/devtools');
        const runtimeConfig = getRuntimeConfig();
        runtimeConfig.isJsDebugProxiedCDPConnection = true;
        DevToolsPanel.createOrShow(context, telemetryReporter, targetWebsocketUrl, runtimeConfig);
    } else {
        const errorMessage = 'Unable to attach DevTools to current debug session.';
        telemetryReporter.sendTelemetryErrorEvent('command/attachToCurrentDebugTarget/devtools', {message: errorMessage});
        void vscode.window.showErrorMessage(errorMessage);
    }
}

export async function launch(context: vscode.ExtensionContext, launchUrl?: string, config?: Partial<IUserConfig>): Promise<void> {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const browserType: string = settings.get('browserFlavor') || 'Default';
    const isHeadless: string = settings.get('headless') || 'false';

    const telemetryProps = { viaConfig: `${!!config}`, browserType, isHeadless};
    telemetryReporter.sendTelemetryEvent('command/launch', telemetryProps);

    const { hostname, port, defaultUrl, userDataDir } = getRemoteEndpointSettings(config);
    const url = launchUrl || defaultUrl;
    const target = await openNewTab(hostname, port, url);
    if (target && target.webSocketDebuggerUrl) {
        // Show the devtools
        telemetryReporter.sendTelemetryEvent('command/launch/devtools', telemetryProps);
        const runtimeConfig = getRuntimeConfig(config);
        DevToolsPanel.createOrShow(context, telemetryReporter, target.webSocketDebuggerUrl, runtimeConfig);
    } else {
        // Launch a new instance
        const browserPath = await getBrowserPath(config);
        if (!browserPath) {
            telemetryReporter.sendTelemetryEvent('command/launch/error/browser_not_found', telemetryProps);
            void vscode.window.showErrorMessage(
                'Microsoft Edge could not be found. ' +
                'Ensure you have installed Microsoft Edge ' +
                "and that you have selected 'default' or the appropriate version of Microsoft Edge " +
                'in the extension settings panel.');
            return;
        }
            // Here we grab the last part of the path (using either forward or back slashes to account for mac/win),
            // Then we search that part for either chrome or edge to best guess identify the browser that is launching.
            // If it is one of those names we use that, otherwise we default it to "other".
            // Then we upload just one of those 3 names to telemetry.
            const exeName = browserPath.split(/\\|\//).pop();
            if (!exeName) { return; }
            const match = exeName.match(/(chrome|edge)/gi) || [];
            const knownBrowser = match.length > 0 ? match[0] : 'other';
            const browserProps = { exe: `${knownBrowser.toLowerCase()}` };
            telemetryReporter.sendTelemetryEvent('command/launch/browser', browserProps);

        browserInstance = await launchBrowser(browserPath, port, url, userDataDir);
        if (url !== SETTINGS_DEFAULT_URL) {
            reportUrlType(url, telemetryReporter);
        }
        browserInstance.on('targetcreated', () => {
            cdpTargetsProvider.refresh();
        });
        browserInstance.on('targetdestroyed', () => {
            cdpTargetsProvider.refresh();
        });
        browserInstance.on('targetchanged',  (target: Target) => {
            if (target.type() === 'page') {
                reportUrlType(target.url(), telemetryReporter);
            }
        });
        await attach(context, url, config);
    }
}
