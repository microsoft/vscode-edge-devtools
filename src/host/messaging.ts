// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

declare const acquireVsCodeApi: () => any;

export function initializeMessaging() {
const vscode = acquireVsCodeApi();

    let toolsWindow: Window | null;

    window.addEventListener("DOMContentLoaded", () => {
        toolsWindow = (document.getElementById("host") as HTMLIFrameElement).contentWindow;

         let message = "websocket:{\"message\":\"getStrings\"}"
         vscode.postMessage(message);
    });

    window.addEventListener("message", (messageEvent) => {
        if (messageEvent.origin === "vscode-resource://") {
            // Pass the message onto the extension
            vscode.postMessage(messageEvent.data);
        } else if (toolsWindow) {
            // Pass the message onto the devtools
            toolsWindow.postMessage(messageEvent.data, "*");
        }
    });
}
