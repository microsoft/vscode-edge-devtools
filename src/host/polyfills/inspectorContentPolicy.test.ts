// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// TODO: Replace vscode-resource with Webview.cspSource
describe("inspectorContentPolicy", () => {
    it("applyContentSecurityPolicyPatch correctly changes text", async () => {
        const apply = await import("./inspectorContentPolicy");
        const result = apply.applyContentSecurityPolicyPatch(
            `Content-Security-Policy" content="script-src 'self' 'unsafe-eval'"`);
        expect(result).toEqual(
            expect.stringContaining(
                `Content-Security-Policy" content="script-src vscode-resource: 'self' 'unsafe-eval'"`));

        const result2 = apply.applyContentSecurityPolicyPatch(
            `<meta name="referrer" content="no-referrer">`);
        expect(result2).toEqual(
            expect.stringContaining(
                `<script src="../../host/host.bundle.js"></script>`));
    });
});
