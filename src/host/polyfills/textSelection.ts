// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function applySetupTextSelectionPatch(content: string): string | null {
    const pattern = /_setupTextSelectionHack\(stylePaneWrapperElement\)\s*{/g;
    if (content.match(pattern)) {
        return content.replace(pattern, '_setupTextSelectionHack() { return;');
    }
        return null;

}
