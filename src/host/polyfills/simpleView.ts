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

export function applyInspectorViewHandleActionPatch(content: string) {
    const pattern = /handleAction\(context,\s*actionId\)\s*{/g;

    if (content.match(pattern)) {
        return content
        .replace(pattern, "handleAction(context, actionId) { return false;");
    } else {
        return null;
    }
}

export function applyInspectorViewShowDrawerPatch(content: string) {
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

export function applySelectTabPatch(content: string) {
    const allowedTabs = [
        "elements",
        "Styles",
        "Computed",
        "accessibility.view",
        "elements.domProperties",
        "elements.domBreakpoints",
        "elements.eventListeners",
        "preferences",
        "workspace",
        "experiments",
        "blackbox",
        "devices",
        "throttling-conditions",
        "emulation-geolocations",
        "Shortcuts",
    ];

    const condition = allowedTabs.map((v) => {
        return `id !== '${v}'`;
    }).join(" && ");

    const pattern = /selectTab\(id,\s*userGesture,\s*forceFocus\)\s*{/g;

    if (content.match(pattern)) {
        return content.replace(
            pattern,
            `selectTab(id, userGesture, forceFocus) { if (${condition}) return false;`);
    } else {
        return null;
    }
}

export function applyInspectorCommonCssHeaderContentsPatch(content: string, isRelease?: boolean) {
    const separator = (isRelease ? "\\n" : "\n");
    const cssHeaderContents =
        `.main-tabbed-pane .tabbed-pane-header-contents {
            display: none !important;
        }`.replace(/\n/g, separator);

    const mainPattern = /(\.main-tabbed-pane\s*\.tabbed-pane-header-contents\s*\{([^\}]*)?\})/g;

    if (content.match(mainPattern)) {
        return content.replace(
            mainPattern,
            cssHeaderContents);
    } else {
        return null;
    }
}

export function applyInspectorCommonCssRightToolbarPatch(content: string, isRelease?: boolean) {
    const separator = (isRelease ? "\\n" : "\n");
    const cssRightToolbar =
        `.tabbed-pane-right-toolbar {
            display: none !important;
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
