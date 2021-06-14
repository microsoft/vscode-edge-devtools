// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { SETTINGS_STORE_NAME } from '../utils';
import { ThemeString } from './webviewEvents';

export class SettingsProvider {

  private static singletonInstance: SettingsProvider;

  isNetworkEnabled(): boolean {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const networkEnabled: boolean = settings.get('enableNetwork') || false;
    return networkEnabled;
  }

  getThemeSettings(): ThemeString {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const themeString: ThemeString = settings.get('themes') || 'System preference';
    return themeString;
  }

  getWelcomeSettings(): boolean {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const welcomeEnabled: boolean = settings.get('welcome') || false;
    return welcomeEnabled;
  }

  getHeadlessSettings(): boolean {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const isHeadless: boolean = settings.get('headless') || false;
    return isHeadless;
  }

  static get instance(): SettingsProvider {
    if (!SettingsProvider.singletonInstance) {
      SettingsProvider.singletonInstance = new SettingsProvider();
    }

    return SettingsProvider.singletonInstance;
  }
}
