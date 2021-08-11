// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    encodeMessageForChannel,
    FrameToolsEvent,
    IOpenEditorData,
    parseMessageFromChannel,
    TelemetryData,
    WebSocketEvent,
    WebviewEvent,
} from '../common/webviewEvents';

declare const acquireVsCodeApi: () => {postMessage(message: unknown, args?: any|undefined): void};
const vscode = acquireVsCodeApi();

/**
 * Both the DevTools iframe and the Extension (which owns the ws connection to the browser) will
 * post messages to the Webview window for communication between the two. This class routes message
 * to the correct location based on the origin and type of message posted.
 *
 */
export class MessageRouter {
    private toolsFrameWindow: Window | undefined;

    constructor(webviewWindow: Window | null) {
        if (!webviewWindow) {
            return;
        }

        webviewWindow.addEventListener('DOMContentLoaded', () => {
            const tw = (document.getElementById('host') as HTMLIFrameElement).contentWindow;
            this.toolsFrameWindow = tw || undefined;
        });


        const extensionMessageCallback = this.onMessageFromChannel.bind(this);

        // Both the DevTools iframe and the extension will post messages to the webview
        // Listen for messages and forward to correct recipient based on origin
        webviewWindow.addEventListener('message', messageEvent => {
            const fromExtension = messageEvent.origin.startsWith('vscode-webview://');
            if (!fromExtension) {
                // Send message from DevTools to Extension
                this.onMessageFromFrame(messageEvent.data.method as FrameToolsEvent, messageEvent.data.args as any[]);
            } else if (this.toolsFrameWindow) {
                // Send message from Extension to DevTools
                parseMessageFromChannel(
                    messageEvent.data,
                    extensionMessageCallback,
                );
                messageEvent.preventDefault();
                messageEvent.stopImmediatePropagation();
                return false;
            }
        }, true);

        // Inform the extension we are ready to receive messages
        this.sendReady();
    }

    onMessageFromFrame(e: FrameToolsEvent, args: any[]): boolean {
        switch(e) {
            case 'openInEditor':
                const [url, line, column, ignoreTabChanges] = args;
                const request: IOpenEditorData = { column, line, url, ignoreTabChanges };
                encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'openInEditor', request);
                return true;
            case 'openInNewTab':
                const uri = args[0];
                encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'openUrl', { url: uri });
                return true;
            case 'recordEnumeratedHistogram':
                const [actionName, actionCode] = args;
                this.sendTelemetry({
                    data: actionCode,
                    event: 'enumerated',
                    name: actionName,
                });
                return true;
            case 'recordPerformanceHistogram':
                const [histogramName, duration] = args;
                this.sendTelemetry({
                    data: duration,
                    event: 'performance',
                    name: histogramName,
                });
                return true;
            case 'reportError':
                const [type, message, stack, filename, sourceUrl, lineno, colno] = args;
                const data = { message, stack, filename, sourceUrl, lineno, colno };
                this.sendTelemetry({
                    data,
                    event: 'error',
                    name: type,
                });
                return true;
            case 'sendMessageToBackend':
                const [cdpMessage] = args;
                encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'websocket', { message: cdpMessage });
                return true;
            default:
                // TODO: handle other types of messages from devtools
                return false;
        }
    }

    onMessageFromChannel(e: WebviewEvent, args: string): boolean {
        if (e !== 'websocket') {
            return false;
        }
        const { event, message } = JSON.parse(args) as {event: WebSocketEvent, message: string};
        this.fireWebSocketCallback(event, message);
        return true;
    }

    private sendReady() {
        // Inform the extension we are ready to receive messages
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'ready');
    }

    private sendTelemetry(telemetry: TelemetryData) {
        // Forward the data to the extension
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'telemetry', telemetry);
    }

    private fireWebSocketCallback(e: WebSocketEvent, message: string) {
        // Send response message to DevTools
        if (this.toolsFrameWindow && e === 'message') {
            this.toolsFrameWindow.postMessage({method: 'dispatchMessage', args: [message]}, '*');
        }
    }
}
