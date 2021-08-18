// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import WebSocket from "ws";
import { Mocked } from "./helpers/helpers";
import type {BrowserVersionCdpResponse} from "../src/versionSocketConnection";

describe("versionDetectionSocket", () => {
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

    it("creates a new websocket on connection", async () => {
        const expected = {
            onmessage: mockWebSocket.onmessage,
            onopen: mockWebSocket.onopen,
        };
        const vs = await import("../src/versionSocketConnection");
        const versionSocket = new vs.BrowserVersionDetectionSocket("");

        versionSocket.detectVersion();
        expect(mockWebSocket.onmessage).not.toEqual(expected.onmessage);
        expect(mockWebSocket.onopen).not.toEqual(expected.onopen);
    });

    it("calculates revision correctly", async () => {
        const vs = await import("../src/versionSocketConnection");
        const versionSocket = new vs.BrowserVersionDetectionSocket("");

        const revisions: string[] = [];
        let headlessCount = 0;
        versionSocket.on("setCdnParameters", (msg: {revision: string, isHeadless: boolean}) => {
            if (msg.revision !== ""){
                revisions.push(msg.revision);
            }
            if (msg.isHeadless) {
                headlessCount++;
            }
        });

        const versionMessages: BrowserVersionCdpResponse[] = [
            { id: 0, result: { revision: "FAIL", product: "Edg/92.0.0.0"}},
            { id: 0, result: { revision: "PASS", product: "Edg/95.0.0.0"}},
            { id: 0, result: { revision: "PASS", product: "Edg/94.0.975.0"}},
            { id: 0, result: { revision: "FAIL", product: "Edg/94.0.100.0"}},
            { id: 0, result: { revision: "FAIL", product: "HeadlessEdg/92.0.0.0"}},
            { id: 0, result: { revision: "PASS", product: "HeadlessEdg/95.0.0.0"}},
            { id: 0, result: { revision: "PASS", product: "HeadlessEdg/94.0.975.0"}},
            { id: 0, result: { revision: "FAIL", product: "HeadlessEdg/94.0.100.0"}},
        ]

        for (const version of versionMessages) {
            versionSocket.detectVersion();
            mockWebSocket.onmessage.call(mockWebSocket, { data: JSON.stringify(version)});
        }

        expect(headlessCount).toEqual(4);
        expect(revisions.length).toEqual(4);
        for (const rev of revisions) {
            expect(rev).toEqual("PASS");
        }
    });
});
