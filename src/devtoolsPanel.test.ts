// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtensionContext } from "vscode";

jest.mock("vscode", () => "mock", { virtual: true });

describe("devtoolsPanel", () => {
    let context: ExtensionContext;

    beforeEach(() => {
        context = {
            extensionPath: "",
            subscriptions: [],
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
            },
        } as any as ExtensionContext;
    });

    describe("createOrShow", () => {
        it("does nothing yet", async () => {
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(context.subscriptions.length).toEqual(0);
        });
    });
});
