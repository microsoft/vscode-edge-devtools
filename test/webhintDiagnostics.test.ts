// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { describe, expect, it } from '@jest/globals';
import { shouldSuppressWebhintDiagnostic } from '../src/webhintDiagnostics';

describe('webhintDiagnostics', () => {
    const tsConfigUri = {
        fsPath: '/workspaces/project/tsconfig.node.json',
    } as never;

    const appConfigUri = {
        fsPath: '/workspaces/project/vite.config.ts',
    } as never;

    it('suppresses the stale ES2023 webhint diagnostic in tsconfig files', () => {
        expect(shouldSuppressWebhintDiagnostic(tsConfigUri, {
            source: 'Microsoft Edge Tools',
            message: "'compilerOptions/target' must be equal to one of the allowed values 'ES3, ES5, ES6, ES2015, ES2016, ES2017, ES2018, ES2019, ES2020, ES2021, ES2022, ESNext'. Value found '\"ES2023\"'.",
            code: { value: 'typescript-config/is-valid' },
        } as never)).toBe(true);
    });

    it('keeps the diagnostic when it does not mention ES2023', () => {
        expect(shouldSuppressWebhintDiagnostic(tsConfigUri, {
            source: 'Microsoft Edge Tools',
            message: "'compilerOptions/target' must be equal to one of the allowed values 'ES3, ES5, ES6, ES2015, ES2016, ES2017, ES2018, ES2019, ES2020, ES2021, ES2022, ESNext'. Value found '\"ES2022\"'.",
            code: { value: 'typescript-config/is-valid' },
        } as never)).toBe(false);
    });

    it('keeps unrelated diagnostics in non-tsconfig files', () => {
        expect(shouldSuppressWebhintDiagnostic(appConfigUri, {
            source: 'Microsoft Edge Tools',
            message: "'compilerOptions/target' must be equal to one of the allowed values 'ES3, ES5, ES6, ES2015, ES2016, ES2017, ES2018, ES2019, ES2020, ES2021, ES2022, ESNext'. Value found '\"ES2023\"'.",
            code: { value: 'typescript-config/is-valid' },
        } as never)).toBe(false);
    });
});