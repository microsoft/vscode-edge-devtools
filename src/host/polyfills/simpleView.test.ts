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

    it("applyInspectorViewPatch correctly changes handleAction text", async () => {
        const comparableText = "handleAction(context, actionId) {\n";
        let fileContents = getTextFromFile("ui/InspectorView.js");
        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;

        const apply = await import("./simpleView");
        const result = apply.applyInspectorViewHandleActionPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(
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

    it("applySelectTabPatch correctly changes text", async () => {
        const comparableText = "selectTab(id, userGesture, forceFocus) {";
        let fileContents = getTextFromFile("ui/TabbedPane.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : comparableText;
        const apply = await import("./simpleView");
        const result = apply.applySelectTabPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining("selectTab(id, userGesture, forceFocus) { if ("));
    });

    it("applyInspectorCommonCssPatch correctly changes tabbed-pane-header-contents", async () => {
        const expectedCss = `.main-tabbed-pane .tabbed-pane-header-contents {
            flex: auto;
            pointer-events: none;
            margin-left: 0;
            position: relative;
        }`;
        const expectedResult = `.main-tabbed-pane .tabbed-pane-header-contents {
            display: none !important;
        }`;
        let fileContents = getTextFromFile("shell.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : expectedCss;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssHeaderContentsPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssPatch correctly changes tabbed-pane-tab-slider", async () => {
        const expectedCss = `.tabbed-pane-tab-slider {
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
        fileContents = fileContents ? fileContents : expectedCss;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssTabSliderPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssPatch correctly changes tabbed-pane-right-toolbar", async () => {
        const expectedCss = `.tabbed-pane-right-toolbar {
            margin-left: -4px;
            flex: none;
        }`;
        const expectedResult = `.tabbed-pane-right-toolbar {
            display: none !important;
        }`;
        let fileContents = getTextFromFile("shell.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : expectedCss;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssRightToolbarPatch(fileContents);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssPatch correctly changes tabbed-pane-header-contents in release mode", async () => {
        const expectedCss = `.main-tabbed-pane .tabbed-pane-header-contents {
            flex: auto;
            pointer-events: none;
            margin-left: 0;
            position: relative;
        }`;
        const expectedResult =
            ".main-tabbed-pane .tabbed-pane-header-contents {\\n            display: none !important;\\n        }";
        let fileContents = getTextFromFile("shell.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : expectedCss;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssHeaderContentsPatch(fileContents, true);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssPatch correctly changes tabbed-pane-tab-slider in release mode", async () => {
        const expectedCss = `.tabbed-pane-tab-slider {
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
        fileContents = fileContents ? fileContents : expectedCss;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssTabSliderPatch(fileContents, true);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });

    it("applyInspectorCommonCssPatch correctly changes tabbed-pane-right-toolbar in release mode", async () => {
        const expectedCss = `.tabbed-pane-right-toolbar {
            margin-left: -4px;
            flex: none;
        }`;
        const expectedResult =
            ".tabbed-pane-right-toolbar {\\n            display: none !important;\\n        }";
        let fileContents = getTextFromFile("shell.js");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : expectedCss;
        const apply = await import("./simpleView");
        const result = apply.applyInspectorCommonCssRightToolbarPatch(fileContents, true);
        expect(result).not.toEqual(null);
        expect(result).toEqual(expect.stringContaining(expectedResult));
    });
});
