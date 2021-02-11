// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTextFromFile } from "../../test/helpers";
import * as ReleaseNotePatch from "./releaseNotes";

describe("Release notes text replacement", () => {
    it("verifies that applyReleaseNotePatch correctly replaces what's new content", async () => {
        const filePath = "help/help.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const result = ReleaseNotePatch.applyReleaseNotePatch(fileContents);
        expect(result).toEqual(
            expect.stringContaining(
                `Highlights from the latest version of Microsoft Edge Developer Tools for Visual Studio Code`));
    });
    it("verifies that applyGithubLinksPatch correctly replaces GitHub links at the bottom of the tab", async () => {
        const filePath = "help/help.js";
        const fileContents = getTextFromFile(filePath);
        if (!fileContents) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        const result = ReleaseNotePatch.applyGithubLinksPatch(fileContents);
        expect(result).toEqual(
            expect.stringContaining(
                `const githubLink`));
    });
    it("verifies that applyAnnouncementNamePatch correctly replaces the section headers", async () => {
      const filePath = "help/help.js";
      const fileContents = getTextFromFile(filePath);
      if (!fileContents) {
          throw new Error(`Could not find file: ${filePath}`);
      }

      const result = ReleaseNotePatch.applyAnnouncementNamePatch(fileContents);
      expect(result).toEqual(
          expect.stringContaining(
              `Announcements from the Microsoft Edge Developer Tools for Visual Studio Code Team`));
    });
});
