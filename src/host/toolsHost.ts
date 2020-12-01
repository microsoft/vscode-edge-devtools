// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    encodeMessageForChannel,
    IOpenEditorData,
    TelemetryData,
    ThemeString,
    WebSocketEvent,
    WebviewEvent,
} from "../common/webviewEvents";
import ToolsResourceLoader from "./toolsResourceLoader";
import ToolsWebSocket from "./toolsWebSocket";

export default class ToolsHost {
    private resourceLoader: Readonly<ToolsResourceLoader> | undefined;
    private getHostCallbacksNextId: number = 0;
    private getHostCallbacks: Map<number, (preferences: object) => void> = new Map();

    public setResourceLoader(resourceLoader: Readonly<ToolsResourceLoader>) {
        this.resourceLoader = resourceLoader;
    }

    public isHostedMode() {
        // DevTools will always be inside a webview
        return true;
    }

    public getPreferences(callback: (preferences: any) => void) {
        // Load the preference via the extension workspaceState
        const id = this.getHostCallbacksNextId++;
        this.getHostCallbacks.set(id, callback);
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "getState", { id });
    }

    public setPreference(name: string, value: string) {
        // Save the preference via the extension workspaceState
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "setState", { name, value });
    }

    public recordEnumeratedHistogram(actionName: string, actionCode: number, bucketSize: number) {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: actionCode,
            event: "enumerated",
            name: actionName,
        });
    }

    public recordPerformanceHistogram(histogramName: string, duration: number) {
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data: duration,
            event: "performance",
            name: histogramName,
        });
    }

    public reportError(
        type: string,
        message: string,
        stack: string,
        filename: string,
        sourceUrl: string,
        lineno: number,
        colno: number) {
        // Package up the error info to send to the extension
        const data = { message, stack, filename, sourceUrl, lineno, colno };

        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data,
            event: "error",
            name: type,
        });
    }

    public openInEditor(url: string, line: number, column: number, ignoreTabChanges: boolean) {
        // Forward the data to the extension
        const request: IOpenEditorData = { column, line, url, ignoreTabChanges };
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "openInEditor", request);
    }

    public getVscodeSettings(callback: (arg0: object) => void) {
        const id = this.getHostCallbacksNextId++;
        this.getHostCallbacks.set(id, callback);
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "getVscodeSettings", {id});
    }

    public copyText(clipboardData: string) {
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "copyText", {clipboardData});
    }

    public focusEditor(next: boolean) {
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "focusEditor", {next});
    }

    public focusEditorGroup(next: boolean) {
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "focusEditorGroup", {next});
    }

    public onMessageFromChannel(e: WebviewEvent, args: string): boolean {
        switch (e) {
            case "getState": {
                const { id, preferences } = JSON.parse(args);
                this.fireGetHostCallback(id, preferences);
                break;
            }

            case "getUrl": {
                const { id, content } = JSON.parse(args);
                this.fireGetUrlCallback(id, content);
                break;
            }

            case "websocket": {
                const { event, message } = JSON.parse(args);
                this.fireWebSocketCallback(event, message);
                break;
            }

            case "getVscodeSettings": {
                const parsedArgs = JSON.parse(args);
                this.parseVscodeSettingsObject(parsedArgs)
            }
        }
        return true;
    }

    private parseVscodeSettingsObject(vscodeObject: any) {
        const id: number = vscodeObject.id;
        const themeString: ThemeString = vscodeObject.themeString;
        let theme;
        switch(themeString) {
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
        });
    }

    private sendTelemetry(telemetry: TelemetryData) {
        // Forward the data to the extension
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "telemetry", telemetry);
    }

    private fireGetHostCallback(id: number, args: object) {
        if (this.getHostCallbacks.has(id)) {
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
        ToolsWebSocket.instance.onMessageFromChannel(e, message);
    }
}
