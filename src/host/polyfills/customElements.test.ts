// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("customElements", () => {
    it("applyCreateElementPatch correctly changes text", async () => {
        const apply = await import("./customElements");
        const result = apply.applyCreateElementPatch(".createElement(someElement, {is: customElementType});");
        expect(result).toEqual(".createElement(someElement,  customElementType || '');");
    });

    it("applyCreateElementPatch ignores other text", async () => {
        const apply = await import("./customElements");
        const expectedText = "hello world";
        const result = apply.applyCreateElementPatch(expectedText);
        expect(result).toEqual(expectedText);
    });

    it("applyUIUtilsPatch correctly changes text", async () => {
        const apply = await import("./customElements");
        const result = apply.applyUIUtilsPatch("UI.registerCustomElement = function() { code }");
        expect(result).toEqual(
            expect.stringContaining("UI.deprecatedRegisterCustomElement = function() { code }"));
        expect(result).toEqual(
            expect.stringContaining("UI.registerCustomElement = function registerCustomElementOverride("));
    });

    it("registerCustomElementOverride returns a constructor", async () => {
        const apply = await import("./customElements");

        const expectedClass = class {};
        const mockRegistration = jest.fn(() => expectedClass);
        (document as any).registerElement = mockRegistration;

        const construct = apply.registerCustomElementOverride("span", "dt-checkbox", expectedClass);
        expect(construct).toEqual(expect.any(Function));
        expect(mockRegistration).toHaveBeenCalled();

        const obj = construct();
        expect(obj).toBeInstanceOf(expectedClass);
    });
});
