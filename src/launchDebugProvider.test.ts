// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TelemetryReporter from "vscode-extension-telemetry";
import LaunchDebugProvider from "./launchDebugProvider";
import {
    createFakeExtensionContext,
    createFakeTelemetryReporter,
    createFakeVSCode,
    getFirstCallback,
    Mocked,
} from "./test/helpers";
import { SETTINGS_STORE_NAME } from "./utils";

jest.mock("vscode", () => null, { virtual: true });

describe("launchDebugProvider", () => {
    let mockReporter: Mocked<Readonly<TelemetryReporter>>;
    let attach: jest.Mock;
    let launch: jest.Mock;
    let host: LaunchDebugProvider;

    beforeEach(async () => {
        mockReporter = createFakeTelemetryReporter();
        attach = jest.fn();
        launch = jest.fn();

        jest.doMock("vscode", () => createFakeVSCode(), { virtual: true });
        jest.resetModules();

        const { default: launchDebugProvider } = await import("./launchDebugProvider");
        host = new launchDebugProvider(createFakeExtensionContext(), mockReporter, attach, launch);
    });

    describe("provideDebugConfigurations", () => {
        it("returns a launch configuration", async () => {
            const result = await host.provideDebugConfigurations(undefined, undefined);
            expect(result).toBeDefined();
            expect(result![0].request).toEqual("launch");
            expect(result![0].type).toEqual(`${SETTINGS_STORE_NAME}.debug`);
        });
    });

    describe("resolveDebugConfiguration", () => {
        it("calls attach", async () => {
            const mockConfig = {
                name: "config",
                request: "attach",
                type: `${SETTINGS_STORE_NAME}.debug`,
            };
            await host.resolveDebugConfiguration(undefined, mockConfig, undefined);
            expect(attach).toHaveBeenCalled();
        });

        it("calls attach on edge debugger", async () => {
            const mockSetTimeout = jest.fn();
            global.setTimeout = mockSetTimeout;

            // Mock out the settings
            const expectedSettings = {
                autoAttachViaDebuggerForEdge: true,
                debugAttachTimeoutMs: 3000,
            };
            const configMock = {
                get: (name: string) => (expectedSettings as any)[name],
            };
            const vscodeMock = await jest.requireMock("vscode");
            vscodeMock.workspace.getConfiguration.mockImplementationOnce(() => configMock);

            // Use an edge debugger config
            const mockConfig = {
                name: "config",
                request: "launch",
                type: "edge",
                urlFilter: "http://localhost/index.html",
            };
            await host.resolveDebugConfiguration(undefined, mockConfig, undefined);

            const { callback, thisObj } = getFirstCallback(mockSetTimeout);
            callback.call(thisObj);

            expect(attach).toHaveBeenCalledWith(expect.any(Object), mockConfig.urlFilter, mockConfig, true);
        });

        it("calls launch", async () => {
            const mockConfig = {
                name: "config",
                request: "launch",
                type: `${SETTINGS_STORE_NAME}.debug`,
            };
            await host.resolveDebugConfiguration(undefined, mockConfig, undefined);
            expect(launch).toHaveBeenCalled();
        });

        it("applies the file value", async () => {
            const mockConfig = {
                file: "index.html",
                name: "config",
                request: "launch",
                type: `${SETTINGS_STORE_NAME}.debug`,
            };
            await host.resolveDebugConfiguration(undefined, mockConfig, undefined);
            expect(launch).toHaveBeenCalledWith(expect.any(Object), "file:///index.html", mockConfig);

            mockConfig.file = "/index.html";
            await host.resolveDebugConfiguration(undefined, mockConfig, undefined);
            expect(launch).toHaveBeenCalledWith(expect.any(Object), "file:///index.html", mockConfig);

            const mockFolder = {
                index: 0,
                name: "folder",
                uri: { path: "path" },
            };
            mockConfig.file = "${workspaceFolder}/index.html";
            await host.resolveDebugConfiguration(mockFolder as any, mockConfig, undefined);
            expect(launch).toHaveBeenCalledWith(expect.any(Object), "file:///path/index.html", mockConfig);
        });

        it("applies the url value", async () => {
            const mockConfig = {
                name: "config",
                request: "launch",
                type: `${SETTINGS_STORE_NAME}.debug`,
                url: "http://localhost/index.html",
            };
            await host.resolveDebugConfiguration(undefined, mockConfig, undefined);
            expect(launch).toHaveBeenCalledWith(expect.any(Object), mockConfig.url, mockConfig);
        });

        it("reports error on no config", async () => {
            const result = await host.resolveDebugConfiguration(undefined, null as any, undefined);
            expect(result).toBeUndefined();
            expect(mockReporter.sendTelemetryEvent).toHaveBeenCalled();
        });
    });
});
