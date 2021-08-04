// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    encodeMessageForChannel,
    FrameToolsEvent,
    IOpenEditorData,
    parseMessageFromChannel,
    TelemetryData,
    ThemeString,
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
    private toolsFrameWindow: Window | undefined;
    private getHostCallbacksNextId = 0;
    private getHostCallbacks: Map<number, (preferences: Record<string, unknown>) => void> =
        new Map<number,(preferences: Record<string, unknown>) => void>();

    constructor(webviewWindow: Window | null) {
        if (!webviewWindow) {
            return;
        }

        webviewWindow.addEventListener('DOMContentLoaded', () => {
            const tw = (document.getElementById('host') as HTMLIFrameElement).contentWindow;
            this.toolsFrameWindow = tw || undefined;
        });


        const extensionMessageCallback = this.onMessageFromChannel.bind(this);

        // Both the DevTools iframe and the extension will post messages to the webview
        // Listen for messages and forward to correct recipient based on origin
        webviewWindow.addEventListener('message', messageEvent => {
            const fromExtension = messageEvent.origin.startsWith('vscode-webview://');
            if (!fromExtension) {
                // Send message from DevTools to Extension
                this.onMessageFromFrame(messageEvent.data.method as FrameToolsEvent, messageEvent.data.args as any[]);
            } else if (this.toolsFrameWindow) {
                // Send message from Extension to DevTools
                parseMessageFromChannel(
                    messageEvent.data,
                    extensionMessageCallback,
                );
                messageEvent.preventDefault();
                messageEvent.stopImmediatePropagation();
                return false;
            }
        }, true);

        // Inform the extension we are ready to receive messages
        this.sendReady();
    }

    sendReady() {
        // Inform the extension we are ready to receive messages
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'ready');
    }

    getPreferences(callback: (preferences: Record<string, unknown>) => void): void {
        // Load the preference via the extension workspaceState
        const id = this.getHostCallbacksNextId++;
        this.getHostCallbacks.set(id, callback);
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'getState', { id });
    }

    setPreference(name: string, value: string): void {
        // Save the preference via the extension workspaceState
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'setState', { name, value });
    }

    recordEnumeratedHistogram(actionName: string, actionCode: number, _bucketSize: number): void {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: actionCode,
            event: 'enumerated',
            name: actionName,
        });
    }

    recordPerformanceHistogram(histogramName: string, duration: number): void {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: duration,
            event: 'performance',
            name: histogramName,
        });
    }

    reportError(
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

    openInEditor(url: string, line: number, column: number, ignoreTabChanges: boolean): void {
        // Forward the data to the extension
        const request: IOpenEditorData = { column, line, url, ignoreTabChanges };
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'openInEditor', request);
    }

    getVscodeSettings(callback: (arg0: Record<string, unknown>) => void): void {
        const id = this.getHostCallbacksNextId++;
        this.getHostCallbacks.set(id, callback);
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'getVscodeSettings', {id});
    }

    sendToVscodeOutput(consoleMessage: string): void {
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'consoleOutput', {consoleMessage});
    }

    openInNewTab(url: string): void {
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'openUrl', {url});
    }

    sendMessageToBackend(message: string): void {
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'websocket', { message });
    }

    onMessageFromFrame(e: FrameToolsEvent, args: any[]): boolean {
        switch(e) {
            case 'sendMessageToBackend':
                this.sendMessageToBackend(args[0]);
                return true;
            default:
                return false;
        }
    }

    onMessageFromChannel(e: WebviewEvent, args: string): boolean {
        switch (e) {
            case 'getState': {
                const { id, preferences } = JSON.parse(args) as {id: number, preferences: Record<string, unknown>};
                this.fireGetHostCallback(id, preferences);
                break;
            }

            case 'websocket': {
                const { event, message } = JSON.parse(args) as {event: WebSocketEvent, message: string};
                this.fireWebSocketCallback(event, message);
                break;
            }

            case 'getVscodeSettings': {
                const parsedArgs = JSON.parse(args) as {parsedArgs: Record<string, unknown>};
                this.parseVscodeSettingsObject(parsedArgs);
            }

        }
        return true;
    }

    private parseVscodeSettingsObject(vscodeObject: Record<string, unknown>) {
        const id: number = vscodeObject.id as number;
        const themeString: ThemeString = vscodeObject.themeString as ThemeString;
        let theme;
        switch (themeString) {
            case 'System preference':
                theme = 'systemPreferred';
                break;
            case 'Light':
                theme = 'default';
                break;
            case 'Dark':
                theme = 'dark';
                break;
            default:
                theme = null;
        }
        this.fireGetHostCallback(id, {
            enableNetwork: vscodeObject.enableNetwork,
            theme,
            welcome: vscodeObject.welcome,
            isHeadless: vscodeObject.isHeadless,
        });
    }

    private sendTelemetry(telemetry: TelemetryData) {
        // Forward the data to the extension
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'telemetry', telemetry);
    }

    private fireGetHostCallback(id: number, args: Record<string, unknown>) {
        if (this.getHostCallbacks.has(id)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.getHostCallbacks.get(id)!(args);
            this.getHostCallbacks.delete(id);
        }
    }

    private fireWebSocketCallback(e: WebSocketEvent, message: string) {
        // Send response message to DevTools
        if (this.toolsFrameWindow && e === 'message') {
            this.toolsFrameWindow.postMessage({method: 'dispatchMessage', args: [message]}, '*');
        }
    }
}
