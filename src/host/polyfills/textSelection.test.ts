// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("textSelection", () => {
    it("applySetupTextSelectionPatch correctly changes text", async () => {
        const apply = await import("./textSelection");
        const result = apply.default("_setupTextSelectionHack(stylePaneWrapperElement) { code }");
        expect(result).toEqual("_setupTextSelectionHack() { return; code }");
    });

    it("applySetupTextSelectionPatch ignores other text", async () => {
        const apply = await import("./textSelection");
        const expectedText = "hello world";
        const result = apply.default(expectedText);
        expect(result).toEqual(expectedText);
    });
});
