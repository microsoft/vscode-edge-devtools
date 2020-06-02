// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";

describe("customElements", () => {
    it("applyCreateElementPatch correctly changes text", async () => {
        const comparableText = ".createElement(elementName, {is: customElementType});";
        let fileContents = getTextFromFile("dom_extension/DOMExtension.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

        const apply = await import("./customElements");
        const result = apply.applyCreateElementPatch(fileContents);
        expect(result).toEqual(expect.stringContaining(".createElement(elementName, customElementType || '');"));
    });

    it("applyCreateElementPatch ignores other text", async () => {
        const apply = await import("./customElements");
        const expectedText = "hello world";
        const result = apply.applyCreateElementPatch(expectedText);
        expect(result).toEqual(null);
    });

    it("applyUIUtilsPatch correctly changes text", async () => {
        const comparableText = "UI.registerCustomElement = function() { code }";
        let fileContents = getTextFromFile("ui/utils/register-custom-element.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

        const apply = await import("./customElements");
        const result = apply.applyUIUtilsPatch(fileContents);
        expect(result).toEqual(
            expect.stringContaining("const construct = document.registerElement("));
        expect(result).toEqual(
            expect.stringContaining("deprecatedRegisterCustomElement(localName, typeExtension"));
    });

    it("registerCustomElement returns a constructor", async () => {
        const apply = await import("./customElements");

        const expectedClass = class {};
        const mockRegistration = jest.fn(() => expectedClass);
        (document as any).registerElement = mockRegistration;

        const construct = apply.registerCustomElement("span", "dt-checkbox", expectedClass);
        expect(construct).toEqual(expect.any(Function));
        expect(mockRegistration).toHaveBeenCalled();

        const obj = construct();
        expect(obj).toBeInstanceOf(expectedClass);
    });
});
