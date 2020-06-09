export function applyRuntimeImportScriptPathPrefixPatch(content: string) {
    const pattern = /importScriptPathPrefix=baseUrl\.substring\(0,baseUrl\.lastIndexOf\('\/'\)\+1\);\}\)\(\);/g;
    content = content.replace(pattern,
        `self.importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf('/')+1);})();`);

    // Remove declaration
    const variableDeclarationPattern = /let\s*importScriptPathPrefix;/g;
    return content = content.replace(variableDeclarationPattern, "");
}
