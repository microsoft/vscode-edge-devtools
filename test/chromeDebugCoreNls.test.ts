/** @jest-environment node */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import * as path from 'path';
import type { Configuration } from 'webpack';

const extensionRoot = path.resolve(__dirname, '..');
const bundleRoot = path.resolve(path.dirname(require.resolve('vscode-chrome-debug-core/package.json')), 'out');
const createWebpackConfig = require('../webpack.config') as (env: Record<string, unknown>) => Configuration[];

describe('external debug-core localization', () => {
    let nls: typeof import('vscode-nls');
    let consoleError: jest.SpyInstance;
    let consoleWarn: jest.SpyInstance;
    const originalNlsConfig = process.env.VSCODE_NLS_CONFIG;

    beforeAll(() => {
        process.env.VSCODE_NLS_CONFIG = '{}';
        nls = jest.requireActual('vscode-nls');
    });

    beforeEach(() => {
        nls.config({ locale: 'en', bundleFormat: nls.BundleFormat.standalone });
        consoleError = jest.spyOn(console, 'error');
        consoleWarn = jest.spyOn(console, 'warn');
    });

    afterEach(() => {
        try {
            expect(consoleError).not.toHaveBeenCalled();
            expect(consoleWarn).not.toHaveBeenCalled();
        } finally {
            consoleError.mockRestore();
            consoleWarn.mockRestore();
        }
    });

    afterAll(() => {
        if (originalNlsConfig === undefined) {
            delete process.env.VSCODE_NLS_CONFIG;
        } else {
            process.env.VSCODE_NLS_CONFIG = originalNlsConfig;
        }
    });

    function localize(modulePath: string, key: number, ...args: string[]): string {
        const messages = nls.loadMessageBundle(path.join(bundleRoot, modulePath));
        // The published dependency uses numeric indexes, which its NLS declarations do not expose.
        return Reflect.apply(messages, undefined, [key, null, ...args]) as string;
    }

    it('keeps debug-core and its subpath imports external without matching other packages', () => {
        const config = createWebpackConfig({}).find(config => config.name === 'extension');
        expect(config?.externalsType).toBe('commonjs');
        const externals = config?.externals;
        if (!Array.isArray(externals)) {
            throw new Error('Expected extension webpack externals to include the debug-core package matcher.');
        }
        for (const request of [
            'vscode-chrome-debug-core',
            'vscode-chrome-debug-core/out/src/utils',
            'vscode-chrome-debug-core/out/src/chrome/chromeUtils',
            'vscode-chrome-debug-core/out/src/transformers/urlPathTransformer',
        ]) {
            expect(externals.some(external => external instanceof RegExp && external.test(request))).toBe(true);
        }
        expect(externals.some(external => external instanceof RegExp && external.test('vscode-chrome-debug-core-other'))).toBe(false);
    });

    it('keeps overlapping message indexes separate for each original module', () => {
        expect(localize('src/errors.js', 0)).toBe('not available');
        expect(localize('src/chrome/stoppedEvent.js', 0)).toBe('Paused on step');
    });

    it('loads the real errors module without losing its messages', () => {
        const errors = jest.requireActual<typeof import('vscode-chrome-debug-core/out/src/errors')>(
            'vscode-chrome-debug-core/out/src/errors',
        );
        expect(errors.evalNotAvailableMsg).toBe('not available');
        expect(errors.runtimeNotConnectedMsg).toBe('not connected to runtime');
        expect(errors.noRestartFrame).toBe("Can't restart frame");
    });

    it('preserves message argument substitution', () => {
        expect(localize('src/errors.js', 3, 'webRoot', 'missing'))
            .toBe("Attribute 'webRoot' does not exist ('missing').");
    });

    it('uses the existing translation and falls back from a regional locale', () => {
        nls.config({ locale: 'de-de' });
        const messages = JSON.parse(fs.readFileSync(path.join(bundleRoot, 'nls.bundle.de.json'), 'utf8')) as Record<string, string[]>;
        expect(localize('src/errors.js', 0)).toBe(messages['src/errors'][0]);
        expect(localize('src/chrome/stoppedEvent.js', 0)).toBe(messages['src/chrome/stoppedEvent'][0]);
        expect(messages['src/errors'][0]).not.toBe('not available');
    });

    it('falls back to the default messages for an unsupported locale', () => {
        nls.config({ locale: 'unsupported-locale' });
        expect(localize('src/errors.js', 0)).toBe('not available');
    });

    it('includes the original modules, NLS resources, runtime dependencies, and codicons in the VSIX file list', async () => {
        const { listFiles } = jest.requireActual<typeof import('@vscode/vsce')>('@vscode/vsce');
        const files = await listFiles({ cwd: extensionRoot });
        const packagedPath = (filename: string): string => path.relative(extensionRoot, filename).split(path.sep).join('/');
        for (const request of [
            'vscode-chrome-debug-core/out/src/utils',
            'vscode-chrome-debug-core/out/src/chrome/chromeUtils',
            'vscode-chrome-debug-core/out/src/transformers/urlPathTransformer',
            'vscode-chrome-debug-core/out/src/errors',
            'vscode-nls',
            'vscode-debugadapter',
            'ws',
        ]) {
            expect(files).toContain(packagedPath(require.resolve(request, { paths: [bundleRoot] })));
        }
        for (const name of fs.readdirSync(bundleRoot).filter(name => /^nls.*\.json$/.test(name))) {
            expect(files).toContain(packagedPath(path.join(bundleRoot, name)));
        }
        expect(files).toContain('node_modules/@vscode/codicons/dist/codicon.css');
        expect(files).toContain('node_modules/@vscode/codicons/dist/codicon.ttf');
    }, 30000);
});
