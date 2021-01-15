// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export default function applyRuntimeImportScriptPathPrefixPatch(content: string) {

    // ImportScript is exposed as a module variable, this patch:
    // Exposes it again as a global and remove the local declaration.
    const importScriptReplacementPattern =
        `self.importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf('/')+1);})();`;
    const pattern = /importScriptPathPrefix\s*=\s*baseUrl\.substring\(0,\s*baseUrl\.lastIndexOf\('\/'\)\s*\+\s*1\);\s*\}\)\(\);/g;

    // Remove declaration
    const variableDeclarationPattern = /let\s*importScriptPathPrefix;/g;

    if (content.match(pattern) && content.match(variableDeclarationPattern)) {
        content = content.replace(pattern, importScriptReplacementPattern);
        content = content.replace(variableDeclarationPattern, "");
        return content;
    } else {
        return null;
    }
}
