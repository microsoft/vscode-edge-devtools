// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { testPatch } from "../../helpers/helpers";
import { applyThirdPartyI18nLocalesPatch } from "../../../src/host/polyfills/thirdPartyI18n";

describe("override i18n locales", () => {
    it("applyThirdPartyI18nLocalesPatch correctly changes text", async () => {
        const filePath = "third_party/i18n/i18n-bundle.js";
        const expectedStrings = ["const locales = {'en-US': {'title': 'value'},};"];
        testPatch(filePath, applyThirdPartyI18nLocalesPatch, expectedStrings);
    });
});
