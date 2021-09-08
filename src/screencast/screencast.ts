// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { parseMessageFromChannel, WebSocketEvent } from '../common/webviewEvents';

declare const acquireVsCodeApi: () => {postMessage(message: unknown, args?: any|undefined): void};
export const vscode = acquireVsCodeApi();

export function initialize(): void {

    window.addEventListener('message', e => {
        parseMessageFromChannel(e.data, (eventName, args) => {
            if (eventName === 'websocket') {
                const { event, message } = JSON.parse(args) as {event: WebSocketEvent, message: string};
                // TODO: handle CDP message
                console.log(event, message);
                return true;
            }
            return false;
        });
    });
}
