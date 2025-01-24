// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as path from 'path';
import * as vscode from 'vscode';
import * as debugCore from 'vscode-chrome-debug-core';
import { performance } from 'perf_hooks';
import TelemetryReporter from '@vscode/extension-telemetry';
import { SettingsProvider } from './common/settingsProvider';
import {
    encodeMessageForChannel,
    ICssMirrorContentData,
    IOpenEditorData,
    ITelemetryMeasures,
    ITelemetryProps,
    IToggleCSSMirrorContentData,
    TelemetryData,
    WebSocketEvent,
} from './common/webviewEvents';
import { JsDebugProxyPanelSocket } from './JsDebugProxyPanelSocket';
import { PanelSocket } from './panelSocket';
import { BrowserVersionDetectionSocket } from './versionSocketConnection';
import {
    addEntrypointIfNeeded,
    applyPathMapping,
    fetchUri,
    IRuntimeConfig,
    SETTINGS_PREF_DEFAULTS,
    SETTINGS_PREF_NAME,
    SETTINGS_STORE_NAME,
    SETTINGS_WEBVIEW_NAME,
    SETTINGS_VIEW_NAME,
    CDN_FALLBACK_REVISION,
    getCSSMirrorContentEnabled,
    setCSSMirrorContentEnabled,
} from './utils';
import { ErrorReporter } from './errorReporter';
import { ErrorCodes } from './common/errorCodes';
import { ScreencastPanel } from './screencastPanel';
import { providedHeadlessDebugConfig } from './launchConfigManager';

export class DevToolsPanel {
    private readonly config: IRuntimeConfig;
    private readonly context: vscode.ExtensionContext;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly extensionPath: string;
    private readonly mirroredCSS = new Map<string, string>();
    private readonly panel: vscode.WebviewPanel;
    private readonly telemetryReporter: Readonly<TelemetryReporter>;
    private readonly targetUrl: string;
    private panelSocket: PanelSocket;
    private versionDetectionSocket: BrowserVersionDetectionSocket;
    private timeStart: number | null;
    private devtoolsBaseUri: string | null;
    private isHeadless: boolean;
    static instance: DevToolsPanel | undefined;
    private consoleMessages: string[] = [];
    private collectConsoleMessages = true;
    private currentRevision: string | undefined;
    private cssWarningActive: boolean;
    private fallbackChain: (() => void)[] = [];
    private getFallbackRevisionFunction: (() => void) = () => {};

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        telemetryReporter: Readonly<TelemetryReporter>,
        targetUrl: string,
        config: IRuntimeConfig) {
        this.panel = panel;
        this.context = context;
        this.telemetryReporter = telemetryReporter;
        this.extensionPath = this.context.extensionPath;
        this.targetUrl = targetUrl;
        this.config = config;
        this.timeStart = null;
        this.devtoolsBaseUri = this.config.devtoolsBaseUri || null;
        this.isHeadless = SettingsProvider.instance.getHeadlessSettings();
        this.cssWarningActive = false;

        // Hook up the socket events
        if (this.config.isJsDebugProxiedCDPConnection) {
            this.panelSocket = new JsDebugProxyPanelSocket(this.targetUrl, (e, msg) => this.postToDevTools(e, msg));
        } else {
            this.panelSocket = new PanelSocket(this.targetUrl, (e, msg) => this.postToDevTools(e, msg));
        }
        this.panelSocket.on('ready', () => this.onSocketReady());
        this.panelSocket.on('websocket', (msg: string) => this.onSocketMessage(msg));
        this.panelSocket.on('telemetry', (msg: string) => this.onSocketTelemetry(msg));
        this.panelSocket.on('getState', (msg: string) => this.onSocketGetState(msg));
        this.panelSocket.on('getVscodeSettings', (msg: string) => this.onSocketGetVscodeSettings(msg));
        this.panelSocket.on('setState', (msg: string) => this.onSocketSetState(msg));
        this.panelSocket.on('getUrl', (msg: string) => this.onSocketGetUrl(msg) as unknown as void);
        this.panelSocket.on('openUrl', (msg: string) => this.onSocketOpenUrl(msg) as unknown as void);
        this.panelSocket.on('openInEditor', (msg: string) => this.onSocketOpenInEditor(msg) as unknown as void);
        this.panelSocket.on('toggleScreencast', () => this.toggleScreencast() as unknown as void);
        this.panelSocket.on('cssMirrorContent', (msg: string) => this.onSocketCssMirrorContent(msg) as unknown as void);
        this.panelSocket.on('close', () => this.onSocketClose());
        this.panelSocket.on('copyText', (msg: string) => this.onSocketCopyText(msg));
        this.panelSocket.on('focusEditor', (msg: string) => this.onSocketFocusEditor(msg));
        this.panelSocket.on('focusEditorGroup', (msg: string) => this.onSocketFocusEditorGroup(msg));
        this.panelSocket.on('replayConsoleMessages', () => this.onSocketReplayConsoleMessages());
        this.panelSocket.on('devtoolsConnection', (success: string) => this.onSocketDevToolsConnection(success));
        this.panelSocket.on('toggleCSSMirrorContent', (msg: string) => this.onToggleCSSMirrorContent(msg) as unknown as void);

        // This Websocket is only used on initial connection to determine the browser version.
        // The browser version is used to select the correct hashed version of the devtools
        this.versionDetectionSocket = new BrowserVersionDetectionSocket(this.targetUrl);

        // Gets an array of functions that will be tried to get the right Devtools revision.
        this.fallbackChain = this.determineVersionFallback();
        if (this.fallbackChain.length > 0) {
            this.getFallbackRevisionFunction = this.fallbackChain.pop() || this.getFallbackRevisionFunction;
        }

        // Handle closing
        this.panel.onDidDispose(() => {
            this.dispose();
        }, this, this.disposables);

        // Handle view change
        this.panel.onDidChangeViewState(_e => {
            if (this.panel.visible) {
                if (this.panelSocket.isConnectedToTarget) {
                    // Connection type determined already
                    this.update();
                } else {
                    this.getFallbackRevisionFunction();
                }
            }
        }, this, this.disposables);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage((message: string) => {
            this.panelSocket.onMessageFromWebview(message);
        }, this, this.disposables);

        // Update DevTools theme if user changes global theme
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.colorTheme') &&
            this.panel.visible) {
                this.update();
            }
        });
    }

    /**
     * Allows multiple fallbacks, allowing the user to select between stability
     * or latest features.
     * @returns A function array that has the fallback chain.
     */
    determineVersionFallback() {
        const browserFlavor = this.config.browserFlavor;
        const storedRevision = this.context.globalState.get<string>('fallbackRevision') || '';
        const callWrapper = (revision: string) => {
            this.setCdnParameters({revision, isHeadless: this.isHeadless});
        };

        // Use version socket to determine which Webview/Tools to use
        const detectedVersion = () => {
            this.versionDetectionSocket.on('setCdnParameters', (msg: {revision: string; isHeadless: boolean}) => {
                this.setCdnParameters(msg);
            });

            this.versionDetectionSocket.detectVersion.bind(this.versionDetectionSocket)();
        };

        // we reverse the array so that it behaves like a stack.
        switch (browserFlavor) {
            case 'Beta':
            case 'Canary':
            case 'Dev':
            case 'Stable': {
                return [ detectedVersion,
                        () => callWrapper(CDN_FALLBACK_REVISION),
                        () => callWrapper(storedRevision)].reverse();
            }

            case 'Default':
            default: {
                return [() => callWrapper(CDN_FALLBACK_REVISION),
                        detectedVersion,
                        () => callWrapper(storedRevision)].reverse();
            }
        }
    }

    dispose(): void {
        DevToolsPanel.instance = undefined;

        this.panel.dispose();
        this.panelSocket.dispose();
        if (this.timeStart !== null) {
            const timeEnd = performance.now();
            const sessionTime = timeEnd - this.timeStart;
            this.telemetryReporter.sendTelemetryEvent('websocket/dispose', undefined, {sessionTime});
            this.timeStart = null;
        }

        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) {
                d.dispose();
            }
        }
        if (!ScreencastPanel.instance && vscode.debug.activeDebugSession?.name.includes(providedHeadlessDebugConfig.name)) {
            void vscode.commands.executeCommand('workbench.action.debug.stop');
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        ScreencastPanel.instance && ScreencastPanel.instance.update();
    }

    private postToDevTools(e: WebSocketEvent, message?: string) {
        switch (e) {
            case 'open':
            case 'close':
            case 'error':
                this.telemetryReporter.sendTelemetryEvent(`websocket/${e}`);
                break;
        }
        if (this.collectConsoleMessages && message && message.includes('Runtime.consoleAPICalled')) {
            this.consoleMessages.push(message);
        } else {
            encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'websocket', { event: e, message });
        }
    }

    private onSocketReplayConsoleMessages() {
        for (const message of this.consoleMessages) {
            encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'websocket', { event: 'message', message });
        }
        this.consoleMessages = [];
        this.collectConsoleMessages = false;
    }

    private onSocketReady() {
        // Report success telemetry
        this.telemetryReporter.sendTelemetryEvent(
            this.panelSocket.isConnectedToTarget ? 'websocket/reconnect' : 'websocket/connect');
        this.timeStart = performance.now();
    }

    private onToggleCSSMirrorContent(message: string) {
        const { isEnabled } = JSON.parse(message) as IToggleCSSMirrorContentData;
        void setCSSMirrorContentEnabled(this.context, isEnabled);
    }

    private onSocketMessage(message: string) {
        // If inspect mode is toggled on the DevTools, we need to let the standalone screencast
        // know in order to enable hover events to be sent through.
        if (message && message.includes('\\"method\\":\\"Overlay.setInspectMode\\"')) {
            try {
                const cdpMsg = JSON.parse((JSON.parse(message) as {message: string}).message) as {method: string, params: {mode: string} };
                if (cdpMsg.method === 'Overlay.setInspectMode') {
                    if (cdpMsg.params.mode === 'none') {
                        void vscode.commands.executeCommand(`${SETTINGS_VIEW_NAME}.toggleInspect`, { enabled: false });
                    } else if (cdpMsg.params.mode === 'searchForNode') {
                        void vscode.commands.executeCommand(`${SETTINGS_VIEW_NAME}.toggleInspect`, { enabled: true });
                    }
                }
            } catch {
                // Ignore
            }
        }
        // TODO: Handle message
    }

    private onSocketClose() {
        this.dispose();
        this.collectConsoleMessages = true;
    }

    private onSocketCopyText(message: string) {
        const { clipboardData } = JSON.parse(message) as { clipboardData: string };
        void vscode.env.clipboard.writeText(clipboardData);
    }

    private onSocketFocusEditor(message: string) {
        const { next } = JSON.parse(message) as { next: boolean };
        if (next) {
            void vscode.commands.executeCommand('workbench.action.nextEditor');
        } else {
            void vscode.commands.executeCommand('workbench.action.previousEditor');
        }
    }

    private onSocketFocusEditorGroup(message: string) {
        const { next } = JSON.parse(message) as { next: boolean };
        if (next) {
            void vscode.commands.executeCommand('workbench.action.focusNextGroup');
        } else {
            void vscode.commands.executeCommand('workbench.action.focusPreviousGroup');
        }
    }

    private toggleScreencast() {
        const websocketUrl = this.targetUrl;
        const isJsDebugProxiedCDPConnection = this.config.isJsDebugProxiedCDPConnection;
        void vscode.commands.executeCommand(`${SETTINGS_VIEW_NAME}.toggleScreencast`, { websocketUrl }, isJsDebugProxiedCDPConnection);
    }

    private onSocketTelemetry(message: string) {
        const telemetry: TelemetryData = JSON.parse(message) as TelemetryData;

        // Fire telemetry
        switch (telemetry.event) {
            case 'performance': {
                const measures: ITelemetryMeasures = {};
                measures[`${telemetry.name}.duration`] = telemetry.data;
                this.telemetryReporter.sendTelemetryEvent(
                    `devtools/${telemetry.name}`,
                    undefined,
                    measures);
                break;
            }

            case 'enumerated': {
                const properties: ITelemetryProps = {};
                properties[`${telemetry.name}.actionCode`] = telemetry.data.toString();
                this.telemetryReporter.sendTelemetryEvent(
                    `devtools/${telemetry.name}`,
                    properties);
                break;
            }

            case 'error': {
                const properties: ITelemetryProps = {};
                properties[`${telemetry.name}.info`] = JSON.stringify(telemetry.data);
                this.telemetryReporter.sendTelemetryErrorEvent(
                    `devtools/${telemetry.name}`,
                    properties);
                break;
            }
        }
    }

    private onSocketGetState(message: string) {
        const { id } = JSON.parse(message) as { id: number };
        const preferences: Record<string, unknown> = this.context.workspaceState.get(SETTINGS_PREF_NAME) || SETTINGS_PREF_DEFAULTS;
        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'getState', { id, preferences });
    }

    private onSocketGetVscodeSettings(message: string) {
        const { id } = JSON.parse(message) as { id: number };
        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'getVscodeSettings', {
            isHeadless: SettingsProvider.instance.getHeadlessSettings(),
            id,
        });
    }

    private onSocketSetState(message: string) {
        // Parse the preference from the message and store it
        const { name, value } = JSON.parse(message) as { name: string, value: string };
        const allPref: Record<string, unknown> = this.context.workspaceState.get(SETTINGS_PREF_NAME) || {};
        allPref[name] = value;
        void this.context.workspaceState.update(SETTINGS_PREF_NAME, allPref);
    }

    private async onSocketGetUrl(message: string) {
        // Parse the request from the message and store it
        const request = JSON.parse(message) as { id: number, url: string };

        let content = '';
        try {
            content = await fetchUri(request.url);
        } catch {
            // Response will not have content
        }

        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'getUrl', { id: request.id, content });
    }

    private onSocketOpenUrl(message: string) {
      const { url } = JSON.parse(message) as { url: string };
      void vscode.env.openExternal(vscode.Uri.parse(url));
    }

    private async onSocketOpenInEditor(message: string) {
        // Report usage telemetry
        this.telemetryReporter.sendTelemetryEvent('extension/openInEditor', {
            sourceMaps: `${this.config.sourceMaps}`,
        });

        // Parse message and open the requested file
        const { column, line, url, ignoreTabChanges } = JSON.parse(message) as IOpenEditorData;

        // If we don't want to force focus to the doc and doing so would cause a tab switch ignore it.
        // This is because just starting to edit a style in the Microsoft Edge Tools with call openInEditor
        // but if we switch vs code tab the edit will be cancelled.
        if (ignoreTabChanges && this.panel.viewColumn === vscode.ViewColumn.One) {
            return;
        }

        const uri = await this.parseUrlToUri(url);
        if (uri) {
            void this.openEditorFromUri(uri, line, column);
        } else {
            await ErrorReporter.showErrorDialog({
                errorCode: ErrorCodes.Error,
                title: 'Error while opening file in editor.',
                message: `Could not open document. No workspace mapping was found for '${url}'.`,
            });
        }
    }

    private async onSocketCssMirrorContent(message: string) {
        if (!getCSSMirrorContentEnabled(this.context)) {
            return;
        }

        // Parse message and open the requested file
        const { url, newContent } = JSON.parse(message) as ICssMirrorContentData;

        const uri = await this.parseUrlToUri(url);

        // Finally open and edit the document if it exists
        if (uri) {
            const textEditor = await this.openEditorFromUri(uri);
            if (textEditor) {
                const fullRange = this.getDocumentFullRange(textEditor);
                const mirroredCSSText = this.mirroredCSS.get(url);
                const textEditorCSSText = textEditor.document.getText();
                const isSnapshotSameAsLastMirroredCSS = mirroredCSSText === textEditorCSSText;
                let canMirror = !textEditor.document.isDirty || isSnapshotSameAsLastMirroredCSS;
                if (!canMirror) {
                    // Standardize line endings to ignore CRLF/LF differences
                    const standardizedMirroredCSStext = mirroredCSSText && mirroredCSSText.replace(/\r\n/g, '\n');
                    const standardizedTextEditorCSSText = textEditorCSSText && textEditorCSSText.replace(/\r\n/g, '\n');
                    canMirror = standardizedMirroredCSStext === standardizedTextEditorCSSText;
                }
                if (canMirror)
                {
                    this.mirroredCSS.set(url, newContent);
                    void textEditor.edit(editBuilder => {
                        editBuilder.replace(fullRange, newContent);
                    });
                }
                else
                {
                    void this.showCssMirroringWarning();
                }
            }
        } else {
            await ErrorReporter.showErrorDialog({
                errorCode: ErrorCodes.Error,
                title: 'Error while mirroring css content to document.',
                message: `Could not mirror css changes to document. No workspace mapping was found for '${url}'.`,
            });
        }
    }

    private onSocketDevToolsConnection(success: string) {
        if (success === 'true') {
            void this.context.globalState.update('fallbackRevision', this.currentRevision);
            this.fallbackChain = this.determineVersionFallback();
        } else {
            if (this.currentRevision) {
                this.telemetryReporter.sendTelemetryEvent('websocket/failedConnection', {revision: this.currentRevision});
            }

            // We failed trying to retrieve the specified revision
            // we fallback to the next option if available.
            if (this.fallbackChain.length > 0) {
                this.getFallbackRevisionFunction = this.fallbackChain.pop() || (() => {});
                this.getFallbackRevisionFunction();
            }
        }
    }

    private async openEditorFromUri(uri: vscode.Uri, line?: number, column?: number): Promise<vscode.TextEditor | undefined> {
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const viewColumn = this.panel.viewColumn === vscode.ViewColumn.One ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
            const selection = line !== undefined && column !== undefined ? new vscode.Range(line, column, line, column) : undefined;
            return await vscode.window.showTextDocument(doc, { preserveFocus: true, viewColumn, selection });
        } catch (e) {
            await ErrorReporter.showErrorDialog({
                errorCode: ErrorCodes.Error,
                title: 'Error while opening file in editor.',
                message: e instanceof Error && e.message ? e.message : `Unexpected error ${e}`,
            });
        }
    }

    private getDocumentFullRange(textEditor: vscode.TextEditor): vscode.Range {
        const firstLine = textEditor.document.lineAt(0);
        const lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
        const range =  new vscode.Range(firstLine.range.start, lastLine.range.end);
        return range;
    }

    private async parseUrlToUri(url: string): Promise<vscode.Uri | undefined> {
        // Convert the devtools url into a local one
        let sourcePath = url;
        let appendedEntryPoint = false;
        if (this.config.defaultEntrypoint) {
            // If sourcePath is just a baseUrl, append to default entrypoint
            try {
                const oldSourePath = sourcePath;
                sourcePath = addEntrypointIfNeeded(sourcePath, this.config.defaultEntrypoint);
                appendedEntryPoint = oldSourePath !== sourcePath;
            } catch {
                await ErrorReporter.showInformationDialog({
                    errorCode: ErrorCodes.Error,
                    title: 'Unable to open file in editor.',
                    message: `'${sourcePath}' is not a valid url.`,
                });
                return;
            }
        }
        if (this.config.sourceMaps) {
            sourcePath = applyPathMapping(sourcePath, this.config.sourceMapPathOverrides);
        }

        // Convert the local url to a workspace path
        const transformer = new debugCore.UrlPathTransformer();
        void transformer.launch({ pathMapping: this.config.pathMapping });

        // origin in this case is trivial since we expect fixSource to take it out
        // marking it explicitly as invalid to clarify intention.
        const localSource = { path: sourcePath, origin: 'invalid-origin://' };
        await transformer.fixSource(localSource);

        // per documentation if the file was correctly resolved origin will be cleared.
        // https://github.com/Microsoft/vscode-chrome-debug-core/blob/main/src/transformers/urlPathTransformer.ts
        if (!localSource.origin) {
            // Convert the workspace path into a VS Code url
            const uri = vscode.Uri.file(localSource.path);
            return uri;
        }
        // If failed to resolve origin, it's possible entrypoint needs to be updated.
        // Space at beginning to allow insertion in message below
        const entryPointErrorMessage = ` Consider updating the 'Default Entrypoint' setting to map to your root html page. The current setting is '${this.config.defaultEntrypoint}'.`;
        await ErrorReporter.showInformationDialog({
            errorCode: ErrorCodes.Error,
            title: 'Unable to open file in editor.',
            message: `${sourcePath} does not map to a local file.${appendedEntryPoint ? entryPointErrorMessage : ''}`,
        });
    }

    private async showCssMirroringWarning() {
        if (!this.cssWarningActive) {
            this.cssWarningActive = true;
            await vscode.window.showWarningMessage('DevTools will not mirror CSS changes while there are unsaved direct edits. Save your changes then refresh the target page to re-enable.', ...[]);
            this.cssWarningActive = false;
        }
    }

    private update() {
        this.panel.webview.html = this.getCdnHtmlForWebview();
    }

    private getCdnHtmlForWebview() {
        // Default to config provided base uri
        const cdnBaseUri = this.config.devtoolsBaseUri || this.devtoolsBaseUri;
        const hostPath = vscode.Uri.file(path.join(this.extensionPath, 'out', 'host', 'host.bundle.js'));
        const hostUri = this.panel.webview.asWebviewUri(hostPath);

        const stylesPath = vscode.Uri.file(path.join(this.extensionPath, 'out', 'common', 'styles.css'));
        const stylesUri = this.panel.webview.asWebviewUri(stylesPath);

        const theme = SettingsProvider.instance.getThemeFromUserSetting();
        const cssMirrorContent = getCSSMirrorContentEnabled(this.context);

        // the added fields for "Content-Security-Policy" allow resource loading for other file types
        return `
            <!doctype html>
            <html>
            <head>
                <meta http-equiv="content-type" content="text/html; charset=utf-8">
                <meta name="referrer" content="no-referrer">
                <link href="${stylesUri}" rel="stylesheet"/>
                <script src="${hostUri}"></script>
                <meta http-equiv="Content-Security-Policy"
                    content="default-src;
                    img-src 'self' data: ${this.panel.webview.cspSource};
                    style-src 'self' 'unsafe-inline' ${this.panel.webview.cspSource};
                    script-src 'self' 'unsafe-eval' ${this.panel.webview.cspSource};
                    frame-src 'self' ${this.panel.webview.cspSource} ${cdnBaseUri};
                    connect-src 'self' data: ${this.panel.webview.cspSource};
                ">
            </head>
            <body>
                <iframe id="devtools-frame"
                allow="clipboard-read; clipboard-write *"
                frameBorder="0" src="${cdnBaseUri}?experiments=true&theme=${theme}&standaloneScreencast=true&cssMirrorContent=${cssMirrorContent}"></iframe>
                <div id="error-message" class="hidden">
                    <h1>Unable to download DevTools for the current target.</h1>
                    <p>Try these troubleshooting steps:</p>
                    <ol>
                    <li>Check your network connection</li>
                    <li>Close and re-launch the DevTools</li>
                    </ol>
                    <p>If this problem continues, please <a target="_blank" href="https://github.com/microsoft/vscode-edge-devtools/issues/new?template=bug_report.md">file an issue.</a></p>
                </div>
            </body>
            </html>
            `;
    }

    private setCdnParameters(msg: {revision: string, isHeadless: boolean}) {
        this.currentRevision = msg.revision;
        this.devtoolsBaseUri = `https://devtools.azureedge.net/serve_file/${this.currentRevision}/vscode_app.html`;
        this.isHeadless = msg.isHeadless;
        this.update();

        if (this.isHeadless) {
            if (!ScreencastPanel.instance) {
                ScreencastPanel.createOrShow(this.context, this.telemetryReporter, this.targetUrl, this.config.isJsDebugProxiedCDPConnection);
            }
        }
    }

    static createOrShow(
        context: vscode.ExtensionContext,
        telemetryReporter: Readonly<TelemetryReporter>,
        targetUrl: string,
        config: IRuntimeConfig): void {
        const column = vscode.ViewColumn.Beside;

        if (DevToolsPanel.instance && DevToolsPanel.instance.targetUrl === targetUrl) {
                DevToolsPanel.instance.panel.reveal(column);
        } else {
            if (DevToolsPanel.instance) {
                DevToolsPanel.instance.dispose();
            }
            const panel = vscode.window.createWebviewPanel(SETTINGS_STORE_NAME, SETTINGS_WEBVIEW_NAME, column, {
                enableCommandUris: true,
                enableScripts: true,
                retainContextWhenHidden: true,
            });
            panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
            DevToolsPanel.instance = new DevToolsPanel(panel, context, telemetryReporter, targetUrl, config);

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            ScreencastPanel.instance && ScreencastPanel.instance.update();
        }
    }
}
