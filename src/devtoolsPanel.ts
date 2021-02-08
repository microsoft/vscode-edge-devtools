// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as path from "path";
import * as vscode from "vscode";
import * as debugCore from "vscode-chrome-debug-core";
import TelemetryReporter from "vscode-extension-telemetry";

import { SettingsProvider } from "./common/settingsProvider";
import {
    encodeMessageForChannel,
    IOpenEditorData,
    ITelemetryMeasures,
    ITelemetryProps,
    TelemetryData,
    WebSocketEvent,
} from "./common/webviewEvents";
import { PanelSocket } from "./panelSocket";
import {
    applyPathMapping,
    fetchUri,
    IRuntimeConfig,
    SETTINGS_PREF_DEFAULTS,
    SETTINGS_PREF_NAME,
    SETTINGS_STORE_NAME,
    SETTINGS_WEBVIEW_NAME,
} from "./utils";

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
    private consoleOutput: vscode.OutputChannel;

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
        this.consoleOutput = vscode.window.createOutputChannel("DevTools Console");
        this.consoleOutput.appendLine('// This Output window displays the DevTools extension\'s console output in text format.');
        this.consoleOutput.appendLine('// Note that this feature is only unidirectional and cannot communicate back to the DevTools.');
        this.consoleOutput.appendLine('');

        // Hook up the socket events
        this.panelSocket = new PanelSocket(this.targetUrl, (e, msg) => this.postToDevTools(e, msg));
        this.panelSocket.on("ready", () => this.onSocketReady());
        this.panelSocket.on("websocket", () => this.onSocketMessage());
        this.panelSocket.on("telemetry", (msg) => this.onSocketTelemetry(msg));
        this.panelSocket.on("getState", (msg) => this.onSocketGetState(msg));
        this.panelSocket.on("getVscodeSettings", (msg) => this.onSocketGetVscodeSettings(msg));
        this.panelSocket.on("setState", (msg) => this.onSocketSetState(msg));
        this.panelSocket.on("getUrl", (msg) => this.onSocketGetUrl(msg));
        this.panelSocket.on("openInEditor", (msg) => this.onSocketOpenInEditor(msg));
        this.panelSocket.on("close", () => this.onSocketClose());
        this.panelSocket.on("copyText", (msg) => this.onSocketCopyText(msg));
        this.panelSocket.on("focusEditor", (msg) => this.onSocketFocusEditor(msg));
        this.panelSocket.on("focusEditorGroup", (msg) => this.onSocketFocusEditorGroup(msg));
        this.panelSocket.on("consoleOutput", (msg) => this.onSocketConsoleOutput(msg));

        // Handle closing
        this.panel.onDidDispose(() => {
            this.dispose();
        }, this, this.disposables);

        // Handle view change
        this.panel.onDidChangeViewState((e) => {
            if (this.panel.visible) {
                this.update();
            }
        }, this, this.disposables);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage((message) => {
            this.panelSocket.onMessageFromWebview(message);
        }, this, this.disposables);
    }

    public dispose() {
        DevToolsPanel.instance = undefined;

        this.panel.dispose();
        this.panelSocket.dispose();

        this.telemetryReporter.sendTelemetryEvent("websocket/dispose");

        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }

    private postToDevTools(e: WebSocketEvent, message?: string) {
        switch (e) {
            case "open":
            case "close":
            case "error":
                this.telemetryReporter.sendTelemetryEvent(`websocket/${e}`);
                break;
        }
        encodeMessageForChannel((msg) => this.panel.webview.postMessage(msg), "websocket", { event: e, message });
    }

    private onSocketReady() {
        // Report success telemetry
        this.telemetryReporter.sendTelemetryEvent(
            this.panelSocket.isConnectedToTarget ? "websocket/reconnect" : "websocket/connect");
    }

    private onSocketMessage() {
        // TODO: Handle message
    }

    private onSocketClose() {
        this.dispose();
    }

    private onSocketCopyText(message: string) {
        const { clipboardData } = JSON.parse(message) as { clipboardData: string };
        vscode.env.clipboard.writeText(clipboardData);
    }

    private onSocketFocusEditor(message: string) {
        const { next } = JSON.parse(message) as { next: boolean };
        if (next) {
            vscode.commands.executeCommand("workbench.action.nextEditor");
        } else {
            vscode.commands.executeCommand("workbench.action.previousEditor");
        }
    }

    private onSocketFocusEditorGroup(message: string) {
        const { next } = JSON.parse(message) as { next: boolean };
        if (next) {
            vscode.commands.executeCommand("workbench.action.focusNextGroup");
        } else {
            vscode.commands.executeCommand("workbench.action.focusPreviousGroup");
        }
    }

    private onSocketConsoleOutput(message: string) {
        const { consoleMessage } = JSON.parse(message) as { consoleMessage: string };
        this.consoleOutput.appendLine(consoleMessage);
    }

    private onSocketTelemetry(message: string) {
        const telemetry: TelemetryData = JSON.parse(message);

        // Fire telemetry
        switch (telemetry.event) {
            case "performance": {
                const measures: ITelemetryMeasures = {};
                measures[`${telemetry.name}.duration`] = telemetry.data;
                this.telemetryReporter.sendTelemetryEvent(
                    `devtools/${telemetry.name}`,
                    undefined,
                    measures);
                break;
            }

            case "enumerated": {
                const properties: ITelemetryProps = {};
                properties[`${telemetry.name}.actionCode`] = telemetry.data.toString();
                this.telemetryReporter.sendTelemetryEvent(
                    `devtools/${telemetry.name}`,
                    properties);
                break;
            }

            case "error": {
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
        const preferences: any = this.context.workspaceState.get(SETTINGS_PREF_NAME) || SETTINGS_PREF_DEFAULTS;
        encodeMessageForChannel((msg) => this.panel.webview.postMessage(msg), "getState", { id, preferences });
    }

    private onSocketGetVscodeSettings(message: string) {
        const { id } = JSON.parse(message) as { id: number };
        encodeMessageForChannel((msg) => this.panel.webview.postMessage(msg), "getVscodeSettings", {
            enableNetwork: SettingsProvider.instance.isNetworkEnabled(),
            themeString: SettingsProvider.instance.getThemeSettings(),
            id });
    }

    private onSocketSetState(message: string) {
        // Parse the preference from the message and store it
        const { name, value } = JSON.parse(message) as { name: string, value: string };
        const allPref: any = this.context.workspaceState.get(SETTINGS_PREF_NAME) || {};
        allPref[name] = value;
        this.context.workspaceState.update(SETTINGS_PREF_NAME, allPref);
    }

    private async onSocketGetUrl(message: string) {
        // Parse the request from the message and store it
        const request = JSON.parse(message) as { id: number, url: string };

        let content = "";
        try {
            content = await fetchUri(request.url);
        } catch {
            // Response will not have content
        }

        encodeMessageForChannel((msg) => this.panel.webview.postMessage(msg), "getUrl", { id: request.id, content });
    }

    private async onSocketOpenInEditor(message: string) {
        // Report usage telemetry
        this.telemetryReporter.sendTelemetryEvent("extension/openInEditor", {
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
        transformer.launch({ pathMapping: this.config.pathMapping });
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
            vscode.window.showTextDocument(
                doc,
                {
                    preserveFocus: true,
                    selection: new vscode.Range(line, column, line, column),
                    viewColumn: vscode.ViewColumn.One,
                });
        } else {
            vscode.window.showErrorMessage(`Could not open document. No workspace mapping was found for '${url}'.`);
        }
    }

    private update() {
        this.panel.webview.html = this.getHtmlForWebview();
    }

    private getHtmlForWebview() {
        const htmlPath = vscode.Uri.file(path.join(this.extensionPath, "out/tools/front_end", "inspector.html"));
        const htmlUri = this.panel.webview.asWebviewUri(htmlPath);

        const scriptPath = vscode.Uri.file(path.join(this.extensionPath, "out", "host", "messaging.bundle.js"));
        const scriptUri = this.panel.webview.asWebviewUri(scriptPath);

        const stylesPath = vscode.Uri.file(path.join(this.extensionPath, "out", "common", "styles.css"));
        const stylesUri = this.panel.webview.asWebviewUri(stylesPath);

        return `
            <!doctype html>
            <html>
            <head>
                <meta http-equiv="content-type" content="text/html; charset=utf-8">
                <meta http-equiv="Content-Security-Policy"
                    content="default-src 'none';
                    frame-src ${this.panel.webview.cspSource};
                    script-src ${this.panel.webview.cspSource};
                    style-src ${this.panel.webview.cspSource};
                    ">
                <link href="${stylesUri}" rel="stylesheet"/>
                <script src="${scriptUri}"></script>
            </head>
            <body>
                <iframe id="host" frameBorder="0" src="${htmlUri}?ws=trueD&experiments=true&edgeThemes=true"></iframe>
            </body>
            </html>
            `;
    }

    public static createOrShow(
        context: vscode.ExtensionContext,
        telemetryReporter: Readonly<TelemetryReporter>,
        targetUrl: string,
        config: IRuntimeConfig) {
        const column = vscode.ViewColumn.Beside;

        if (DevToolsPanel.instance) {
            DevToolsPanel.instance.panel.reveal(column);
        } else {
            const panel = vscode.window.createWebviewPanel(SETTINGS_STORE_NAME, SETTINGS_WEBVIEW_NAME, column, {
                enableCommandUris: true,
                enableScripts: true,
                retainContextWhenHidden: true,
            });

            DevToolsPanel.instance = new DevToolsPanel(panel, context, telemetryReporter, targetUrl, config);
        }
    }
}
