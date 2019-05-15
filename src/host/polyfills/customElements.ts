// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

declare var document: HTMLDocument & { registerElement: (...args: any[]) => any };

export function registerCustomElementOverride(
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
    const newContent = content.replace(
        /UI.registerCustomElement\s*=\s*function/g,
        `UI.registerCustomElement = ${registerCustomElementOverride.toString()};
        UI.deprecatedRegisterCustomElement = function`,
    );
    return newContent;
}

export function applyCreateElementPatch(content: string) {
    return content.replace(
        /\.createElement\((.+){is:\s*customElementType}/g,
        ".createElement($1 customElementType || ''");
}
