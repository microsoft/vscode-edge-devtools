// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getFirstCallback, Mocked } from "../helpers/helpers";
import { IRuntimeResourceLoader } from "../../src/host/toolsResourceLoader";

describe("toolsResourceLoader", () => {
    let mockLoader: Mocked<IRuntimeResourceLoader>;
    let mockWebviewEvents: { encodeMessageForChannel: jest.Mock };
    let mockHost: { vscode: { postMessage: jest.Mock } };

    beforeEach(() => {
        mockLoader = {
            loadResourcePromise: jest.fn(),
        };

        mockWebviewEvents = {
            encodeMessageForChannel: jest.fn(),
        };

        mockHost = {
          vscode: {
              postMessage: jest.fn(),
          },
        };

        jest.doMock("../../src/host/host", () => mockHost);
        jest.doMock("../../src/common/webviewEvents", () => mockWebviewEvents);
        jest.resetModules();
    });

    describe("overrideResourceLoading", () => {
        it("overrides load resource promise correctly", async () => {
            const originalLoader = mockLoader.loadResourcePromise;

            const trl = await import("../../src/host/toolsResourceLoader");
            const resourceLoader = trl.ToolsResourceLoader.overrideResourceLoading(mockLoader);

            expect(resourceLoader).toBeDefined();
            expect(mockLoader.loadResourcePromise).not.toEqual(originalLoader);
        });
    });

    describe("loadResource", () => {
        it("uses channel to request http url", async () => {
            const trl = await import("../../src/host/toolsResourceLoader");
            const resourceLoader = trl.ToolsResourceLoader.overrideResourceLoading(mockLoader);

            const expectedUrl = "http://file.url";
            const contentPromise = mockLoader.loadResourcePromise(expectedUrl);
            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "getUrl",
                expect.objectContaining({ id: 0, url: expectedUrl }),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(mockHost.vscode.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");

            // Ensure that a message back from the extension will complete the original promise
            const expectedContent = "some http content";
            resourceLoader.onResolvedUrlFromChannel(0, expectedContent);

            const content = await contentPromise;
            expect(content).toEqual(expectedContent);
        });

        it("uses channel to request https url", async () => {
            const trl = await import("../../src/host/toolsResourceLoader");
            const resourceLoader = trl.ToolsResourceLoader.overrideResourceLoading(mockLoader);

            const expectedUrl = "https://file.url";
            const contentPromise = mockLoader.loadResourcePromise(expectedUrl);
            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "getUrl",
                expect.objectContaining({ id: 0, url: expectedUrl }),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(mockHost.vscode.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");

            // Ensure that a message back from the extension will complete the original promise
            const expectedContent = "some https content";
            resourceLoader.onResolvedUrlFromChannel(0, expectedContent);

            const content = await contentPromise;
            expect(content).toEqual(expectedContent);
        });

        it("uses real loader for packaged files", async () => {
            const originalLoader = mockLoader.loadResourcePromise;

            const trl = await import("../../src/host/toolsResourceLoader");
            const resourceLoader = trl.ToolsResourceLoader.overrideResourceLoading(mockLoader);
            expect(resourceLoader).toBeDefined();

            const expectedUrl = "elements.js";
            const expectedContent = "some content for elements";

            originalLoader.mockResolvedValue(expectedContent);

            const content = await mockLoader.loadResourcePromise(expectedUrl);
            expect(originalLoader).toBeCalledWith(expectedUrl);
            expect(content).toEqual(expectedContent);
        });
    });
});
