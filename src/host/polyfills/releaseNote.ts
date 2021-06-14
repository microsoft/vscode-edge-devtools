// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {devtoolsHighlights, extensionHighlights} from './releaseNoteContent';

export function applyReleaseNotePatch(content: string): string | null {
    // This patch changes the content for the Welcome tab.
    const releaseNoteTextPattern = /const releaseNoteText\s*=\s*\[[\s\S]+export\s*{\s*releaseNoteText\s*};/;
    const replacementNotes = `
        export const releaseNoteText = [
            {
            version: 1,
            header: i18nLazyString('Highlights from the latest version of Microsoft Edge Developer Tools for Visual Studio Code'),
            highlightsEdge: ${extensionHighlights}
            highlights: ${devtoolsHighlights}
            help: [
                {
                    title: i18nLazyString("Microsoft Edge DevTools for VS Code Documentation"),
                    link: 'https://microsoft.github.io/vscode-edge-devtools/',
                },
                {
                    title: i18nLazyString(UIStrings.devToolsForBeginners),
                    link: 'https://docs.microsoft.com/microsoft-edge/devtools-guide-chromium/beginners/html',
                },
                { title: i18nLazyString("Visit our GitHub Page"), link: 'https://www.twitter.com/EdgeDevTools' },
                { title: i18nLazyString(UIStrings.submitFeedback), link: 'https://github.com/microsoft/vscode-edge-devtools/issues' },
                { title: i18nLazyString(UIStrings.followOnTwitter), link: 'https://www.twitter.com/EdgeDevTools' },
            ],
            },
        ];
    `;

    if (releaseNoteTextPattern.exec(content)) {
        return content.replace(releaseNoteTextPattern, replacementNotes);
    }
        return null;

}

export function applyAnnouncementNamePatch(content: string): string | null {
    // This patch changes the section headers for the Welcome tab.
    const chromiumAnnouncement = /UIStrings\.chromiumHighlightsTitle/;
    if (chromiumAnnouncement.exec(content)) {
        return content.replace(chromiumAnnouncement, '\'New in Developer Tools\'');
    }
    return null;
}

export function applyShowMorePatch(content: string): string | null {
    // This patch removes the empty href in the 'Show more' button so that VS Code doesn't try to open a blank web page.
    const hrefText = /href=""/;
    if (hrefText.exec(content)) {
        return content.replace(hrefText, '');
    }
    return null;
}

export function applySettingsCheckboxPatch(content: string): string | null {
    // This patch removes the checkbox on the page to enable/disable the Welcome tool. We already handle that in the extension settings.
    const hrefText = /titleContainer\.appendChild\(this\.startupCheckBox\);/;
    if (hrefText.exec(content)) {
        return content.replace(hrefText, '');
    }
    return null;
}
