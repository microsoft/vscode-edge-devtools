import { getFirstCallback } from "../test/helpers";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("toolsHost", () => {
    let mockWebviewEvents: { encodeMessageForChannel: jest.Mock };
    beforeEach(() => {
        window.parent.postMessage = jest.fn();

        mockWebviewEvents = {
            encodeMessageForChannel: jest.fn(),
        };
        jest.doMock("../common/webviewEvents", () => mockWebviewEvents);
        jest.resetModules();
    });

    describe("isHostedMode", () => {
        it("returns true", async () => {
            const th = await import("./toolsHost");
            const host = new th.ToolsHost();

            expect(host.isHostedMode()).toEqual(true);
        });
    });

    describe("getPreferences", () => {
        it("calls across to webview", async () => {
            const th = await import("./toolsHost");
            const host = new th.ToolsHost();

            const mockCallback = jest.fn();
            host.getPreferences(mockCallback);

            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "getState",
                expect.objectContaining([{ id: 0 }]),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");
        });

        it("fires callbacks on response from extension", async () => {
            const th = await import("./toolsHost");
            const host = new th.ToolsHost();

            const mockCallback = jest.fn();
            host.getPreferences(mockCallback);

            const mockCallback2 = jest.fn();
            host.getPreferences(mockCallback2);

            const expectedPref = { name: "myPref", value: "myValue" };
            const expectedArgs = { id: 0, preferences: { ...expectedPref } };
            host.onMessageFromChannel("getState", JSON.stringify(expectedArgs));
            expect(mockCallback).toHaveBeenCalledWith(expectedPref);

            const expectedPref2 = { name: "myPref2", value: "myValue2" };
            const expectedArgs2 = { id: 1, preferences: { ...expectedPref2 } };
            host.onMessageFromChannel("getState", JSON.stringify(expectedArgs2));
            expect(mockCallback2).toHaveBeenCalledWith(expectedPref2);
        });
    });

    describe("setPreferences", () => {
        it("calls across to webview", async () => {
            const th = await import("./toolsHost");
            const host = new th.ToolsHost();

            const expectedPref = {
                name: "myPreference",
                value: "myValue",
            };
            host.setPreference(expectedPref.name, expectedPref.value);

            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "setState",
                [expectedPref],
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");
        });
    });

    describe("recordEnumeratedHistogram", () => {
        it("calls across to extension", async () => {
            const th = await import("./toolsHost");
            const host = new th.ToolsHost();

            const expectedTelemetry = {
                data: 1000,
                event: "enumerated",
                name: "DevTools.InspectElement",
            };
            host.recordEnumeratedHistogram(expectedTelemetry.name, expectedTelemetry.data, 0);

            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "telemetry",
                expect.objectContaining([expectedTelemetry]),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");
        });
    });

    describe("recordPerformanceHistogram", () => {
        it("calls across to extension", async () => {
            const th = await import("./toolsHost");
            const host = new th.ToolsHost();

            const expectedTelemetry = {
                data: 500,
                event: "performance",
                name: "DevTools.Launch.Console",
            };
            host.recordPerformanceHistogram(expectedTelemetry.name, expectedTelemetry.data);

            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "telemetry",
                expect.objectContaining([expectedTelemetry]),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");
        });
    });

    describe("onMessageFromChannel", () => {
        it("does nothing yet on getUrl message", async () => {
            const th = await import("./toolsHost");
            const host = new th.ToolsHost();

            const expectedArgs = "some content";
            host.onMessageFromChannel("getUrl", expectedArgs);

            // TODO: Change test once implemented
            expect(window.parent.postMessage).not.toHaveBeenCalled();
        });

        it("calls onMessageFromChannel on websocket message", async () => {
            const mockToolsWS = {
                ToolsWebSocket: {
                    instance: {
                        onMessageFromChannel: jest.fn(),
                    },
                },
            };
            jest.doMock("./toolsWebSocket", () => mockToolsWS);

            const th = await import("./toolsHost");
            const host = new th.ToolsHost();

            const expectedArgs = ["message", "some websocket message"];
            host.onMessageFromChannel("websocket", JSON.stringify(expectedArgs));

            expect(mockToolsWS.ToolsWebSocket.instance.onMessageFromChannel).toHaveBeenCalledWith(
                expectedArgs[0],
                expectedArgs[1],
            );
        });
    });
});
