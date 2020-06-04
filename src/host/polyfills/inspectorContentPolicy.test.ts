// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";

describe("inspectorContentPolicy", () => {
    it("applyContentSecurityPolicyPatch correctly changes text", async () => {
        //const comparableText = "script-src 'self' 'unsafe-eval' <meta name=\"referrer\" content=\"no-referrer\">";
        let fileContents = getTextFromFile("inspector.html");

        // The file was not found, so test that at least the text is being replaced.
        fileContents = fileContents ? fileContents : "aaa";

        const apply = await import("./inspectorContentPolicy");
        const result = apply.applyContentSecurityPolicyPatch(fileContents);
        expect(result).toEqual(
            expect.stringContaining(
                `script-src vscode-resource: 'self'`));
        expect(result).toEqual(
            expect.stringContaining(
                `<script src="../../host/host.bundle.js"></script>`));
    });
});
