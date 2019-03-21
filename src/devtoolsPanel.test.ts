// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtensionContext, WebviewPanel } from "vscode";
import { createFakeExtensionContext, createFakeVSCode, Mocked } from "./test/helpers";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });

describe("devtoolsPanel", () => {
    let context: ExtensionContext;
    let mockPanel: Mocked<WebviewPanel>;

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
        } as Mocked<WebviewPanel>;

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

            // Create the function used for each event handler so that we can store the disposable objects
            // and ensure they get correctly disposed later
            const addDisposable = (isDispose: boolean) => (callback: () => void, thisArg: any, disposables: any[]) => {
                const disposable = {
                    dispose: jest.fn(),
                };
                expectedDisposables.push(disposable);
                disposables.push(disposable);
            };

            // Mock out each callback
            mockPanel.onDidDispose.mockImplementation(addDisposable(true) as any);
            mockPanel.onDidChangeViewState.mockImplementation(addDisposable(false) as any);
            mockPanel.webview.onDidReceiveMessage.mockImplementation(addDisposable(false) as any);

            // Create the panel
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(mockPanel.onDidDispose.mock.calls.length).toBeGreaterThan(0);

            // Ensure that dispose correctly called each disposable
            const disposeCallback = mockPanel.onDidDispose.mock.calls[0][0];
            const disposeThis = mockPanel.onDidDispose.mock.instances[0];
            disposeCallback.call(disposeThis);
            expect(mockPanel.dispose).toHaveBeenCalled();
            for (const d of expectedDisposables) {
                expect(d.dispose).toHaveBeenCalled();
            }
        });
    });

    describe("update", () => {
        it("adds html to the webview only when visible", async () => {
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(mockPanel.onDidChangeViewState.mock.calls.length).toBeGreaterThan(0);

            const updateCallback = mockPanel.onDidChangeViewState.mock.calls[0][0];
            const updateThis = mockPanel.onDidChangeViewState.mock.instances[0];

            // Not visible
            (mockPanel as any).visible = false;
            updateCallback.call(updateThis);
            expect(mockPanel.webview.html).toBeUndefined();

            // Visible
            (mockPanel as any).visible = true;
            updateCallback.call(updateThis);
            expect(mockPanel.webview.html).toBeDefined();
        });
    });
});
