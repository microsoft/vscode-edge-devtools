// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getFirstCallback, Mocked } from "../test/helpers";
import { IRuntimeResourceLoader } from "./toolsResourceLoader";

describe("toolsResourceLoader", () => {
    let mockLoader: Mocked<IRuntimeResourceLoader>;
    let mockWebviewEvents: { encodeMessageForChannel: jest.Mock };

    beforeEach(() => {
        window.parent.postMessage = jest.fn();

        mockLoader = {
            loadResourcePromise: jest.fn(),
        };

        mockWebviewEvents = {
            encodeMessageForChannel: jest.fn(),
        };
        jest.doMock("../common/webviewEvents", () => mockWebviewEvents);
        jest.resetModules();
    });

    describe("overrideResourceLoading", () => {
        it("overrides load resource promise correctly", async () => {
            const originalLoader = mockLoader.loadResourcePromise;

            const { default: toolsResourceLoader } = await import("./toolsResourceLoader");
            const resourceLoader = toolsResourceLoader.overrideResourceLoading(mockLoader);

            expect(resourceLoader).toBeDefined();
            expect(mockLoader.loadResourcePromise).not.toEqual(originalLoader);
        });
    });

    describe("loadResource", () => {
        it("uses channel to request http url", async () => {
            const { default: toolsResourceLoader } = await import("./toolsResourceLoader");
            const resourceLoader = toolsResourceLoader.overrideResourceLoading(mockLoader);

            const expectedUrl = "http://file.url";
            const contentPromise = mockLoader.loadResourcePromise(expectedUrl);
            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "getUrl",
                expect.objectContaining([{ id: 0, url: expectedUrl }]),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");

            // Ensure that a message back from the extension will complete the original promise
            const expectedContent = "some http content";
            resourceLoader.onResolvedUrlFromChannel(0, expectedContent);

            const content = await contentPromise;
            expect(content).toEqual(expectedContent);
        });

        it("uses channel to request https url", async () => {
            const { default: toolsResourceLoader } = await import("./toolsResourceLoader");
            const resourceLoader = toolsResourceLoader.overrideResourceLoading(mockLoader);

            const expectedUrl = "https://file.url";
            const contentPromise = mockLoader.loadResourcePromise(expectedUrl);
            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "getUrl",
                expect.objectContaining([{ id: 0, url: expectedUrl }]),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");

            // Ensure that a message back from the extension will complete the original promise
            const expectedContent = "some https content";
            resourceLoader.onResolvedUrlFromChannel(0, expectedContent);

            const content = await contentPromise;
            expect(content).toEqual(expectedContent);
        });

        it("uses real loader for packaged files", async () => {
            const originalLoader = mockLoader.loadResourcePromise;

            const { default: toolsResourceLoader } = await import("./toolsResourceLoader");
            const resourceLoader = toolsResourceLoader.overrideResourceLoading(mockLoader);
            expect(resourceLoader).toBeDefined();

            const expectedUrl = "elements.js";
            const expectedContent = "some content for elements";

            originalLoader.mockResolvedValue(expectedContent);

            const content = await mockLoader.loadResourcePromise(expectedUrl);
            expect(originalLoader).toBeCalledWith(expectedUrl);
            expect(content).toEqual(expectedContent);
        });

        it("overrides content of patched files", async () => {
            const originalLoader = mockLoader.loadResourcePromise;

            const expectedContent = "this is some fake content";

            const mockCustomElements = {
                applyCreateElementPatch: jest.fn(() => expectedContent),
                applyUIUtilsPatch: jest.fn(() => expectedContent),
            };
            const mockTextSelection = jest.fn(() => expectedContent);
            jest.doMock("./polyfills/customElements", () => mockCustomElements);
            jest.doMock("./polyfills/textSelection", () => mockTextSelection);
            jest.resetModules();

            const { default: toolsResourceLoader } = await import("./toolsResourceLoader");
            const resourceLoader = toolsResourceLoader.overrideResourceLoading(mockLoader);
            expect(resourceLoader).toBeDefined();

            originalLoader.mockResolvedValue(expectedContent);

            // Ensure UIUtils is patched
            const expectedUIUtilsUrl = "ui/UIUtils.js";
            const content = await mockLoader.loadResourcePromise(expectedUIUtilsUrl);
            expect(originalLoader).toBeCalledWith(expectedUIUtilsUrl);
            expect(mockCustomElements.applyUIUtilsPatch).toHaveBeenCalledWith(expectedContent);
            expect(content).toEqual(expectedContent);

            // Ensure DOMExtension is patched
            const expectedDOMExtensionUrl = "/dom_extension/DOMExtension.js";
            const content2 = await mockLoader.loadResourcePromise(expectedDOMExtensionUrl);
            expect(originalLoader).toBeCalledWith(expectedDOMExtensionUrl);
            expect(mockCustomElements.applyCreateElementPatch).toHaveBeenCalledWith(expectedContent);
            expect(content2).toEqual(expectedContent);

            // Ensure ElementsPanel is patched
            const expectedElementsPanelUrl = "elements/ElementsPanel.js";
            const content3 = await mockLoader.loadResourcePromise(expectedElementsPanelUrl);
            expect(originalLoader).toBeCalledWith(expectedElementsPanelUrl);
            expect(mockTextSelection).toHaveBeenCalledWith(expectedContent);
            expect(content3).toEqual(expectedContent);
        });
    });
});
