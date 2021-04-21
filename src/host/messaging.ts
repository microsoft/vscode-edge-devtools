// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

declare const acquireVsCodeApi: () => {postMessage(message: unknown): void};

export function initializeMessaging(): void {
    // const vscode = acquireVsCodeApi();

    // window.addEventListener('message', messageEvent => {
    //     // Both windows now have a "null" origin so we need to distinguish direction based on protocol,
    //     // which will throw an exception when it is from the devtools x-domain window.
    //     // See: https://blog.mattbierner.com/vscode-webview-web-learnings/
    //     let sendToDevTools = false;
    //     try {
    //         sendToDevTools = (messageEvent.source as Window).location.protocol === 'vscode-webview:';
    //     } catch { /* NO-OP */ }

    //     if (!sendToDevTools) {
    //         // Pass the message onto the extension
    //         vscode.postMessage(messageEvent.data);
    //     }
    // });
}
