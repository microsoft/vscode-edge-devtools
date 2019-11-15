import { getFirstCallback } from "../test/helpers";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("messaging", () => {
    let mockToolsWindow: { contentWindow: { postMessage: jest.Mock } };
    let mockVSCode: { postMessage: jest.Mock };
    let mockAcquireVsCodeApi: jest.Mock;

    beforeEach(() => {
        mockToolsWindow = {
            contentWindow: { postMessage: jest.fn() },
        };

        mockVSCode = {
            postMessage: jest.fn(),
        };

        mockAcquireVsCodeApi = jest.fn().mockReturnValue(mockVSCode);
        (window as any).acquireVsCodeApi = mockAcquireVsCodeApi;

        window.addEventListener = jest.fn();
        document.getElementById = jest.fn().mockReturnValue(mockToolsWindow);
    });

    it("acquires vscode api", async () => {
        const messaging = await import("./messaging");
        messaging.initializeMessaging();
        expect(mockAcquireVsCodeApi).toBeCalled();
    });

    it("hooks events correctly", async () => {
        const messaging = await import("./messaging");
        messaging.initializeMessaging();
        expect(window.addEventListener).toHaveBeenNthCalledWith(1, "DOMContentLoaded", expect.any(Function));
        expect(window.addEventListener).toHaveBeenNthCalledWith(2, "message", expect.any(Function));
    });

    it("caches tools window on dom content loaded", async () => {
        const messaging = await import("./messaging");
        messaging.initializeMessaging();

        const windowListenerMock = window.addEventListener as jest.Mock;
        expect(windowListenerMock).toHaveBeenCalled();

        const { callback, thisObj } = getFirstCallback(windowListenerMock, 1);
        callback.call(thisObj);
        expect(document.getElementById).toBeCalledTimes(1);
    });

    it("posts message based on protocol", async () => {
        const messaging = await import("./messaging");
        messaging.initializeMessaging();

        const windowListenerMock = window.addEventListener as jest.Mock;
        expect(windowListenerMock).toHaveBeenCalledTimes(2);

        // Simulate DOMContentLoaded
        const { callback, thisObj } = getFirstCallback(windowListenerMock, 1);
        callback.call(thisObj);

        const messageCallback = windowListenerMock.mock.calls[1][1];
        const messageThis = windowListenerMock.mock.instances[1];

        const expectedToolsWindowMessage = "to tools window";
        messageCallback.call(messageThis,
            { source: { location: { protocol: "data:" } }, data: expectedToolsWindowMessage } as MessageEvent);
        expect(mockToolsWindow.contentWindow.postMessage).toBeCalledWith(expectedToolsWindowMessage, "*");

        const expectedVSCodeMessage = "to vscode";
        messageCallback.call(messageThis,
            { source: { location: { protocol: "null" } }, data: expectedVSCodeMessage } as MessageEvent);
        expect(mockVSCode.postMessage).toBeCalledWith(expectedVSCodeMessage);
    });
});
