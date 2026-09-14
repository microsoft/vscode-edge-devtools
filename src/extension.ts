// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Browser, Target, TargetType } from 'puppeteer-core';
import * as vscode from 'vscode';
import * as debugCore from 'vscode-chrome-debug-core';
import { TelemetryReporter } from '@vscode/extension-telemetry';
import { CDPTarget } from './cdpTarget';
import { CDPTargetsProvider } from './cdpTargetsProvider';
import { DevToolsPanel } from './devtoolsPanel';
import { ScreencastPanel } from './screencastPanel';
import { LaunchDebugProvider } from './launchDebugProvider';
import { sendTaxonomyErrorEvent, sendTaxonomyEvent } from './telemetryTaxonomy';
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
    getCSSMirrorContentEnabled,
    setCSSMirrorContentEnabled,
} from './utils';
import { LaunchConfigManager, providedHeadlessDebugConfig, providedLaunchDevToolsConfig } from './launchConfigManager';
import { ErrorReporter } from './errorReporter';
import { ErrorCodes } from './common/errorCodes';

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

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_STORE_NAME}.launch`, (opts: {launchUrl: string} = {launchUrl: ''}): void => {
        void launch(context, opts.launchUrl);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_STORE_NAME}.attachToCurrentDebugTarget`, (debugSessionId: string | undefined, config: Partial<IUserConfig>): void => {
        void attachToCurrentDebugTarget(context, debugSessionId, config);
    }));

    // Register the launch provider
    vscode.debug.registerDebugConfigurationProvider(`${SETTINGS_STORE_NAME}.debug`,
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
                sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.emptyTargetListLaunchBrowserInstance });
            } else {
                sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.launchBrowserInstance });
            }
            await launch(context);
            cdpTargetsProvider.refresh();
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.refresh`,
        () => {
            sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.refreshTargetList });
            cdpTargetsProvider.refresh();
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.attach`,
        (target?: CDPTarget, isJsDebugProxiedCDPConnection = false) => {
            if (!target){
                sendTaxonomyEvent(telemetryReporter, { area: 'command', feature: 'target', action: 'attach', outcome: 'noTarget' });
                return;
            }
            sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.attachToTarget });
            sendTaxonomyEvent(telemetryReporter, { area: 'view', feature: 'devtools', action: 'open' });
            const runtimeConfig = getRuntimeConfig();
            if (isJsDebugProxiedCDPConnection) {
                runtimeConfig.isJsDebugProxiedCDPConnection = true;
            }
            DevToolsPanel.createOrShow(context, telemetryReporter, target.websocketUrl, runtimeConfig);
        }));

    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.toggleScreencast`,
        (target?: CDPTarget, isJsDebugProxiedCDPConnection: boolean = false) => {
            if (!target){
                const errorMessage = 'No target selected';
                sendTaxonomyErrorEvent(telemetryReporter, { area: 'command', feature: 'screencast', action: 'toggle', outcome: 'noTarget' }, {message: errorMessage});
                return;
            }
            sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.toggleScreencast });
            sendTaxonomyEvent(telemetryReporter, { area: 'view', feature: 'screencast', action: 'open' });
            ScreencastPanel.createOrShow(context,  telemetryReporter, target.websocketUrl, isJsDebugProxiedCDPConnection);
        }));

    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.toggleInspect`,
        (enabled: boolean) => {
            if (ScreencastPanel.instance) {
                ScreencastPanel.instance.toggleInspect(enabled);
            }
        }));

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_VIEW_NAME}.openSettings`, () => {
        sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.openSettings });
        void vscode.commands.executeCommand('workbench.action.openSettings', `${SETTINGS_STORE_NAME}`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_VIEW_NAME}.viewChangelog`, () => {
        sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.viewChangelog });
        void vscode.env.openExternal(vscode.Uri.parse('https://github.com/microsoft/vscode-edge-devtools/blob/main/CHANGELOG.md'));
    }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.close-instance`,
        async (target?: CDPTarget) => {
            if (!target) {
                sendTaxonomyEvent(telemetryReporter, { area: 'command', feature: 'target', action: 'close', outcome: 'noTarget' });
                return;
            }
            sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.closeTarget });
            // disable buttons for this target
            target.contextValue = 'cdpTargetClosing';
            cdpTargetsProvider.changeDataEvent.fire(target);

            // update with the latest information, in case user has navigated to a different page via browser.
            cdpTargetsProvider.refresh();
            const normalizedPath = new URL(target.description).toString();
            if (browserInstance) {
                const browserPages = await browserInstance.pages();

                // First we validate we have pages to close, some non-visual targets could keep the browser
                // instance alive.
                if (!browserPages || browserPages.length === 0){
                    void browserInstance.close();
                    return;
                }

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
            sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, {
                'VSCode.buttonCode': LaunchConfigManager.instance.getLaunchConfig() === 'None' ? buttonCode.generateLaunchJson : buttonCode.configureLaunchJson,
            });
            void LaunchConfigManager.instance.configureLaunchJson();
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.launchProject`,
        () => {
            sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.launchProject });
            LaunchConfigManager.instance.updateLaunchConfig();
            if (vscode.workspace.workspaceFolders) {
                const workspaceFolder = vscode.workspace.workspaceFolders[0];
                if (LaunchConfigManager.instance.isValidLaunchConfig()) {
                    void vscode.debug.startDebugging(workspaceFolder, LaunchConfigManager.instance.getLaunchConfig());
                } else {
                    const autoConfigButtonText = 'Auto-configure launch.json and launch project';
                    void vscode.window.showErrorMessage('Cannot launch a project without a valid launch.json. Please open a folder in the editor.', autoConfigButtonText).then(value => {
                        if (value === autoConfigButtonText) {
                            void LaunchConfigManager.instance.configureLaunchJson().then(() => vscode.debug.startDebugging(workspaceFolder, LaunchConfigManager.instance.getLaunchConfig()));
                        }
                    });
                }
                cdpTargetsProvider.refresh();
            } else {
                const openFolderText = 'Open Folder';
                void vscode.window.showErrorMessage('Cannot launch a project for an empty workspace. Please open a folder in the editor and try again.', openFolderText).then(value => {
                    if (value === openFolderText) {
                        void vscode.commands.executeCommand('workbench.action.files.openFolder');
                    }
                });
            }
        }));
    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_VIEW_NAME}.viewDocumentation`, () => {
            sendTaxonomyEvent(telemetryReporter, { area: 'user', feature: 'ui', action: 'buttonPress' }, { 'VSCode.buttonCode': buttonCode.viewDocumentation });
            void vscode.env.openExternal(vscode.Uri.parse('https://learn.microsoft.com/microsoft-edge/visual-studio-code/microsoft-edge-devtools-extension'));
        }));

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_VIEW_NAME}.cssMirrorContent`, () => {
        const cssMirrorContent = getCSSMirrorContentEnabled(context);
        void setCSSMirrorContentEnabled(context, !cssMirrorContent);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_VIEW_NAME}.launchHtml`, async (fileUri: vscode.Uri): Promise<void> => {
        sendTaxonomyEvent(telemetryReporter, { area: 'contextMenu', feature: 'item', action: 'launchHtml' });
        await launchHtml(fileUri);
    }));


    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_VIEW_NAME}.launchScreencast`, async (fileUri: vscode.Uri): Promise<void> => {
        sendTaxonomyEvent(telemetryReporter, { area: 'contextMenu', feature: 'item', action: 'launchScreencast' });
        await launchScreencast(context, fileUri);
    }));

    void vscode.commands.executeCommand('setContext', 'titleCommandsRegistered', true);
    void reportFileExtensionTypes(telemetryReporter);
    reportExtensionSettings(telemetryReporter);
    vscode.workspace.onDidChangeConfiguration(event => reportChangedExtensionSetting(event, telemetryReporter));
}

export async function launchHtml(fileUri: vscode.Uri): Promise<void> {
    const edgeDebugConfig = providedHeadlessDebugConfig;
    const devToolsAttachConfig = providedLaunchDevToolsConfig;
    if (!vscode.env.remoteName) {
        edgeDebugConfig.url = `file://${fileUri.fsPath}`;
        devToolsAttachConfig.url = `file://${fileUri.fsPath}`;
        void vscode.debug.startDebugging(undefined, edgeDebugConfig).then(() => vscode.debug.startDebugging(undefined, devToolsAttachConfig));
    } else {
        // Parse the filename from the remoteName, file authority and path e.g. file://wsl.localhost/ubuntu-20.04/test/index.html
        const url = `file://${vscode.env.remoteName}.localhost/${fileUri.authority.split('+')[1]}/${fileUri.fsPath.replace(/\\/g, '/')}`;
        edgeDebugConfig.url = url;
        devToolsAttachConfig.url = url;
        const { port, userDataDir } = getRemoteEndpointSettings();
        const browserPath = await getBrowserPath();
        await launchBrowser(browserPath, port, url, userDataDir, /** headless */ true).then(() => vscode.debug.startDebugging(undefined, devToolsAttachConfig));
    }
}

export async function launchScreencast(context: vscode.ExtensionContext, fileUri: vscode.Uri): Promise<void> {
    const edgeDebugConfig = providedHeadlessDebugConfig;
    if (!vscode.env.remoteName) {
        edgeDebugConfig.url = `file://${fileUri.fsPath}`;
        void vscode.debug.startDebugging(undefined, edgeDebugConfig).then(() => attach(context, fileUri.fsPath, undefined, true, true));
    } else {
        // Parse the filename from the remoteName, file authority and path e.g. file://wsl.localhost/ubuntu-20.04/test/index.html
        const url = `file://${vscode.env.remoteName}.localhost/${fileUri.authority.split('+')[1]}/${fileUri.fsPath.replace(/\\/g, '/')}`;
        edgeDebugConfig.url = url;
        const { port, userDataDir } = getRemoteEndpointSettings();
        const browserPath = await getBrowserPath();
        await launchBrowser(browserPath, port,  url, userDataDir, /** headless */ true).then(() => attach(context, url, undefined, true, true));
    }
}

export async function attach(
    context: vscode.ExtensionContext, attachUrl?: string, config?: Partial<IUserConfig>, useRetry?: boolean, screencastOnly?: boolean): Promise<void> {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    const telemetryProps = { viaConfig: `${!!config}`, withTargetUrl: `${!!attachUrl}` };
    const { hostname, port, useHttps, timeout } = getRemoteEndpointSettings(config);

    // Get the attach target and keep trying until reaching timeout
    const startTime = Date.now();
    let responseArray: IRemoteTargetJson[] = [];
    let exceptionStack: unknown;
    do {
        try {
            // Keep trying to attach to the list endpoint until timeout
            responseArray = await debugCore.utils.retryAsync(
                () => getListOfTargets(hostname, port, useHttps),
                timeout,
                /* intervalDelay=*/ SETTINGS_DEFAULT_ATTACH_INTERVAL) as IRemoteTargetJson[];
        } catch (e) {
            exceptionStack = e;
        }

        if (responseArray.length > 0) {
            // Try to match the given target with the list of targets we received from the endpoint
            let targetWebsocketUrl = '';
            if (attachUrl) {
                // Match the targets using the edge debug adapter logic
                let matchedTargets: debugCore.chromeConnection.ITarget[] | undefined;
                try {
                    matchedTargets = debugCore.chromeUtils.getMatchingTargets(responseArray as unknown as debugCore.chromeConnection.ITarget[], attachUrl);
                } catch (e) {
                    void ErrorReporter.showErrorDialog({
                        errorCode: ErrorCodes.Error,
                        title: 'Error while getting a debug connection to the target',
                        message: e instanceof Error && e.message ? e.message : `Unexpected error ${e}`,
                    });

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
                if (screencastOnly) {
                    ScreencastPanel.createOrShow(context, telemetryReporter, targetWebsocketUrl, false);
                } else {
                    DevToolsPanel.createOrShow(context, telemetryReporter, targetWebsocketUrl, runtimeConfig);
                }
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
                    };
                });

                // Show the target list and allow the user to select one
                const selection = await vscode.window.showQuickPick(items);
                if (selection && selection.detail) {
                    const runtimeConfig = getRuntimeConfig(config);
                    if (screencastOnly) {
                        ScreencastPanel.createOrShow(context, telemetryReporter, selection.detail, false);
                    } else {
                        DevToolsPanel.createOrShow(context, telemetryReporter, selection.detail, runtimeConfig);
                    }
                }
            }
        }
    } while (useRetry && Date.now() - startTime < timeout);

    // If there is no response after the timeout then throw an exception (unless for legacy Edge targets which we warned about separately)
    if (responseArray.length === 0) {
        void ErrorReporter.showErrorDialog({
            errorCode: ErrorCodes.Error,
            title: 'Error while fetching list of available targets',
            message: exceptionStack as string || 'No available targets to attach.',
        });

        sendTaxonomyEvent(telemetryReporter, { area: 'command', feature: 'target', action: 'attach', outcome: 'error', detail: 'no_json_array' }, telemetryProps);
    }
}

export async function attachToCurrentDebugTarget(context: vscode.ExtensionContext, debugSessionId?: string, config?: Partial<IUserConfig>): Promise<void> {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    sendTaxonomyEvent(telemetryReporter, { area: 'command', feature: 'currentDebugTarget', action: 'attach' });
    const sessionId = debugSessionId || getActiveDebugSessionId();

    if (!sessionId) {
        const errorMessage = 'No active debug session';
        sendTaxonomyErrorEvent(telemetryReporter, { area: 'command', feature: 'currentDebugTarget', action: 'attach', detail: 'no_active_session' }, {message: errorMessage});
        void vscode.window.showErrorMessage(errorMessage);
        return;
    }

    const targetWebsocketUrl = await getJsDebugCDPProxyWebsocketUrl(sessionId);

    if (targetWebsocketUrl instanceof Error) {
        sendTaxonomyErrorEvent(telemetryReporter, { area: 'command', feature: 'currentDebugTarget', action: 'attach', detail: 'proxy_url_failed' }, {message: targetWebsocketUrl.message});
        void vscode.window.showErrorMessage(targetWebsocketUrl.message);
    } else if (targetWebsocketUrl) {
        // Auto connect to found target
        sendTaxonomyEvent(telemetryReporter, { area: 'command', feature: 'currentDebugTarget', action: 'attach', detail: 'devtools' });
        const runtimeConfig = getRuntimeConfig(config);
        runtimeConfig.isJsDebugProxiedCDPConnection = true;
        DevToolsPanel.createOrShow(context, telemetryReporter, targetWebsocketUrl, runtimeConfig);
    } else {
        const errorMessage = 'Unable to attach DevTools to current debug session.';
        sendTaxonomyErrorEvent(telemetryReporter, { area: 'command', feature: 'currentDebugTarget', action: 'attach', detail: 'attach_failed' }, {message: errorMessage});
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
    sendTaxonomyEvent(telemetryReporter, { area: 'command', feature: 'browser', action: 'launch' }, telemetryProps);

    const { hostname, port, defaultUrl, userDataDir } = getRemoteEndpointSettings(config);
    const url = launchUrl || defaultUrl;
    const target = await openNewTab(hostname, port, url);
    if (target && target.webSocketDebuggerUrl) {
        // Show the devtools
        sendTaxonomyEvent(telemetryReporter, { area: 'command', feature: 'browser', action: 'launch', detail: 'devtools' }, telemetryProps);
        const runtimeConfig = getRuntimeConfig(config);
        DevToolsPanel.createOrShow(context, telemetryReporter, target.webSocketDebuggerUrl, runtimeConfig);
    } else {
        // Launch a new instance
        const browserPath = await getBrowserPath(config);
        if (!browserPath) {
            sendTaxonomyEvent(telemetryReporter, { area: 'command', feature: 'browser', action: 'launch', outcome: 'error', detail: 'browser_not_found' }, telemetryProps);
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
            const browserProps = { exe: `${knownBrowser?.toLowerCase()}` };
            sendTaxonomyEvent(telemetryReporter, { area: 'command', feature: 'browser', action: 'launch', detail: 'newInstance' }, browserProps);

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
            if (target.type() === TargetType.PAGE) {
                reportUrlType(target.url(), telemetryReporter);
            }
        });
        await attach(context, url, config);
    }
}
