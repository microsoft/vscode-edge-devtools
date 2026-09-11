// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryReporter } from '@vscode/extension-telemetry';
import packageJson from '../package.json';

// packageJson is mocked away as null in some tests, so read it defensively.
const packageInfo = packageJson as { publisher?: string; name?: string } | null;
const extensionIdPrefix = packageInfo && packageInfo.publisher && packageInfo.name
    ? `${packageInfo.publisher}.${packageInfo.name}/`
    : '';

// The 1DS collector drops event names containing '/' and rewrites '-' and '.'
// to '_'. VS Code prefixes every gated event with '<publisher>.<name>/', so the
// prefix alone is enough to have an event discarded.
export function sanitizeEventName(eventName: string): string {
    const withoutPrefix = eventName.startsWith(extensionIdPrefix)
        ? eventName.slice(extensionIdPrefix.length)
        : eventName;

    return withoutPrefix
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 98);
}

// Rewrites names at the sender, the single point both the usage and error paths
// pass through, so VS Code's opt-in check, common.* properties and scrubbing
// are all preserved.
export class AriaTelemetryReporter extends TelemetryReporter {
    constructor(key: string) {
        super(key);
        this.sanitizeSenderEventNames();
    }

    private sanitizeSenderEventNames(): void {
        /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
        const sender = (this as any).telemetrySender;
        if (!sender || typeof sender.sendEventData !== 'function') {
            return;
        }

        const sendEventData = sender.sendEventData.bind(sender) as (eventName: string, data: unknown) => void;
        sender.sendEventData = (eventName: string, data: unknown): void => {
            sendEventData(sanitizeEventName(eventName), data);
        };
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    }
}
