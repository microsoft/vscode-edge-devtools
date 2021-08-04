// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { FrameToolsEvent, parseMessageFromChannel } from '../common/webviewEvents';
import { MessageRouter } from './messageRouter';

export class Host {
    private messageRouter: MessageRouter = new MessageRouter();
    private toolsWindow: Window | null | undefined;

    constructor(dtWindow: Window) {
        if (!dtWindow) {
            return;
        }

        // Inform the extension we are ready to receive messages
        this.messageRouter.sendReady();

        // let toolsWindow: Window | null;
        dtWindow.addEventListener('DOMContentLoaded', () => {
            this.toolsWindow = (document.getElementById('host') as HTMLIFrameElement).contentWindow;
            if (this.toolsWindow) {
                this.messageRouter.setToolsWindow(this.toolsWindow);
            }
        });


        const messageCallback =
            this.messageRouter.onMessageFromChannel.bind(this.messageRouter);

        // Both the DevTools iframe and the extension will post messages to the webview
        // Listen for messages and forward to correct recipient based on origin
        dtWindow.addEventListener('message', messageEvent => {
            const fromExtension = messageEvent.origin.startsWith('vscode-webview://');
            if (!fromExtension) {
                // Send message from DevTools to Extension
                this.messageRouter.onMessageFromFrame(messageEvent.data.method as FrameToolsEvent, messageEvent.data.args as any[]);
            } else if (this.toolsWindow) {
                // Send message from Extension to DevTools
                parseMessageFromChannel(
                    messageEvent.data,
                    messageCallback,
                );
                messageEvent.preventDefault();
                messageEvent.stopImmediatePropagation();
                return false;
            }
        }, true);

    }
}