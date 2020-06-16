// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";

describe("simpleView", () => {
    it("revealInVSCode calls openInEditor", async () => {
        const apply = await import("./simpleView");
        const expected = {
            columnNumber: 0,
            lineNumber: 0,
            omitFocus: false,
            uiSourceCode: {
                _url: "http://bing.com",
            },
        };
        const mockOpen = jest.fn();
        (global as any).InspectorFrontendHost = {
            InspectorFrontendHostInstance: {
                openInEditor: mockOpen,
            },
        };

        await apply.revealInVSCode(expected, expected.omitFocus);

        expect(mockOpen).toHaveBeenCalled();
    });

    it("applyCommonRevealerPatch correctly changes text", async () => {
        const filePath = "common/common.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyCommonRevealerPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(
            expect.stringContaining("let reveal = function revealInVSCode(revealable, omitFocus) {"));
    });

    it("applyHandleActionPatch correctly changes handleAction text for Quick Open", async () => {
        const filePath = "ui/ui.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyHandleActionPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(
            expect.stringContaining("handleAction(context, actionId) { return false;"));
    });

    it("applyHandleActionPatch correctly changes handleAction text for Command Menu", async () => {
        const filePath = "ui/ui.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyHandleActionPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(
            expect.stringContaining("handleAction(context, actionId) { return false;"));
    });

    it("applyInspectorViewPatch correctly changes _showDrawer text", async () => {
        const filePath = "ui/ui.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyInspectorViewShowDrawerPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining("_showDrawer(focus) { return false;"));
    });

    it("applyMainViewPatch correctly changes text", async () => {
        const filePath = "main/main.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyMainViewPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(
            expect.stringContaining("const moreTools = { defaultSection: () => ({ appendItem: () => {} }) };"));
    });

    it("applyDrawerTabLocationPatch correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyDrawerTabLocationPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(
            "this._showDrawer.bind(this, false), 'drawer-view', true, true, 'network.blocked-urls'"));
    });

    it("applySetTabIconPatch correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applySetTabIconPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining("if(!tab){return;}"));
    });

    it("applyAppendTabPatch correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyAppendTabPatch(fileContents);
        expect(result).toEqual(expect.stringContaining(
            "appendTabOverride(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index) {"));
    });

    it("applyShowElementsTab correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyShowElementsTab(fileContents);
        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining("this._defaultTab = 'elements';"));
        }
    });

    it("applyShowRequestBlockingTab correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyShowRequestBlockingTab(fileContents);
        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(
                "if(!view.isCloseable()||id==='network.blocked-urls')"));
        }
    });

    it("applyPersistRequestBlockingTab correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyPersistRequestBlockingTab(fileContents);
        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(
                "this._closeable=id==='network.blocked-urls'?false:closeable;"));
        }
    });

    it("applyInspectorCommonCssPatch correctly changes text", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssPatch(fileContents);

        // If this part of the css was correctly applied to the file, the rest of the css will be there as well.
        const expectedString =
            ".toolbar-button[aria-label='Toggle screencast'] {\n            visibility: visible !important;";
        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(expectedString));
        }
    });

    it("applyInspectorCommonCssPatch correctly changes text (release)", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssPatch(fileContents, true);
        // If this part of the css was correctly applied to the file, the rest of the css will be there as well.
        const expectedString =
            ".toolbar-button[aria-label='Toggle screencast'] {\\n            visibility: visible !important;";

        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(expectedString));
        }
    });

    it("applyInspectorCommonNetworkPatch correctly changes text", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonNetworkPatch(fileContents);

        // If this part of the css was correctly applied to the file, the rest of the css will be there as well.
        const expectedString =
            ".toolbar-button[aria-label='Export HAR...'] {\n            display: none !important;";
        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(expectedString));
        }
    });

    it("applyInspectorCommonNetworkPatch correctly changes text (release)", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonNetworkPatch(fileContents, true);
        // If this part of the css was correctly applied to the file, the rest of the css will be there as well.
        const expectedString =
            ".toolbar-button[aria-label='Export HAR...'] {\\n            display: none !important;";

        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(expectedString));
        }
    });

    it("applyInspectorCommonContextMenuPatch correctly changes text", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonContextMenuPatch(fileContents);

        // If this part of the css was correctly applied to the file, the rest of the css will be there as well.
        const expectedString =
            ".soft-context-menu-item[aria-label='Save as...'] {\n            display: none !important;";
        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(expectedString));
        }
    });

    it("applyInspectorCommonContextMenuPatch correctly changes text (release)", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonContextMenuPatch(fileContents, true);
        // If this part of the css was correctly applied to the file, the rest of the css will be there as well.
        const expectedString =
            ".soft-context-menu-item[aria-label='Save as...'] {\\n            display: none !important;";

        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(expectedString));
        }
    });

    it("applyInspectorCommonCssRightToolbarPatch correctly changes tabbed-pane-right-toolbar (release)", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const expectedResult = `.tabbed-pane-right-toolbar {
            visibility: hidden !important;
        }`;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssRightToolbarPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssRightToolbarPatch correctly changes tabbed-pane-right-toolbar", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const expectedResult =
            ".tabbed-pane-right-toolbar {\\n            visibility: hidden !important;\\n        }";
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssRightToolbarPatch(fileContents, true);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssTabSliderPatch correctly changes tabbed-pane-tab-slider (release)", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const expectedResult =
            ".tabbed-pane-tab-slider {\\n            display: none !important;\\n        }";
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssTabSliderPatch(fileContents, true);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssTabSliderPatch correctly changes tabbed-pane-tab-slider", async () => {
        const filePath = "shell.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const expectedResult = `.tabbed-pane-tab-slider {
            display: none !important;
        }`;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssTabSliderPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });
});
