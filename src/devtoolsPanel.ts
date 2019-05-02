// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from "path";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import {
    encodeMessageForChannel,
    ITelemetryData,
    ITelemetryMeasures,
    ITelemetryProps,
    WebSocketEvent,
} from "./common/webviewEvents";
import { PanelSocket } from "./panelSocket";
import {
    fetchUri,
    SETTINGS_PREF_DEFAULTS,
    SETTINGS_PREF_NAME,
    SETTINGS_STORE_NAME,
    SETTINGS_WEBVIEW_NAME,
} from "./utils";

export class DevToolsPanel {
    private static instance: DevToolsPanel | undefined;
    private readonly context: vscode.ExtensionContext;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly extensionPath: string;
    private readonly panel: vscode.WebviewPanel;
    private readonly telemetryReporter: Readonly<TelemetryReporter>;
    private readonly targetUrl: string;
    private panelSocket: PanelSocket;

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        telemetryReporter: Readonly<TelemetryReporter>,
        targetUrl: string) {
        this.panel = panel;
        this.context = context;
        this.telemetryReporter = telemetryReporter;
        this.extensionPath = this.context.extensionPath;
        this.targetUrl = targetUrl;

        // Hook up the socket events
        this.panelSocket = new PanelSocket(this.targetUrl, (e, msg) => this.postToDevTools(e, msg));
        this.panelSocket.on("ready", () => this.onSocketReady());
        this.panelSocket.on("websocket", () => this.onSocketMessage());
        this.panelSocket.on("telemetry", (msg) => this.onSocketTelemetry(msg));
        this.panelSocket.on("getState", (msg) => this.onSocketGetState(msg));
        this.panelSocket.on("setState", (msg) => this.onSocketSetState(msg));
        this.panelSocket.on("getUrl", (msg) => this.onSocketGetUrl(msg));

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

    private onSocketTelemetry(message: string) {
        const telemetry: ITelemetryData = JSON.parse(message);

        // Fire telemetry
        switch (telemetry.event) {
            case "performance":
                const measures: ITelemetryMeasures = {};
                measures[`${telemetry.name}.duration`] = telemetry.data;
                this.telemetryReporter.sendTelemetryEvent(
                    `devtools/${telemetry.name}`,
                    undefined,
                    measures);
                break;

            case "enumerated":
                const properties: ITelemetryProps = {};
                properties[`${telemetry.name}.actionCode`] = telemetry.data.toString();
                this.telemetryReporter.sendTelemetryEvent(
                    `devtools/${telemetry.name}`,
                    properties);
                break;
        }
    }

    private onSocketGetState(message: string) {
        const { id } = JSON.parse(message) as { id: number };
        const preferences: any = this.context.workspaceState.get(SETTINGS_PREF_NAME) || SETTINGS_PREF_DEFAULTS;
        encodeMessageForChannel((msg) => this.panel.webview.postMessage(msg), "getState", { id, preferences });
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

    private update() {
        this.panel.webview.html = this.getHtmlForWebview();
    }

    private getHtmlForWebview() {
        const htmlPath = vscode.Uri.file(path.join(this.extensionPath, "out", "host", "devtools.html"));
        const htmlUri = htmlPath.with({ scheme: "vscode-resource" });

        const scriptPath = vscode.Uri.file(path.join(this.extensionPath, "out", "host", "messaging.bundle.js"));
        const scriptUri = scriptPath.with({ scheme: "vscode-resource" });

        return `
            <!doctype html>
            <html>
            <head>
                <meta http-equiv="content-type" content="text/html; charset=utf-8">
                <style>
                    html, body, iframe {
                        height: 100%;
                        width: 100%;
                        position: absolute;
                        padding: 0;
                        margin: 0;
                        overflow: hidden;
                    }
                </style>
                <script src="${scriptUri}"></script>
            </head>
            <iframe id="host" style="width: 100%; height: 100%" frameBorder="0" src="${htmlUri}"></iframe>
            </html>
            `;
    }

    public static createOrShow(
        context: vscode.ExtensionContext,
        telemetryReporter: Readonly<TelemetryReporter>,
        targetUrl: string) {
        const column = vscode.ViewColumn.Beside;

        if (DevToolsPanel.instance) {
            DevToolsPanel.instance.panel.reveal(column);
        } else {
            const panel = vscode.window.createWebviewPanel(SETTINGS_STORE_NAME, SETTINGS_WEBVIEW_NAME, column, {
                enableCommandUris: true,
                enableScripts: true,
                retainContextWhenHidden: true,
            });

            DevToolsPanel.instance = new DevToolsPanel(panel, context, telemetryReporter, targetUrl);
        }
    }
}
