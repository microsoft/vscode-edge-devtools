// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { encodeMessageForChannel, WebSocketEvent } from '../common/webviewEvents';

interface IMessageEvent {
    data: string;
}
declare const acquireVsCodeApi: () => {postMessage(message: unknown, args: any): void};
export const vscode = acquireVsCodeApi();

/**
 * Class used to override the real WebSocket constructor in the webview.
 * This is required as a VS Code webview cannot create a WebSocket connection,
 * so instead we replace it and forward all messages to/from the extension
 * which is able to create the real websocket connection to the target page.
 */
export class ToolsWebSocket {
    private static devtoolsWebSocket: ToolsWebSocket;

    onopen: (() => void) | undefined;
    onclose: (() => void) | undefined;
    onerror: (() => void) | undefined;
    onmessage: ((e: IMessageEvent) => void) | undefined;

    constructor(_url: string) {
        ToolsWebSocket.devtoolsWebSocket = this;
        // Inform the extension that we are ready to receive messages
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'ready');
    }

    send(message: string): void {
        // Forward the message to the extension
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'websocket', { message });
    }

    onMessageFromChannel(e: WebSocketEvent, message?: string): void {
        switch (e) {
            case 'open':
                if (this.onopen) {
                    this.onopen();
                }
                break;

            case 'close':
                if (this.onclose) {
                    this.onclose();
                }
                break;

            case 'error':
                if (this.onerror) {
                    this.onerror();
                }
                break;

            default:
                // Messages from the target page's websocket should just be forwarded to the tools
                if (this.onmessage && message) {
                    this.onmessage({ data: message });
                }
                break;
        }
    }

    static get instance(): ToolsWebSocket {
        return ToolsWebSocket.devtoolsWebSocket;
    }
}
