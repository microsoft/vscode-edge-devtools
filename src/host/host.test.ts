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
            } as object,
        } as Mocked<HTMLIFrameElement>;

        mockDevToolsWindow = mockIframe.contentWindow as IDevToolsWindow;
    });

    describe("initialize", () => {
        it("hooks events correctly", async () => {
            const { default: initialize } = await import("./host");
            initialize(mockIframe);

            expect(mockIframe.onload).toBeDefined();
        });
    });

    describe("onload", () => {
        beforeEach(() => {
            // Disable lint rule so we can mock a constructor function that can be called with 'new'
            // tslint:disable-next-line: object-literal-shorthand only-arrow-functions
            jest.doMock("./toolsHost", () => (function ToolsHost() {
                return {
                    onMessageFromChannel: jest.fn(),
                };
            }));
            jest.doMock("./toolsResourceLoader", () => ({
                overrideResourceLoading: jest.fn(),
            }));
            jest.doMock("./toolsWebSocket");
            jest.resetModules();
        });

        it("skips events if there is no contentWindow", async () => {
            const { default: initialize } = await import("./host");
            initialize(mockIframe);

            const overwrite: Writable<Mocked<HTMLIFrameElement>> = mockIframe;
            overwrite.contentWindow = null;

            expect(mockIframe.onload).toBeDefined();
            mockIframe.onload!(new Event("load"));

            expect(mockDevToolsWindow.InspectorFrontendHost).toBeUndefined();
            expect(mockDevToolsWindow.WebSocket).toBeUndefined();
        });

        it("hooks events correctly", async () => {
            const { default: initialize } = await import("./host");
            initialize(mockIframe);

            expect(mockIframe.onload).toBeDefined();
            mockIframe.onload!(new Event("load"));

            expect(mockDevToolsWindow.InspectorFrontendHost).toBeDefined();
            expect(mockDevToolsWindow.WebSocket).toBeDefined();
            expect(mockGlobal.addEventListener).toBeCalledWith("message", expect.any(Function));
        });

        it("hides local storage", async () => {
            const { default: initialize } = await import("./host");
            initialize(mockIframe);
            mockIframe.onload!(new Event("load"));

            expect(mockDevToolsWindow.localStorage).toBeUndefined();

            const setter = Object.getOwnPropertyDescriptor(mockDevToolsWindow, "localStorage");
            expect(setter).toBeDefined();
            setter!.set!("some new value");
            expect(mockDevToolsWindow.localStorage).toBeUndefined();
        });
    });

    describe("message", () => {
        it("forwards message events correctly", async () => {
            const mockWebviewEvents = {
                parseMessageFromChannel: jest.fn(),
            };
            jest.doMock("../common/webviewEvents", () => mockWebviewEvents);
            jest.resetModules();

            const { default: initialize } = await import("./host");
            initialize(mockIframe);
            mockIframe.onload!(new Event("load"));

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
            const expectedData = "some data";
            onParsed.callback.call(onParsed.thisObj, expectedEvent, expectedData);
            expect(mockDevToolsWindow.InspectorFrontendHost.onMessageFromChannel).toHaveBeenCalledWith(
                expectedEvent,
                expectedData,
            );
        });
    });
});
