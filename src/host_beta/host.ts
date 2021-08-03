// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { FrameToolsEvent, parseMessageFromChannel } from '../common/webviewEvents';
import { ToolsHost } from './toolsHost';
import { IRuntimeResourceLoader } from './toolsResourceLoader';
import { ToolsWebSocket } from './toolsWebSocket';

declare const acquireVsCodeApi: () => {postMessage(message: unknown, args?: any|undefined): void};
export const vscode = acquireVsCodeApi();

export interface IDevToolsWindow extends Window {
    InspectorFrontendHost: ToolsHost;
    WebSocket: typeof ToolsWebSocket;
    Root: IRoot;
    importScriptPathPrefix: string;
}

export interface IRoot {
    Runtime: IRuntimeResourceLoader;
}

export function initialize(dtWindow: IDevToolsWindow): void {
    if (!dtWindow) {
        return;
    }

    // Setup the global objects that must exist at load time
    dtWindow.InspectorFrontendHost = new ToolsHost();
    dtWindow.WebSocket = ToolsWebSocket;

    let toolsWindow: Window | null;

    window.addEventListener('DOMContentLoaded', () => {
        toolsWindow = (document.getElementById('host') as HTMLIFrameElement).contentWindow;
    });

    const messageCallback =
        dtWindow.InspectorFrontendHost.onMessageFromChannel.bind(dtWindow.InspectorFrontendHost);
    // Listen for messages from the extension and forward to the tools
    dtWindow.addEventListener('message', messageEvent => {
        const fromDevtools = messageEvent.origin === 'http://localhost:3000';
        console.log(messageEvent.origin)
        if (fromDevtools) {
            // Call the right handler to send message to extension
            dtWindow.InspectorFrontendHost.onMessageFromFrame(messageEvent.data.method as FrameToolsEvent, messageEvent.data.args as any[]);
        } else if (toolsWindow) {
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
