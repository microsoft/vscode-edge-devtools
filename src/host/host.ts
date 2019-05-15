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

export function initialize(devToolsFrame: HTMLIFrameElement) {
    if (!devToolsFrame.contentWindow) {
        return;
    }

    const dtWindow = devToolsFrame.contentWindow as IDevToolsWindow;

    // Prevent the devtools from using localStorage since it doesn't exist in data uris
    Object.defineProperty(dtWindow, "localStorage", {
        get() { return undefined; },
        set() { /* NO-OP */ },
    });

    // Setup the global objects that must exist at load time
    dtWindow.InspectorFrontendHost = new ToolsHost();
    dtWindow.WebSocket = ToolsWebSocket;

    // Listen for messages from the extension and forward to the tools
    const messageCallback =
        dtWindow.InspectorFrontendHost.onMessageFromChannel.bind(dtWindow.InspectorFrontendHost);
    window.addEventListener("message", (e) => {
        parseMessageFromChannel(
            e.data,
            messageCallback,
        );
    });

    dtWindow.addEventListener("DOMContentLoaded", () => {
        // Override the resource loading once the window has loaded so that we can control it
        const resourceLoader = ToolsResourceLoader.overrideResourceLoading(dtWindow.Runtime);
        dtWindow.InspectorFrontendHost.setResourceLoader(resourceLoader);
    });
}
