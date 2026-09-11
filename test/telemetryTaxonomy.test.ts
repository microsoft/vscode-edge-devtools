// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createFakeVSCode } from './helpers/helpers';
import {
    sendTaxonomyErrorEvent,
    sendTaxonomyEvent,
    taxonomyToProperties,
} from '../src/telemetryTaxonomy';

jest.mock('vscode', () => createFakeVSCode(), { virtual: true });
jest.mock('@vscode/extension-telemetry');

function createFakeReporter() {
    return {
        sendTelemetryEvent: jest.fn(),
        sendTelemetryErrorEvent: jest.fn(),
    };
}

describe('taxonomyToProperties', () => {
    it('defaults outcome to success and omits an absent detail', () => {
        expect(taxonomyToProperties({ area: 'workspace', feature: 'metadata', action: 'scan' })).toEqual({
            area: 'workspace',
            feature: 'metadata',
            action: 'scan',
            outcome: 'success',
        });
    });

    it('includes detail when provided', () => {
        const properties = taxonomyToProperties({
            area: 'command', feature: 'browser', action: 'launch', outcome: 'error', detail: 'browser_not_found',
        });
        expect(properties).toEqual({
            area: 'command',
            feature: 'browser',
            action: 'launch',
            outcome: 'error',
            detail: 'browser_not_found',
        });
    });

    it('merges event specific properties alongside the dimensions', () => {
        const properties = taxonomyToProperties(
            { area: 'user', feature: 'ui', action: 'buttonPress' },
            { 'VSCode.buttonCode': '8' });
        expect(properties['VSCode.buttonCode']).toBe('8');
        expect(properties.area).toBe('user');
    });
});

describe('sendTaxonomyEvent', () => {
    it('uses the area as the event name', () => {
        const reporter = createFakeReporter();
        sendTaxonomyEvent(
            reporter as never,
            { area: 'user', feature: 'ui', action: 'buttonPress' },
            { 'VSCode.buttonCode': '8' });

        expect(reporter.sendTelemetryEvent).toHaveBeenCalledWith(
            'user',
            { area: 'user', feature: 'ui', action: 'buttonPress', outcome: 'success', 'VSCode.buttonCode': '8' },
            undefined);
    });

    it('forwards measurements unchanged', () => {
        const reporter = createFakeReporter();
        sendTaxonomyEvent(
            reporter as never,
            { area: 'workspace', feature: 'metadata', action: 'scan' },
            undefined,
            { css: 4 });

        expect(reporter.sendTelemetryEvent).toHaveBeenCalledWith(
            'workspace',
            { area: 'workspace', feature: 'metadata', action: 'scan', outcome: 'success' },
            { css: 4 });
    });

    it('never produces an event name the collector would drop', () => {
        const reporter = createFakeReporter();
        sendTaxonomyEvent(reporter as never, { area: 'contextMenu', feature: 'item', action: 'launchHtml' });

        const eventName = reporter.sendTelemetryEvent.mock.calls[0][0] as string;
        expect(eventName).toMatch(/^[a-zA-Z0-9]([a-zA-Z0-9]|_){2,98}[a-zA-Z0-9]$/);
    });
});

describe('sendTaxonomyErrorEvent', () => {
    it('defaults outcome to error', () => {
        const reporter = createFakeReporter();
        sendTaxonomyErrorEvent(
            reporter as never,
            { area: 'command', feature: 'currentDebugTarget', action: 'attach', detail: 'no_active_session' },
            { message: 'No active debug session' });

        expect(reporter.sendTelemetryErrorEvent).toHaveBeenCalledWith(
            'command',
            {
                area: 'command',
                feature: 'currentDebugTarget',
                action: 'attach',
                outcome: 'error',
                detail: 'no_active_session',
                message: 'No active debug session',
            },
            undefined);
    });

    it('keeps an explicit outcome', () => {
        const reporter = createFakeReporter();
        sendTaxonomyErrorEvent(
            reporter as never,
            { area: 'command', feature: 'screencast', action: 'toggle', outcome: 'noTarget' });

        const properties = reporter.sendTelemetryErrorEvent.mock.calls[0][1] as { outcome: string };
        expect(properties.outcome).toBe('noTarget');
    });
});
