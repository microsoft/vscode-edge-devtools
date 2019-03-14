//
// Copyright (C) Microsoft. All rights reserved.
//

import { ExtensionContext } from "vscode";

describe("extension", () => {
    describe("activate", () => {
        it("does nothing yet", async () => {
            const mockVSCode = { commands: { registerCommand: jest.fn() } };
            jest.doMock("vscode", () => mockVSCode, { virtual: true });
            jest.resetModules();

            // Create a fake context
            const context = {
                subscriptions: [],
            } as ExtensionContext;

            const newExtension = await import("./extension");
            newExtension.activate(context);
            expect(context.subscriptions.length).toBe(0);
        });
    });
});
