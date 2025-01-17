// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Allow unused variables in the mocks to have leading underscore
// tslint:disable: variable-name

import { ExtensionContext } from "vscode";
import TelemetryReporter from "@vscode/extension-telemetry";
import { CDPTarget } from "../src/cdpTarget";
import { createFakeExtensionContext, createFakeTelemetryReporter, createFakeVSCode, Mocked } from "./helpers/helpers";
import { IRemoteTargetJson } from "../src/utils";

describe("CDPTargetsProvider", () => {
    let mockContext: ExtensionContext;
    let mockVSCode: typeof import("vscode");
    let mockReporter: Mocked<Readonly<TelemetryReporter>>;

    beforeEach(() => {
        mockContext = createFakeExtensionContext();
        mockVSCode = createFakeVSCode() as any;
        mockReporter = createFakeTelemetryReporter();

        jest.doMock("../src/cdpTarget", () => ({ CDPTarget: jest.fn() }));
        jest.doMock("vscode", () => mockVSCode, { virtual: true });
        jest.resetModules();
    });

    it("gets created successfully", async () => {
        const ctp = await import("../src/cdpTargetsProvider");
        const provider = new ctp.CDPTargetsProvider(mockContext, mockReporter);
        expect(provider).toBeDefined();
    });

    it("returns the element from getTreeItem", async () => {
        const ctp = await import("../src/cdpTargetsProvider");
        const provider = new ctp.CDPTargetsProvider(mockContext, mockReporter);
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

        const ctp = await import("../src/cdpTargetsProvider");
        const provider = new ctp.CDPTargetsProvider(mockContext, mockReporter);
        provider.refresh();
        expect(mockFire).toHaveBeenCalled();
    });

    it("calls getChildren on the element", async () => {
        const ctp = await import("../src/cdpTargetsProvider");
        const provider = new ctp.CDPTargetsProvider(mockContext, mockReporter);
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
            isLocalResource: jest.fn(),
        };
        jest.doMock("../src/utils", () => mockUtils);
        jest.doMock("../src/cdpTarget", () => ({
            CDPTarget: jest.fn((json: IRemoteTargetJson) => ({ targetJson: json }))
        }));
        jest.resetModules();

        const ctp = await import("../src/cdpTargetsProvider");
        const provider = new ctp.CDPTargetsProvider(mockContext, mockReporter);
        const result = await provider.getChildren();
        expect(result.length).toEqual(allTargets.length);

        // Ensure that a bad response fires telemetry
        mockUtils.getListOfTargets!.mockResolvedValueOnce(null as any);
        const result2 = await provider.getChildren();
        expect(result2.length).toEqual(0);
        expect(mockReporter.sendTelemetryEvent).toHaveBeenCalled();
    });

    it("check if favicons are downloaded and cleared correctly", async () => {
        const ctp = await import("../src/cdpTargetsProvider");
        const fs = require('fs');
        const dir = './resources/favicons/';

        const provider = new ctp.CDPTargetsProvider(mockContext, mockReporter);
        let template: IRemoteTargetJson = {
            description: '',
            devtoolsFrontendUrl: '',
            faviconUrl: '',
            id: '',
            title: '',
            type: '',
            url: '',
            webSocketDebuggerUrl: ''
        }
        template.url = "https://learn.microsoft.com/microsoft-edge/";
        await provider.downloadFaviconFromSitePromise(template);
        const microsoftIcon = template.faviconUrl;
        template.url = "https://www.bing.com/";
        await provider.downloadFaviconFromSitePromise(template);
        const bingIcon = template.faviconUrl;
        expect(microsoftIcon).not.toEqual(null);
        expect(microsoftIcon).not.toEqual('');
        expect(microsoftIcon).not.toEqual(bingIcon);
        expect(bingIcon).not.toEqual(null);
        expect(bingIcon).not.toEqual('');
        const checkFileLengthPromise = new Promise<number>((resolve) => {
            fs.readdir(dir, (err: Error, files: File[]) => {
                resolve(files.length);
            });
        });
        const numFiles = await checkFileLengthPromise;
        expect(numFiles).toEqual(3); // Two favicon files plus the .gitkeep file.

        await provider.clearFaviconResourceDirectory();
        const checkFileLengthAfterDeletionPromise = new Promise<number>((resolve) => {
            fs.readdir(dir, (err: Error, files: File[]) => {
                resolve(files.length);
            });
        });
        const numFilesAfterDeletion = await checkFileLengthAfterDeletionPromise;
        expect(numFilesAfterDeletion).toEqual(1); // the .gitkeep file.
    });
});
