// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {devtoolsHighlights, extensionHighlights} from './releaseNoteContent';

export function applyReleaseNotePatch(content: string): string | null {
    const releaseNoteTextPattern = /const releaseNoteText\s*=\s*\[[\s\S]+export\s*{\s*releaseNoteText\s*};/;
    const replacementNotes = `
        export const releaseNoteText = [
            {
            version: 1,
            header: ls\`Highlights from the latest version of Microsoft Edge Developer Tools for Visual Studio Code\`,
            highlightsEdge: ${extensionHighlights}
            highlights: ${devtoolsHighlights}
            githubLink: 'https://github.com/microsoft/vscode-edge-devtools',
            issuesLink: 'https://github.com/microsoft/vscode-edge-devtools/issues',
            },
        ];

        export { releaseNoteText };
    `;

    if (releaseNoteTextPattern.exec(content)) {
        return content.replace(releaseNoteTextPattern, replacementNotes);
    }
        return null;

}

export function applyGithubLinksPatch(content: string): string | null {
    const linkPattern = /const learnMore\s*=[\s\S]+learnMore\);/g;
    const linkReplacementText = `
        const githubLink = XLink.XLink.create(releaseNote.githubLink, ls \`Visit our Github Page\`, 'release-note-link-learn-more');
        actionContainer.appendChild(githubLink);
        const issuesContainer = buttonContainer.createChild('div', 'release-note-action-container');
        const issuesLink = XLink.XLink.create(releaseNote.issuesLink, ls \`Send us feedback\`, 'release-note-link-learn-more');
        issuesContainer.appendChild(issuesLink);
    `;
    if (linkPattern.exec(content)) {
        return content.replace(linkPattern, linkReplacementText);
    }
        return null;

}

export function applyAnnouncementNamePatch(content: string): string | null {
    const microsoftAnnouncement = /Announcements from the Microsoft Edge DevTools team/;
    const chromiumAnnouncement = /Announcements from the Chromium project/;
    if (microsoftAnnouncement.exec(content) && chromiumAnnouncement.exec(content)) {
        content = content.replace(microsoftAnnouncement, 'New extension features');
        return content.replace(chromiumAnnouncement, 'New in Developer Tools');
    }
        return null;

}
