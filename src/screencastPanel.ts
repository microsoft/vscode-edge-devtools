// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as path from 'path';
import * as vscode from 'vscode';
import {
    encodeMessageForChannel,
    WebSocketEvent,
    ITelemetryProps,
    ITelemetryMeasures,
} from './common/webviewEvents';
import { JsDebugProxyPanelSocket } from './JsDebugProxyPanelSocket';
import { PanelSocket } from './panelSocket';
import { ScreencastView } from './screencast/view';
import {
    SETTINGS_STORE_NAME,
    SETTINGS_SCREENCAST_WEBVIEW_NAME,
} from './utils';
import TelemetryReporter from 'vscode-extension-telemetry';
import { DevToolsPanel } from './devtoolsPanel';
import { providedHeadlessDebugConfig } from './launchConfigManager';

export class ScreencastPanel {
    private readonly context: vscode.ExtensionContext;
    private readonly extensionPath: string;
    private readonly panel: vscode.WebviewPanel;
    private readonly telemetryReporter: TelemetryReporter;
    private targetUrl: string
    private panelSocket: PanelSocket;
    private screencastStartTime;
    static instance: ScreencastPanel | undefined;

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        telemetryReporter: TelemetryReporter,
        targetUrl: string,
        isJsDebugProxiedCDPConnection: boolean) {
        this.panel = panel;
        this.context = context;
        this.targetUrl = targetUrl;
        this.extensionPath = this.context.extensionPath;
        this.telemetryReporter = telemetryReporter;
        this.screencastStartTime = Date.now();

        if (isJsDebugProxiedCDPConnection) {
            this.panelSocket = new JsDebugProxyPanelSocket(this.targetUrl, (e, msg) => this.postToWebview(e, msg));
        } else {
            this.panelSocket = new PanelSocket(this.targetUrl, (e, msg) => this.postToWebview(e, msg));
        }
        this.panelSocket.on('close', () => this.onSocketClose());

        // Handle closing
        this.panel.onDidDispose(() => {
            this.dispose();
            this.panelSocket.dispose();
            this.recordEnumeratedHistogram('DevTools.ScreencastToggle', 0);
            const sessionDuration = Date.now() - this.screencastStartTime;
            this.recordPerformanceHistogram('DevTools.ScreencastDuration', sessionDuration);
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

        this.recordEnumeratedHistogram('DevTools.ScreencastToggle', 1);
    }

    private recordEnumeratedHistogram(actionName: string, actionCode: number) {
        const properties: ITelemetryProps = {};
        properties[`${actionName}.actionCode`] = actionCode.toString();
        this.telemetryReporter.sendTelemetryEvent(
            `devtools/${actionName}`,
            properties);
    }

    private recordPerformanceHistogram(actionName: string, duration: number) {
        const measures: ITelemetryMeasures = {};
        measures[`${actionName}.duration`] = duration;
        this.telemetryReporter.sendTelemetryEvent(
            `devtools/${actionName}`,
            undefined,
            measures);
    }

    dispose(): void {
        ScreencastPanel.instance = undefined;

        this.panel.dispose();
        this.panelSocket.dispose();
        if (!DevToolsPanel.instance && vscode.debug.activeDebugSession?.name.includes(providedHeadlessDebugConfig.name)) {
            void vscode.commands.executeCommand('workbench.action.debug.stop');
        }
    }

    toggleInspect(enabled: boolean): void {
        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'toggleInspect', { enabled });
    }

    private onSocketClose() {
        this.dispose();
    }

    private update() {
        this.panel.webview.html = this.getHtmlForWebview();
    }

    private postToWebview(e: WebSocketEvent, message?: string) {
        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'websocket', { event: e, message });
    }

    private getHtmlForWebview() {
        const inspectorPath = vscode.Uri.file(path.join(this.extensionPath, 'out/screencast', 'screencast.bundle.js'));
        const inspectorUri = this.panel.webview.asWebviewUri(inspectorPath);
		const codiconsUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
        const cssPath = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'out/screencast', 'view.css'));
        const view = new ScreencastView(this.panel.webview.cspSource, cssPath, codiconsUri, inspectorUri);
        return view.render();
    }

    static createOrShow(context: vscode.ExtensionContext,
        telemetryReporter: TelemetryReporter, targetUrl: string, isJsDebugProxiedCDPConnection = false): void {
        const column = vscode.ViewColumn.Beside;
        if (ScreencastPanel.instance) {
            ScreencastPanel.instance.dispose();
        } else {
            const panel = vscode.window.createWebviewPanel(SETTINGS_STORE_NAME, SETTINGS_SCREENCAST_WEBVIEW_NAME, column, {
                enableCommandUris: true,
                enableScripts: true,
                retainContextWhenHidden: true,
            });
            ScreencastPanel.instance = new ScreencastPanel(panel, context, telemetryReporter, targetUrl, isJsDebugProxiedCDPConnection);
        }
    }
}
