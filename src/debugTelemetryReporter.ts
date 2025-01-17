// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TelemetryReporter from '@vscode/extension-telemetry';

export class DebugTelemetryReporter extends TelemetryReporter {
    constructor() {
        super('key');
    }

    sendTelemetryEvent(
        eventName: string,
        properties?: { [key: string]: string; },
        measurements?: { [key: string]: number; }): void {
        // eslint-disable-next-line no-console
        console.log(
            `${eventName}: ${JSON.stringify(properties)}, ${JSON.stringify(measurements)}`);
    }

    dispose(): Promise<void> {
        return Promise.resolve();
    }
}
