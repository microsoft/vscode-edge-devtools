// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function applyContentSecurityPolicyPatch(content: string): string | null {
    const scriptPattern = /script-src\s*'self'/g;
    let result;
    if (content.match(scriptPattern)) {
        result = content.replace(scriptPattern, `script-src vscode-webview-resource: 'self'`);
    } else {
        return null;
    }

    const metaString = `<meta name="referrer" content="no-referrer">`;
    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
    if (result.match(metaString)) {
        return result.replace(metaString, `<script src="../../host/host.bundle.js"></script>`);
    }
        return null;

}
