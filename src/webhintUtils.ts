// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as path from 'path';

import type { UserConfig as WebhintUserConfig } from '@hint/utils';

export async function getWebhintUserConfig(path: vscode.Uri): Promise<WebhintUserConfig | undefined> {
  if (!path || !path.toString()) {
      return;
  }

  // start with an empty file
  let userConfigByteArray: Uint8Array = Buffer.from('', 'utf8');

  try {
      // verify if .hintrc exists
      await vscode.workspace.fs.stat(path);
  } catch (error) {
      if ((error as vscode.FileSystemError).code === vscode.FileSystemError.FileNotFound.name) {

          // .hintrc does not exists so create one with the default config
          const defaultConfig = { extends: ['development'] };
          await vscode.workspace.fs.writeFile(path, Buffer.from(JSON.stringify(defaultConfig), 'utf8'));
      } else {
          throw error;
      }
  }

  // user config file is guaranteed to exist at this point, now read it.
  userConfigByteArray = await vscode.workspace.fs.readFile(path);
  const rawUserConfig = Buffer.from(userConfigByteArray).toString('utf8');
  const userConfig = JSON.parse(rawUserConfig) as WebhintUserConfig;
  return userConfig;
}

export function getWehbhintConfigPath(directory: string[]): vscode.Uri {
  const absolutePath = path.join(...directory, '.hintrc');
  const encodedUri = vscode.Uri.parse(vscode.Uri.file(absolutePath).toString(), true);
  return encodedUri;
}

export async function ignoreProblemInHints(problemName: string | undefined, hintName: string | undefined, configFilePath: vscode.Uri): Promise<void> {
  const userConfig = await getWebhintUserConfig(configFilePath);

  if (!userConfig || !configFilePath.toString() || !problemName || !hintName) {
      return;
  }

  await addProblemToIgnoredHintsConfig(configFilePath, userConfig, hintName, problemName);
}

export async function addProblemToIgnoredHintsConfig(configFilePath: vscode.Uri, userConfig: WebhintUserConfig, hintName: string, problemName: string): Promise<void> {

  if (!userConfig || !problemName || !hintName) {
      return;
  }

  if (!userConfig.hints) {
      userConfig.hints = {};
  }

  const hintWrapper = Object.getOwnPropertyDescriptor(userConfig.hints, hintName);
  const ignore = {'ignore': [problemName]};
  const defaultObject = ['default', ignore];

  if (hintWrapper && hintWrapper.value) {

      // hint value is a configuration array e.g "hints": { "compat-api/css": [] }
      if (typeof hintWrapper.value === typeof []){
          const typedHintWrapper: [] = hintWrapper.value as [];

          // search for the 'ignore' key inside each item, start from position [1] (zero-index based)
          // as position [0] should always be a severity.
          for (let i = 1; i < typedHintWrapper.length; i++) {
              const ignoreProperty = Object.getOwnPropertyDescriptor(typedHintWrapper[i], 'ignore');

              if (ignoreProperty && typeof ignoreProperty.value === typeof []) {

                  // a list of ignored properties was found, use that one.
                  ignore.ignore = ignoreProperty.value as [];
                  defaultObject[0] = typedHintWrapper[i - 1];
                  ignore.ignore.push(problemName);
                  break;
              }
          }
      } else if (typeof hintWrapper.value === 'string'){
          defaultObject[0] = hintWrapper.value;
      }
  }

  Object.defineProperty(userConfig.hints, hintName, {
      enumerable: true,
      value: defaultObject,
      writable: true,
  });

  await vscode.workspace.fs.writeFile(configFilePath, Buffer.from(JSON.stringify(userConfig), 'utf-8'));
}

async function ignoreHint(hintName: string | undefined, configFilePath: vscode.Uri) {
  try {
    const userConfig = await getWebhintUserConfig(configFilePath);
    if (!userConfig || !hintName) {
      return;
    }

    if (!userConfig.hints) {
      userConfig.hints = {};
    }

    userConfig.hints = Object.defineProperty(userConfig.hints, hintName, {
      value: 'off',
      writable: true,
      enumerable: true,
    });

    // save new config
    const serializedConfig = JSON.stringify(userConfig);
    return vscode.workspace.fs.writeFile(configFilePath, Buffer.from(serializedConfig, 'utf8'));
  } catch (error) {
    void vscode.window.showErrorMessage(
      `Error happened while creating configuration in ${configFilePath} file.\nError: ${error} `);
  }
}

export async function ignoreHintPerProject(hintName: string | undefined): Promise<void> {
  const workspacePath = vscode.workspace.rootPath;
  if (!workspacePath || !hintName){
      return;
  }

  const configFilePath = getWehbhintConfigPath([workspacePath]);
  return ignoreHint(hintName, configFilePath);
}

export async function ignoreHintGlobally(hintName: string | undefined, globalStoragePath: string): Promise<void> {
  if (!globalStoragePath || !hintName){
      return;
  }

  const configFilePath = getWehbhintConfigPath([globalStoragePath]);
  await ignoreHint(hintName, configFilePath);
}
