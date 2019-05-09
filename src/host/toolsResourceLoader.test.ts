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

        describe("overrides", () => {
            async function ensureOverride(
                expectedUrl: string,
                expectedContent: string,
                patch: jest.Mock,
                originalLoader: jest.Mock) {
                const content = await mockLoader.loadResourcePromise(expectedUrl);
                expect(originalLoader).toBeCalledWith(expectedUrl);
                expect(patch).toHaveBeenCalledWith(expectedContent);
                expect(content).toEqual(expectedContent);
            }

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

                await ensureOverride("ui/UIUtils.js", expectedContent,
                    mockCustomElements.applyUIUtilsPatch, originalLoader);
                await ensureOverride("/dom_extension/DOMExtension.js", expectedContent,
                    mockCustomElements.applyCreateElementPatch, originalLoader);
                await ensureOverride("elements/ElementsPanel.js", expectedContent,
                    mockTextSelection, originalLoader);
            });

            it("overrides content of patched files for simple view", async () => {
                const originalLoader = mockLoader.loadResourcePromise;

                const expectedContent = "this is some fake content";

                const mockView = {
                    applyCommonRevealerPatch: jest.fn(() => expectedContent),
                    applyInspectorCommonCssPatch: jest.fn(() => expectedContent),
                    applyInspectorViewPatch: jest.fn(() => expectedContent),
                    applyMainViewPatch: jest.fn(() => expectedContent),
                    applySelectTabPatch: jest.fn(() => expectedContent),
                };
                jest.doMock("./polyfills/simpleView", () => mockView);
                jest.resetModules();

                const { default: toolsResourceLoader } = await import("./toolsResourceLoader");
                const resourceLoader = toolsResourceLoader.overrideResourceLoading(mockLoader);
                expect(resourceLoader).toBeDefined();

                originalLoader.mockResolvedValue(expectedContent);

                await ensureOverride("ui/inspectorCommon.css", expectedContent,
                    mockView.applyInspectorCommonCssPatch, originalLoader);
                await ensureOverride("common/ModuleExtensionInterfaces.js", expectedContent,
                    mockView.applyCommonRevealerPatch, originalLoader);
                await ensureOverride("main/Main.js", expectedContent,
                    mockView.applyMainViewPatch, originalLoader);
                await ensureOverride("ui/InspectorView.js", expectedContent,
                    mockView.applyInspectorViewPatch, originalLoader);
                await ensureOverride("ui/TabbedPane.js", expectedContent,
                    mockView.applySelectTabPatch, originalLoader);
            });

            it("ignores overrides on later webview versions", async () => {
                const originalLoader = mockLoader.loadResourcePromise;

                const expectedContent = "this is some fake content";
                const mockTextSelection = jest.fn(() => expectedContent);
                jest.doMock("./polyfills/textSelection", () => mockTextSelection);
                jest.resetModules();

                const value = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)\
                    AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3777.0 Safari/537.36 Edg/76.0.147.0";
                Object.defineProperty((global as any).navigator, "userAgent", { value, writable: true });

                const { default: toolsResourceLoader } = await import("./toolsResourceLoader");
                const resourceLoader = toolsResourceLoader.overrideResourceLoading(mockLoader);
                expect(resourceLoader).toBeDefined();

                // Ensure ElementsPanel is not patched
                const expectedElementsPanelUrl = "elements/ElementsPanel.js";
                const content = await mockLoader.loadResourcePromise(expectedElementsPanelUrl);
                expect(originalLoader).toBeCalledWith(expectedElementsPanelUrl);
                expect(mockTextSelection).not.toHaveBeenCalled();
                expect(content).toBeUndefined();
            });
        });
    });
});
