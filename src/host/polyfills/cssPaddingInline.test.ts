// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";

describe("cssPaddingInline", () => {
    it("applyPaddingInlineCssPatch correctly changes elements-disclosure text", async () => {
        const comparableText = ".elements-disclosure .gutter-container {\n    position: absolute;\n    top: 0;\n    left: 0;\n    cursor: pointer;\n    width: 15px;\n    height: 15px;\n}";
        let fileContents = getTextFromFile("elements/elements_module.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

        const apply = await import("./cssPaddingInline");
        const result = apply.default(fileContents);
        expect(result).toEqual(expect.stringContaining(
            ".elements-disclosure .gutter-container {\n        display: none !important;"
        ));
    });

    it("applyPaddingInlineCssPatch correctly changes padding-inline-start text", async () => {
        const comparableText = "padding-inline-start: 6px;\n    border-width: 1px;\n"
        let fileContents = getTextFromFile("elements/elements_module.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

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
