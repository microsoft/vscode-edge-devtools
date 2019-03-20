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

    it("hooks message event", async () => {
        const messaging = await import("./messaging");
        messaging.initializeMessaging();
        expect(window.addEventListener).toBeCalled();
    });

    it("caches tools window on first message", async () => {
        let messageCallback: ((e: MessageEvent) => void) | undefined;
        (window.addEventListener as jest.Mock).mockImplementation((name, callback) => {
            messageCallback = callback;
        });

        const messaging = await import("./messaging");
        messaging.initializeMessaging();
        expect(messageCallback).toBeDefined();

        const expectedMessage = { origin: "", data: "" } as MessageEvent;

        messageCallback!(expectedMessage);
        expect(document.getElementById).toBeCalledTimes(1);

        messageCallback!(expectedMessage);
        messageCallback!(expectedMessage);
        messageCallback!(expectedMessage);
        expect(document.getElementById).toBeCalledTimes(1);
    });

    it("posts message based on origin", async () => {
        let messageCallback: ((e: MessageEvent) => void) | undefined;
        (window.addEventListener as jest.Mock).mockImplementation((name, callback) => {
            messageCallback = callback;
        });

        const messaging = await import("./messaging");
        messaging.initializeMessaging();
        expect(messageCallback).toBeDefined();

        const expectedToolsWindowMessage = "to tools window";
        messageCallback!({ origin: "", data: expectedToolsWindowMessage } as MessageEvent);
        expect(mockToolsWindow.contentWindow.postMessage).toBeCalledWith(expectedToolsWindowMessage, "*");

        const expectedVSCodeMessage = "to vscode";
        messageCallback!({ origin: "vscode-resource://", data: expectedVSCodeMessage } as MessageEvent);
        expect(mockVSCode.postMessage).toBeCalledWith(expectedVSCodeMessage);
    });
});
