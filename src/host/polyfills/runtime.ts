// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function applyRuntimeImportScriptPathPrefixPatch(content: string) {
    // ImportScript is exposed as a module variable, this patch:
    // Exposes it again as a global and remove the local declaration.
    const pattern = /importScriptPathPrefix=baseUrl\.substring\(0,baseUrl\.lastIndexOf\('\/'\)\+1\);\}\)\(\);/g;
    content = content.replace(pattern,
        `self.importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf('/')+1);})();`);

    // Remove declaration
    const variableDeclarationPattern = /let\s*importScriptPathPrefix;/g;
    return content = content.replace(variableDeclarationPattern, "");
}
