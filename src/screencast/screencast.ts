// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { parseMessageFromChannel, WebSocketEvent, encodeMessageForChannel } from '../common/webviewEvents';

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


    const emulateTest = document.createElement('button');
    emulateTest.addEventListener('click', () => {
        sendMessageToBackend(
        `{
            "id": 123456,
            "method": "Emulation.setDeviceMetricsOverride",
            "params": {
                "width": 400,
                "height": 700,
                "deviceScaleFactor": 0,
                "mobile": false
            }
        }`)
    })
    emulateTest.textContent = "Update Emulation";
    document.body.appendChild(emulateTest);
}



function sendMessageToBackend(message: string): void {
    encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'websocket', { message });
}
