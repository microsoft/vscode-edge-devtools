// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WebSocketEvent } from './common/webviewEvents';
import { PanelSocket } from './panelSocket';

export type IDevToolsPostMessageCallback = (e: WebSocketEvent, message?: string) => void;

export class JsDebugProxyPanelSocket extends PanelSocket {
    /**
     * @override
     */
    protected onOpen(): void {
        if (this.socket) {
            this.registerForJsDebugSharedCDPEvents();
        }
        super.onOpen();
    }

    private registerForJsDebugSharedCDPEvents() {
        // Register for CDP events from jsdebug:
        // https://github.com/microsoft/vscode-js-debug/blob/main/CDP_SHARE.md
        const registrationMessage = {
            method: 'JsDebug.subscribe',
            params: {
                events: [
                'Runtime.*',
                'DOM.*',
                'CSS.*',
                'DOMDebugger.*',
                'Network.*',
                'Page.*',
                'Target.*',
                'Overlay.*',
                ],
            },
        };
        if (this.socket) {
            this.socket.send(JSON.stringify(registrationMessage));
        }
    }
}
