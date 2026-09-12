// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createFakeVSCode } from './helpers/helpers';

jest.mock('vscode', () => createFakeVSCode(), { virtual: true });

// Stands in for the real base class so the sender wrapping can be observed.
jest.mock('@vscode/extension-telemetry', () => {
    class FakeTelemetryReporter {
        telemetrySender: { sendEventData: jest.Mock; sendErrorData: jest.Mock };
        originalSendEventData: jest.Mock;
        originalSendErrorData: jest.Mock;
        constructor(_key: string) {
            this.originalSendEventData = jest.fn();
            this.originalSendErrorData = jest.fn();
            this.telemetrySender = {
                sendEventData: this.originalSendEventData,
                sendErrorData: this.originalSendErrorData,
            };
        }
    }
    return { TelemetryReporter: FakeTelemetryReporter, default: FakeTelemetryReporter };
});

const prefix = 'ms-edgedevtools.vscode-edge-devtools/';

describe('sanitizeEventName', () => {
    it('strips the publisher prefix VS Code adds to gated events', async () => {
        const { sanitizeEventName } = await import('../src/ariaTelemetryReporter');
        expect(sanitizeEventName(`${prefix}workspace`)).toBe('workspace');
        expect(sanitizeEventName(`${prefix}user`)).toBe('user');
    });

    it('leaves an already clean name untouched', async () => {
        const { sanitizeEventName } = await import('../src/ariaTelemetryReporter');
        expect(sanitizeEventName('workspace')).toBe('workspace');
        expect(sanitizeEventName('unhandlederror')).toBe('unhandlederror');
    });

    it('replaces characters the collector rejects', async () => {
        const { sanitizeEventName } = await import('../src/ariaTelemetryReporter');
        expect(sanitizeEventName(`${prefix}user/buttonPress`)).toBe('user_buttonPress');
        expect(sanitizeEventName('command/attach/error/no_json_array')).toBe('command_attach_error_no_json_array');
        expect(sanitizeEventName('diag-probe.dotted')).toBe('diag_probe_dotted');
    });

    it('collapses runs and trims leading and trailing separators', async () => {
        const { sanitizeEventName } = await import('../src/ariaTelemetryReporter');
        expect(sanitizeEventName('//a//b//')).toBe('a_b');
    });

    it('only ever emits characters the collector accepts', async () => {
        const { sanitizeEventName } = await import('../src/ariaTelemetryReporter');
        const names = [
            `${prefix}user/buttonPress`,
            `${prefix}devtools/Some.Name With Spaces`,
            'websocket/failedConnection',
        ];
        for (const name of names) {
            expect(sanitizeEventName(name)).toMatch(/^[a-zA-Z0-9_]+$/);
        }
    });

    it('caps the name at the collector limit', async () => {
        const { sanitizeEventName } = await import('../src/ariaTelemetryReporter');
        expect(sanitizeEventName('a'.repeat(200))).toHaveLength(98);
    });
});

describe('AriaTelemetryReporter', () => {
    it('rewrites event names on their way to the sender', async () => {
        const { AriaTelemetryReporter } = await import('../src/ariaTelemetryReporter');
        const reporter = new AriaTelemetryReporter('key') as unknown as {
            telemetrySender: { sendEventData: (name: string, data: unknown) => void };
            originalSendEventData: jest.Mock;
        };

        reporter.telemetrySender.sendEventData(`${prefix}user/buttonPress`, { data: 1 });

        expect(reporter.originalSendEventData).toHaveBeenCalledWith('user_buttonPress', { data: 1 });
    });

    it('wraps the sender rather than leaving it untouched', async () => {
        const { AriaTelemetryReporter } = await import('../src/ariaTelemetryReporter');
        const reporter = new AriaTelemetryReporter('key') as unknown as {
            telemetrySender: { sendEventData: unknown };
            originalSendEventData: jest.Mock;
        };

        expect(reporter.telemetrySender.sendEventData).not.toBe(reporter.originalSendEventData);
    });

    // sendTelemetryErrorEvent passes a string event name, and VS Code's
    // logError(string) overload routes to sendEventData, so error events are
    // sanitized by the same wrapper.
    it('sanitizes error event names, which also travel via sendEventData', async () => {
        const { AriaTelemetryReporter } = await import('../src/ariaTelemetryReporter');
        const reporter = new AriaTelemetryReporter('key') as unknown as {
            telemetrySender: { sendEventData: (name: string, data: unknown) => void };
            originalSendEventData: jest.Mock;
        };

        reporter.telemetrySender.sendEventData(`${prefix}command`, { properties: { outcome: 'error' } });

        expect(reporter.originalSendEventData).toHaveBeenCalledWith(
            'command',
            { properties: { outcome: 'error' } });
    });

    // sendErrorData takes an Exception, not an event name; the 1DS fallback
    // hardcodes the already valid name 'unhandlederror'. Nothing to sanitize.
    it('leaves sendErrorData alone because it carries no event name', async () => {
        const { AriaTelemetryReporter } = await import('../src/ariaTelemetryReporter');
        const reporter = new AriaTelemetryReporter('key') as unknown as {
            telemetrySender: { sendErrorData: (error: Error, data?: unknown) => void };
            originalSendErrorData: jest.Mock;
        };

        const error = new Error('boom');
        reporter.telemetrySender.sendErrorData(error, { properties: {} });

        expect(reporter.originalSendErrorData).toHaveBeenCalledWith(error, { properties: {} });
    });

    it('keeps a name the collector already accepts unchanged', async () => {
        const { sanitizeEventName } = await import('../src/ariaTelemetryReporter');
        expect(sanitizeEventName('unhandlederror')).toBe('unhandlederror');
    });
});
