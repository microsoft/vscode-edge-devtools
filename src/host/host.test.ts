// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getFirstCallback, Mocked } from "../test/helpers";
import { IDevToolsWindow } from "./host";

describe("host", () => {
    let mockGlobal: Mocked<IDevToolsWindow>;

    beforeEach(() => {
        mockGlobal = {
            Root: {},
            _importScriptPathPrefix: "",
            addEventListener: jest.fn(),
            localStorage: jest.fn(),
        } as object as Mocked<IDevToolsWindow>;
    });

    describe("initialize", () => {
        it("hooks events correctly", async () => {
            const host = await import("./host");
            host.initialize(mockGlobal);

            expect(mockGlobal.addEventListener).toHaveBeenNthCalledWith(1, "message", expect.any(Function), true);
            expect(mockGlobal.addEventListener).toHaveBeenNthCalledWith(2, "DOMContentLoaded", expect.any(Function));

            expect(mockGlobal.InspectorFrontendHost).toBeDefined();
            expect(mockGlobal.WebSocket).toBeDefined();
        });

        it("skips events if there is no contentWindow", async () => {
            const host = await import("./host");
            host.initialize(null as any as IDevToolsWindow);

            expect(mockGlobal.addEventListener).not.toHaveBeenCalled();
            expect(mockGlobal.InspectorFrontendHost).toBeUndefined();
            expect(mockGlobal.WebSocket).toBeUndefined();
        });

        it("hides local storage", async () => {
            const host = await import("./host");
            host.initialize(mockGlobal);

            expect(mockGlobal.localStorage).toBeUndefined();

            const setter = Object.getOwnPropertyDescriptor(mockGlobal, "localStorage");
            expect(setter).toBeDefined();
            setter!.set!("some new value");
            expect(mockGlobal.localStorage).toBeUndefined();
        });

        it("emulates session storage", async () => {
            const host = await import("./host");
            host.initialize(mockGlobal);

            expect(mockGlobal.sessionStorage).toBeDefined();

            const expectedKey = "key";
            const expectedVal = "value";
            (mockGlobal as any).sessionStorage[expectedKey] = expectedVal;
            expect(mockGlobal.sessionStorage[expectedKey]).toEqual(expectedVal);
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
            host.initialize(mockGlobal);

            mockGlobal._importScriptPathPrefix = "null/somepath";

            function getDOMLoadedCallback(mock: jest.Mock, callbackArgIndex: number = 0):
                // Allow us to type the callback as a general 'Function' so that we get enough typing to use .call();
                // tslint:disable-next-line: ban-types
                { callback: Function, thisObj: object } {
                return { callback: mock.mock.calls[1][callbackArgIndex], thisObj: mock.mock.instances[0] };
            }

            const { callback, thisObj } = getDOMLoadedCallback(mockGlobal.addEventListener as jest.Mock, 1);
            callback.call(thisObj);

            expect(mockOverride).toHaveBeenCalled();
            expect(mockGlobal._importScriptPathPrefix).toBe("vscode-resource:/somepath");
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
            host.initialize(mockGlobal);

            const onMessage = getFirstCallback(mockGlobal.addEventListener, 1);
            expect(onMessage).toBeDefined();

            // Ensure that the message gets parsed correctly
            const expected = { data: "hello", preventDefault: jest.fn(), stopImmediatePropagation: jest.fn() };
            const returnValue = onMessage.callback.call(onMessage.thisObj, expected);
            expect(returnValue).toBe(false);
            expect(mockWebviewEvents.parseMessageFromChannel).toHaveBeenCalledWith(
                expected.data,
                expect.any(Function),
            );
            expect(expected.preventDefault).toHaveBeenCalled();
            expect(expected.stopImmediatePropagation).toHaveBeenCalled();

            const onParsed = getFirstCallback(mockWebviewEvents.parseMessageFromChannel, 1);
            expect(onParsed).toBeDefined();

            // Ensure that the parsed data is passed on to the devtools via the host
            const expectedEvent = "websocket";
            const expectedData = JSON.stringify({ event: "event", message: "some message" });
            onParsed.callback.call(onParsed.thisObj, expectedEvent, expectedData);
            expect(mockGlobal.InspectorFrontendHost.onMessageFromChannel).toHaveBeenCalledWith(
                expectedEvent,
                expectedData,
            );
        });
    });
});
