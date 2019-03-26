// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    parseMessageFromChannel,
    postMessageAcrossChannel,
    webviewEventNames,
} from "../common/webviewEvents";

describe("webviewEvents", () => {
    describe("parseMessageFromChannel", () => {
        it("calls emit on events", async () => {
            for (const e of webviewEventNames) {
                const expectedArgs = [{
                    name: e,
                    someArg: "hello",
                }];

                // Generate a message we can use for parsing
                const mockPostMessageObject = {
                    postMessage: jest.fn(),
                };
                postMessageAcrossChannel(mockPostMessageObject, e, expectedArgs);

                // Grab the data from the postMessage
                expect(mockPostMessageObject.postMessage).toHaveBeenCalled();
                const data = mockPostMessageObject.postMessage.mock.calls[0][0];

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
        it("calls postMessage with origin", async () => {
            for (const e of webviewEventNames) {
                const expectedOrigin = "*";
                const expectedArgs = [{
                    name: e,
                    someArg: "hello",
                }];
                const expectedFormat = `${e}:${JSON.stringify(expectedArgs)}`;

                const mockPostMessageObject = {
                    postMessage: jest.fn(),
                };
                postMessageAcrossChannel(mockPostMessageObject, e, expectedArgs);
                expect(mockPostMessageObject.postMessage).toHaveBeenCalledWith(expectedFormat);

                postMessageAcrossChannel(mockPostMessageObject, e, expectedArgs, expectedOrigin);
                expect(mockPostMessageObject.postMessage).toHaveBeenCalledWith(expectedFormat, expectedOrigin);
            }
        });
    });
});
