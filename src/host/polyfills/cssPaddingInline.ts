// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export default function applyPaddingInlineCssPatch(content: string, isRelease?: boolean) {
    const separator = (isRelease ? "\\n" : "\n");
    const cssHeaderContents =
    `.elements-disclosure .gutter-container {
        display: none !important;
    }`.replace(/\n/g, separator);
    const elementsPattern = /(\.elements-disclosure\s*\.gutter-container\s*\{([^\}]*)?\})/g;
    let result;
    if (content.match(elementsPattern)) {
        result = content.replace(elementsPattern, cssHeaderContents);
    } else {
        return null;
    }

    const paddingPattern = /([^-])padding-inline-start:/g;
    if (result.match(paddingPattern)) {
        return result.replace(paddingPattern, "$1-webkit-padding-start:");
    } else {
        return null;
    }
}
