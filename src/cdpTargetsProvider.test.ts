// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Allow unused variables in the mocks to have leading underscore
// tslint:disable: variable-name

import { ExtensionContext } from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import CDPTarget from "./cdpTarget";
import { createFakeExtensionContext, createFakeTelemetryReporter, createFakeVSCode, Mocked } from "./test/helpers";
import { IRemoteTargetJson } from "./utils";

describe("CDPTargetsProvider", () => {
    let mockContext: ExtensionContext;
    let mockVSCode: typeof import("vscode");
    let mockReporter: Mocked<Readonly<TelemetryReporter>>;

    beforeEach(() => {
        mockContext = createFakeExtensionContext();
        mockVSCode = createFakeVSCode() as any;
        mockReporter = createFakeTelemetryReporter();

        jest.doMock("./cdpTarget", () => jest.fn());
        jest.doMock("vscode", () => mockVSCode, { virtual: true });
        jest.resetModules();
    });

    it("gets created successfully", async () => {
        const { default: cdpTargetsProvider } = await import("./cdpTargetsProvider");
        const provider = new cdpTargetsProvider(mockContext, mockReporter);
        expect(provider).toBeDefined();
    });

    it("returns the element from getTreeItem", async () => {
        const { default: cdpTargetsProvider } = await import("./cdpTargetsProvider");
        const provider = new cdpTargetsProvider(mockContext, mockReporter);
        const expectedElement = {} as CDPTarget;
        expect(provider.getTreeItem(expectedElement)).toEqual(expectedElement);
    });

    it("fires event on refresh", async () => {
        const mockFire = jest.fn();
        mockVSCode.EventEmitter = function EventEmitter() {
            return {
                fire: mockFire,
            };
        } as any;

        const { default: cdpTargetsProvider } = await import("./cdpTargetsProvider");
        const provider = new cdpTargetsProvider(mockContext, mockReporter);
        provider.refresh();
        expect(mockFire).toHaveBeenCalled();
        expect(mockReporter.sendTelemetryEvent).toHaveBeenCalled();
    });

    it("calls getChildren on the element", async () => {
        const { default: cdpTargetsProvider } = await import("./cdpTargetsProvider");
        const provider = new cdpTargetsProvider(mockContext, mockReporter);
        const expectedChildren = [1, 2, 3];
        const mockElement = {
            getChildren: jest.fn(() => expectedChildren),
        } as any;
        const result = await provider.getChildren(mockElement);
        expect(result).toEqual(expectedChildren);
    });

    it("requests targets in getChildren when no element", async () => {
        const allTargets = [
            { title: "a", type: "page" },
            { title: "a", type: "page" },
            { title: "d", type: "extension" },
            { title: "c", type: "page" },
            { title: "b", type: "background" },
            { title: "e", type: "page" },
            { title: "f", type: "background" },
            { title: "e", type: "web" },
        ];

        // Mock out the imported utils
        const mockUtils = {
            fixRemoteWebSocket: jest.fn((_host, _port, json) => json),
            getListOfTargets: jest.fn().mockResolvedValue(allTargets),
            getRemoteEndpointSettings: jest.fn().mockReturnValue({
                hostname: "hostname",
                port: "port",
                useHttps: false,
            }),
        };
        jest.doMock("./utils", () => mockUtils);
        jest.doMock("./cdpTarget", () => function CDPTargetInstance(json: IRemoteTargetJson) {
            return { targetJson: json };
        });
        jest.resetModules();

        const { default: cdpTargetsProvider } = await import("./cdpTargetsProvider");
        const provider = new cdpTargetsProvider(mockContext, mockReporter);
        const result = await provider.getChildren();
        expect(result.length).toEqual(allTargets.length);

        // Ensure that a bad response fires telemetry
        mockUtils.getListOfTargets!.mockResolvedValueOnce(null as any);
        const result2 = await provider.getChildren();
        expect(result2.length).toEqual(0);
        expect(mockReporter.sendTelemetryEvent).toHaveBeenCalled();
    });
});
