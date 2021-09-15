// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const extensionHighlights = `[
    {
        title: i18nLazyString("Error handling implementation"),
        subtitle:
            i18nLazyString("Introduces the behavior for handling a common set of errors by using the Error reporter."),
        link: 'https://github.com/microsoft/vscode-edge-devtools/pull/475',
    },
    {
        title: i18nLazyString("Implement CSS mirror editing"),
        subtitle:
            i18nLazyString("Adds the cssMirrorContent function for VSCode hosted DevTools that allows mirror editing for the extension when the modified stylesheet is in the VSCode workspace."),
        link: 'https://github.com/microsoft/vscode-edge-devtools/pull/462',
    },
    {
        title: i18nLazyString("Properly resolve index.html and other entrypoint links"),
        subtitle:
            i18nLazyString("Fixes an issue where index.html and other entrypoint links in the extension would not properly resolve to workspace folders."),
        link: 'https://github.com/microsoft/vscode-edge-devtools/pull/469',
    },
    {
        title: i18nLazyString("Supporting following CSS links on WSL remotes"),
        subtitle:
            i18nLazyString("Fixes an issue that prevented CSS files from opening in WSL."),
        link: 'https://github.com/microsoft/vscode-edge-devtools/pull/467',
    },
],`;

export const devtoolsHighlights = `[
    {
        title: i18nLazyString("New Flexbox (flex) icon helps identify and display flex containers"),
        subtitle:
            i18nLazyString("In the Elements tool, the new Flexbox (flex) icon helps you identify Flexbox containers in your code."),
        link: 'https://docs.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/whats-new/2021/01/devtools#new-flexbox-flex-icon-helps-identify-and-display-flex-containers',
    },
    {
        title: i18nLazyString("Display alignment icons and visual guides when Flexbox layouts change using CSS properties"),
        subtitle: i18nLazyString("When you edit CSS for your Flexbox layout, CSS autocompletes in the Styles pane now displays helpful icons next to relevant Flexbox properties."),
        link: 'https://docs.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/whats-new/2021/01/devtools#display-alignment-icons-and-visual-guides-when-flexbox-layouts-change-using-css-properties',
    },
    {
        title: i18nLazyString("Improved CSS flexbox editing with visual flexbox editor and multiple overlays"),
        subtitle: i18nLazyString("DevTools now has dedicated CSS flexbox debugging tools. If the display: flex or display: inline-flex CSS style is applied to an HTML element, a flex icon displays next to that element in the Elements tool."),
        link: 'https://docs.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/whats-new/2021/02/devtools#improved-css-flexbox-editing-with-visual-flexbox-editor-and-multiple-overlays',
    },
    {
        title: i18nLazyString("Introducing the new 'Welcome' tab!"),
        subtitle:
            i18nLazyString("The 'Welcome' tab has replaced the What's New tab"),
        link: 'https://docs.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/whats-new/2021/01/devtools#whats-new-is-now-welcome',
    },
    {
        title: i18nLazyString("Learn about DevTools with informative tooltips"),
        subtitle: i18nLazyString("The DevTools Tooltips feature helps you learn about all the different tools and panes in DevTools. Toggle on with 'CTRL/CMD + SHIFT + H' and Toggle off with 'Esc'"),
        link: 'https://docs.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/whats-new/2021/04/devtools#learn-about-devtools-with-informative-tooltips',
    },
],`;
