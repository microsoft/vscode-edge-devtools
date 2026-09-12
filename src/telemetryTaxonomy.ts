// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryReporter } from '@vscode/extension-telemetry';

// Used verbatim as the event name, so the set is closed and every value is at
// least 4 characters, which is the minimum the 1DS collector accepts.
export type TelemetryArea =
    | 'command'
    | 'contextMenu'
    | 'debug'
    | 'devtools'
    | 'extension'
    | 'user'
    | 'view'
    | 'websocket'
    | 'workspace';

export type TelemetryOutcome =
    | 'success'
    | 'error'
    | 'noTarget'
    | 'notFound'
    | 'cancelled';

// Fixed dimensions attached to every event, replacing the previous
// 'area/subarea/subarea' names that the collector dropped for containing '/'.
export interface TelemetryTaxonomy {
    area: TelemetryArea;
    feature: string;
    action: string;
    outcome?: TelemetryOutcome;
    detail?: string;
}

export type TelemetryProperties = { [key: string]: string };
export type TelemetryMeasurements = { [key: string]: number };

export function taxonomyToProperties(
    taxonomy: TelemetryTaxonomy,
    properties?: TelemetryProperties): TelemetryProperties {
    const dimensions: TelemetryProperties = {
        area: taxonomy.area,
        feature: taxonomy.feature,
        action: taxonomy.action,
        outcome: taxonomy.outcome || 'success',
    };

    if (taxonomy.detail !== undefined) {
        dimensions.detail = taxonomy.detail;
    }

    return { ...dimensions, ...properties };
}

export function sendTaxonomyEvent(
    telemetryReporter: Readonly<TelemetryReporter>,
    taxonomy: TelemetryTaxonomy,
    properties?: TelemetryProperties,
    measurements?: TelemetryMeasurements): void {
    telemetryReporter.sendTelemetryEvent(
        taxonomy.area,
        taxonomyToProperties(taxonomy, properties),
        measurements);
}

export function sendTaxonomyErrorEvent(
    telemetryReporter: Readonly<TelemetryReporter>,
    taxonomy: TelemetryTaxonomy,
    properties?: TelemetryProperties,
    measurements?: TelemetryMeasurements): void {
    telemetryReporter.sendTelemetryErrorEvent(
        taxonomy.area,
        taxonomyToProperties({ ...taxonomy, outcome: taxonomy.outcome || 'error' }, properties),
        measurements);
}
