// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from "path";
import * as vscode from "vscode";
import { SETTINGS_STORE_NAME, SETTINGS_WEBVIEW_NAME } from "./utils";

export class DevToolsPanel {
    private static instance: DevToolsPanel | undefined;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly extensionPath: string;
    private readonly panel: vscode.WebviewPanel;

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, targetUrl: string) {
        this.panel = panel;
        this.extensionPath = context.extensionPath;

        // TODO: Create a websocket connection to the target url

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
    }

    public dispose() {
        DevToolsPanel.instance = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) {
                d.dispose();
            }
        }
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

    public static createOrShow(context: vscode.ExtensionContext, targetUrl: string) {
        const column = vscode.ViewColumn.Two;

        if (DevToolsPanel.instance) {
            DevToolsPanel.instance.panel.reveal(column);
        } else {
            const panel = vscode.window.createWebviewPanel(SETTINGS_STORE_NAME, SETTINGS_WEBVIEW_NAME, column, {
                enableCommandUris: true,
                enableScripts: true,
                retainContextWhenHidden: true,
            });

            DevToolsPanel.instance = new DevToolsPanel(panel, context, targetUrl);
        }
    }
}
