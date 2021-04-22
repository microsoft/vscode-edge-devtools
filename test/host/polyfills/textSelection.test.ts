// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { testPatch } from "../../helpers/helpers";
import { applySetupTextSelectionPatch } from "../../../src/host/polyfills/textSelection";

describe("textSelection", () => {
    it("applySetupTextSelectionPatch correctly changes text", async () => {
        const filePath = "elements/elements.js";
        const expectedStrings = ["_setupTextSelectionHack() { return;"];
        testPatch(filePath, applySetupTextSelectionPatch, expectedStrings);
    });

    it("applySetupTextSelectionPatch ignores other text", async () => {
        const expectedText = "hello world";
        const result = applySetupTextSelectionPatch(expectedText);
        expect(result).toEqual(null);
    });
});
