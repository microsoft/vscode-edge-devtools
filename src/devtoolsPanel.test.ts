// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtensionContext } from "vscode";
import { createFakeExtensionContext, createFakeVSCode } from "./test/helpers";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });

describe("devtoolsPanel", () => {
    let context: ExtensionContext;

    beforeEach(() => {
        context = createFakeExtensionContext();
    });

    describe("createOrShow", () => {
        it("does nothing yet", async () => {
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(context.subscriptions.length).toEqual(0);
        });
    });
});
