// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export default function applySetupTextSelectionPatch(content: string) {
    return content.replace(
        /_setupTextSelectionHack\(stylePaneWrapperElement\)\s*{/g,
        "_setupTextSelectionHack() { return;",
    );
}
