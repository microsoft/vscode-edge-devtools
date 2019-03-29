// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { encodeMessageForChannel, ITelemetryData, WebviewEvent } from "../common/webviewEvents";
import { ToolsWebSocket } from "./toolsWebSocket";

export class ToolsHost {
    private getStateNextId: number = 0;
    private getStateCallbacks: Map<number, (preferences: object) => void> = new Map();

    public isHostedMode() {
        // DevTools will always be inside a webview
        return true;
    }

    public getPreferences(callback: (preferences: any) => void) {
        // Load the preference via the extension workspaceState
        const id = this.getStateNextId++;
        this.getStateCallbacks.set(id, callback);
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "getState", [{ id }]);
    }

    public setPreference(name: string, value: string) {
        // Save the preference via the extension workspaceState
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "setState", [{ name, value }]);
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

    public onMessageFromChannel(e: WebviewEvent, args: string): boolean {
        switch (e) {
            case "getState": {
                this.fireGetStateCallback(args);
                break;
            }

            case "getUrl": {
                this.fireGetUrlCallback(args);
                break;
            }

            case "websocket": {
                this.fireWebSocketCallback(args);
                break;
            }
        }
        return true;
    }

    private sendTelemetry(telemetry: ITelemetryData) {
        // Forward the data to the extension
        encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "telemetry", [telemetry]);
    }

    private fireGetStateCallback(response: string) {
        const { id, preferences } = JSON.parse(response);

        if (this.getStateCallbacks.has(id)) {
            this.getStateCallbacks.get(id)!(preferences);
            this.getStateCallbacks.delete(id);
        }
    }

    private fireGetUrlCallback(response: string) {
        // TODO: Send response content to DevTools
    }

    private fireWebSocketCallback(response: string) {
        // Send response message to DevTools
        const [e, message] = JSON.parse(response);
        ToolsWebSocket.instance.onMessageFromChannel(e, message);
    }
}
