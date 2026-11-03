// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import puppeteer, { Browser } from 'puppeteer-core';
import { launchAndConnectToBrowser } from '../src/browserLauncher';

jest.mock('child_process', () => ({ spawn: jest.fn() }));

describe('launchAndConnectToBrowser', () => {
    let browserProcess: ChildProcess;
    let browser: Browser;
    let waitForTarget: jest.Mock;
    let disconnect: jest.Mock;
    const args = ['--remote-debugging-port=9222'];

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        browserProcess = Object.assign(new EventEmitter(), { kill: jest.fn() }) as unknown as ChildProcess;
        jest.mocked(spawn).mockReturnValue(browserProcess);
        jest.mocked(puppeteer.defaultArgs).mockImplementation(async options => options?.args ?? []);
        waitForTarget = jest.fn().mockResolvedValue({});
        disconnect = jest.fn().mockResolvedValue(undefined);
        const partialBrowser: Partial<Browser> = { waitForTarget, disconnect };
        browser = partialBrowser as Browser;
        jest.mocked(puppeteer.connect).mockResolvedValue(browser);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function launch(timeout = 1000): Promise<Browser> {
        return launchAndConnectToBrowser('edge.exe', 9222, args, false, timeout);
    }

    it('starts Edge with the standard arguments and connects to its debugging endpoint', async () => {
        expect(await launch()).toBe(browser);
        expect(puppeteer.defaultArgs).toHaveBeenCalledWith({ args, headless: false });
        expect(spawn).toHaveBeenCalledWith('edge.exe', args, { stdio: 'ignore' });
        expect(puppeteer.connect).toHaveBeenCalledWith({ browserURL: 'http://127.0.0.1:9222' });
        expect(waitForTarget).toHaveBeenCalledWith(expect.any(Function), { timeout: 1000 });
    });

    it('keeps waiting when the launcher process hands off and exits successfully', async () => {
        jest.mocked(puppeteer.connect).mockRejectedValueOnce(new Error('ECONNREFUSED'));
        const result = launch();
        await jest.advanceTimersByTimeAsync(0);
        browserProcess.emit('exit', 0, null);
        await jest.advanceTimersByTimeAsync(200);
        expect(await result).toBe(browser);
        expect(puppeteer.connect).toHaveBeenCalledTimes(2);
    });

    it('reports startup errors', async () => {
        jest.mocked(puppeteer.connect).mockRejectedValue(new Error('ECONNREFUSED'));
        const result = launch();
        const rejection = expect(result).rejects.toThrow('Failed to start Microsoft Edge: not found');
        await jest.advanceTimersByTimeAsync(0);
        browserProcess.emit('error', new Error('not found'));
        await jest.advanceTimersByTimeAsync(200);
        await rejection;
    });

    it('reports unsuccessful exits', async () => {
        jest.mocked(puppeteer.connect).mockRejectedValue(new Error('ECONNREFUSED'));
        const result = launch();
        const rejection = expect(result).rejects.toThrow('Microsoft Edge exited before connecting (code 1).');
        await jest.advanceTimersByTimeAsync(0);
        browserProcess.emit('exit', 1, null);
        await jest.advanceTimersByTimeAsync(200);
        await rejection;
    });

    it('times out when the debugging endpoint never becomes available', async () => {
        jest.mocked(puppeteer.connect).mockRejectedValue(new Error('ECONNREFUSED'));
        const result = launch(500);
        const rejection = expect(result).rejects.toThrow('Timed out waiting for Microsoft Edge on port 9222.');
        await jest.advanceTimersByTimeAsync(600);
        await rejection;
    });

    it('disconnects and stops the launched process when no page becomes available', async () => {
        waitForTarget.mockRejectedValue(new Error('Waiting for target failed'));
        await expect(launch()).rejects.toThrow('Waiting for target failed');
        expect(disconnect).toHaveBeenCalledTimes(1);
        expect(browserProcess.kill).toHaveBeenCalledTimes(1);
    });

    it('times out when a connection attempt stalls past the deadline', async () => {
        jest.mocked(puppeteer.connect).mockReturnValue(new Promise<Browser>(() => undefined));
        const result = launch(500);
        const rejection = expect(result).rejects.toThrow('Timed out waiting for Microsoft Edge on port 9222.');
        await jest.advanceTimersByTimeAsync(500);
        await rejection;
    });
});
