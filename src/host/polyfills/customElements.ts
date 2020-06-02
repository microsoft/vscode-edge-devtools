// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

declare var document: HTMLDocument & { registerElement: (...args: any[]) => any };

export function registerCustomElement(
    localName: string,
    typeExtension: string,
    definition: new (...a: any[]) => any) {
    // Replace the class definition with the custom elements v0 version
    const code = definition.toString();
    const classObjectDef = code.replace(/super\(\);/g, "")
    .replace(/constructor\(\)\s*{/g, "createdCallback() {");

    // tslint:disable-next-line: no-eval
    const classObject = eval(`(${classObjectDef})`);

    const construct = document.registerElement(
        typeExtension,
        { prototype: Object.create(classObject.prototype), extends: localName });

    return () => {
        const obj = new construct();
        return obj;
    };
}

export function applyUIUtilsPatch(content: string) {
    const pattern = /export\s*function\s*registerCustomElement\s*\(localName,\s*typeExtension/g;
    if (content.match(pattern)) {
        return content.replace(pattern,
            `export ${registerCustomElement.toString()} 
            export function deprecatedRegisterCustomElement(localName, typeExtension`);
    } else {
        return null;
    }
}

export function applyCreateElementPatch(content: string) {
    const pattern = /\.createElement\(([a-zA-Z]+)\s*,\s*{is:\s*customElementType}/g;
    if (content.match(pattern)) {
        return content.replace(pattern, ".createElement($1, customElementType || ''");
    } else {
        return null;
    }
}
