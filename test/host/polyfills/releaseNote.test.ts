// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { testPatch } from "../../helpers/helpers";
import * as ReleaseNotePatch from "../../../src/host/polyfills/releaseNote";

describe("Release notes text replacement", () => {
    it("verifies that applyReleaseNotePatch correctly replaces what's new content", async () => {
        const filePath = "panels/help/ReleaseNoteText.js";
        const patch = ReleaseNotePatch.applyReleaseNotePatch;
        const expectedStrings = ["Highlights from the latest version of Microsoft Edge Developer Tools for Visual Studio Code"];

        await testPatch(filePath, patch, expectedStrings);
    });
    it("verifies that applyAnnouncementNamePatch correctly replaces the section headers", async () => {
        const filePath = "welcome/WelcomePanel.js";
        const patch = ReleaseNotePatch.applyAnnouncementNamePatch;
        const expectedStrings = ["New in Developer Tools"];

        await testPatch(filePath, patch, expectedStrings);
    });
    it("verifies that applyShowMorePatch correctly replaces the section headers", async () => {
        const filePath = "welcome/WhatsNewList.js";
        const patch = ReleaseNotePatch.applyShowMorePatch;
        const unexpectedStrings = ["href=\"\""];

        await testPatch(filePath, patch, undefined, unexpectedStrings);
    });
    it("verifies that applySettingsCheckboxPatch correctly replaces the section headers", async () => {
        const filePath = "welcome/WelcomePanel.js";
        const patch = ReleaseNotePatch.applySettingsCheckboxPatch;
        const unexpectedStrings = ["titleContainer.appendChild(this.startupCheckBox);"];

        await testPatch(filePath, patch, undefined, unexpectedStrings);
    });
});
