// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("simpleView", () => {
    it("revealInVSCode calls openInEditor", async () => {
        const apply = await import("./simpleView");
        const expected = {
            columnNumber: 0,
            lineNumber: 0,
            uiSourceCode: {
                _url: "http://bing.com",
            },
        };
        const mockOpen = jest.fn();
        (global as any).InspectorFrontendHost = {
            openInEditor: mockOpen,
        };

        await apply.revealInVSCode(expected, false);

        expect(mockOpen).toHaveBeenCalled();
    });

    it("applyCommonRevealerPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const result = apply.applyCommonRevealerPatch(
            "Common.Revealer.reveal = function(revealable, omitFocus) { // code");
        expect(result).toEqual(
            expect.stringContaining("Common.Revealer.reveal = function revealInVSCode(revealable, omitFocus) {"));
    });

    it("applyInspectorViewPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const result = apply.applyInspectorViewPatch(
            "handleAction(context, actionId) { // code");
        expect(result).toEqual("handleAction(context, actionId) { return false; // code");

        const result2 = apply.applyInspectorViewPatch(
            "handleAction(context,actionId) { // code");
        expect(result2).toEqual("handleAction(context, actionId) { return false; // code");

        const result3 = apply.applyInspectorViewPatch(
            "_showDrawer(focus) { // code");
        expect(result3).toEqual("_showDrawer(focus) { return false; // code");
    });

    it("applyMainViewPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const result = apply.applyMainViewPatch("const moreTools = getExtensions();");
        expect(result).toEqual("const moreTools = { defaultSection: () => ({ appendItem: () => {} }) };");
    });

    it("applySelectTabPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const result = apply.applySelectTabPatch("selectTab(id, userGesture) { // code");
        expect(result).toEqual(expect.stringContaining("selectTab(id, userGesture) { if ("));

        const result2 = apply.applySelectTabPatch("selectTab(id,userGesture) { // code");
        expect(result2).toEqual(expect.stringContaining("selectTab(id, userGesture) { if ("));
    });

    it("applyInspectorCommonCssPatch correctly changes text", async () => {
        const expectedCss = ":host-context(.platform-mac) .monospace,";
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssPatch(expectedCss);
        expect(result.startsWith(".main")).toEqual(true);
        expect(result.endsWith(".monospace,")).toEqual(true);
    });

    it("applyInspectorCommonCssPatch correctly changes text in release mode", async () => {
        const expectedCss = ":host-context(.platform-mac) .monospace,";
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssPatch(expectedCss, true);
        expect(result.startsWith(".main")).toEqual(true);
        expect(result.endsWith(".monospace,")).toEqual(true);
        expect(result.indexOf("\\n") > -1).toEqual(true);
    });
});
