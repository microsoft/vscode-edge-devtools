// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { IDevToolsWindow } from "../host";
import ToolsHost from "../toolsHost";

declare var InspectorFrontendHost: {
    InspectorFrontendHostInstance: ToolsHost;
};

interface IRevealable {
    lineNumber: number;
    columnNumber: number;
    uiSourceCode: {
        _url: string;
    };
}

export function revealInVSCode(revealable: IRevealable | undefined, omitFocus: boolean) {
    if (revealable && revealable.uiSourceCode && revealable.uiSourceCode._url) {
        // using Devtools legacy mode.
        (self as any as IDevToolsWindow).InspectorFrontendHost.openInEditor(
            revealable.uiSourceCode._url,
            revealable.lineNumber,
            revealable.columnNumber,
            omitFocus,
        );
    }

    return Promise.resolve();
}

export function getNetworkSetting(callback: () => void) {
    // @ts-ignore we inject this function into the Runtime constructor where we call InspectorFrontendHost, not InspectorFrontendHost.InspectorFrontendHostInstance
    InspectorFrontendHost.getNetworkSetting(callback);
}

export function getThemesSetting(callback: (arg0: object) => void) {
    // @ts-ignore we inject this function into the Runtime constructor where we call InspectorFrontendHost, not InspectorFrontendHost.InspectorFrontendHostInstance
    InspectorFrontendHost.getThemesSetting(callback);
}

export function applyCreateExtensionSettingsPatch(content: string) {
    const pattern = /const experiments=new ExperimentsSupport\(\);/;
    const match = content.match(pattern);
    if (match) {
        const matchedString = match[0];
        content = content.replace(pattern, `const extensionSettings=new Map();${matchedString}`);
    } else {
        return null;
    }

    const pattern2 = /experiments:experiments/;
    const match2 = content.match(pattern2);
    if (match2) {
        const matchedString = match2[0];
        return content.replace(pattern2, `${matchedString}, extensionSettings:extensionSettings`);
    } else {
        return null;
    }
}

export function applyCreateExtensionSettingsLegacyPatch(content: string) {
    const pattern = /Root\.Runtime\.experiments/g
    const match = content.match(pattern);
    if (match) {
        const matchedString = match[0];
        return content.replace(pattern, `Root.Runtime.extensionSettings = RootModule.Runtime.extensionSettings; ${matchedString}`);
    } else {
        return null;
    }
}

export function applyPortSettingsPatch(content: string) {
    const pattern = /static instance/g;
    const match = content.match(pattern);
    if (match) {
        const matchedString = match[0];
        content = content.replace(pattern, `${getNetworkSetting.toString().slice(9)} ${getThemesSetting.toString().slice(9)} ${matchedString}`);
    } else {
        return null;
    }

    const constructorPattern = /this._descriptorsMap={};/g;
    const constructorMatch = content.match(constructorPattern);
    if (constructorMatch) {
        const matchedString = constructorMatch[0];
        return content.replace(constructorPattern, `${matchedString} this.getNetworkSetting((networkSettings) => {const networkEnabled = networkSettings.enableNetwork; extensionSettings.set('networkEnabled', networkEnabled);}); this.getThemesSetting((themeSettings) => {const theme = themeSettings.theme; extensionSettings.set('theme', theme);});`);
    } else {
        return null;
    }
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

export function applyQuickOpenPatch(content: string) {
    // This patch removes the ability to use the quick open menu (CTRL + P)
    const pattern = /handleAction\(context,actionId\){switch\(actionId\)/;

    if (content.match(pattern)) {
        return content
        .replace(pattern, "handleAction(context, actionId) { actionId = null; switch(actionId)");
    } else {
        return null;
    }
}

export function applyCommandMenuPatch(content: string) {
    // pattern intended to match logic of CommandMenu.attach()
    const pattern = /for\(const action of actions\){const category=action[\s\S]+this\._commands\.sort\(commandComparator\);/;
    if(content.match(pattern)) {
        return content.replace(pattern, `
            const networkEnabled = Root.Runtime.extensionSettings.get('networkEnabled');
            for (const action of actions) {
              const category = action.category();
              if (!category) {
                continue;
              }
              let condition = (category !== 'Elements' || action.title() === 'Show DOM Breakpoints');
              if (networkEnabled) {
                condition = condition && category !== 'Network';
              }
              if (!condition) {
                const options = {action, userActionCode: undefined};
                this._commands.push(CommandMenu.createActionCommand(options));
              }
            }
            for (const command of allCommands) {
              let condition = (command.category() !== 'Elements' || command.title() === 'Show DOM Breakpoints');
              if (networkEnabled) {
                condition = condition && command.category() !== 'Network';
              }
              if (!condition && command.available()) {
                this._commands.push(command);
              }
            }
            this._commands = this._commands.sort(commandComparator);`);
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

export function applyRemoveBreakOnContextMenuItem(content: string) {
    const pattern = /const breakpointsMenu=.+hasDOMBreakpoint\(.*\);}/;
    if (content.match(pattern)) {
        return content.replace(pattern, "");
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
    const elementsTabs = [
        "elements",
        "Styles",
        "Computed",
        "accessibility.view",
        "elements.domProperties",
        "elements.eventListeners",
    ];

    const condition = elementsTabs.map((tab) => {
        return `id !== '${tab}'`;
    }).join(" && ");

    const appendTabWrapper =
        /appendTab\(id,\s*tabTitle\s*,\s*view,\s*tabTooltip,\s*userGesture,\s*isCloseable,\s*index\)\s*{/;
    const injectionPoint = /}(\s|\n)*\s*let EventData;(\s|\n)*\s*const\s*Events/;

    // Injecting our verifications by redirecting appendTab to appendTabOverride
    if (content.match(appendTabWrapper)) {
        content = content.replace(
            appendTabWrapper,
            `appendTabOverride(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index) {`);
    } else {
        return null;
    }

    // We then replace with the verifications itself.
    if (content.match(injectionPoint)) {
        content = content.replace(
            injectionPoint,
            `appendTab(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index) {
                let patchedCondition = ${condition};
                ${applyEnableNetworkPatch()}
                if (!patchedCondition) {
                    this.appendTabOverride(id, tabTitle, view, tabTooltip, userGesture, isCloseable, index);
                }
            }}
            let EventData;
            const Events`);
    } else {
        return null;
    }

    return content;
}

export function applyEnableNetworkPatch(): string {
    // Creates the condition to display or hide the network panel.
    const networkTabs = ["network",
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
        "Shortcuts"];

    const networkCondition = networkTabs.map((tab) => {
        return `id !== '${tab}'`;
    }).join(" && ");

    return `if(Root.Runtime.extensionSettings.get('networkEnabled')) {
        patchedCondition = patchedCondition && (${networkCondition});
    }`;
}

export function applyDefaultTabPatch(content: string) {
    // This patches removes the _defaultTab property
    const pattern = /this\._defaultTab=[^;]+;/g;
    if (content.match(pattern)) {
        return content.replace(pattern,"this._defaultTab=undefined;");
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

export function applyInspectorCommonCssPatch(content: string) {
    // Hides the more tools button in the drawer and reveals the screen cast button.
    const separator = "\\n";

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

export function applyInspectorCommonNetworkPatch(content: string) {
    // Hides export HAR button and pretty print button and reveals the Network search close button in the Network Panel.
    const separator = "\\n";

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

export function applyInspectorCommonContextMenuPatch(content: string) {
    // Hides certain context menu items from elements in the Network Panel.
    const separator = "\\n";

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

export function applyInspectorCommonCssRightToolbarPatch(content: string) {
    const separator = "\\n";
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

export function applyInspectorCommonCssTabSliderPatch(content: string) {
    const separator = "\\n";
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

export function applyRemoveNonSupportedRevealContextMenu(content: string) {
    const pattern = /result\.push\({section:'reveal',title:destination.+reveal\(revealable\)}\);/;
    const match = content.match(pattern);
    if (match) {
        const matchedString = match[0];
        return content.replace(pattern, `if(destination === "Elements panel"){${matchedString}}`);
    } else {
        return null;
    }
}

export function applyThemePatch(content: string) {
    // Sets the theme of the DevTools
    const setPattern = /const settingDescriptor/;
    if (content.match(setPattern)) {
        return content.replace(setPattern, `const theme = Root.Runtime.extensionSettings.get('theme');if(theme){themeSetting.set(theme);} const settingDescriptor`);
    } else {
        return null;
    }
}

export function applyRemovePreferencePatch(content: string) {
    // This patch returns early whe trying to remove localStorage which we already set as undefined
    const pattern = /removePreference\(name\){delete window\.localStorage\[name\];}/;
    const match = content.match(pattern);
    if (match) {
        return content.replace(pattern, "removePreference(name){return;}");
    } else {
        return null;
    }
}
