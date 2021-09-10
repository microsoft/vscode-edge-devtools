// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as path from 'path';
import * as vscode from 'vscode';
import { encodeMessageForChannel, WebSocketEvent } from './common/webviewEvents';
import { PanelSocket } from './panelSocket';
import {
    SETTINGS_STORE_NAME,
    SETTINGS_SCREENCAST_WEBVIEW_NAME,
} from './utils';

export class ScreencastPanel {
    private static instance: ScreencastPanel | undefined;
    private readonly context: vscode.ExtensionContext;
    private readonly extensionPath: string;
    private readonly panel: vscode.WebviewPanel;
    private targetUrl: string
    private panelSocket: PanelSocket;

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        targetUrl: string) {
        this.panel = panel;
        this.context = context;
        this.targetUrl = targetUrl
        this.extensionPath = this.context.extensionPath;

        this.panelSocket = new PanelSocket(this.targetUrl, (e, msg) => this.postToWebview(e, msg));
        this.panelSocket.on('websocket', () => this.onSocketMessage());
        this.panelSocket.on('close', () => this.onSocketClose());

        // Handle closing
        this.panel.onDidDispose(() => {
            this.dispose();
            this.panelSocket.dispose();
        }, this);

        // Handle view change
        this.panel.onDidChangeViewState(_e => {
            if (this.panel.visible) {
                this.update();
            }
        }, this);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(message => {
            this.panelSocket.onMessageFromWebview(message);
        }, this);
    }

    dispose(): void {
        ScreencastPanel.instance = undefined;

        this.panel.dispose();
        this.panelSocket.dispose();
    }

    private onSocketMessage() {
        // TODO: Handle message
    }

    private onSocketClose() {
        this.dispose();
    }

    private update() {
        // Check to see which version of devtools we need to launch
        this.panel.webview.html = this.getHtmlForWebview();
    }

    private postToWebview(e: WebSocketEvent, message?: string) {
        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'websocket', { event: e, message });
    }

    private getHtmlForWebview() {
        const inspectorPath = vscode.Uri.file(path.join(this.extensionPath, 'out/screencast', 'screencast.bundle.js'));
        const inspectorUri = this.panel.webview.asWebviewUri(inspectorPath);
		const codiconsUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

        // the added fields for "Content-Security-Policy" allow resource loading for other file types
        return `
            <!doctype html>
            <html>
            <head>
                <meta http-equiv="content-type" content="text/html; charset=utf-8">
                <meta http-equiv="Content-Security-Policy"
                    content="default-src;
                    font-src ${this.panel.webview.cspSource};
                    img-src 'self' data: ${this.panel.webview.cspSource};
                    style-src 'self' 'unsafe-inline' ${this.panel.webview.cspSource};
                    script-src 'self' 'unsafe-eval' ${this.panel.webview.cspSource};
                    frame-src 'self' ${this.panel.webview.cspSource};
                    connect-src 'self' data: ${this.panel.webview.cspSource};
                ">
                <meta name="referrer" content="no-referrer">
				<link href="${codiconsUri}" rel="stylesheet" />
                <style>
                    html, body {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                    }
                    #main {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        width: 100%;
                        height: 100%;
                    }
                    #toolbar {
                        display: flex;
                        width: 100%;
                    }
                    #toolbar > button, #toolbar > select {
                        background-color: var(--vscode-editor-background);
                        border: none;
                        color: var(--vscode-editor-foreground);
                    }
                    #url {
                        flex: 1;
                        background-color: var(--vscode-input-background);
                        border-style: solid;
                        border-width: 1px;
                        color: var(--vscode-input-foreground);
                    }
                    #canvas-wrapper {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                    }
                    #canvas-wrapper.fill {
                        display: block;
                    }
                    #canvas-wrapper.fill #canvas {
                        max-width: none;
                        max-height: none;
                    }
                </style>
                <script type="module" src="${inspectorUri}"></script>
            </head>
            <body>
                <div id="main">
                    <div id="toolbar">
                        <button id="back">
                            <i class="codicon codicon-arrow-left"></i>
                        </button>
                        <button id="forward">
                            <i class="codicon codicon-arrow-right"></i>
                        </button>
                        <button id="reload">
                            <i class="codicon codicon-refresh"></i>
                        </button>
                        <input id="url" />
                        <select id="device">
                            <option selected value="fill">Fill</option>
                            <option value="phone">Phone</option>
                        </select>
                        <button id="rotate">
                            <i class="codicon codicon-editor-layout"></i>
                        </button>
                        <label>
                            <input id="mobile" type="checkbox"/> Mobile
                        </label>
                    </div>
                    <div id="canvas-wrapper" class="fill">
                        <img id="canvas" draggable="false" />
                    </div>
                </div>
            </body>
            </html>
            `;
    }

    static createOrShow(context: vscode.ExtensionContext, targetUrl: string): void {
        const column = vscode.ViewColumn.Beside;

        if (ScreencastPanel.instance) {
            ScreencastPanel.instance.dispose();
        }
        const panel = vscode.window.createWebviewPanel(SETTINGS_STORE_NAME, SETTINGS_SCREENCAST_WEBVIEW_NAME, column, {
            enableCommandUris: true,
            enableScripts: true,
            retainContextWhenHidden: true,
        });

        ScreencastPanel.instance = new ScreencastPanel(panel, context, targetUrl);
    }
}
