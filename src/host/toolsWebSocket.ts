// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { encodeMessageForChannel, WebSocketEvent } from "../common/webviewEvents";

interface IMessageEvent {
    data: string;
}

/**
 * Class used to override the real WebSocket constructor in the webview.
 * This is required as a VSCode webview cannot create a WebSocket connection,
 * so instead we replace it and forward all messages to/from the extension
 * which is able to create the real websocket connection to the target page.
 */
export default class ToolsWebSocket {
    private static devtoolsWebSocket: ToolsWebSocket;
    public static get instance() {
        return ToolsWebSocket.devtoolsWebSocket;
    }

    public onopen: (() => void) | undefined;
    public onclose: (() => void) | undefined;
    public onerror: (() => void) | undefined;
    public onmessage: ((e: IMessageEvent) => void) | undefined;

    constructor(url: string) {
        ToolsWebSocket.devtoolsWebSocket = this;
        // Inform the extension that we are ready to receive messages
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "ready");
    }

    public send(message: string) {
        // Forward the message to the extension
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "websocket", { message });
    }

    public onMessageFromChannel(e: WebSocketEvent, message?: string) {
        switch (e) {
            case "open":
                if (this.onopen) {
                    this.onopen();
                }
                break;

            case "close":
                if (this.onclose) {
                    this.onclose();
                }
                break;

            case "error":
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
}
