// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { spawn } from 'child_process';
import puppeteer, { Browser, TargetType } from 'puppeteer-core';

const RETRY_INTERVAL = 200;

export async function launchAndConnectToBrowser(
    executablePath: string, port: number, args: string[], headless: boolean, timeout: number,
): Promise<Browser> {
    const deadline = Date.now() + timeout;
    const browserProcess = spawn(executablePath, await puppeteer.defaultArgs({ args, headless }), { stdio: 'ignore' });

    let launchError: Error | undefined;
    browserProcess.once('error', error => {
        launchError = new Error(`Failed to start Microsoft Edge: ${error.message}`, { cause: error });
    });
    // Edge can hand off to another process and exit successfully before its debugging endpoint is ready.
    browserProcess.once('exit', (code, signal) => {
        if (code !== 0) {
            launchError = new Error(`Microsoft Edge exited before connecting (${signal ?? `code ${code}`}).`);
        }
    });

    let browser: Browser | undefined;
    while (!browser) {
        if (launchError) {
            throw launchError;
        }
        try {
            browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` });
        } catch (error) {
            if (Date.now() >= deadline) {
                throw new Error(`Timed out waiting for Microsoft Edge on port ${port}.`, { cause: error });
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        }
    }

    try {
        await browser.waitForTarget(target => target.type() === TargetType.PAGE, {
            timeout: Math.max(1, deadline - Date.now()),
        });
    } catch (error) {
        await browser.disconnect();
        throw error;
    }
    return browser;
}
