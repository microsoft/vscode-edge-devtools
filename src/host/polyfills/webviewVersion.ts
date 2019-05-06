// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export default function getWebviewVersion() {
    const versionRegex = /Chrom(?:e|ium)\/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/;
    const parts = versionRegex.exec(self.navigator.userAgent);
    if (parts && parts.length === 5) {
        return {
            build: parseInt(parts[3], 10),
            major: parseInt(parts[1], 10),
            minor: parseInt(parts[2], 10),
            revision: parseInt(parts[4], 10),
        };
    }

    return undefined;
}
