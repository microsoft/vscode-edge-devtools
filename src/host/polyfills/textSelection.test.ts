// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";

describe("textSelection", () => {
    it("applySetupTextSelectionPatch correctly changes text", async () => {
        const comparableText = "_setupTextSelectionHack(stylePaneWrapperElement) { code }";
        let fileContents = getTextFromFile("elements/ElementsPanel.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

        const apply = await import("./textSelection");
        const result = apply.default(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining("_setupTextSelectionHack() { return;"));
    });

    it("applySetupTextSelectionPatch ignores other text", async () => {
        const apply = await import("./textSelection");
        const expectedText = "hello world";
        const result = apply.default(expectedText);
        expect(result).toEqual(null);
    });
});
