// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export default function applyPaddingInlineCssPatch(content: string, isRelease?: boolean) {
    return content.replace(
        /([^-])padding-inline-start:/g,
        "$1-webkit-padding-start:",
    );
}
