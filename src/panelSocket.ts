// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EventEmitter } from "events";
import WebSocket from "ws";
import { parseMessageFromChannel, WebviewEvents } from "./common/webviewEvents";

export class PanelSocket extends EventEmitter {
    private readonly targetUrl: string;
    private readonly postMessageToDevTools: (message: string) => void;
    private socket: WebSocket | undefined;
    private isConnected: boolean = false;
    private messages: string[] = [];

    constructor(targetUrl: string, postMessageToDevTools: (message: string) => void) {
        super();
        this.targetUrl = targetUrl;
        this.postMessageToDevTools = postMessageToDevTools;
    }

    public onMessageFromWebview(message: string) {
        parseMessageFromChannel(message, (name, args) => this.onMessageParsed(name, args));
    }

    public dispose() {
        if (this.socket) {
            this.socket.onopen = undefined as any;
            this.socket.onmessage = undefined as any;
            this.socket.onerror = undefined as any;
            this.socket.onclose = undefined as any;
            this.socket.close();
            this.socket = undefined;
        }
    }

    private onMessageParsed(event: string | symbol, ...args: any[]): boolean {
        if (event === WebviewEvents.ready) {
            this.dispose();

            // First message, so connect a real websocket to the target
            this.connectToTarget();
        }

        if (event === WebviewEvents.websocket) {
            if (!this.socket) {
                // Reconnect if we no longer have a websocket
                this.connectToTarget();
            }

            const data = JSON.parse(args[0]);
            if (data && data[0] === "{") {
                if (!this.isConnected) {
                    // DevTools are sending a message before the real websocket has finished opening so cache it
                    this.messages.push(data);
                } else {
                    // Websocket ready so send the message directly
                    this.socket!.send(data);
                }
            }
        }

        return this.emit(event, args);
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
            this.postMessageToDevTools(message.data as string);
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
        }
        this.isConnected = false;
    }
}
