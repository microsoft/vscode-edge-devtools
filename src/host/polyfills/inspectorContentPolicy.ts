// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function applyContentSecurityPolicyPatch(content: string) {
    const scriptPattern = /script-src\s*'self'/g;
    let result;
    if (content.match(scriptPattern)) {
        result = content.replace(scriptPattern, `script-src vscode-resource: 'self'`);
    } else {
        return null;
    }

    const metaString = `<meta name="referrer" content="no-referrer">`;
    if (result.indexOf(metaString) !== -1) {
        return result.replace(metaString, `<script src="../../host/host.bundle.js"></script>`);
    } else {
        return null;
    }
}
