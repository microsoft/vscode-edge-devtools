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

    let processExited = false;
    let rejectOnProcessFailure: (error: Error) => void = () => undefined;
    const processFailure = new Promise<never>((_, reject) => {
        rejectOnProcessFailure = reject;
    });
    // Prevents an unhandled rejection if the process fails after the launch has settled.
    processFailure.catch(() => undefined);

    browserProcess.once('error', error => {
        processExited = true;
        rejectOnProcessFailure(new Error(`Failed to start Microsoft Edge: ${error.message}`, { cause: error }));
    });
    // Edge can hand off to another process and exit successfully before its debugging endpoint is ready.
    browserProcess.once('exit', (code, signal) => {
        processExited = true;
        if (code !== 0) {
            rejectOnProcessFailure(new Error(`Microsoft Edge exited before connecting (${signal ?? `code ${code}`}).`));
        }
    });

    let browser: Browser | undefined;
    try {
        browser = await connectBeforeDeadline(port, deadline, processFailure);
        await Promise.race([
            browser.waitForTarget(target => target.type() === TargetType.PAGE, {
                timeout: Math.max(1, deadline - Date.now()),
            }),
            processFailure,
        ]);
        return browser;
    } catch (error) {
        await browser?.disconnect().catch(() => undefined);
        // Only stop the process this launch still owns; after a successful handoff the
        // browser belongs to another (possibly pre-existing) Edge process.
        if (!processExited) {
            browserProcess.kill();
        }
        throw error;
    }
}

async function connectBeforeDeadline(port: number, deadline: number, processFailure: Promise<never>): Promise<Browser> {
    const timeoutMessage = `Timed out waiting for Microsoft Edge on port ${port}.`;
    let lastError: unknown;
    for (;;) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            throw new Error(timeoutMessage, { cause: lastError });
        }

        let timer: NodeJS.Timeout | undefined;
        const timedOut = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(timeoutMessage, { cause: lastError })), remaining);
        });
        const attempt = puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` });
        try {
            const outcome = await Promise.race([
                attempt.then(browser => ({ browser }), (error: unknown) => ({ error })),
                processFailure,
                timedOut,
            ]);
            if ('browser' in outcome) {
                return outcome.browser;
            }
            lastError = outcome.error;
        } catch (error) {
            // The launch was abandoned; don't leak a connection that completes afterwards.
            void attempt.then(browser => browser.disconnect(), () => undefined);
            throw error;
        } finally {
            clearTimeout(timer);
        }

        await Promise.race([
            new Promise(resolve => setTimeout(resolve, Math.min(RETRY_INTERVAL, Math.max(0, deadline - Date.now())))),
            processFailure,
        ]);
    }
}
