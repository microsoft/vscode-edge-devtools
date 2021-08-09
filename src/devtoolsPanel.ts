// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as path from 'path';
import * as vscode from 'vscode';
import * as debugCore from 'vscode-chrome-debug-core';
import { performance } from 'perf_hooks';
import TelemetryReporter from 'vscode-extension-telemetry';

import { SettingsProvider } from './common/settingsProvider';
import {
    encodeMessageForChannel,
    IOpenEditorData,
    ITelemetryMeasures,
    ITelemetryProps,
    TelemetryData,
    WebSocketEvent,
} from './common/webviewEvents';
import { JsDebugProxyPanelSocket } from './JsDebugProxyPanelSocket';
import { PanelSocket } from './panelSocket';
import { BrowserVersionDetectionSocket } from './versionSocketConnection';
import {
    applyPathMapping,
    fetchUri,
    IRuntimeConfig,
    SETTINGS_PREF_DEFAULTS,
    SETTINGS_PREF_NAME,
    SETTINGS_STORE_NAME,
    SETTINGS_WEBVIEW_NAME,
} from './utils';

export class DevToolsPanel {
    private static instance: DevToolsPanel | undefined;
    private readonly config: IRuntimeConfig;
    private readonly context: vscode.ExtensionContext;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly extensionPath: string;
    private readonly panel: vscode.WebviewPanel;
    private readonly telemetryReporter: Readonly<TelemetryReporter>;
    private readonly targetUrl: string;
    private panelSocket: PanelSocket;
    private versionDetectionSocket: BrowserVersionDetectionSocket;
    private consoleOutput: vscode.OutputChannel;
    private timeStart: number | null;
    private devtoolsBaseUri: string | null;
    private isHeadless: boolean;

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
        this.isHeadless = false;
        this.consoleOutput = vscode.window.createOutputChannel('DevTools Console');
        if (config.isJsDebugProxiedCDPConnection) {
            // Direct users to the Debug Console
            this.consoleOutput.appendLine('// Microsoft Edge Devtools Extension:');
            this.consoleOutput.appendLine('// You have connected to a target using Visual Studio Code\'s JavaScript Debugger.');
            this.consoleOutput.appendLine('// Please use the "Debug Console" to view console messages from your webpage and evaluate expressions.');
        } else {
            // Provide 1-way console when attached to a target that is not the current debug target
            this.consoleOutput.appendLine('// Microsoft Edge Devtools Extension:');
            this.consoleOutput.appendLine('// This Output window displays the DevTools extension\'s console output in text format.');
            this.consoleOutput.appendLine('// Note that this feature is only unidirectional and cannot communicate back to the DevTools.');
            this.consoleOutput.appendLine('');
        }

        // Hook up the socket events
        if (this.config.isJsDebugProxiedCDPConnection) {
            this.panelSocket = new JsDebugProxyPanelSocket(this.targetUrl, (e, msg) => this.postToDevTools(e, msg));
        } else {
            this.panelSocket = new PanelSocket(this.targetUrl, (e, msg) => this.postToDevTools(e, msg));
        }
        this.panelSocket.on('ready', () => this.onSocketReady());
        this.panelSocket.on('websocket', () => this.onSocketMessage());
        this.panelSocket.on('telemetry', msg => this.onSocketTelemetry(msg));
        this.panelSocket.on('getState', msg => this.onSocketGetState(msg));
        this.panelSocket.on('getVscodeSettings', msg => this.onSocketGetVscodeSettings(msg));
        this.panelSocket.on('setState', msg => this.onSocketSetState(msg));
        this.panelSocket.on('getUrl', msg => this.onSocketGetUrl(msg) as unknown as void);
        this.panelSocket.on('openUrl', msg => this.onSocketOpenUrl(msg) as unknown as void);
        this.panelSocket.on('openInEditor', msg => this.onSocketOpenInEditor(msg) as unknown as void);
        this.panelSocket.on('close', () => this.onSocketClose());
        this.panelSocket.on('copyText', msg => this.onSocketCopyText(msg));
        this.panelSocket.on('focusEditor', msg => this.onSocketFocusEditor(msg));
        this.panelSocket.on('focusEditorGroup', msg => this.onSocketFocusEditorGroup(msg));
        if (!config.isJsDebugProxiedCDPConnection){
            // Provide 1-way console when attached to a target that is not the current debug target
            this.panelSocket.on('consoleOutput', msg => this.onSocketConsoleOutput(msg));
        }

        // This Websocket is only used on initial connection to determine the browser version.
        // The browser version is used to select between CDN and bundled tools
        // Future versions of the extension will remove this socket and only use CDN
        this.versionDetectionSocket = new BrowserVersionDetectionSocket(this.targetUrl);
        this.versionDetectionSocket.on('setCdnParameters', msg => this.setCdnParameters(msg));


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
                    // Use version socket to determine which Webview/Tools to use
                    this.versionDetectionSocket.detectVersion();
                }
            }
        }, this, this.disposables);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(message => {
            this.panelSocket.onMessageFromWebview(message);
        }, this, this.disposables);

        // Update DevTools theme if user changes global theme
        vscode.workspace.onDidChangeConfiguration(e => {
            if (this.config.isCdnHostedTools &&
            e.affectsConfiguration('workbench.colorTheme') &&
            this.panel.visible) {
                this.update();
            }
        });
    }

    dispose(): void {
        DevToolsPanel.instance = undefined;

        this.panel.dispose();
        this.panelSocket.dispose();
        this.consoleOutput.dispose();
        this.versionDetectionSocket.dispose();
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
    }

    private postToDevTools(e: WebSocketEvent, message?: string) {
        switch (e) {
            case 'open':
            case 'close':
            case 'error':
                this.telemetryReporter.sendTelemetryEvent(`websocket/${e}`);
                break;
        }
        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'websocket', { event: e, message });
    }

    private onSocketReady() {
        // Report success telemetry
        this.telemetryReporter.sendTelemetryEvent(
            this.panelSocket.isConnectedToTarget ? 'websocket/reconnect' : 'websocket/connect');
        this.timeStart = performance.now();
    }

    private onSocketMessage() {
        // TODO: Handle message
    }

    private onSocketClose() {
        this.dispose();
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

    private onSocketConsoleOutput(message: string) {
        const { consoleMessage } = JSON.parse(message) as { consoleMessage : string };
        this.consoleOutput.appendLine(consoleMessage);
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
            enableNetwork: SettingsProvider.instance.isNetworkEnabled(),
            themeString: SettingsProvider.instance.getThemeSettings(),
            welcome: SettingsProvider.instance.getWelcomeSettings(),
            isHeadless: SettingsProvider.instance.getHeadlessSettings(),
            id });
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

        // Convert the devtools url into a local one
        let sourcePath = url;
        if (this.config.sourceMaps) {
            sourcePath = applyPathMapping(sourcePath, this.config.sourceMapPathOverrides);
        }

        // Convert the local url to a workspace path
        const transformer = new debugCore.UrlPathTransformer();
        void transformer.launch({ pathMapping: this.config.pathMapping });
        const localSource = { path: sourcePath };
        await transformer.fixSource(localSource);

        sourcePath = localSource.path || sourcePath;

        // Convert the workspace path into a VS Code url
        let uri: vscode.Uri | undefined;
        try {
            uri = vscode.Uri.file(sourcePath);
        } catch {
            try {
                uri = vscode.Uri.parse(sourcePath, true);
            } catch {
                uri = undefined;
            }
        }

        // Finally open the document if it exists
        if (uri) {
            const doc = await vscode.workspace.openTextDocument(uri);
            void vscode.window.showTextDocument(
                doc,
                {
                    preserveFocus: true,
                    selection: new vscode.Range(line, column, line, column),
                    viewColumn: vscode.ViewColumn.One,
                });
        } else {
            void vscode.window.showErrorMessage(`Could not open document. No workspace mapping was found for '${url}'.`);
        }
    }

    private update() {
        // Check to see which version of devtools we need to launch
        this.panel.webview.html = (this.config.isCdnHostedTools || this.config.useLocalEdgeWatch) ? this.getCdnHtmlForWebview() : this.getHtmlForWebview();
    }

    private getHtmlForWebview() {
        // inspectorUri is the file that used to be loaded in inspector.html
        // They are being loaded directly into the webview.
        // local resource loading inside iframes was deprecated in these commits:
        // https://github.com/microsoft/vscode/commit/de9887d9e0eaf402250d2735b3db5dc340184b74
        // https://github.com/microsoft/vscode/commit/d05ded6d3b64fed4a3cc74106f9b6c72243b18de

        const inspectorPath = vscode.Uri.file(path.join(this.extensionPath, 'out/tools/front_end', 'inspector.js'));
        const inspectorUri = this.panel.webview.asWebviewUri(inspectorPath);

        const hostPath = vscode.Uri.file(path.join(this.extensionPath, 'out', 'host', 'host.bundle.js'));
        const hostUri = this.panel.webview.asWebviewUri(hostPath);

        const stylesPath = vscode.Uri.file(path.join(this.extensionPath, 'out', 'common', 'styles.css'));
        const stylesUri = this.panel.webview.asWebviewUri(stylesPath);

        // the added fields for "Content-Security-Policy" allow resource loading for other file types
        return `
            <!doctype html>
            <html>
            <head>
                <base href="${inspectorUri}">
                <meta http-equiv="content-type" content="text/html; charset=utf-8">
                <meta http-equiv="Content-Security-Policy"
                    content="default-src;
                    img-src 'self' data: ${this.panel.webview.cspSource};
                    style-src 'self' 'unsafe-inline' ${this.panel.webview.cspSource};
                    script-src 'self' 'unsafe-eval' ${this.panel.webview.cspSource};
                    frame-src 'self' ${this.panel.webview.cspSource};
                    connect-src 'self' data: ${this.panel.webview.cspSource};
                ">
                <meta name="referrer" content="no-referrer">
                <link href="${stylesUri}" rel="stylesheet"/>
                <script src="${hostUri}"></script>
                <script type="module" src="${inspectorUri}"></script>
            </head>
            <body>
            </body>
            </html>
            `;
    }

    private getCdnHtmlForWebview() {
        // Default to config provided base uri
        const cdnBaseUri = this.config.devtoolsBaseUri || this.devtoolsBaseUri;
        const hostPath = vscode.Uri.file(path.join(this.extensionPath, 'out', 'host_beta', 'host.bundle.js'));
        const hostUri = this.panel.webview.asWebviewUri(hostPath);

        const stylesPath = vscode.Uri.file(path.join(this.extensionPath, 'out', 'common', 'styles.css'));
        const stylesUri = this.panel.webview.asWebviewUri(stylesPath);

        const theme = SettingsProvider.instance.getThemeFromUserSetting();

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
                <iframe id="devtools-frame" frameBorder="0" src="${cdnBaseUri}?experiments=true&theme=${theme}&headless=${this.isHeadless}"></iframe>
            </body>
            </html>
            `;
    }

    private setCdnParameters(msg: {revision: string, isHeadless: boolean}) {
        if (msg.revision !== '') {
            this.config.isCdnHostedTools = true;
            this.devtoolsBaseUri = `https://devtools.azureedge.net/serve_file/${msg.revision}/vscode_app.html`;
        } else {
            this.config.isCdnHostedTools = false;
            this.devtoolsBaseUri = '';
        }
        this.isHeadless = msg.isHeadless;
        this.update();
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

            DevToolsPanel.instance = new DevToolsPanel(panel, context, telemetryReporter, targetUrl, config);
        }
    }
}
