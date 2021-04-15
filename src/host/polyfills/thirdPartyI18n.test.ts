// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { testPatch } from "../../test/helpers";
import { applyThirdPartyI18nLocalesPatch } from "./thirdPartyI18n";

describe("override i18n locales", () => {
    it("applyThirdPartyI18nLocalesPatch correctly changes text", async () => {
        const filePath = "i18n/i18n.js";
        const expectedStrings = ["const locales = {'en-US': {'title': 'value'},};"];
        testPatch(filePath, applyThirdPartyI18nLocalesPatch, expectedStrings);
    });
});
