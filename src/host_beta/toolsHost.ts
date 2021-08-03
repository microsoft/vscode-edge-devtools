// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    encodeMessageForChannel,
    FrameToolsEvent,
    IOpenEditorData,
    TelemetryData,
    ThemeString,
    WebSocketEvent,
    WebviewEvent,
} from '../common/webviewEvents';
import { ToolsResourceLoader } from './toolsResourceLoader';
import { vscode } from './host';

export class ToolsHost {
    // We need to add a dummy property to get around build errors for sendToVscodeOutput.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    InspectorFrontendHost: any;
    private toolsWindow: Window | undefined;
    private resourceLoader: Readonly<ToolsResourceLoader> | undefined;
    private getHostCallbacksNextId = 0;
    private getHostCallbacks: Map<number, (preferences: Record<string, unknown>) => void> =
        new Map<number,(preferences: Record<string, unknown>) => void>();

    setResourceLoader(resourceLoader: Readonly<ToolsResourceLoader>): void {
        this.resourceLoader = resourceLoader;
    }

    isHostedMode(): boolean {
        // DevTools will always be inside a webview
        return true;
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
        console.log('hit send message')
        // Inform the extension of the DevTools telemetry event
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

            case 'getUrl': {
                const { id, content } = JSON.parse(args) as {id: number, content: string};
                this.fireGetUrlCallback(id, content);
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

    setToolsWindow(tw: Window) {
        this.toolsWindow = tw;
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

    private fireGetUrlCallback(id: number, content: string) {
        // Send response content to DevTools
        if (this.resourceLoader) {
            this.resourceLoader.onResolvedUrlFromChannel(id, content);
        }
    }

    private fireWebSocketCallback(e: WebSocketEvent, message: string) {
        // Send response message to DevTools
        if (this.toolsWindow) {
            this.toolsWindow.postMessage({method: 'dispatchMessage', args: [message]}, '*');
        }
    }
}
