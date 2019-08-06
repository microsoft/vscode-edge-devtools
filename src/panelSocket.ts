// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EventEmitter } from "events";
import WebSocket from "ws";
import { parseMessageFromChannel, WebSocketEvent, WebviewEvent } from "./common/webviewEvents";

export type IDevToolsPostMessageCallback = (e: WebSocketEvent, message?: string) => void;

export class PanelSocket extends EventEmitter {
    private readonly targetUrl: string;
    private readonly postMessageToDevTools: IDevToolsPostMessageCallback;
    private socket: WebSocket | undefined;
    private isConnected: boolean = false;
    private messages: string[] = [];

    constructor(targetUrl: string, postMessageToDevTools: IDevToolsPostMessageCallback) {
        super();
        this.targetUrl = targetUrl;
        this.postMessageToDevTools = postMessageToDevTools;
    }

    public get isConnectedToTarget() {
        return this.isConnected;
    }

    public onMessageFromWebview(message: string) {
        parseMessageFromChannel(message, (eventName, args) => this.onMessageParsed(eventName, args));
    }

    public dispose() {
        if (this.socket) {
            this.isConnected = false;
            this.socket.close();
            this.socket = undefined;
        }
    }

    private onMessageParsed(eventName: WebviewEvent, args: string): boolean {
        if (eventName === "ready") {
            this.dispose();

            // First message, so connect a real websocket to the target
            this.connectToTarget();
        }

        if (eventName === "websocket") {
            if (!this.socket) {
                // Reconnect if we no longer have a websocket
                this.connectToTarget();
            }

            const { message } = JSON.parse(args);
            if (message && message[0] === "{") {
                if (!this.isConnected) {
                    // DevTools are sending a message before the real websocket has finished opening so cache it
                    this.messages.push(message);
                } else {
                    // Websocket ready so send the message directly
                    this.socket!.send(message);
                }
            }
        }

        return this.emit(eventName, args);
    }

    private connectToTarget() {
        // Create the websocket
        this.socket = new WebSocket(this.targetUrl);
        this.socket.onopen = () => this.onOpen();
        this.socket.onmessage = (ev) => this.onMessage(ev);
        this.socket.onerror = () => this.onError();
        this.socket.onclose = () => this.onClose();
    }

    private onOpen() {
        this.isConnected = true;

        this.postMessageToDevTools("open");

        if (this.socket) {
            // Forward any cached messages onto the real websocket
            for (const message of this.messages) {
                this.socket.send(message);
            }
            this.messages = [];
        }
    }

    private onMessage(message: { data: WebSocket.Data }) {
        if (this.isConnected) {
            // Forward the message onto the devtools
            this.postMessageToDevTools("message", message.data.toString());
        }
    }

    private onError() {
        if (this.isConnected) {
            // Tell the devtools that there was a connection error
            this.postMessageToDevTools("error");
        }
    }

    private onClose() {
        if (this.isConnected) {
            // Tell the devtools that the real websocket was closed
            this.postMessageToDevTools("close");
            this.emit("close");
        }

        this.isConnected = false;
    }
}
