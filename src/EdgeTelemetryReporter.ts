// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { DebugTelemetryReporter } from './debugTelemetryReporter';
import * as vscode from 'vscode';
import { SETTINGS_STORE_NAME } from './utils';

export class EdgeTelemetryReporter extends DebugTelemetryReporter {
    private uuid: string;
    constructor(extensionId: string, extensionVersion: string, key: string, firstParty?: boolean) {
        // super(extensionId, extensionVersion, key, firstParty);
        super();
        const { v4 } = require('uuid');
        this.uuid = v4();
    }

    sendTelemetryEvent(eventName: string, properties?: {
        [key: string]: string;
    }, measurements?: {
        [key: string]: number;
    }): void {
        const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
        if (settings.get('enableSessionId') === 'Opted in') {
            const updatedProperties = properties ? properties : {};
            updatedProperties.uuid = this.uuid;
            super.sendTelemetryEvent(eventName, updatedProperties, measurements);
        } else {
            super.sendTelemetryEvent(eventName, properties, measurements);
        }
    }
}