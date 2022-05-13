// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createFakeVSCode, getFakeWebhintConfigContent } from "./helpers/helpers";

import { Uri } from "vscode";
import type { UserConfig } from "@hint/utils";

jest.mock("vscode", () => null, { virtual: true });
describe("webhintUtils", () => {
  let webhintUtils: typeof import("../src/webhintUtils");

  beforeEach(async () => {
    jest.doMock("vscode", () => createFakeVSCode(), { virtual: true });
    jest.resetModules();

    webhintUtils = await import("../src/webhintUtils");
  });

  describe("getWebhintUserConfig", () => {

    it("handles an empty path when getting the user configuration", async () => {
      const uri = { 
        path: jest.fn().mockReturnValue(''),
        toString: jest.fn().mockReturnValue('')
      } as unknown as Uri;
      const result = await webhintUtils.getWebhintUserConfig(uri);

      expect(result).toEqual(undefined);
    });

    it("creates a file if it does not exists in the given path", async () => {

      const expectedText = 'pathWithoutConfigFile';

      const uri = { 
        path: jest.fn().mockReturnValue(expectedText),
        toString: jest.fn().mockReturnValue(expectedText)
      } as unknown as Uri;

      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.stat.mockImplementationOnce(() => {
        const mockedError = { code: "FileNotFound" };
        throw mockedError;
      });

      const documentArray = Buffer.from(getFakeWebhintConfigContent());
      vscodeMock.workspace.fs.readFile.mockImplementationOnce(jest.fn().mockResolvedValue(documentArray));
      const result = await webhintUtils.getWebhintUserConfig(uri);

      expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalledWith(uri, expect.any(Buffer));
      expect(vscodeMock.workspace.fs.readFile).toHaveBeenCalled();
      expect(result).not.toBe(undefined);
      expect(result).not.toBe(null);
    });

    it("retrieves file if it exists in the given path", async () => {

      const expectedText = 'pathWithoutConfigFile';

      const uri = { 
        path: jest.fn().mockReturnValue(expectedText),
        toString: jest.fn().mockReturnValue(expectedText)
      } as unknown as Uri;

      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.stat.mockImplementationOnce(jest.fn());

      const documentArray = Buffer.from(getFakeWebhintConfigContent());
      vscodeMock.workspace.fs.readFile.mockImplementationOnce(jest.fn().mockResolvedValue(documentArray));
      const result = await webhintUtils.getWebhintUserConfig(uri);

      expect(vscodeMock.workspace.fs.writeFile).not.toHaveBeenCalled();
      expect(vscodeMock.workspace.fs.readFile).toHaveBeenCalled();
      expect(result).not.toBe(undefined);
      expect(result).not.toBe(null);
      expect(result?.hints).not.toBe(null);
      expect(result?.extends).not.toBe(null);
    });
  });

  describe("addProblemToIgnoredHintsConfig", () => {

    const expectedText = 'pathWithoutConfigFile';
    let userConfig: UserConfig;
    const uri = { 
      path: jest.fn().mockReturnValue(expectedText),
      toString: jest.fn().mockReturnValue(expectedText)
    } as unknown as Uri;

    beforeEach(async () => {
      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.stat.mockImplementationOnce(jest.fn());

      const documentArray = Buffer.from(getFakeWebhintConfigContent());
      vscodeMock.workspace.fs.readFile.mockImplementationOnce(jest.fn().mockResolvedValue(documentArray));
      const resultConfig = await webhintUtils.getWebhintUserConfig(uri);
      expect(resultConfig).not.toBe(null);
      expect(resultConfig).not.toBe(undefined);
      userConfig = resultConfig as UserConfig;
    });

    it("fails if required arguments are not provided", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce(jest.fn());
      userConfig = {};
      await webhintUtils.addProblemToIgnoredHintsConfig(uri, userConfig, '','');
      expect(vscodeMock.workspace.fs.writeFile).not.toHaveBeenCalled();
    });

    it("handles an empty user configuration", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce((args1: string, args2: Buffer)=>{
        expect(args1).toBe(uri);
        const expectedResult = `{"hints":{"fakeHintName":["default",{"ignore":["fakeHintProblem"]}]}}`;
        expect(args2.toString()).toBe(expectedResult);
      });

      userConfig = {};
      await webhintUtils.addProblemToIgnoredHintsConfig(uri, userConfig, 'fakeHintName','fakeHintProblem');
      expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalled();
    });

    it("appends a new hint in an existing user configuration", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce((args1: string, args2: Buffer)=>{
        expect(args1).toBe(uri);
        const expectedResult = JSON.parse(getFakeWebhintConfigContent());
        expectedResult['hints']['fakeHintName'] = JSON.parse('["default",{"ignore":["fakeHintProblem"]}]');
        expect(args2.toString()).toBe(JSON.stringify(expectedResult));
      });

      await webhintUtils.addProblemToIgnoredHintsConfig(uri, userConfig, 'fakeHintName','fakeHintProblem');
      expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalled();
    });

    it("appends a problem to an existing hint", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce((args1: string, args2: Buffer)=>{
        expect(args1).toBe(uri);
        const expectedResult = JSON.parse(getFakeWebhintConfigContent());
        expectedResult['hints']['compat-api/css'][1].ignore = JSON.parse('["box-flex", "fakeHintProblem"]');
        expect(args2.toString()).toBe(JSON.stringify(expectedResult));
      });

      await webhintUtils.addProblemToIgnoredHintsConfig(uri, userConfig, 'compat-api/css','fakeHintProblem');
      expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalled();
    });

    it.skip("does not duplicate an existing problem in an existing hint", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce((args1: string, args2: Buffer)=>{
        expect(args1).toBe(uri);
        const expectedResult = JSON.parse(getFakeWebhintConfigContent());
        expect(args2.toString()).toBe(JSON.stringify(expectedResult));
      });

      await webhintUtils.addProblemToIgnoredHintsConfig(uri, userConfig, 'compat-api/css','box-flex');
      expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalled();
    });

    it.skip("keeps the format when adding a new problem", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce((args1: string, args2: Buffer)=>{
        expect(args1).toBe(uri);
        const expectedResult = getFakeWebhintConfigContent();
        expect(args2.toString()).toBe(expectedResult);
      });

      await webhintUtils.addProblemToIgnoredHintsConfig(uri, userConfig, 'compat-api/css','box-flex');
      expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalled();
    });

    it("appends a new hint when another hint is turned off (set to a string)", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce((args1: string, args2: Buffer)=>{
        expect(args1).toBe(uri);
        const expectedResult = JSON.parse(getFakeWebhintConfigContent());
        expectedResult['hints']['compat-api/css'] = "off";
        expectedResult['hints']['fakeHintName'] = JSON.parse('["default",{"ignore":["fakeHintProblem"]}]');
        expect(args2.toString()).toBe(JSON.stringify(expectedResult));
      });

      (userConfig.hints as any)['compat-api/css'] = "off";
      await webhintUtils.addProblemToIgnoredHintsConfig(uri, userConfig, 'fakeHintName','fakeHintProblem');
      expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalled();
    });

    it("respect existing state when a new problem is added to a hint that is turned off (set to a string)", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce((args1: string, args2: Buffer)=>{
        expect(args1).toBe(uri);
        const expectedResult = JSON.parse(getFakeWebhintConfigContent());
        expectedResult['hints']['compat-api/css'] = JSON.parse('["off",{"ignore":["fakeHintProblem"]}]');
        expect(args2.toString()).toBe(JSON.stringify(expectedResult));
      });

      (userConfig.hints as any)['compat-api/css'] = "off";
      await webhintUtils.addProblemToIgnoredHintsConfig(uri, userConfig, 'compat-api/css','fakeHintProblem');
      expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalled();
    });
  });

  describe("ignoreHintPerProject", () => {
    it("successfully ignores a hint in the user configuration folder", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      const expectedValue = 'file:///user/config/path/.hintrc';
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce((args1: string, args2: Buffer)=>{
        expect(args1).toBe(expectedValue);
        const expectedResult = JSON.parse(getFakeWebhintConfigContent());
        expectedResult['hints']['compat-api/css'] = 'off';
        expect(args2.toString()).toBe(JSON.stringify(expectedResult));
      });
      vscodeMock.workspace.fs.stat.mockImplementationOnce(jest.fn());
      const documentArray = Buffer.from(getFakeWebhintConfigContent());
      vscodeMock.workspace.fs.readFile.mockImplementationOnce(jest.fn().mockResolvedValue(documentArray));
      vscodeMock.Uri.parse.mockReturnValue(expectedValue);
      await webhintUtils.ignoreHintPerProject('compat-api/css');
      expect(vscodeMock.workspace.fs.readFile).toHaveBeenCalledWith('file:///user/config/path/.hintrc');
    });
  });

  describe("ignoreHintGlobally", () => {
    it("successfully ignores a hint in the globalStoragePath folder", async () => {
      const vscodeMock = await jest.requireMock("vscode");
      const expectedValue = 'file:///global/storage/path/.hintrc';
      vscodeMock.workspace.fs.writeFile.mockImplementationOnce((args1: string, args2: Buffer)=>{
        expect(args1).toBe(expectedValue);
        const expectedResult = JSON.parse(getFakeWebhintConfigContent());
        expectedResult['hints']['compat-api/css'] = 'off';
        expect(args2.toString()).toBe(JSON.stringify(expectedResult));
      });
      vscodeMock.workspace.fs.stat.mockImplementationOnce(jest.fn());
      const documentArray = Buffer.from(getFakeWebhintConfigContent());
      vscodeMock.workspace.fs.readFile.mockImplementationOnce(jest.fn().mockResolvedValue(documentArray));
      vscodeMock.Uri.parse.mockReturnValue(expectedValue);
      await webhintUtils.ignoreHintGlobally('compat-api/css',expectedValue);
      expect(vscodeMock.workspace.fs.readFile).toHaveBeenCalledWith('file:///global/storage/path/.hintrc')
    });
  });
});
