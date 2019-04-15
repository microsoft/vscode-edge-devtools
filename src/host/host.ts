// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { parseMessageFromChannel } from "../common/webviewEvents";
import ToolsHost from "./toolsHost";
import ToolsResourceLoader, { IRuntimeResourceLoader } from "./toolsResourceLoader";
import ToolsWebSocket from "./toolsWebSocket";

export interface IDevToolsWindow extends Window {
    InspectorFrontendHost: ToolsHost;
    WebSocket: typeof ToolsWebSocket;
    Runtime: IRuntimeResourceLoader;
}

export default function initialize(devToolsFrame: HTMLIFrameElement) {
    devToolsFrame.onload = () => {
        if (!devToolsFrame.contentWindow) {
            return;
        }
        const dtWindow = devToolsFrame.contentWindow as IDevToolsWindow;

        // Override the resource loading, host apis, and websocket so that we can control them
        const resourceLoader = ToolsResourceLoader.overrideResourceLoading(dtWindow.Runtime);
        dtWindow.InspectorFrontendHost = new ToolsHost(resourceLoader);
        dtWindow.WebSocket = ToolsWebSocket;

        // Prevent the devtools from using localStorage since it doesn't exist in data uris
        Object.defineProperty(dtWindow, "localStorage", {
            get() { return undefined; },
            set() { /* NO-OP */ },
        });

        // Listen for messages from the extension and forward to the tools
        window.addEventListener("message", (e) => {
            parseMessageFromChannel(
                e.data,
                dtWindow.InspectorFrontendHost.onMessageFromChannel.bind(dtWindow.InspectorFrontendHost),
            );
        });
    };
}
