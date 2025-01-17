// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as path from 'path';
import * as vscode from 'vscode';
import {
    encodeMessageForChannel,
    WebSocketEvent,
    ITelemetryProps,
    ITelemetryMeasures,
    TelemetryData,
} from './common/webviewEvents';
import { JsDebugProxyPanelSocket } from './JsDebugProxyPanelSocket';
import { PanelSocket } from './panelSocket';
import { ScreencastView } from './screencast/view';
import {
    SETTINGS_STORE_NAME,
    SETTINGS_SCREENCAST_WEBVIEW_NAME,
    SETTINGS_VIEW_NAME,
} from './utils';
import TelemetryReporter from '@vscode/extension-telemetry';
import { DevToolsPanel } from './devtoolsPanel';
import { providedHeadlessDebugConfig } from './launchConfigManager';

export class ScreencastPanel {
    private readonly context: vscode.ExtensionContext;
    private readonly extensionPath: string;
    private readonly panel: vscode.WebviewPanel;
    private readonly telemetryReporter: TelemetryReporter;
    private isJsDebugProxiedCDPConnection = false;
    private targetUrl: string;
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
        this.isJsDebugProxiedCDPConnection = isJsDebugProxiedCDPConnection;

        if (isJsDebugProxiedCDPConnection) {
            this.panelSocket = new JsDebugProxyPanelSocket(this.targetUrl, (e, msg) => this.postToWebview(e, msg));
        } else {
            this.panelSocket = new PanelSocket(this.targetUrl, (e, msg) => this.postToWebview(e, msg));
        }
        this.panelSocket.on('close', () => this.onSocketClose());
        this.panelSocket.on('telemetry', (message: string) => this.onSocketTelemetry(message));
        this.panelSocket.on('writeToClipboard', (message: string) => this.onSaveToClipboard(message));
        this.panelSocket.on('readClipboard', () => this.onGetClipboardText());

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
            if (typeof message === 'string') {
                this.panelSocket.onMessageFromWebview(message);
            } else if ('type' in message && (message as {type:string}).type === 'open-devtools') {
                this.toggleDevTools();
            }
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

    private toggleDevTools() {
        const websocketUrl = this.targetUrl;
        if (DevToolsPanel.instance) {
            DevToolsPanel.instance.dispose();
        } else {
            void vscode.commands.executeCommand(`${SETTINGS_VIEW_NAME}.attach`, { websocketUrl }, this.isJsDebugProxiedCDPConnection);
        }
    }

    toggleInspect(enabled: boolean): void {
        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'toggleInspect', { enabled });
    }

    private onSocketClose() {
        this.dispose();
    }

    update(): void {
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
        const view = new ScreencastView(this.panel.webview.cspSource, cssPath, codiconsUri, inspectorUri, !!DevToolsPanel.instance);
        return view.render();
    }

    private onSocketTelemetry(message: string) {
        const telemetry: TelemetryData = JSON.parse(message) as TelemetryData;
        if (telemetry.event !== 'screencast') {
            return;
        }

        this.telemetryReporter.sendTelemetryEvent(
            `devtools/${telemetry.name}/${telemetry.data.event}`, {
                'value': telemetry.data.value as string,
            });
    }

    private onSaveToClipboard(message: string): void {
        const clipboardMessage = JSON.parse(message) as {data: {message: string}};
        void vscode.env.clipboard.writeText(clipboardMessage.data.message);
    }

    private onGetClipboardText(): void {
        void vscode.env.clipboard.readText().then(clipboardText => {
            encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'readClipboard', { clipboardText });
        });
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
            panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
            ScreencastPanel.instance = new ScreencastPanel(panel, context, telemetryReporter, targetUrl, isJsDebugProxiedCDPConnection);
        }
    }
}
