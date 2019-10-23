// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export default function applyPaddingInlineCssPatch(content: string, isRelease?: boolean) {
    const separator = (isRelease ? "\\n" : "\n");
    const cssHeaderContents =
        `.elements-disclosure .gutter-container {
            display: none !important;
        }`.replace(/\n/g, separator);

    let result = content.replace(
        /(\.elements-disclosure\s*\.gutter-container\s*\{([^\}]*)?\})/g,
        cssHeaderContents);
    result = result.replace(
        /([^-])padding-inline-start:/g,
        "$1-webkit-padding-start:",
    );

    return result;
}
