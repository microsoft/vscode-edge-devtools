// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";

describe("importScriptPathPrefix replacement", () => {
    it("verifies that importScriptPathPrefix is exposed as a module variable", async () => {
        const filePath = "root/root.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const apply = await import("./runtime");
        const result = apply.default(fileContents);
        const importScriptReplacementPattern =
            "self.importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf('/')+1);})();";
        const variableDeclarationPattern = "let importScriptPathPrefix";

        expect(result).toEqual(expect.stringContaining(importScriptReplacementPattern));
        expect(result).not.toEqual(expect.stringContaining(variableDeclarationPattern));
    });

    it("verifies that importScriptPathPrefix correctly reports a wrong replacement", async () => {
        const apply = await import("./runtime");
        const result = apply.default("");
        expect(result).toEqual(null);
    });
});
