// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { encodeMessageForChannel, parseMessageFromChannel } from "../common/webviewEvents";

declare const acquireVsCodeApi: () => {postMessage(message: unknown, args?: any|undefined): void};
export const vscode = acquireVsCodeApi();

interface CdpMessage {
    id: number;
    method: string;
    params?: any;
    result?: any;
}

export type CdpEventCallback = (params: any) => void;
export type CdpMethodCallback = (result: any) => void;

export class ScreencastCDPConnection {
    private nextId: number = 0;
    private eventCallbackMap: Map<string, CdpEventCallback[]> = new Map();
    private methodCallbackMap: Map<number, CdpMethodCallback> = new Map();

    constructor() {
        // Handle CDP messages/events routed from the extension through post message
        window.addEventListener('message', e => {
            parseMessageFromChannel(e.data, (eventName, args) => {
                if (eventName === 'websocket') {
                    const { message } = JSON.parse(args) as { message: string };
                    if (message) {
                        // Handle event responses
                        const messageObj = JSON.parse(message) as CdpMessage;
                        for (const callback of this.eventCallbackMap.get(messageObj.method) || []) {
                            callback(messageObj.params);
                        }
                        // Handle method responses
                        const methodCallback = this.methodCallbackMap.get(messageObj.id);
                        if (methodCallback) {
                            methodCallback(messageObj.result);
                            this.methodCallbackMap.delete(messageObj.id);
                        }
                    }
                    return true;
                }
                if (eventName === 'toggleInspect') {
                    const { enabled } = JSON.parse(args) as { enabled: string };
                    for (const callback of this.eventCallbackMap.get('DevTools.toggleInspect') || []) {
                        callback(enabled);
                    }
                }
                return false;
            });
        });
    }

    sendMessageToBackend(method: string, params: any, callback?: CdpMethodCallback): void {
        const id = this.nextId++;
        const cdpMessage: CdpMessage = {
            id: id,
            method,
            params,
        };
        if (callback) {
            this.methodCallbackMap.set(id, callback);
        }
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'websocket', { message: JSON.stringify(cdpMessage) });
    }

    registerForEvent(method: string, callback: CdpEventCallback): void {
        if (this.eventCallbackMap.has(method)) {
            this.eventCallbackMap.get(method)?.push(callback);
        }
        this.eventCallbackMap.set(method, [callback]);
    }
}
