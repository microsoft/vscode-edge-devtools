// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import WebSocket from "ws";
import { webviewEventNames } from "./common/webviewEvents";
import { Mocked } from "./test/helpers";

describe("panelSocket", () => {
    const readyMessage = "ready:args";
    let mockWebSocket: Mocked<WebSocket>;

    beforeEach(() => {
        mockWebSocket = {
            close: jest.fn(),
            onclose: jest.fn(),
            onerror: jest.fn(),
            onmessage: jest.fn(),
            onopen: jest.fn(),
            send: jest.fn(),
        } as Mocked<WebSocket>;

        // We need to use a non-arrow function here as it is used as a constructor.
        // tslint:disable-next-line: object-literal-shorthand only-arrow-functions
        jest.doMock("ws", () => function() { return mockWebSocket; });
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

        panelSocket.onMessageFromWebview(`websocket:""`);
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

        panelSocket.onMessageFromWebview(readyMessage);
        expect(mockWebSocket.onclose).not.toEqual(expected.onclose);
        expect(mockWebSocket.onerror).not.toEqual(expected.onerror);
        expect(mockWebSocket.onmessage).not.toEqual(expected.onmessage);
        expect(mockWebSocket.onopen).not.toEqual(expected.onopen);

        expected.onclose = mockWebSocket.onclose;
        expected.onerror = mockWebSocket.onerror;
        expected.onmessage = mockWebSocket.onmessage;
        expected.onopen = mockWebSocket.onopen;

        panelSocket.onMessageFromWebview(readyMessage);
        expect(mockWebSocket.onclose).not.toEqual(expected.onclose);
        expect(mockWebSocket.onerror).not.toEqual(expected.onerror);
        expect(mockWebSocket.onmessage).not.toEqual(expected.onmessage);
        expect(mockWebSocket.onopen).not.toEqual(expected.onopen);
    });

    it("disposes websocket correctly", async () => {
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", jest.fn());

        panelSocket.onMessageFromWebview(readyMessage);
        mockWebSocket.onopen.call(mockWebSocket);
        expect(panelSocket.isConnectedToTarget).toEqual(true);

        panelSocket.dispose();
        expect(mockWebSocket.close).toHaveBeenCalled();
        expect(panelSocket.isConnectedToTarget).toEqual(false);
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
        panelSocket.onMessageFromWebview(readyMessage);

        // Queue up some messages and make sure they haven't been sent
        for (const m of expectedMessages) {
            panelSocket.onMessageFromWebview(`websocket:${JSON.stringify({ message: m })}`);
        }
        expect(mockWebSocket.send).not.toBeCalled();

        // Connect the websocket and ensure the messages are now pumped through
        mockWebSocket.onopen.call(mockWebSocket);
        expect(mockWebSocket.send).toHaveBeenCalledTimes(expectedMessages.length);
        expectedMessages.forEach((msg, index) => {
            expect(mockWebSocket.send).toHaveBeenNthCalledWith(index + 1, msg);
        });

        // Now the websocket is open, send a final message that should not be queued up
        const expectedFinalMessage = "{final}";
        panelSocket.onMessageFromWebview(`websocket:${JSON.stringify({ message: expectedFinalMessage })}`);
        expect(mockWebSocket.send).toHaveBeenLastCalledWith(expectedFinalMessage);
    });

    it("posts back messages once connected", async () => {
        const expectedMessage = { data: "hello world" };
        const mockPost = jest.fn();
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", mockPost);

        // Create the websocket
        panelSocket.onMessageFromWebview(readyMessage);

        // Should ignore messages before the socket is open
        mockWebSocket.onmessage.call(mockWebSocket, expectedMessage);
        expect(mockPost).not.toHaveBeenCalled();
        expect(panelSocket.isConnectedToTarget).toEqual(false);

        // Opening should post a message to say it was connected
        mockWebSocket.onopen.call(mockWebSocket);
        expect(mockPost).toHaveBeenNthCalledWith(1, "open");
        expect(panelSocket.isConnectedToTarget).toEqual(true);

        // Once open we should get the message posted
        mockWebSocket.onmessage.call(mockWebSocket, expectedMessage);
        expect(mockPost).toHaveBeenNthCalledWith(2, "message", expectedMessage.data);
    });

    it("posts back errors once connected", async () => {
        const mockPost = jest.fn();
        const ps = await import("./panelSocket");
        const panelSocket = new ps.PanelSocket("", mockPost);

        // Create the websocket
        panelSocket.onMessageFromWebview(readyMessage);

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
        panelSocket.onMessageFromWebview(readyMessage);

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
        for (const e of webviewEventNames) {
            panelSocket.on(e, (msg: string) => {
                actualMessages.push(`${e}:${msg}`);
            });
        }

        // Should emit each event
        for (const e of webviewEventNames) {
            panelSocket.onMessageFromWebview(`${e}:${JSON.stringify(e)}`);
        }
        expect(actualMessages.length).toEqual(webviewEventNames.length);
        for (const e of actualMessages) {
            const [name] = e.split(":");
            expect(e).toEqual(`${name}:${JSON.stringify(name)}`);
        }
    });
});
