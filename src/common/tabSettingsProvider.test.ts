// Copyright (c) Microsoft Corporation. All rights reserved.

import { createFakeVSCode } from "../test/helpers";

// Licensed under the MIT License.

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });

describe("tabSettingsProvider", () => {
  beforeEach(() => {
    const mockVSCode = createFakeVSCode();
    jest.doMock("vscode", () => mockVSCode, { virtual: true });
    jest.resetModules();
  });

  describe("GetTabConfiguration", () => {
    it("test that singleton provides the right instance", async () => {
      const tsp = await import("../common/tabSettingsProvider");
      const instance = tsp.TabSettingsProvider.instance;
      const instanceB = tsp.TabSettingsProvider.instance;
      expect(instance).not.toEqual(null);
      expect(instance).toEqual(instanceB);
    });

    it("test that the right value is retrieved for networkEnabled configuration", async () => {
      jest.requireMock("vscode");
      const tsp = await import("../common/tabSettingsProvider");
      const instance = tsp.TabSettingsProvider.instance;
      expect(instance).not.toEqual(null);
      const result = instance.isNetworkEnabled();
      expect(result).toEqual(true);
    });
  });
});
