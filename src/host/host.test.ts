// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getFirstCallback, Mocked, Writable } from "../test/helpers";
import { IDevToolsWindow } from "./host";

describe("host", () => {
    let mockGlobal: Mocked<Window>;
    let mockIframe: Mocked<HTMLIFrameElement>;
    let mockDevToolsWindow: IDevToolsWindow;

    beforeEach(() => {
        mockGlobal = global as object as Mocked<Window>;
        mockGlobal.addEventListener = jest.fn();

        mockIframe = {
            contentWindow: {
                addEventListener: jest.fn(),
                localStorage: jest.fn(),
                Root: {}
            } as object,
        } as Mocked<HTMLIFrameElement>;

        mockDevToolsWindow = mockIframe.contentWindow as IDevToolsWindow;
    });

    describe("initialize", () => {
        it("hooks events correctly", async () => {
            const host = await import("./host");
            host.initialize(mockIframe);

            expect(mockGlobal.addEventListener).toHaveBeenCalledWith("message", expect.any(Function));
            expect(mockDevToolsWindow.addEventListener).toHaveBeenCalledWith("DOMContentLoaded", expect.any(Function));

            expect(mockDevToolsWindow.InspectorFrontendHost).toBeDefined();
            expect(mockDevToolsWindow.WebSocket).toBeDefined();
        });

        it("skips events if there is no contentWindow", async () => {
            const overwrite: Writable<Mocked<HTMLIFrameElement>> = mockIframe;
            overwrite.contentWindow = null;

            const host = await import("./host");
            host.initialize(mockIframe);

            expect(mockGlobal.addEventListener).not.toHaveBeenCalled();
            expect(mockDevToolsWindow.addEventListener).not.toHaveBeenCalled();
            expect(mockDevToolsWindow.InspectorFrontendHost).toBeUndefined();
            expect(mockDevToolsWindow.WebSocket).toBeUndefined();
        });

        it("hides local storage", async () => {
            const host = await import("./host");
            host.initialize(mockIframe);

            expect(mockDevToolsWindow.localStorage).toBeUndefined();

            const setter = Object.getOwnPropertyDescriptor(mockDevToolsWindow, "localStorage");
            expect(setter).toBeDefined();
            setter!.set!("some new value");
            expect(mockDevToolsWindow.localStorage).toBeUndefined();
        });

        it("verifies that session storage cannot be modified", async () => {
            const host = await import("./host");
            host.initialize(mockIframe);

            expect(mockDevToolsWindow.sessionStorage).toBeDefined();
            const previousSessionStorage = mockDevToolsWindow.sessionStorage;
            const setter = Object.getOwnPropertyDescriptor(mockDevToolsWindow, "sessionStorage");
            expect(setter).toBeDefined();
            setter!.set!("some new value");
            expect(mockDevToolsWindow.sessionStorage).toMatchObject(previousSessionStorage);
        });
    });

    describe("DOMContentLoaded", () => {
        it("sets resource loader", async () => {
            const mockOverride = jest.fn();
            jest.doMock("./toolsResourceLoader", () => ({
                overrideResourceLoading: mockOverride,
            }));
            jest.resetModules();

            const host = await import("./host");
            host.initialize(mockIframe);

            const { callback, thisObj } = getFirstCallback(mockDevToolsWindow.addEventListener as jest.Mock, 1);
            callback.call(thisObj);

            expect(mockOverride).toHaveBeenCalled();
        });
    });

    describe("message", () => {
        it("forwards message events correctly", async () => {
            const mockWebviewEvents = {
                parseMessageFromChannel: jest.fn(),
            };
            jest.doMock("../common/webviewEvents", () => mockWebviewEvents);
            jest.doMock("./toolsHost", () => (function toolsHost() {
                return {
                    onMessageFromChannel: jest.fn(),
                };
            }));
            jest.resetModules();

            const host = await import("./host");
            host.initialize(mockIframe);

            const onMessage = getFirstCallback(mockGlobal.addEventListener, 1);
            expect(onMessage).toBeDefined();

            // Ensure that the message gets parsed correctly
            const expected = { data: "hello" };
            onMessage.callback.call(onMessage.thisObj, expected);
            expect(mockWebviewEvents.parseMessageFromChannel).toHaveBeenCalledWith(
                expected.data,
                expect.any(Function),
            );

            const onParsed = getFirstCallback(mockWebviewEvents.parseMessageFromChannel, 1);
            expect(onParsed).toBeDefined();

            // Ensure that the parsed data is passed on to the devtools via the host
            const expectedEvent = "websocket";
            const expectedData = JSON.stringify({ event: "event", message: "some message" });
            onParsed.callback.call(onParsed.thisObj, expectedEvent, expectedData);
            expect(mockDevToolsWindow.InspectorFrontendHost.onMessageFromChannel).toHaveBeenCalledWith(
                expectedEvent,
                expectedData,
            );
        });
    });
});
