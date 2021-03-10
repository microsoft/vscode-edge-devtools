// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { testPatch } from "../../test/helpers";
import { applyContentSecurityPolicyPatch } from "./inspectorContentPolicy"

describe("inspectorContentPolicy", () => {
    it("applyContentSecurityPolicyPatch correctly changes text", async () => {
        const filePath = "inspector.html";
        const expectedStrings = [`script-src vscode-webview-resource: 'self'`, `<script src="../../host/host.bundle.js"></script>`];
        testPatch(filePath, applyContentSecurityPolicyPatch, expectedStrings);
    });
});
