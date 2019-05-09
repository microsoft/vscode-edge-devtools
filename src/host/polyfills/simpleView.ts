// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function applyCommonRevealerPatch(content: string) {
    return content.replace(
        /Common\.Revealer\.reveal = function\(revealable, omitFocus\) {/g,
        "Common.Revealer.reveal = function() { Promise.resolve(); return;");
}

export function applyInspectorViewPatch(content: string) {
    return content
        .replace(
            /handleAction\(context, actionId\) {/g,
            "handleAction(context, actionId) { return false;")
        .replace(
            /_showDrawer\(focus\) {/g,
            "_showDrawer(focus) { return false;");
}

export function applyMainViewPatch(content: string) {
    return content.replace(
        /const moreTools = [^;]+;/g,
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
        /selectTab\(id, userGesture\) {/g,
        `selectTab(id, userGesture) { if (${condition}) return false;`);
}

export function applyInspectorCommonCssPatch(content: string) {
    return content.concat(
        `\n.main-tabbed-pane .tabbed-pane-header-contents {
            visibility: hidden;
        }
        .tabbed-pane-tab-slider {
            visibility: hidden !important;
        }`,
    );
}
