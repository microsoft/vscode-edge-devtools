// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

describe("simpleView", () => {
    it("applyCommonRevealerPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const result = apply.applyCommonRevealerPatch(
            "Common.Revealer.reveal = function(revealable, omitFocus) { // code");
        expect(result).toEqual("Common.Revealer.reveal = function() { Promise.resolve(); return; // code");
    });

    it("applyInspectorViewPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const result = apply.applyInspectorViewPatch(
            "handleAction(context, actionId) { // code");
        expect(result).toEqual("handleAction(context, actionId) { return false; // code");

        const result2 = apply.applyInspectorViewPatch(
            "_showDrawer(focus) { // code");
        expect(result2).toEqual("_showDrawer(focus) { return false; // code");
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
    });

    it("applyInspectorCommonCssPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssPatch("// some amount of code");
        expect(result).toEqual(expect.stringContaining("// some amount of code\n.main-tabbed-pane"));
    });
});
