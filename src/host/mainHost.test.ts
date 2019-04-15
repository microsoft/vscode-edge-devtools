// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("mainHost", () => {
    it("calls initialize", async () => {
        const mockInitialize = jest.fn();
        jest.doMock("./host", () => mockInitialize);

        const expectedFrame = {};
        (global as object as Window).document.getElementById = jest.fn().mockReturnValue(expectedFrame);

        const mainHost = await import("./mainHost");
        expect(mainHost).toBeDefined();
        expect(mockInitialize).toBeCalledWith(expectedFrame);
    });
});
