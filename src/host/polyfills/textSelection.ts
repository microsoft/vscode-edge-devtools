// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Overrides a weird text selection hack in the elements panel not needed in VSCode
// Confirm it works by selecting text in the elements DOM tree and styles sidebar
export function applySetupTextSelectionPatch(content: string): string | null {
    const pattern = /_setupTextSelectionHack\(stylePaneWrapperElement\)\s*{/g;
    if (content.match(pattern)) {
        return content.replace(pattern, '_setupTextSelectionHack() { return;');
    }
        return null;

}
