// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    encodeMessageForChannel,
    parseMessageFromChannel,
    webviewEventNames,
} from "../common/webviewEvents";

describe("webviewEvents", () => {
    describe("parseMessageFromChannel", () => {
        it("calls emit on events", async () => {
            for (const e of webviewEventNames) {
                const expectedArgs = {
                    name: e,
                    someArg: "hello",
                };

                // Generate a message we can use for parsing
                let data = "";
                encodeMessageForChannel((msg) => data = msg, e, expectedArgs);

                // Ensure parsing it calls the correct emit event
                const mockEmit = jest.fn();
                parseMessageFromChannel(data, mockEmit);
                expect(mockEmit).toBeCalledWith(e, JSON.stringify(expectedArgs));
            }
        });

        it("returns false on unknown message", async () => {
            const mockEmit = jest.fn();
            const result = parseMessageFromChannel("some unknown event", mockEmit);
            expect(result).toBe(false);
            expect(mockEmit).not.toBeCalled();
        });
    });

    describe("postMessageAcrossChannel", () => {
        it("calls postMessageCallback with encoded data", async () => {
            for (const e of webviewEventNames) {
                const expectedArgs = {
                    name: e,
                    someArg: "hello",
                };
                const expectedFormat = `${e}:${JSON.stringify(expectedArgs)}`;

                const mockPostMessage = jest.fn();
                encodeMessageForChannel(mockPostMessage, e, expectedArgs);
                expect(mockPostMessage).toHaveBeenCalledWith(expectedFormat);
            }
        });
    });
});
