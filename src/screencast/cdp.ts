// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { encodeMessageForChannel, parseMessageFromChannel, WebSocketEvent } from "../common/webviewEvents";

declare const acquireVsCodeApi: () => {postMessage(message: unknown, args?: any|undefined): void};
export const vscode = acquireVsCodeApi();

export type CdpEventCallback = (params: any) => void;

export class ScreencastCDPConnection {
    private nextId: number = 0;
    private eventMap: Map<string, CdpEventCallback[]> = new Map();

    constructor() {
        window.addEventListener('message', e => {
            parseMessageFromChannel(e.data, (eventName, args) => {
                if (eventName === 'websocket') {
                    const { event, message } = JSON.parse(args) as {event: WebSocketEvent, message: string};
                    console.log(event, message);
                    // Handle event responses
                    const messageObj = JSON.parse(message);
                    for (const callback of this.eventMap.get(messageObj.method) || []) {
                        callback(messageObj.params)
                    }
                    // TODO: handle CDP method responses
                    return true;
                }
                return false;
            });
        });
    }

    sendMessageToBackend(method: string, params: any): void {
        const cdpMessage = {
            id: this.nextId++,
            method,
            params
        }
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'websocket', { message: JSON.stringify(cdpMessage) });
    }

    registerForEvent(method: string, callback: CdpEventCallback): void {
        if (this.eventMap.has(method)) {
            this.eventMap.get(method)?.push(callback);
        }
        this.eventMap.set(method, [callback]);
    }
}