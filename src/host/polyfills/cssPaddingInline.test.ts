// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";

describe("cssPaddingInline", () => {
    it("applyPaddingInlineCssPatch correctly changes elements-disclosure text", async () => {
        const filePath = "elements/elements_module.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./cssPaddingInline");
        const result = apply.default(fileContents);
        expect(result).toEqual(
            expect.stringContaining(".elements-disclosure .gutter-container {\n        display: none !important;"));
    });

    it("applyPaddingInlineCssPatch correctly changes padding-inline-start text", async () => {
        const filePath = "elements/elements_module.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./cssPaddingInline");
        const result = apply.default(fileContents);
        expect(result).toEqual(expect.stringContaining("webkit-padding-start"));
    });

    it("applyPaddingInlineCssPatch ignores other text", async () => {
        const apply = await import("./cssPaddingInline");
        const expectedText = "body { scroll-padding-inline-start: 10px; }";
        const result = apply.default(expectedText);
        expect(result).toEqual(null);
    });
});
