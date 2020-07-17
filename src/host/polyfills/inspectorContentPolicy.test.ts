// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";

describe("inspectorContentPolicy", () => {
    it("applyContentSecurityPolicyPatch correctly changes text", async () => {
        const filePath = "inspector.html";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./inspectorContentPolicy");
        const result = apply.applyContentSecurityPolicyPatch(fileContents);
        expect(result).toEqual(
            expect.stringContaining(
                `script-src vscode-webview-resource: 'self'`));
        expect(result).toEqual(
            expect.stringContaining(
                `<script src="../../host/host.bundle.js"></script>`));
    });
});
