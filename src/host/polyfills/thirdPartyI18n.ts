// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export default function applyThirdPartyI18nLocalesPatch(content: string) {
    const pattern = /const\s*locales\s*=\s*\{[^]+?};/g;
    if (content.match(pattern)) {
        return content.replace(pattern, "const locales = {'en-US': {'title': 'value'},};");
    } else {
        return null;
    }
}
