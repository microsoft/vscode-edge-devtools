// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { encodeMessageForChannel, FrameToolsEvent, parseMessageFromChannel } from '../common/webviewEvents';
import { ToolsHost } from './toolsHost';

declare const acquireVsCodeApi: () => {postMessage(message: unknown, args?: any|undefined): void};
export const vscode = acquireVsCodeApi();

export interface IDevToolsWindow extends Window {
    InspectorFrontendHost: ToolsHost;
}

export function initialize(dtWindow: IDevToolsWindow): void {
    if (!dtWindow) {
        return;
    }

    // Setup the global objects that must exist at load time
    dtWindow.InspectorFrontendHost = new ToolsHost();
    encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'ready');


    let toolsWindow: Window | null;

    window.addEventListener('DOMContentLoaded', () => {
        toolsWindow = (document.getElementById('host') as HTMLIFrameElement).contentWindow;
        if (toolsWindow) {
            dtWindow.InspectorFrontendHost.setToolsWindow(toolsWindow);
        }
    });


    const messageCallback =
        dtWindow.InspectorFrontendHost.onMessageFromChannel.bind(dtWindow.InspectorFrontendHost);

    // Both the DevTools iframe and the extension will post messages to the webview
    // Listen for messages and forward to correct recipient based on origin
    dtWindow.addEventListener('message', messageEvent => {
        const fromExtension = messageEvent.origin.startsWith('vscode-webview://');
        console.log(messageEvent.origin)
        if (!fromExtension) {
            // Send message from DevTools to Extension
            dtWindow.InspectorFrontendHost.onMessageFromFrame(messageEvent.data.method as FrameToolsEvent, messageEvent.data.args as any[]);
        } else if (toolsWindow) {
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
