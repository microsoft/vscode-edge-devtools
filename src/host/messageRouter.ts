// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    encodeMessageForChannel,
    FrameToolsEvent,
    ICssMirrorContentData,
    IOpenEditorData,
    parseMessageFromChannel,
    TelemetryData,
    WebSocketEvent,
    WebviewEvent,
} from '../common/webviewEvents';

declare const acquireVsCodeApi: () => {postMessage(message: unknown, args?: any|undefined): void};
const vscode = acquireVsCodeApi();

/**
 * Both the DevTools iframe and the Extension (which owns the ws connection to the browser) will
 * post messages to the Webview window for communication between the two. This class routes message
 * to the correct location based on the origin and type of message posted.
 *
 */
export class MessageRouter {
    private toolsFrameWindow: Window | null | undefined;
    private errorMessageDiv: HTMLElement | null | undefined;
    private devtoolsActionReceived = false;
    private fallbackAttempt = false;

    constructor(webviewWindow: Window) {
        webviewWindow.addEventListener('DOMContentLoaded', () => {
            this.toolsFrameWindow = (document.getElementById('devtools-frame') as HTMLIFrameElement).contentWindow;
            this.toolsFrameWindow?.addEventListener('load', () => {
                this.devtoolsActionReceived = true;
            });

            this.errorMessageDiv = document.getElementById('error-message') as HTMLElement;
        });

        const extensionMessageCallback = this.onMessageFromChannel.bind(this);

        // Both the DevTools iframe and the extension will post messages to the webview
        // Listen for messages and forward to correct recipient based on origin
        webviewWindow.addEventListener('message', messageEvent => {
            const fromExtension = messageEvent.origin.startsWith('vscode-webview://');
            if (!fromExtension) {
                // Send message from DevTools to Extension
                this.onMessageFromFrame(messageEvent.data.method as FrameToolsEvent, messageEvent.data.args as any[]);
                // Record that the DevTools has sent a message to prevent error page from loading
                this.devtoolsActionReceived = true;
            } else if (this.toolsFrameWindow) {
                // Send message from Extension to DevTools
                parseMessageFromChannel(
                    messageEvent.data,
                    extensionMessageCallback,
                );
                messageEvent.preventDefault();
                messageEvent.stopImmediatePropagation();
            }
        }, true);

        // Inform the extension we are ready to receive messages
        this.sendReady();

        // Set timeout to show error message if devtools has not loaded within 10 seconds
        setTimeout(() => this.showLoadingError(), 10000);
    }

    onMessageFromFrame(e: FrameToolsEvent, args: any[]): boolean {
        switch(e) {
            case 'openInEditor':
                const [url, line, column, ignoreTabChanges] = args;
                this.openInEditor(url, line, column, ignoreTabChanges);
                return true;
            case 'cssMirrorContent':
                const [cssUrl = url, newContent] = args;
                this.cssMirrorContent(cssUrl, newContent);
                return true;
            case 'openInNewTab':
                this.openInNewTab(args[0]);
                return true;
            case 'recordEnumeratedHistogram':
                const [actionName, actionCode, bucketSize] = args;
                this.recordEnumeratedHistogram(actionName, actionCode, bucketSize);
                return true;
            case 'recordPerformanceHistogram':
                const [histogramName, duration] = args;
                this.recordPerformanceHistogram(histogramName, duration);
                return true;
            case 'reportError':
                const [type, message, stack, filename, sourceUrl, lineno, colno] = args;
                this.reportError(type, message, stack, filename, sourceUrl, lineno, colno);
                return true;
            case 'sendMessageToBackend':
                const [cdpMessage] = args;
                this.sendMessageToBackend(cdpMessage);
                return true;
            case 'toggleScreencast':
                this.toggleScreencast();
                return true;
            case 'replayConsoleMessages':
                this.replayConsoleMessages();
                return true;
            case 'toggleCSSMirrorContent':
                const [isEnabled] = args;
                this.toggleCSSMirrorContent(isEnabled);
                return true;
            default:
                // TODO: handle other types of messages from devtools
                return false;
        }
    }

    onMessageFromChannel(e: WebviewEvent, args: string): boolean {
        if (e !== 'websocket') {
            return false;
        }
        const { event, message } = JSON.parse(args) as {event: WebSocketEvent, message: string};
        this.fireWebSocketCallback(event, message);
        return true;
    }

    private sendReady() {
        // Inform the extension we are ready to receive messages
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'ready');
    }

    private recordEnumeratedHistogram(actionName: string, actionCode: number, _bucketSize: number): void {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: actionCode,
            event: 'enumerated',
            name: actionName,
        });
    }

    private recordPerformanceHistogram(histogramName: string, duration: number): void {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: duration,
            event: 'performance',
            name: histogramName,
        });
    }

    private reportError(
        type: string,
        message: string,
        stack: string,
        filename: string,
        sourceUrl: string,
        lineno: number,
        colno: number): void {
        // Package up the error info to send to the extension
        const data = { message, stack, filename, sourceUrl, lineno, colno };

        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data,
            event: 'error',
            name: type,
        });
    }

    private openInEditor(url: string, line: number, column: number, ignoreTabChanges: boolean): void {
        // Forward the data to the extension
        const request: IOpenEditorData = { column, line, url, ignoreTabChanges };
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'openInEditor', request);
    }

    private toggleScreencast(): void {
        // Forward the data to the extension
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'toggleScreencast');
    }

    private toggleCSSMirrorContent(isEnabled: boolean): void {
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'toggleCSSMirrorContent', {isEnabled});
    }

    private replayConsoleMessages(): void {
        // Forward the data to the extension
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'replayConsoleMessages');
    }

    private cssMirrorContent(url: string, newContent: string): void {
        // Forward the data to the extension
        const request: ICssMirrorContentData = { url, newContent };
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'cssMirrorContent', request);
    }

    private openInNewTab(url: string): void {
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'openUrl', {url});
    }

    private sendMessageToBackend(message: string): void {
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'websocket', { message });
    }

    private sendTelemetry(telemetry: TelemetryData) {
        // Forward the data to the extension
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'telemetry', telemetry);
    }

    private sendDevToolsConnectionStatus(success: boolean) {
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'devtoolsConnection', success);
    }

    private fireWebSocketCallback(e: WebSocketEvent, message: string) {
        // Send response message to DevTools
        if (this.toolsFrameWindow && e === 'message') {
            this.toolsFrameWindow.postMessage({method: 'dispatchMessage', args: [message]}, '*');
        }
    }

    private showLoadingError() {
        if (this.devtoolsActionReceived || !this.errorMessageDiv) {
            this.sendDevToolsConnectionStatus(true);
            this.fallbackAttempt = false;
            return;
        }
        // Show the error message if DevTools has failed to record an action
        if (!this.fallbackAttempt) {
            this.sendDevToolsConnectionStatus(false);
            this.fallbackAttempt = true;
        } else {
            this.errorMessageDiv.classList.remove('hidden');
        }
    }
}
