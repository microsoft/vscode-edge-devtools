// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { parseMessageFromChannel } from "../common/webviewEvents";
import ToolsHost from "./toolsHost";
import ToolsResourceLoader, { IRuntimeResourceLoader } from "./toolsResourceLoader";
import ToolsWebSocket from "./toolsWebSocket";

export interface IDevToolsWindow extends Window {
    InspectorFrontendHost: ToolsHost;
    WebSocket: typeof ToolsWebSocket;
    Root: IRoot;
    importScriptPathPrefix: string;
}

export interface IRoot {
    Runtime: IRuntimeResourceLoader;
}

export function initialize(dtWindow: IDevToolsWindow) {
    if (!dtWindow) {
        return;
    }

    // Create a mock sessionStorage since it doesn't exist in data url but the devtools use it
    const sessionStorage = {};
    Object.defineProperty(dtWindow, "sessionStorage", {
        get() { return sessionStorage; },
        set() { /* NO-OP */ },
    });

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
    dtWindow.addEventListener("message", (e) => {
        parseMessageFromChannel(
            e.data,
            messageCallback,
        );
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
    }, true);

    dtWindow.addEventListener("DOMContentLoaded", () => {
        // Override the resource loading once the window has loaded so that we can control it
        const resourceLoader = ToolsResourceLoader.overrideResourceLoading(dtWindow.Root.Runtime);
        dtWindow.InspectorFrontendHost.setResourceLoader(resourceLoader);

        dtWindow.importScriptPathPrefix = dtWindow.importScriptPathPrefix.replace("null", "vscode-webview-resource:");
    });

    dtWindow.addEventListener("keydown", (e) => {
        const obj = {
            altKey: e.altKey,
            code: e.code,
            ctrlKey: e.ctrlKey,
            isComposing: e.isComposing,
            key: e.key,
            location: e.location,
            metaKey: e.metaKey,
            repeat: e.repeat,
            shiftKey: e.shiftKey
        }
        window.parent.postMessage( JSON.stringify(obj), '*');
        dtWindow.InspectorFrontendHost.sendKeyObject(obj);
    });
}
