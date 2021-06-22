// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { testPatch } from "../../helpers/helpers";
import { applyRuntimeImportScriptPathPrefixPatch } from "../../../src/host/polyfills/runtime";

describe("importScriptPathPrefix replacement", () => {
    it("verifies that importScriptPathPrefix is exposed as a module variable", async () => {
        const filePath = "core/root/Runtime_edge.js";
        const expectedStrings = ["self.importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf('/')+1);})();"];
        const unexpectedStrings = ["let importScriptPathPrefix"]

        testPatch(filePath, applyRuntimeImportScriptPathPrefixPatch, expectedStrings, unexpectedStrings);
    });

    it("verifies that importScriptPathPrefix correctly reports a wrong replacement", async () => {
        const result = applyRuntimeImportScriptPathPrefixPatch("");
        expect(result).toEqual(null);
    });
});
