// Copyright (c) Microsoft Corporation. All rights reserved.

import { createFakeVSCode } from "../helpers/helpers";

// Licensed under the MIT License.

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });

describe("settingsProvider", () => {
  beforeEach(() => {
    const mockVSCode = createFakeVSCode();
    jest.doMock("vscode", () => mockVSCode, { virtual: true });
    jest.resetModules();
  });

  describe("GetTabConfiguration", () => {
    it("test that singleton provides the right instance", async () => {
      const settingsProvider = await import("../../src/common/settingsProvider");
      const instance = settingsProvider.SettingsProvider.instance;
      const instanceB = settingsProvider.SettingsProvider.instance;
      expect(instance).not.toEqual(null);
      expect(instance).toEqual(instanceB);
    });
  });
});
