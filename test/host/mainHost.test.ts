// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("mainHost", () => {
    it("calls initialize", async () => {
        const mockInitialize = jest.fn();
        jest.doMock("../../src/host/host", () => ({ initialize: mockInitialize }));

        const mainHost = await import("../../src/host/mainHost");
        expect(mainHost).toBeDefined();
        expect(mockInitialize).toBeCalledWith(global);
    });
});
