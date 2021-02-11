// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function applyReleaseNotePatch(content: string) {
    const releaseNoteTextPattern = /const releaseNoteText\s*=\s*\[[\s\S]+var ReleaseNoteText_edge\s*=/;
    const replacementNotes = `
        export const releaseNoteText = [
            {
            version: 1,
            header: ls\`Highlights from the latest version of Microsoft Edge Developer Tools for Visual Studio Code\`,
            highlightsEdge: [
                {
                    title: ls\`DevTools Extension Console rerouting to VSCode output window\`,
                    subtitle:
                        ls\`The console messages from the DevTools are now rerouted to the VS Code Output window for an integrated debugging experience.\`,
                    link: 'https://github.com/microsoft/vscode-edge-devtools/pull/275',
                },
                {
                    title: ls\`Improvements to revealing files in VSCode from the DevTools styles pane\`,
                    subtitle:
                        ls\`Clicking on a property will only navigate when CTRL is held and clicking the styles sheet link will open the file in VS Code.\`,
                    link: 'https://github.com/microsoft/vscode-edge-devtools/pull/264',
                },
                {
                    title: ls\`Introducing favicons to the extension sidebar\`,
                    subtitle:
                        ls\`The extension's sidebar will now display the target website's favicon to help organize debugging targets.\`,
                    link: 'https://github.com/microsoft/vscode-edge-devtools/pull/278',
                },
                {
                    title: ls\`Changing screencast view cursor from touch to default\`,
                    subtitle:
                        ls\`After receiving feedback, we have changed the type of cursor for the screencast view from a touch cursor to the default cursor to improve precision.\`,
                    link: 'https://github.com/microsoft/vscode-edge-devtools/pull/279',
                },
                {
                    title: ls\`Network tool enabled by default\`,
                    subtitle:
                        ls\`The Network tool is now availalbe by default! If you would like to keep it off, uncheck the "Enable Network" checkbox in the VS Code extension settings.\`,
                    link: 'https://github.com/microsoft/vscode-edge-devtools/pull/272',
                },
            ],
            highlights: [
                {
                title: ls\`CSS grid overlay improvements and new experimental grid features\`,
                subtitle:
                    ls\`Grid overlays are now enabled by default with multiple persistent and configurable overlays coming soon.\`,
                link: 'https://go.microsoft.com/fwlink/?linkid=2142427',
                },
                {
                title: ls\`Highlight all search results in Elements tool\`,
                subtitle: ls\`Thanks to your feedback, we were able to find and fix a bug in the open-source Chromium project.\`,
                link: 'https://go.microsoft.com/fwlink/?linkid=2142224'
                },
                {
                title: ls\`Network and Elements panel updates\`,
                subtitle:
                    ls\`Capture node screenshots shortcut, accessible color suggestion, consistent resource types, and more.\`,
                link: 'https://go.microsoft.com/fwlink/?linkid=2142153',
                }
            ],
            githubLink: 'https://github.com/microsoft/vscode-edge-devtools',
            issuesLink: 'https://github.com/microsoft/vscode-edge-devtools/issues',
            },
        ];

        var ReleaseNoteText_edge =
    `;

    if (content.match(releaseNoteTextPattern)) {
        return content.replace(releaseNoteTextPattern, replacementNotes);
    } else {
        return null;
    }
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
    } else {
        return null;
    }
}

export function applyAnnouncementNamePatch(content: string) {
  const microsoftAnnouncement = /Announcements from the Microsoft Edge DevTools team/;
  const chromiumAnnouncement = /Announcements from the Chromium project/;
  if (content.match(microsoftAnnouncement) && content.match(chromiumAnnouncement)) {
    content = content.replace(microsoftAnnouncement, 'Announcements from the Microsoft Edge Developer Tools for Visual Studio Code Team');
    return content.replace(chromiumAnnouncement, 'Announcements from the Developer Tools Team');
  } else {
    return null;
  }
}
