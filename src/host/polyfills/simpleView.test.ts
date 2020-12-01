// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";
import * as SimpleView from "./simpleView"

/**
 * This helper test function grabs the source code, applies the given patch, checks to see if the patch is applied, and checks for expected and unexpected strings.
 * @param filename
 * @param patchFunction
 * @param expectedStrings
 * @param unexpectedStrings
 * @return
 */
async function testPatch(filename: string, patch: (content:string)=>string|null, expectedStrings?: string[], unexpectedStrings?: string[]) {
    const fileContents = getTextFromFile(filename);
    if (!fileContents) {
        throw new Error(`Could not find file: ${filename}`);
    }

    const result = patch(fileContents);
    expect(result).not.toEqual(null);
    if (expectedStrings) {
        for (const expectedString of expectedStrings) {
            expect(result).toEqual(expect.stringContaining(expectedString));
        }
    }
    if (unexpectedStrings) {
        for (const unexpectedString of unexpectedStrings) {
            expect(result).not.toEqual(expect.stringContaining(unexpectedString));
        }
    }
}

describe("simpleView", () => {
    it("revealInVSCode calls openInEditor", async () => {
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

        await SimpleView.revealInVSCode(expected, expected.omitFocus);

        expect(mockOpen).toHaveBeenCalled();
    });

    it("applyCommonRevealerPatch correctly changes text", async () => {
        const filePath = "common/common.js";
        const patch = SimpleView.applyCommonRevealerPatch;
        const expectedStrings = ["let reveal = function revealInVSCode(revealable, omitFocus) {"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyQuickOpenPatch correctly changes handleAction text for Quick Open", async () => {
        const filePath = "quick_open/quick_open.js";
        const patch = SimpleView.applyQuickOpenPatch;
        const expectedStrings = ["handleAction(context, actionId) { actionId = null; switch(actionId)"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyCommandMenuPatch correctly changes attach text for command menu", async () => {
        const filePath = "quick_open/quick_open.js";
        const patch = SimpleView.applyCommandMenuPatch;
        const expectedStrings = ["this.getApprovedTabs((networkSettings)"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorViewPatch correctly changes _showDrawer text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyInspectorViewShowDrawerPatch;
        const expectedStrings = ["_showDrawer(focus) { return false;"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyMainViewPatch correctly changes text", async () => {
        const filePath = "main/main.js";
        const patch = SimpleView.applyMainViewPatch;
        const expectedStrings = ["const moreTools = { defaultSection: () => ({ appendItem: () => {} }) };"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyDrawerTabLocationPatch correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyDrawerTabLocationPatch;
        const expectedStrings = ["this._showDrawer.bind(this, false), 'drawer-view', true, true, 'network.blocked-urls'"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applySetTabIconPatch correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applySetTabIconPatch;
        const expectedStrings = ["if(!tab){return;}"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyAppendTabPatch correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyAppendTabPatch;
        const expectedStrings = ["appendTabOverride(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index) {"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyRemoveBreakOnContextMenuItem correctly changes text", async () => {
        const filePath = "browser_debugger/browser_debugger.js";
        const patch = SimpleView.applyRemoveBreakOnContextMenuItem;
        const unexpectedStrings = ["const breakpointsMenu"];

        await testPatch(filePath, patch, undefined, unexpectedStrings);
    });

    it("applyShowRequestBlockingTab correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyShowRequestBlockingTab;
        const expectedStrings = ["if(!view.isCloseable()||id==='network.blocked-urls')"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyPersistRequestBlockingTab correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyPersistRequestBlockingTab;
        const expectedStrings = ["this._closeable=id==='network.blocked-urls'?false:closeable;"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorCommonCssPatch correctly changes text", async () => {
        const filePath = "shell.js";
        const patch = SimpleView.applyInspectorCommonCssPatch;
        const expectedStrings = [".toolbar-button[aria-label='Toggle screencast'] {\\n            visibility: visible !important;"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorCommonNetworkPatch correctly changes text", async () => {
        const filePath = "shell.js";
        const patch = SimpleView.applyInspectorCommonNetworkPatch;
        const expectedStrings = [".toolbar-button[aria-label='Export HAR...'] {\\n            display: none !important;"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorCommonContextMenuPatch correctly changes text", async () => {
        const filePath = "shell.js";
        const patch = SimpleView.applyInspectorCommonContextMenuPatch;
        const expectedStrings = [".soft-context-menu-item[aria-label='Save as...'] {\\n            display: none !important;"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorCommonCssRightToolbarPatch correctly changes tabbed-pane-right-toolbar", async () => {
        const filePath = "shell.js";
        const patch = SimpleView.applyInspectorCommonCssRightToolbarPatch;
        const expectedStrings = [".tabbed-pane-right-toolbar {\\n            visibility: hidden !important;\\n        }"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorCommonCssTabSliderPatch correctly changes tabbed-pane-tab-slider", async () => {
        const filePath = "shell.js";
        const patch = SimpleView.applyInspectorCommonCssTabSliderPatch;
        const expectedStrings = [".tabbed-pane-tab-slider {\\n            display: none !important;\\n        }"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyRemoveNonSupportedRevealContextMenu correctly changes text", async () => {
        const filePath = "components/components.js";
        const patch = SimpleView.applyRemoveNonSupportedRevealContextMenu;
        const expectedStrings = ["if(destination === \"Elements panel\")"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyThemePatch correctly modifies themes to use theme parameter", async () => {
        const filePath = "themes/themes.js";
        const patch = SimpleView.applyThemePatch;
        const expectedStrings = ["function init(theme)", "if(theme){themeSetting.set(theme);}"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyMainThemePatch correctly modifes main.js to pass in themes from settings", async () => {
        const filePath = "main/main.js";
        const patch = SimpleView.applyMainThemePatch;
        const expectedStrings = ["resolve(theme);", "await this.getThemePromise()"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyDefaultTabPatch correctly modifies text to prevent usage of TabbedLocation._defaultTab", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyDefaultTabPatch;
        const expectedStrings = ["this._defaultTab=undefined;"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyRemovePreferencePatch correctly modifes host.js to ignore localStorage deletion", async () => {
        const filePath = "host/host.js";
        const patch = SimpleView.applyRemovePreferencePatch;
        const expectedStrings = ["removePreference(name){return;}"];

        await testPatch(filePath, patch, expectedStrings);
    });
});
