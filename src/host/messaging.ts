// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

declare const acquireVsCodeApi: () => any;

export function initializeMessaging() {
    const vscode = acquireVsCodeApi();

    let toolsWindow: Window | null;

    window.addEventListener("DOMContentLoaded", () => {
        toolsWindow = (document.getElementById("host") as HTMLIFrameElement).contentWindow;
    });

    window.addEventListener("message", (messageEvent) => {
        // Both windows now have a "null" origin so we need to distiguish direction based on protocol,
        // which will throw an exception when it is from the devtools x-domain window.
        // See: https://blog.mattbierner.com/vscode-webview-web-learnings/
        let sendToDevTools = false;
        try {
            sendToDevTools = (messageEvent.source as Window).location.protocol === "data:";
        } catch { /* NO-OP */ }

        if (!sendToDevTools) {
            // Pass the message onto the extension
            vscode.postMessage(messageEvent.data);
        } else if (toolsWindow) {
            // Pass the message onto the devtools
            toolsWindow.postMessage(messageEvent.data, "*");
        }
    });
}
