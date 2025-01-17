// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TelemetryReporter from "@vscode/extension-telemetry";
import { LaunchDebugProvider } from "../src/launchDebugProvider";
import {
    createFakeExtensionContext,
    createFakeTelemetryReporter,
    createFakeVSCode,
    Mocked,
} from "./helpers/helpers";
import { SETTINGS_STORE_NAME } from "../src/utils";

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

        const ldp = await import("../src/launchDebugProvider");
        host = new ldp.LaunchDebugProvider(createFakeExtensionContext(), mockReporter, attach, launch);
    });

    describe("provideDebugConfigurations", () => {
        it("returns a launch configuration", async () => {
            const result = await host.provideDebugConfigurations(undefined, undefined);
            expect(result).toBeDefined();
            expect(result![0].request).toEqual("launch");
            expect(result![0].type).toEqual('pwa-msedge');
        });
    });

    describe("resolveDebugConfigurationWithSubstitutedVariables", () => {
        it("calls attach", async () => {
            const mockConfig = {
                name: "config",
                request: "attach",
                type: `${SETTINGS_STORE_NAME}.debug`,
            };
            await host.resolveDebugConfigurationWithSubstitutedVariables(undefined, mockConfig, undefined);
            expect(attach).toHaveBeenCalled();
        });

        it("calls launch", async () => {
            const mockConfig = {
                name: "config",
                request: "launch",
                type: `${SETTINGS_STORE_NAME}.debug`,
            };
            await host.resolveDebugConfigurationWithSubstitutedVariables(undefined, mockConfig, undefined);
            expect(launch).toHaveBeenCalled();
        });

        it("applies the file value", async () => {
            const mockConfig = {
                file: "index.html",
                name: "config",
                request: "launch",
                type: `${SETTINGS_STORE_NAME}.debug`,
            };
            await host.resolveDebugConfigurationWithSubstitutedVariables(undefined, mockConfig, undefined);
            expect(launch).toHaveBeenCalledWith(expect.any(Object), "file:///index.html", mockConfig);

            mockConfig.file = "/index.html";
            await host.resolveDebugConfigurationWithSubstitutedVariables(undefined, mockConfig, undefined);
            expect(launch).toHaveBeenCalledWith(expect.any(Object), "file:///index.html", mockConfig);

            const mockFolder = {
                index: 0,
                name: "folder",
                uri: { path: "path" },
            };
            mockConfig.file = "${workspaceFolder}/index.html";
            await host.resolveDebugConfigurationWithSubstitutedVariables(mockFolder as any, mockConfig, undefined);
            expect(launch).toHaveBeenCalledWith(expect.any(Object), "file:///path/index.html", mockConfig);
        });

        it("applies the url value", async () => {
            const mockConfig = {
                name: "config",
                request: "launch",
                type: `${SETTINGS_STORE_NAME}.debug`,
                url: "http://localhost/index.html",
            };
            await host.resolveDebugConfigurationWithSubstitutedVariables(undefined, mockConfig, undefined);
            expect(launch).toHaveBeenCalledWith(expect.any(Object), mockConfig.url, mockConfig);
        });

        it("reports error on no config", async () => {
            const result = await host.resolveDebugConfigurationWithSubstitutedVariables(undefined, null as any, undefined);
            expect(result).toBeUndefined();
            expect(mockReporter.sendTelemetryEvent).toHaveBeenCalled();
        });
    });
});
