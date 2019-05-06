// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("webviewVersion", () => {
    it("getWebviewVersion returns valid info", async () => {
        const value = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)\
            AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3777.0 Safari/537.36 Edg/76.0.147.0";
        Object.defineProperty((global as any).navigator , "userAgent", { value, writable: true });

        const { default:  getWebviewVersion } = await import("./webviewVersion");
        const result = getWebviewVersion();
        expect(result).toBeDefined();
        expect(result!.major).toEqual(76);
        expect(result!.minor).toEqual(0);
        expect(result!.build).toEqual(3777);
        expect(result!.revision).toEqual(0);
    });

    it("getWebviewVersion returns undefined on bad useragent", async () => {
        Object.defineProperty((global as any).navigator , "userAgent", { value: "Unknown", writable: true });
        const { default: getWebviewVersion } = await import("./webviewVersion");
        const result = getWebviewVersion();
        expect(result).toBeUndefined();
    });
});
