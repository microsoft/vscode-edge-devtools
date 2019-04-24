// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Allow unused variables in the mocks to have leading underscore
// tslint:disable: variable-name

import { Disposable, ExtensionContext, WebviewPanel } from "vscode";
import { webviewEventNames } from "./common/webviewEvents";
import { PanelSocket } from "./panelSocket";
import { createFakeExtensionContext, createFakeVSCode, getFirstCallback, Mocked, Writable } from "./test/helpers";
import { SETTINGS_PREF_DEFAULTS, SETTINGS_PREF_NAME } from "./utils";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });

describe("devtoolsPanel", () => {
    let context: ExtensionContext;
    let mockPanel: Mocked<WebviewPanel>;
    let mockPanelSocket: Mocked<PanelSocket>;
    let mockPanelSocketFactory: { PanelSocket: jest.Mock };
    let mockWebviewEvents: { encodeMessageForChannel: jest.Mock };

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

        mockPanelSocket = {
            dispose: jest.fn(),
            on: jest.fn(),
            onMessageFromWebview: jest.fn(),
        } as Mocked<PanelSocket>;

        mockPanelSocketFactory = {
            PanelSocket: jest.fn(() => mockPanelSocket),
        };
        jest.doMock("./panelSocket", () => mockPanelSocketFactory);

        mockWebviewEvents = {
            encodeMessageForChannel: jest.fn(),
        };
        jest.doMock("./common/webviewEvents", () => mockWebviewEvents);

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
            const addDisposable = () => (...args: any): Disposable => {
                const [, , disposables] = args;
                const disposable = {
                    dispose: jest.fn(),
                };
                expectedDisposables.push(disposable);
                disposables.push(disposable);
                return { dispose: jest.fn() };
            };

            // Mock out each callback
            mockPanel.onDidDispose.mockImplementation(addDisposable());
            mockPanel.onDidChangeViewState.mockImplementation(addDisposable());
            mockPanel.webview.onDidReceiveMessage.mockImplementation(addDisposable());

            // Create the panel
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(mockPanel.onDidDispose).toHaveBeenCalled();

            // Ensure that dispose correctly called each disposable
            const { callback, thisObj } = getFirstCallback(mockPanel.onDidDispose);
            callback.call(thisObj);
            expect(mockPanel.dispose).toHaveBeenCalled();
            expect(mockPanelSocket.dispose).toBeCalled();
            for (const d of expectedDisposables) {
                expect(d.dispose).toHaveBeenCalled();
            }
        });
    });

    describe("update", () => {
        it("adds html to the webview only when visible", async () => {
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");
            expect(mockPanel.onDidChangeViewState).toHaveBeenCalled();

            const { callback, thisObj } = getFirstCallback(mockPanel.onDidChangeViewState);

            const testPanel: Writable<WebviewPanel> = mockPanel;

            // Not visible
            testPanel.visible = false;
            callback.call(thisObj);
            expect(mockPanel.webview.html).toBeUndefined();

            // Visible
            testPanel.visible = true;
            callback.call(thisObj);
            expect(mockPanel.webview.html).toBeDefined();
        });
    });

    describe("panelSocket", () => {
        it("listens for all the emit events", async () => {
            const hookedEvents: string[] = [];
            mockPanelSocket.on.mockImplementation(((name: string | symbol, ...args: any) => {
                hookedEvents.push(name.toString());
                return mockPanelSocket;
            }));

            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");

            expect(mockPanelSocket.on).toHaveBeenCalledTimes(Object.keys(webviewEventNames).length);
            for (const e of webviewEventNames) {
                expect(hookedEvents).toContain(e);
            }
        });

        it("forwards webview messages to the panel socket", async () => {
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");

            const expectedMessage = "some message that should be passed through";
            const { callback, thisObj } = getFirstCallback(mockPanel.webview.onDidReceiveMessage);
            callback.call(thisObj, expectedMessage);
            expect(mockPanelSocket.onMessageFromWebview).toBeCalledWith(expectedMessage);
        });

        it("forwards panel socket messages to the webview", async () => {
            const dtp = await import("./devtoolsPanel");
            dtp.DevToolsPanel.createOrShow(context, "");

            const expectedEvent = "message";
            const expectedMessage = "some message that should be passed through";
            const { callback, thisObj } = getFirstCallback(mockPanelSocketFactory.PanelSocket, 1);
            callback.call(thisObj, expectedEvent, expectedMessage);
            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "websocket",
                {event: expectedEvent, message: expectedMessage},
            );

            // Ensure that the encoded message is actually passed over to the webview
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(expectedPostedMessage);
        });

        describe("events", () => {
            let hookedEvents: Map<string, (msg: string) => void>;
            beforeEach(() => {
                hookedEvents = new Map();
                mockPanelSocket.on.mockImplementation((
                    (name: string | symbol, callback: (msg: string) => void, ...args: any) => {
                        hookedEvents.set(name.toString(), callback);
                        return mockPanelSocket;
                    }),
                );
            });

            it("does nothing yet for ready", async () => {
                const dtp = await import("./devtoolsPanel");
                dtp.DevToolsPanel.createOrShow(context, "");

                hookedEvents.get("ready")!(JSON.stringify({}));
                expect(context.workspaceState.get).not.toHaveBeenCalled();
            });

            it("does nothing yet for websocket", async () => {
                const dtp = await import("./devtoolsPanel");
                dtp.DevToolsPanel.createOrShow(context, "");

                hookedEvents.get("websocket")!(JSON.stringify({}));
                expect(context.workspaceState.get).not.toHaveBeenCalled();
            });

            it("does nothing yet for telemetry", async () => {
                const dtp = await import("./devtoolsPanel");
                dtp.DevToolsPanel.createOrShow(context, "");

                hookedEvents.get("telemetry")!(JSON.stringify({}));
                expect(context.workspaceState.get).not.toHaveBeenCalled();
            });

            it("posts result of get state", async () => {
                const expectedId = { id: 0 };
                const expectedState = { ...expectedId, someKey: "someValue" };
                (context.workspaceState.get as jest.Mock).mockReturnValue(expectedState);

                const dtp = await import("./devtoolsPanel");
                dtp.DevToolsPanel.createOrShow(context, "");

                hookedEvents.get("getState")!(JSON.stringify(expectedId));
                expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                    expect.any(Function),
                    "getState",
                    { ...expectedId, preferences: expectedState },
                );

                // Ensure that the encoded message is actually passed over to the webview
                const expectedPostedMessage = "encodedMessage";
                const { callback, thisObj } = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
                callback.call(thisObj, expectedPostedMessage);
                expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(expectedPostedMessage);
            });

            it("posts defaults for get state", async () => {
                (context.workspaceState.get as jest.Mock).mockReturnValue(null);

                const dtp = await import("./devtoolsPanel");
                dtp.DevToolsPanel.createOrShow(context, "");

                const expectedId = { id: 0 };

                hookedEvents.get("getState")!(JSON.stringify(expectedId));
                expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                    expect.any(Function),
                    "getState",
                    { ...expectedId, preferences: SETTINGS_PREF_DEFAULTS },
                );
            });

            it("updates value for set state", async () => {
                const expectedState = {
                    key1: "value1",
                    key2: "value2",
                };
                (context.workspaceState.get as jest.Mock).mockReturnValue({
                    key1: "value1",
                });

                const dtp = await import("./devtoolsPanel");
                dtp.DevToolsPanel.createOrShow(context, "");

                hookedEvents.get("setState")!(JSON.stringify({
                    name: "key2",
                    value: "value2",
                }));
                expect(context.workspaceState.update).toHaveBeenCalledWith(SETTINGS_PREF_NAME, expectedState);
            });

            it("updates default value for set state", async () => {
                const expectedState = {
                    key1: "value1",
                };
                (context.workspaceState.get as jest.Mock).mockReturnValue(null);

                const dtp = await import("./devtoolsPanel");
                dtp.DevToolsPanel.createOrShow(context, "");

                hookedEvents.get("setState")!(JSON.stringify({
                    name: "key1",
                    value: "value1",
                }));
                expect(context.workspaceState.update).toHaveBeenCalledWith(SETTINGS_PREF_NAME, expectedState);
            });

            it("posts url content for get url", async () => {
                const expectedContent = "some content";
                const expectedRequest = {
                    id: 1,
                    url: "fake.com",
                };

                const mockUtils = {
                    fetchUri: jest.fn().mockResolvedValue(expectedContent),
                };
                jest.doMock("./utils", () => mockUtils);

                const dtp = await import("./devtoolsPanel");
                dtp.DevToolsPanel.createOrShow(context, "");

                await hookedEvents.get("getUrl")!(JSON.stringify(expectedRequest));
                expect(mockUtils.fetchUri).toBeCalledWith(expectedRequest.url);

                expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                    expect.any(Function),
                    "getUrl",
                    { id: expectedRequest.id, content: expectedContent },
                );

                // Ensure that the encoded message is actually passed over to the webview
                const expectedPostedMessage = "encodedMessage";
                const { callback, thisObj } = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
                callback.call(thisObj, expectedPostedMessage);
                expect(mockPanel.webview.postMessage).toHaveBeenCalledWith(expectedPostedMessage);
            });

            it("posts empty string for failed get url", async () => {
                const expectedRequest = {
                    id: 2,
                    url: "fake.com",
                };

                const mockUtils = {
                    fetchUri: jest.fn().mockRejectedValue(null),
                };
                jest.doMock("./utils", () => mockUtils);

                const dtp = await import("./devtoolsPanel");
                dtp.DevToolsPanel.createOrShow(context, "");

                await hookedEvents.get("getUrl")!(JSON.stringify(expectedRequest));
                expect(mockUtils.fetchUri).toBeCalledWith(expectedRequest.url);
                expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                    expect.any(Function),
                    "getUrl",
                    { id: expectedRequest.id, content: "" },
                );
            });
        });
    });
});
