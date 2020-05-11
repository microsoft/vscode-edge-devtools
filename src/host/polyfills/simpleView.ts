// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import ToolsHost from "../toolsHost";

declare var InspectorFrontendHost: ToolsHost;

interface IRevealable {
    lineNumber: number;
    columnNumber: number;
    uiSourceCode: {
        _url: string;
    };
}

export function revealInVSCode(revealable: IRevealable | undefined, omitFocus: boolean) {
    if (revealable && revealable.uiSourceCode && revealable.uiSourceCode._url) {
        InspectorFrontendHost.openInEditor(
            revealable.uiSourceCode._url,
            revealable.lineNumber,
            revealable.columnNumber,
            omitFocus,
        );
    }

    return Promise.resolve();
}

export function applyCommonRevealerPatch(content: string) {
    const pattern = /let reveal\s*=\s*function\(revealable,\s*omitFocus\)\s*{/g;
    if (content.match(pattern)) {
        return content.replace(pattern,
            `let reveal = ${revealInVSCode.toString().slice(0, -1)}`);
    } else {
        return null;
    }
}

export function applyHandleActionPatch(content: string) {
    // This patch removes the ability to use the
    // quick open menu (CTRL + P) and command menu (CTRL + SHIFT + P)
    const pattern = /handleAction\(context,\s*actionId\)\s*{/g;

    if (content.match(pattern)) {
        return content
        .replace(pattern, "handleAction(context, actionId) { return false;");
    } else {
        return null;
    }
}

// This function is needed for Elements-only version, but we need the drawer
// for the Request Blocking tool when enabling the Network Panel.
export function applyInspectorViewShowDrawerPatch(content: string) {
    // This patch hides the drawer.
    const pattern = /_showDrawer\(focus\)\s*{/g;

    if (content.match(pattern)) {
        return content.replace(pattern, "_showDrawer(focus) { return false;");
    } else {
        return null;
    }
}

export function applyMainViewPatch(content: string) {
    const pattern = /const moreTools\s*=\s*[^;]+;/g;

    if (content.match(pattern)) {
        return content.replace(pattern, "const moreTools = { defaultSection: () => ({ appendItem: () => {} }) };");
    } else {
        return null;
    }
}

export function applyShowElementsTab(content: string) {
    // This tab sets the Elements tool as the default tab,
    // so the extension will always show the Elements tool first.
    const pattern = /this\._defaultTab\s*=\s*defaultTab;/;

    if (content.match(pattern)) {
        return content.replace(pattern, "this._defaultTab = 'elements';");
    } else {
    return null;
    }
}

export function applyShowRequestBlockingTab(content: string) {
    // Appends the Request Blocking tab in the drawer even if it is not open.
    const pattern = /if\s*\(!view\.isCloseable\(\)\)/;

    if (content.match(pattern)) {
        return content.replace(pattern, "if(!view.isCloseable()||id==='network.blocked-urls')");
    } else {
        return null;
    }
}

export function applyPersistRequestBlockingTab(content: string) {
    // Removes the close button from the Request blocking tab by making the tab non-closeable.
    const pattern = /this\._closeable\s*=\s*closeable;/;

    if (content.match(pattern)) {
        return content.replace(pattern, "this._closeable=id==='network.blocked-urls'?false:closeable;");
    } else {
        return null;
    }
}

export function applySetTabIconPatch(content: string) {
    // Adding undefined check in SetTabIcon so it doesn't throw an error trying to access disabled tabs.
    // This is needed due to applyAppendTabPatch which removes unused tabs from the tablist.
    const pattern = /setTabIcon\(id,\s*icon\)\s*{\s*const tab\s*=\s*this\._tabsById\.get\(id\);/;

    if (content.match(pattern)) {
        return content.replace(pattern, "setTabIcon(id,icon){const tab=this._tabsById.get(id); if(!tab){return;}");
    } else {
        return null;
    }
}

export function applyAppendTabPatch(content: string) {
    // The appendTab function chooses which tabs to put in the tabbed pane header section
    // showTabElement and selectTab are only called by tabs that have already been appended via appendTab.
    const allowedTabs = [
        "elements",
        "Styles",
        "Computed",
        "accessibility.view",
        "elements.domProperties",
        "elements.domBreakpoints",
        "elements.eventListeners",
        "network",
        "network.blocked-urls",
        "network.search-network-tab",
        "headers",
        "preview",
        "response",
        "timing",
        "initiator",
        "cookies",
        "eventSource",
        "webSocketFrames",
        "preferences",
        "workspace",
        "experiments",
        "blackbox",
        "devices",
        "throttling-conditions",
        "emulation-geolocations",
        "Shortcuts",
    ];

    const condition = allowedTabs.map((tab) => {
        return `id !== '${tab}'`;
    }).join(" && ");

    const pattern = /appendTab\(id,\s*tabTitle\s*,\s*view,\s*tabTooltip,\s*userGesture,\s*isCloseable,\s*index\)\s*{/;

    if (content.match(pattern)) {
        return content.replace(
            pattern,
            `appendTab(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index) { if (${condition}) return;`);
    } else {
        return null;
    }
}

export function applyDrawerTabLocationPatch(content: string) {
    // This shows the drawer with the network.blocked-urls tab open.
    const pattern = /this._showDrawer.bind\s*\(this,\s*false\),\s*'drawer-view',\s*true,\s*true/g;
    if (content.match(pattern)) {
        return content.replace(pattern,
            `this._showDrawer.bind\(this, false\), 'drawer-view', true, true, 'network.blocked-urls'`);
    } else {
        return null;
    }
}

export function applyInspectorCommonCssPatch(content: string, isRelease?: boolean) {
    // Hides the more tools button in the drawer and reveals the screen cast button.
    const separator = (isRelease ? "\\n" : "\n");

    const hideMoreToolsBtn =
        `.toolbar-button[aria-label='More Tools'] {
            display: none !important;
        }`.replace(/\n/g, separator);

    const unHideScreenCastBtn =
        `.toolbar-button[aria-label='Toggle screencast'] {
            visibility: visible !important;
        }`.replace(/\n/g, separator);

    const topHeaderCSS =
        hideMoreToolsBtn +
        unHideScreenCastBtn;

    const pattern = /(:host-context\(\.platform-mac\)\s*\.monospace,)/g;
    if (content.match(pattern)) {
        return content.replace(pattern, `${topHeaderCSS}${separator} $1`);
    } else {
        return null;
    }
}

export function applyInspectorCommonNetworkPatch(content: string, isRelease?: boolean) {
    // Hides export HAR button and pretty print button and reveals the Network search close button in the Network Panel.
    const separator = (isRelease ? "\\n" : "\n");

    const hideExportHarBtn =
        `.toolbar-button[aria-label='Export HAR...'] {
            display: none !important;
        }`.replace(/\n/g, separator);

    const hidePrettyPrintBtn =
        `.toolbar-button[aria-label='Pretty print'] {
            display: none !important;
        }`.replace(/\n/g, separator);

    // Search close button initially hidden by applyInspectorCommonCssRightToolbarPatch
    const unHideSearchCloseButton =
        `.toolbar-button[aria-label='Close'] {
            visibility: visible !important;
        }`.replace(/\n/g, separator);

    const networkCSS =
        hideExportHarBtn +
        hidePrettyPrintBtn +
        unHideSearchCloseButton;

    const pattern = /(:host-context\(\.platform-mac\)\s*\.monospace,)/g;
    if (content.match(pattern)) {
        return content.replace(pattern, `${networkCSS}${separator} $1`);
    } else {
        return null;
    }
}

export function applyInspectorCommonContextMenuPatch(content: string, isRelease?: boolean) {
    // Hides certain context menu items from elements in the Network Panel.
    const separator = (isRelease ? "\\n" : "\n");

    const hideContextMenuItems =
        `.soft-context-menu-separator,
        .soft-context-menu-item[aria-label='Open in new tab'],
        .soft-context-menu-item[aria-label='Open in Sources panel'],
        .soft-context-menu-item[aria-label='Clear browser cache'],
        .soft-context-menu-item[aria-label='Clear browser cookies'],
        .soft-context-menu-item[aria-label='Save all as HAR with content'],
        .soft-context-menu-item[aria-label='Save as...'] {
            display: none !important;
        }`.replace(/\n/g, separator);

    const pattern = /(:host-context\(\.platform-mac\)\s*\.monospace,)/g;
    if (content.match(pattern)) {
        return content.replace(pattern, `${hideContextMenuItems}${separator} $1`);
    } else {
        return null;
    }
}

export function applyInspectorCommonCssRightToolbarPatch(content: string, isRelease?: boolean) {
    const separator = (isRelease ? "\\n" : "\n");
    const cssRightToolbar =
        `.tabbed-pane-right-toolbar {
            visibility: hidden !important;
        }`.replace(/\n/g, separator);

    const tabbedPanePattern = /(\.tabbed-pane-right-toolbar\s*\{([^\}]*)?\})/g;

    if (content.match(tabbedPanePattern)) {
        return content.replace(
                tabbedPanePattern,
                cssRightToolbar);
    } else {
        return null;
    }
}

export function applyInspectorCommonCssTabSliderPatch(content: string, isRelease?: boolean) {
    const separator = (isRelease ? "\\n" : "\n");
    const cssTabSlider =
        `.tabbed-pane-tab-slider {
            display: none !important;
        }`.replace(/\n/g, separator);

    const tabbedPaneSlider = /(\.tabbed-pane-tab-slider\s*\{([^\}]*)?\})/g;

    if (content.match(tabbedPaneSlider)) {
        return content.replace(
            tabbedPaneSlider,
            cssTabSlider);
    } else {
        return null;
    }
}
