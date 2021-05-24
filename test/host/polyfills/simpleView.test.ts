// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { testPatch } from "../../helpers/helpers";
import * as SimpleView from "../../../src/host/polyfills/simpleView"

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

    it("applyQueryParamsObjectPatch correctly changes handleAction text for Quick Open", async () => {
        const filePath = "root/root.js";
        const patch = SimpleView.applyQueryParamsObjectPatch;
        const expectedStrings = ["?ws=trueD&experiments=true&edgeThemes=true"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyCommandMenuPatch correctly changes attach text for command menu", async () => {
        const filePath = "quick_open/quick_open.js";
        const patch = SimpleView.applyCommandMenuPatch;
        const expectedStrings = ["Root.Runtime.vscodeSettings.enableNetwork;"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorViewShowDrawerPatch correctly changes _showDrawer text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyInspectorViewShowDrawerPatch;
        const expectedStrings = ["if (!(Root.Runtime.vscodeSettings.enableNetwork || Root.Runtime.vscodeSettings.whatsNew)) {return false;}"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorViewCloseDrawerPatch correctly changes _showAppUI text", async () => {
        const filePath = "main/main.js";
        const patch = SimpleView.applyInspectorViewCloseDrawerPatch;
        const expectedStrings = ["InspectorView.InspectorView.instance()._closeDrawer();"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyMainViewPatch correctly changes text", async () => {
        const filePath = "main/main.js";
        const patch = SimpleView.applyMainViewPatch;
        const expectedStrings = ["const moreTools = { defaultSection: () => ({ appendItem: () => {} }) };"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyScreencastAppPatch correctly changes text", async () => {
        const filePath = "main/main.js";
        const patch = SimpleView.applyScreencastAppPatch;
        const expectedStrings = ["Runtime.Runtime.instance().extension(AppProvider.AppProvider).instance();"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyScreencastRepaintPatch correctly changes text", async () => {
        const filePath = "screencast/screencast.js";
        const patch = SimpleView.applyScreencastRepaintPatch;
        const unexpectedStrings = ["(this._highlightNode)"];

        await testPatch(filePath, patch, [], unexpectedStrings);
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

    it("applyAppendTabOverridePatch correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyAppendTabOverridePatch;
        const expectedStrings = ["appendTabOverride(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index) {"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyAppendTabConditionsPatch correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyAppendTabConditionsPatch;
        const expectedStrings = ["if (!patchedCondition) {"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyRemoveBreakOnContextMenuItem correctly changes text", async () => {
        const filePath = "browser_debugger/browser_debugger.js";
        const patch = SimpleView.applyRemoveBreakOnContextMenuItem;
        const unexpectedStrings = ["const breakpointsMenu"];

        await testPatch(filePath, patch, undefined, unexpectedStrings);
    });

    it("applyShowDrawerTabs correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyShowDrawerTabs;
        const expectedStrings = ["if(!view.isCloseable()||id==='network.blocked-urls'||id==='release-note')"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyPersistDrawerTabs correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyPersistDrawerTabs;
        const expectedStrings = ["this._closeable= (id==='network.blocked-urls' | id === 'release-note')?false:closeable;"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorCommonCssPatch correctly changes text", async () => {
        const filePath = "shell.js";
        const patch = SimpleView.applyInspectorCommonCssPatch;
        const expectedStrings = [".toolbar-button[aria-label='Toggle screencast']", ".toolbar-button[aria-label='More Tools']"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorCommonNetworkPatch correctly changes text", async () => {
        const filePath = "shell.js";
        const patch = SimpleView.applyInspectorCommonNetworkPatch;
        const expectedStrings = [".toolbar-button[aria-label='Export HAR...']", ".toolbar-button[aria-label='Pretty print']", ".toolbar-button[aria-label='Close']"];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyInspectorCommonContextMenuPatch correctly changes text", async () => {
        const filePath = "shell.js";
        const patch = SimpleView.applyInspectorCommonContextMenuPatch;
        const expectedStrings = [".soft-context-menu-item[aria-label='Save as...']", ".soft-context-menu-item[aria-label='Open in Sources panel']", ".soft-context-menu-item[aria-label='Clear browser cookies']"];

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

    it("applyContextMenuRevealOption correctly changes text", async () => {
        const filePath = "components/components.js";
        const patch = SimpleView.applyContextMenuRevealOption;
        const expectedStrings = ['destination = "Visual Studio Code"'];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyMoveToContextMenuPatch correctly changes text", async () => {
        const filePath = "ui/ui.js";
        const patch = SimpleView.applyMoveToContextMenuPatch;
        const expectedStrings = ['const locationName = ViewManager.instance().locationNameForViewId(tabId);return;'];

        await testPatch(filePath, patch, expectedStrings);
    });

    it("applyThemePatch correctly modifies themes to use theme parameter", async () => {
        const filePath = "themes/themes.js";
        const patch = SimpleView.applyThemePatch;
        const expectedStrings = ["Root.Runtime.vscodeSettings.theme;"];

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

    it("applyExtensionSettingsInstantiatePatch correctly changes root.js to include extensionSettings global const", async () => {
        const filePath = "root/root.js";
        const patch = SimpleView.applyExtensionSettingsInstantiatePatch;
        const expectedStrings = ["const vscodeSettings={}"];

        testPatch(filePath, patch, expectedStrings);
    });

    it("applyExtensionSettingsRuntimeObjectPatch correctly changes RuntimeObject to include extensionSettings global const", async () => {
        const filePath = "root/root.js";
        const patch = SimpleView.applyExtensionSettingsRuntimeObjectPatch;
        const expectedStrings = ["vscodeSettings:vscodeSettings"];

        testPatch(filePath, patch, expectedStrings);
    });

    it("applyCreateExtensionSettingsLegacyPatch correctly changes root-legacy.js to include extensionSettings glbal const", async () => {
        const filePath = "root/root-legacy.js";
        const patch = SimpleView.applyCreateExtensionSettingsLegacyPatch;
        const expectedStrings = ["Root.Runtime.vscodeSettings = Runtime.vscodeSettings"];

        testPatch(filePath, patch, expectedStrings);
    });

    it("applyPortSettingsFunctionCreationPatch correctly changes root.js to create settings function", async () => {
        const filePath = "root/root.js";
        const patch = SimpleView.applyPortSettingsFunctionCreationPatch;
        const expectedStrings = ["InspectorFrontendHost.getVscodeSettings(callback);"];

        testPatch(filePath, patch, expectedStrings);
    });

    it("applyPortSettingsFunctionCallPatch correctly changes root.js to call settings function", async () => {
        const filePath = "root/root.js";
        const patch = SimpleView.applyPortSettingsFunctionCallPatch;
        const expectedStrings = ["this.getVscodeSettings"];

        testPatch(filePath, patch, expectedStrings);
    });

    it("applyStylesRevealerPatch correctly changes root.js to set extensionSettings map", async () => {
        const filePath = "elements/elements.js";
        const patch = SimpleView.applyStylesRevealerPatch;
        const unexpectedStrings = ["this._navigateToSource(selectElement, true);"];

        testPatch(filePath, patch, [], unexpectedStrings);
    });

    it("applyStylesToggleFocusPatch correctly changes root.js to set extensionSettings map", async () => {
        const filePath = "elements/elements.js";
        const patch = SimpleView.applyStylesToggleFocusPatch;
        const expectedStrings = ["ARIAUtils.alert('Toggle property and continue editing selected', this.nameElement);"];

        testPatch(filePath, patch, expectedStrings);
    });

    it("applyRerouteConsoleMessagePatch correctly changes root.js to set extensionSettings map", async () => {
        const filePath = "sdk/sdk.js";
        const patch = SimpleView.applyRerouteConsoleMessagePatch;
        const expectedStrings = ["sendToVscodeOutput"];

        testPatch(filePath, patch, expectedStrings);
    });

    it("applyScreencastCursorPatch correctly changes inspector.js text to remove touch cursor", async () => {
        const filePath = "screencast/screencast.js";
        const patch = SimpleView.applyScreencastCursorPatch;
        const expectedStrings = ["this._canvasContainerElement.style.cursor = 'unset';"];

        testPatch(filePath, patch, expectedStrings);
    });
});
