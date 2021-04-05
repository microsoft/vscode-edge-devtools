// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {devtoolsHighlights, extensionHighlights} from './releaseNoteContent';

export function applyReleaseNotePatch(content: string) {
    const releaseNoteTextPattern = /const releaseNoteText\s*=\s*\[[\s\S]+var ReleaseNoteText_edge\s*=/;
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

        var ReleaseNoteText_edge =
    `;

    if (content.match(releaseNoteTextPattern)) {
        return content.replace(releaseNoteTextPattern, replacementNotes);
    }
        return null;

}

export function applyGithubLinksPatch(content: string) {
    const linkPattern = /const learnMore\s*=[\s\S]+learnMore\);/g;
    const linkReplacementText = `
        const githubLink = XLink.XLink.create(releaseNote.githubLink, ls \`Visit our Github Page\`, 'release-note-link-learn-more');
        actionContainer.appendChild(githubLink);
        const issuesContainer = buttonContainer.createChild('div', 'release-note-action-container');
        const issuesLink = XLink.XLink.create(releaseNote.issuesLink, ls \`Send us feedback\`, 'release-note-link-learn-more');
        issuesContainer.appendChild(issuesLink);
    `;
    if (content.match(linkPattern)) {
        return content.replace(linkPattern, linkReplacementText);
    }
        return null;

}

export function applyAnnouncementNamePatch(content: string) {
    const microsoftAnnouncement = /Announcements from the Microsoft Edge DevTools team/;
    const chromiumAnnouncement = /Announcements from the Chromium project/;
    if (content.match(microsoftAnnouncement) && content.match(chromiumAnnouncement)) {
        content = content.replace(microsoftAnnouncement, 'New extension features');
        return content.replace(chromiumAnnouncement, 'New in Developer Tools');
    }
        return null;

}
