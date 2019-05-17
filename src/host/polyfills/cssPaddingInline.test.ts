// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("cssPaddingInline", () => {
    it("applyPaddingInlineCssPatch correctly changes text", async () => {
        const apply = await import("./cssPaddingInline");
        const result = apply.default("body { padding-inline-start: 10px; }");
        expect(result).toEqual("body { -webkit-padding-start: 10px; }");
    });

    it("applyPaddingInlineCssPatch ignores other text", async () => {
        const apply = await import("./cssPaddingInline");
        const expectedText = "body { scroll-padding-inline-start: 10px; }";
        const result = apply.default(expectedText);
        expect(result).toEqual(expectedText);
    });
});
