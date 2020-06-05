// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";

describe("textSelection", () => {
    it("applySetupTextSelectionPatch correctly changes text", async () => {
        const filePath = "elements/ElementsPanessl.js"
        let fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

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
