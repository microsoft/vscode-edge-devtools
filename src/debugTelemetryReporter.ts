// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TelemetryReporter from "vscode-extension-telemetry";

export default class DebugTelemetryReporter extends TelemetryReporter {
    constructor() {
        super("extensionId", "extensionVersion", "key");
    }

    public sendTelemetryEvent(
        eventName: string,
        properties?: { [key: string]: string; },
        measurements?: { [key: string]: number; }) {
        // tslint:disable-next-line: no-console
        console.log(
            `${eventName}: ${JSON.stringify(properties)}, ${JSON.stringify(measurements)}`);
    }

    public dispose(): Promise<any> {
        return Promise.resolve();
    }
}
