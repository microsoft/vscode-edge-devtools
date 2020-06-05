// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export default function applySetupTextSelectionPatch(content: string) {
    const pattern = /_setupTextSelectionHack\(stylePaneWrapperElement\)\s*{/g;
    if (content.match(pattern)) {
        return content.replace(pattern, "_setupTextSelectionHack() { return;");
    } else {
        return null;
    }
}
