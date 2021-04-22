// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { testPatch } from "../../helpers/helpers";
import { applyPaddingInlineCssPatch } from "../../../src/host/polyfills/cssPaddingInline";

describe("cssPaddingInline", () => {
    it("applyPaddingInlineCssPatch correctly changes elements-disclosure text", async () => {
        const filePath = "elements/elements_module.js";
        const expectedStrings =
        [".elements-disclosure .gutter-container {\\n        display: none !important;\\n    }"];

        testPatch(filePath, applyPaddingInlineCssPatch, expectedStrings);
    });

    it("applyPaddingInlineCssPatch correctly changes padding-inline-start text", async () => {
        const filePath = "elements/elements_module.js";
        const expectedStrings = ["webkit-padding-start"];

        testPatch(filePath, applyPaddingInlineCssPatch, expectedStrings);
    });

    it("applyPaddingInlineCssPatch ignores other text", async () => {
        const sampleText = "body { scroll-padding-inline-start: 10px; }";
        const result = applyPaddingInlineCssPatch(sampleText);
        expect(result).toEqual(null);
    });
});
