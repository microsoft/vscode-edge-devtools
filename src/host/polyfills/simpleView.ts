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
    return content.replace(
        /Common\.Revealer\.reveal\s*=\s*function\(revealable,\s*omitFocus\)\s*{/g,
        `Common.Revealer.reveal = ${revealInVSCode.toString().slice(0, -1)}`);
}

export function applyInspectorViewPatch(content: string) {
    return content
        .replace(
            /handleAction\(context,\s*actionId\)\s*{/g,
            "handleAction(context, actionId) { return false;")
        .replace(
            /_showDrawer\(focus\)\s*{/g,
            "_showDrawer(focus) { return false;");
}

export function applyMainViewPatch(content: string) {
    return content.replace(
        /const moreTools\s*=\s*[^;]+;/g,
        "const moreTools = { defaultSection: () => ({ appendItem: () => {} }) };");
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

    return content.replace(
        /selectTab\(id,\s*userGesture\)\s*{/g,
        `selectTab(id, userGesture) { if (${condition}) return false;`);
}

export function applyInspectorCommonCssPatch(content: string, isRelease?: boolean) {
    const separator = (isRelease ? "\\n" : "\n"); // Release css is embedded in js
    const css =
        `.main-tabbed-pane .tabbed-pane-header-contents {
            display: none !important;
        }
        .main-tabbed-pane .tabbed-pane-right-toolbar {
            display: none !important;
        }
        .tabbed-pane-tab-slider {
            display: none !important;
        }`.replace(/\n/g, separator);

    return content.replace(
        /(:host-context\(\.platform-mac\)\s*\.monospace,)/g,
        `${css}${separator} $1`,
    );
}
