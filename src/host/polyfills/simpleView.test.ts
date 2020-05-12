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
            openInEditor: mockOpen,
        };

        await apply.revealInVSCode(expected, expected.omitFocus);

        expect(mockOpen).toHaveBeenCalled();
    });

    it("applyCommonRevealerPatch correctly changes text", async () => {
        const comparableText = "let reveal = function(revealable, omitFocus) {";
        let fileContents = getTextFromFile("common/Revealer.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

        const apply = await import("./simpleView");
        const result = apply.applyCommonRevealerPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(
            expect.stringContaining("let reveal = function revealInVSCode(revealable, omitFocus) {"));
    });

    it("applyHandleActionPatch correctly changes handleAction text", async () => {
        const comparableText = "handleAction(context, actionId) {\n";
        const apply = await import("./simpleView");

        let fileContents = getTextFromFile("quick_open/QuickOpen.js");
        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

        const quickOpenResult = apply.applyHandleActionPatch(fileContents);
        expect(quickOpenResult).not.toEqual(null);
        expect(quickOpenResult).toEqual(
            expect.stringContaining("handleAction(context, actionId) { return false;"));

        fileContents = getTextFromFile("quick_open/CommandMenu.js");
        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

        const commandMenuResult = apply.applyHandleActionPatch(fileContents);
        expect(commandMenuResult).not.toEqual(null);
        expect(commandMenuResult).toEqual(
            expect.stringContaining("handleAction(context, actionId) { return false;"));
    });

    it("applyInspectorViewPatch correctly changes _showDrawer text", async () => {
        const comparableText = "_showDrawer(focus) {";
        let fileContents = getTextFromFile("ui/InspectorView.js");
        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

        const apply = await import("./simpleView");
        const result = apply.applyInspectorViewShowDrawerPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining("_showDrawer(focus) { return false;"));
    });

    it("applyMainViewPatch correctly changes text", async () => {
        const comparableText = "const moreTools = getExtensions();";
        let fileContents = getTextFromFile("main/MainImpl.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;
        const apply = await import("./simpleView");
        const result = apply.applyMainViewPatch(comparableText);
        expect(result).not.toEqual(null);
        expect(result).toEqual(
            expect.stringContaining("const moreTools = { defaultSection: () => ({ appendItem: () => {} }) };"));
    });

    it("applyDrawerTabLocationPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const comparableText = "this._showDrawer.bind(this, false), 'drawer-view', true, true";
        let fileContents = getTextFromFile("ui/InspectorView.js");
        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;
        const result = apply.applyDrawerTabLocationPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(
            "this._showDrawer.bind(this, false), 'drawer-view', true, true, 'network.blocked-urls'"));
    });

    it("applySetTabIconPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const comparableText =
            " setTabIcon(id, icon) {const tab = this._tabsById.get(id); tab._setIcon(icon);this._updateTabElements();}";
        let fileContents = getTextFromFile("ui/TabbedPane.js");
        fileContents = fileContents ? fileContents : comparableText;
        const result = apply.applySetTabIconPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining("if(!tab){return;}"));
    });

    it("applyAppendTabPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const comparableText = `appendTab(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index) {}
        export const Events={}`;
        let fileContents = getTextFromFile("ui/TabbedPane.js");
        fileContents = fileContents ? fileContents : comparableText;
        const result = apply.applyAppendTabPatch(fileContents);
        expect(result).toEqual(expect.stringContaining(
            "appendTabOverride(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index) {"));
    });

    it("applyShowElementsTab correctly changes text", async () => {
        const apply = await import("./simpleView");
        const comparableText = "this._defaultTab = defaultTab;";
        let fileContents = getTextFromFile("ui/ViewManager.js");
        fileContents = fileContents ? fileContents : comparableText;
        const result = apply.applyShowElementsTab(fileContents);
        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining("this._defaultTab = 'elements';"));
        }
    });

    it("applyShowRequestBlockingTab correctly changes text", async () => {
        const apply = await import("./simpleView");
        const comparableText = "if(!view.isCloseable())";
        let fileContents = getTextFromFile("ui/ViewManager.js");
        fileContents = fileContents ? fileContents : comparableText;
        const result = apply.applyShowRequestBlockingTab(fileContents);
        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(
                "if(!view.isCloseable()||id==='network.blocked-urls')"));
        }
    });

    it("applyPersistRequestBlockingTab correctly changes text", async () => {
        const apply = await import("./simpleView");
        const comparableText = "this._closeable = closeable;";
        let fileContents = getTextFromFile("ui/TabbedPane.js");
        fileContents = fileContents ? fileContents : comparableText;
        const result = apply.applyPersistRequestBlockingTab(fileContents);
        expect(result).not.toEqual(null);
        if (result) {
            expect(result).toEqual(expect.stringContaining(
                "this._closeable=id==='network.blocked-urls'?false:closeable;"));
        }
    });

    it("applyInspectorCommonCssPatch correctly changes text", async () => {
        const apply = await import("./simpleView");
        const comparableText = ":host-context(.platform-mac) .monospace,";
        let fileContents = getTextFromFile("shell.js");
        fileContents = fileContents ? fileContents : comparableText;
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
        const apply = await import("./simpleView");
        const comparableText = ":host-context(.platform-mac) .monospace,";
        let fileContents = getTextFromFile("shell.js");
        fileContents = fileContents ? fileContents : comparableText;
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
        const apply = await import("./simpleView");
        const comparableText = ":host-context(.platform-mac) .monospace,";
        let fileContents = getTextFromFile("shell.js");
        fileContents = fileContents ? fileContents : comparableText;
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
        const apply = await import("./simpleView");
        const comparableText = ":host-context(.platform-mac) .monospace,";
        let fileContents = getTextFromFile("shell.js");
        fileContents = fileContents ? fileContents : comparableText;
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
        const apply = await import("./simpleView");
        const comparableText = ":host-context(.platform-mac) .monospace,";
        let fileContents = getTextFromFile("shell.js");
        fileContents = fileContents ? fileContents : comparableText;
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
        const apply = await import("./simpleView");
        const comparableText = ":host-context(.platform-mac) .monospace,";
        let fileContents = getTextFromFile("shell.js");
        fileContents = fileContents ? fileContents : comparableText;
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
        const comparableText = `.tabbed-pane-right-toolbar {
            margin-left: -4px;
            flex: none;
        }`;
        const expectedResult = `.tabbed-pane-right-toolbar {
            visibility: hidden !important;
        }`;
        let fileContents = getTextFromFile("shell.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssRightToolbarPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssRightToolbarPatch correctly changes tabbed-pane-right-toolbar", async () => {
        const comparableText = `.tabbed-pane-right-toolbar {
            margin-left: -4px;
            flex: none;
        }`;
        const expectedResult =
            ".tabbed-pane-right-toolbar {\\n            visibility: hidden !important;\\n        }";
        let fileContents = getTextFromFile("shell.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssRightToolbarPatch(fileContents, true);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssTabSliderPatch correctly changes tabbed-pane-tab-slider (release)", async () => {
        const comparableText = `.tabbed-pane-tab-slider {
            height: 2px;
            position: absolute;
            bottom: -1px;
            background-color: var(--accent-color);
            left: 0;
            z-index: 50;
            transform-origin: 0 100%;
            transition: transform 150ms cubic-bezier(0, 0, 0.2, 1);
            visibility: hidden;
        }`;
        const expectedResult =
            ".tabbed-pane-tab-slider {\\n            display: none !important;\\n        }";
        let fileContents = getTextFromFile("shell.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssTabSliderPatch(fileContents, true);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssTabSliderPatch correctly changes tabbed-pane-tab-slider", async () => {
        const comparableText = `.tabbed-pane-tab-slider {
            height: 2px;
            position: absolute;
            bottom: -1px;
            background-color: var(--accent-color);
            left: 0;
            z-index: 50;
            transform-origin: 0 100%;
            transition: transform 150ms cubic-bezier(0, 0, 0.2, 1);
            visibility: hidden;
        }`;
        const expectedResult = `.tabbed-pane-tab-slider {
            display: none !important;
        }`;
        let fileContents = getTextFromFile("shell.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssTabSliderPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });
});
