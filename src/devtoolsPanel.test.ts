// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtensionContext } from "vscode";
import { createFakeExtensionContext, createFakeVSCode } from "./test/helpers";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });

describe("devtoolsPanel", () => {
    let context: ExtensionContext;
    let mockPanel: any;

    beforeEach(() => {
        context = createFakeExtensionContext();

        mockPanel = {
            dispose: jest.fn(),
            onDidChangeViewState: jest.fn(),
            onDidDispose: jest.fn(),
            reveal: jest.fn(),
            webview: {
                onDidReceiveMessage: jest.fn(),
                postMessage: jest.fn(),
            },
        };

        const mockVSCode = createFakeVSCode();
        mockVSCode.window.createWebviewPanel.mockReturnValue(mockPanel);
        jest.doMock("vscode", () => mockVSCode, { virtual: true });
        jest.resetModules();
    });

    describe("createOrShow", () => {
        it("registers panel events correctly", async () => {
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(mockPanel.onDidChangeViewState).toHaveBeenCalled();
            expect(mockPanel.onDidDispose).toHaveBeenCalled();
        });

        it("calls reveal on existing instance", async () => {
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(mockPanel.reveal).toHaveBeenCalled();
        });
    });

    describe("dispose", () => {
        it("calls dispose on all event handlers", async () => {
            const expectedDisposables: Array<{ dispose: () => void }> = [];
            let expectedDisposeCallback: (() => void) | undefined;
            let expectedDisposeThis: object | undefined;

            // Create the function used for each event handler so that we can store the disposable object
            // and ensure it gets correctly disposed later
            const addDisposable = (isDispose: boolean) => (callback: () => void, thisArg: any, disposables: any[]) => {
                if (isDispose) {
                    expectedDisposeCallback = callback;
                    expectedDisposeThis = thisArg;
                }
                const disposable = {
                    dispose: jest.fn(),
                };
                expectedDisposables.push(disposable);
                disposables.push(disposable);
            };

            // Mock out each callback
            mockPanel.onDidDispose.mockImplementation(addDisposable(true));
            mockPanel.onDidChangeViewState.mockImplementation(addDisposable(false));
            mockPanel.webview.onDidReceiveMessage.mockImplementation(addDisposable(false));

            // Create the panel
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(expectedDisposeCallback).toBeDefined();
            expect(expectedDisposeThis).toBeDefined();

            // Ensure that dispose correctly called each disposable
            expectedDisposeCallback!.call(expectedDisposeThis);
            expect(mockPanel.dispose).toHaveBeenCalled();
            for (const d of expectedDisposables) {
                expect(d.dispose).toHaveBeenCalled();
            }
        });
    });

    describe("update", () => {
        it("adds html to the webview only when visible", async () => {
            let updateCallback: (() => void) | undefined;
            let updateThis: object | undefined;
            mockPanel.onDidChangeViewState.mockImplementation((callback: () => void, thisArg: any) => {
                updateCallback = callback;
                updateThis = thisArg;
            });

            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(updateCallback).toBeDefined();
            expect(updateThis).toBeDefined();

            // Not visible
            mockPanel.visible = false;
            updateCallback!.call(updateThis);
            expect(mockPanel.webview.html).toBeUndefined();

            // Visible
            mockPanel.visible = true;
            updateCallback!.call(updateThis);
            expect(mockPanel.webview.html).toBeDefined();
        });
    });
});
