// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import WebSocket from "ws";
import { WebviewEvents } from "./common/webviewEvents";
import { Mocked } from "./test/helpers";

describe("panelSocket", () => {
    let mockWebSocket: Mocked<WebSocket>;

    beforeEach(() => {
        mockWebSocket = {
            close: jest.fn(),
            onclose: jest.fn(),
            onerror: jest.fn(),
            onmessage: jest.fn(),
            onopen: jest.fn(),
            send: jest.fn(),
        } as object as Mocked<WebSocket>;

        // tslint:disable-next-line: object-literal-shorthand only-arrow-functions
        const mockWebSocketFactory = function() {
            return mockWebSocket;
        };

        jest.doMock("ws", () => mockWebSocketFactory);
        jest.resetModules();
    });

    it("creates new websocket on first websocket message", async () => {
        const expected = {
            onclose: mockWebSocket.onclose,
            onerror: mockWebSocket.onerror,
            onmessage: mockWebSocket.onmessage,
            onopen: mockWebSocket.onopen,
        };
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", jest.fn());

        panelSocket.onMessageFromWebview(`${WebviewEvents.websocket}:""`);
        expect(mockWebSocket.onclose).not.toEqual(expected.onclose);
        expect(mockWebSocket.onerror).not.toEqual(expected.onerror);
        expect(mockWebSocket.onmessage).not.toEqual(expected.onmessage);
        expect(mockWebSocket.onopen).not.toEqual(expected.onopen);
    });

    it("creates new websocket and hooks all events on each ready message", async () => {
        const expected = {
            onclose: mockWebSocket.onclose,
            onerror: mockWebSocket.onerror,
            onmessage: mockWebSocket.onmessage,
            onopen: mockWebSocket.onopen,
        };
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", jest.fn());

        panelSocket.onMessageFromWebview(`${WebviewEvents.ready}:args`);
        expect(mockWebSocket.onclose).not.toEqual(expected.onclose);
        expect(mockWebSocket.onerror).not.toEqual(expected.onerror);
        expect(mockWebSocket.onmessage).not.toEqual(expected.onmessage);
        expect(mockWebSocket.onopen).not.toEqual(expected.onopen);

        expected.onclose = mockWebSocket.onclose;
        expected.onerror = mockWebSocket.onerror;
        expected.onmessage = mockWebSocket.onmessage;
        expected.onopen = mockWebSocket.onopen;

        panelSocket.onMessageFromWebview(`${WebviewEvents.ready}:args`);
        expect(mockWebSocket.onclose).not.toEqual(expected.onclose);
        expect(mockWebSocket.onerror).not.toEqual(expected.onerror);
        expect(mockWebSocket.onmessage).not.toEqual(expected.onmessage);
        expect(mockWebSocket.onopen).not.toEqual(expected.onopen);
    });

    it("disposes websocket correctly", async () => {
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", jest.fn());

        panelSocket.onMessageFromWebview(`${WebviewEvents.ready}:args`);
        panelSocket.dispose();
        expect(mockWebSocket.onclose).toBeUndefined();
        expect(mockWebSocket.onerror).toBeUndefined();
        expect(mockWebSocket.onmessage).toBeUndefined();
        expect(mockWebSocket.onopen).toBeUndefined();
        expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it("buffers messages until connection is open", async () => {
        const expectedMessages = [
            "{hello}",
            "{there}",
            "{world}",
        ];
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", jest.fn());

        // Create the websocket
        panelSocket.onMessageFromWebview(`${WebviewEvents.ready}:args`);

        // Queue up some messages and make sure they haven't been sent
        for (const m of expectedMessages) {
            panelSocket.onMessageFromWebview(`${WebviewEvents.websocket}:"${m}"`);
        }
        expect(mockWebSocket.send).not.toBeCalled();

        // Connect the websocket and ensure the messages are now pumped through
        mockWebSocket.onopen.call(mockWebSocket);
        for (let i = 0; i < expectedMessages.length; i++) {
            expect(mockWebSocket.send).toHaveBeenNthCalledWith(i + 1, expectedMessages[i]);
        }
        expect(mockWebSocket.send).toHaveBeenCalledTimes(expectedMessages.length);

        // Now the websocket is open, send a final message that should not be queued up
        panelSocket.onMessageFromWebview(`${WebviewEvents.websocket}:"{final}"`);
        expect(mockWebSocket.send).toHaveBeenNthCalledWith(expectedMessages.length + 1, "{final}");
    });

    it("posts back messages once connected", async () => {
        const expectedMessage = { data: "hello world" };
        const mockPost = jest.fn();
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", mockPost);

        // Create the websocket
        panelSocket.onMessageFromWebview(`${WebviewEvents.ready}:args`);

        // Should ignore messages before the socket is open
        mockWebSocket.onmessage.call(mockWebSocket, expectedMessage);
        expect(mockPost).not.toHaveBeenCalled();

        // Opening should post a message to say it was connected
        mockWebSocket.onopen.call(mockWebSocket);
        expect(mockPost).toHaveBeenNthCalledWith(1, "open");

        // Once open we should get the message posted
        mockWebSocket.onmessage.call(mockWebSocket, expectedMessage);
        expect(mockPost).toHaveBeenNthCalledWith(2, expectedMessage.data);
    });

    it("posts back errors once connected", async () => {
        const mockPost = jest.fn();
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", mockPost);

        // Create the websocket
        panelSocket.onMessageFromWebview(`${WebviewEvents.ready}:args`);

        // Should ignore messages before the socket is open
        mockWebSocket.onerror.call(mockWebSocket);
        expect(mockPost).not.toHaveBeenCalled();

        // Once open we should get the error message posted
        mockWebSocket.onopen.call(mockWebSocket);
        mockWebSocket.onerror.call(mockWebSocket);
        expect(mockPost).toHaveBeenNthCalledWith(2, "error");
    });

    it("posts back close once connected", async () => {
        const mockPost = jest.fn();
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", mockPost);

        // Create the websocket
        panelSocket.onMessageFromWebview(`${WebviewEvents.ready}:args`);

        // Should ignore messages before the socket is open
        mockWebSocket.onclose.call(mockWebSocket);
        expect(mockPost).not.toHaveBeenCalled();

        // Once open we should get the error message posted
        mockWebSocket.onopen.call(mockWebSocket);
        mockWebSocket.onclose.call(mockWebSocket);
        expect(mockPost).toHaveBeenNthCalledWith(2, "close");

        // Should ignore messages once closed
        mockWebSocket.onclose.call(mockWebSocket);
        expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it("emits messages correctly", async () => {
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", jest.fn());

        const actualMessages: string[] = [];
        for (const e in WebviewEvents) {
            if (!WebviewEvents.hasOwnProperty(e)) { continue; }
            panelSocket.on(e, (msg: string) => {
                actualMessages.push(`${e}:${msg}`);
            });
        }

        // Should emit each event
        for (const e in WebviewEvents) {
            if (!WebviewEvents.hasOwnProperty(e)) { continue; }
            panelSocket.onMessageFromWebview(`${e}:${JSON.stringify(e)}`);
        }
        expect(actualMessages.length).toEqual(Object.keys(WebviewEvents).length);
        for (const e of actualMessages) {
            const i = e.indexOf(":");
            const name = e.substr(0, i);
            expect(e).toEqual(`${name}:${JSON.stringify(name)}`);
        }
    });
});
