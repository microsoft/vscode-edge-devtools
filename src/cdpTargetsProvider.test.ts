// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Allow unused variables in the mocks to have leading underscore
// tslint:disable: variable-name

import { ExtensionContext } from "vscode";
import CDPTarget from "./cdpTarget";
import { createFakeExtensionContext, createFakeVSCode } from "./test/helpers";
import { IRemoteTargetJson } from "./utils";

describe("CDPTargetsProvider", () => {
    let mockContext: ExtensionContext;
    let mockVSCode: typeof import("vscode");

    beforeEach(() => {
        mockContext = createFakeExtensionContext();
        mockVSCode = createFakeVSCode() as any;

        jest.doMock("./cdpTarget", () => jest.fn());
        jest.doMock("vscode", () => mockVSCode, { virtual: true });
        jest.resetModules();
    });

    it("gets created successfully", async () => {
        const { default: cdpTargetsProvider } = await import("./cdpTargetsProvider");
        const provider = new cdpTargetsProvider(mockContext);
        expect(provider).toBeDefined();
    });

    it("returns the element from getTreeItem", async () => {
        const { default: cdpTargetsProvider } = await import("./cdpTargetsProvider");
        const provider = new cdpTargetsProvider(mockContext);
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
        const provider = new cdpTargetsProvider(mockContext);
        provider.refresh();
        expect(mockFire).toHaveBeenCalled();
    });

    it("calls getChildren on the element", async () => {
        const { default: cdpTargetsProvider } = await import("./cdpTargetsProvider");
        const provider = new cdpTargetsProvider(mockContext);
        const expectedChildren = [1, 2, 3];
        const mockElement = {
            getChildren: jest.fn(() => expectedChildren),
        } as any;
        const result = await provider.getChildren(mockElement);
        expect(result).toEqual(expectedChildren);
    });

    it("calls getChildren on the element", async () => {
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
        const provider = new cdpTargetsProvider(mockContext);
        const result = await provider.getChildren();
        expect(result.length).toEqual(allTargets.length);
    });
});
