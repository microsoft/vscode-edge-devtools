// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Allow unused variables in the mocks to have leading underscore
// tslint:disable: variable-name

import { createFakeVSCode } from "./helpers/helpers";
import { IRemoteTargetJson } from "../src/utils";

describe("CDPTarget", () => {
    let mockVSCode: typeof import("vscode");

    beforeEach(() => {
        mockVSCode = createFakeVSCode() as any;

        jest.doMock("vscode", () => mockVSCode, { virtual: true });
        jest.resetModules();
    });

    it("gets created successfully", async () => {
        const json = {
            url: "url",
        } as IRemoteTargetJson;

        const ct = await import("../src/cdpTarget");
        const target = new ct.CDPTarget(json, "");
        expect(target).toBeDefined();
    });

    it("gets created with icon", async () => {
        const json = {
            title: "title",
            type: "extension",
            url: "url",
        } as IRemoteTargetJson;

        const ct = await import("../src/cdpTarget");
        const target = new ct.CDPTarget(json, "", "path");
        expect(target.iconPath).toBeDefined();
        expect((target.iconPath! as any).dark.fsPath).toEqual(
            expect.stringMatching(/path(\\|\/)resources(\\|\/)dark(\\|\/)extension.svg/g));
        expect((target.iconPath! as any).light.fsPath).toEqual(
            expect.stringMatching(/path(\\|\/)resources(\\|\/)light(\\|\/)extension.svg/g));
    });

    it("gets created with properties", async () => {
        const json = {
            title: "title",
            type: "extension",
            url: "url",
            webSocketDebuggerUrl: "webSocketDebuggerUrl",
        } as IRemoteTargetJson;

        const ct = await import("../src/cdpTarget");
        const target = new ct.CDPTarget(json, "");
        target.label = "label";
        expect(target.websocketUrl).toEqual(json.webSocketDebuggerUrl);
        expect(target.description).toEqual(json.url);
        expect(target.tooltip).toEqual(`label - ${json.url}`);

        const target2 = new ct.CDPTarget(json, "type");
        target2.label = "label";
        expect(target2.description).toEqual(json.type);
        expect(target2.tooltip).toEqual(`label - ${json.type}`);
    });

    it("gets children correctly", async () => {
        const json = {
            title: "title",
            type: "extension",
            url: "url",
            webSocketDebuggerUrl: "webSocketDebuggerUrl",
        } as IRemoteTargetJson;

        const ct = await import("../src/cdpTarget");
        const target = new ct.CDPTarget(json, "");
        expect(target.getChildren().length).toEqual(4);
    });
});
