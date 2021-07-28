// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("mainMessaging", () => {
    it("calls initializeMessaging", async () => {
        const mockInit = jest.fn();
        jest.doMock("./messaging", () => {
            return {
                initializeMessaging: mockInit,
            };
        });

        await import("./mainMessaging");
        expect(mockInit).toHaveBeenCalled();
    });
});
