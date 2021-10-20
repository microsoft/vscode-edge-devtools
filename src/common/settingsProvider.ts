// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { SETTINGS_STORE_NAME } from '../utils';
import { ThemeString } from './webviewEvents';

const SUPPORTED_THEMES = new Map<string, string>([
  ['Default Light+', 'default'],
  ['Visual Studio Light', 'default'],
  ['Default Dark+', 'dark'],
  ['Visual Studio Dark', 'dark'],
  ['System Preference', 'systemPreferred'],
  ['Dark', 'dark'],
  ['Light', 'default'],
  ['Chromium Dark', 'darkChromium'],
  ['Chromium Light', 'lightChromium'],
  ['Monokai', 'vscode-monokai'],
  ['Monokai Dimmed', 'vscode-monokai-dimmed'],
  ['Solarized Dark', 'vscode-solarized-dark'],
  ['Solarized Light', 'vscode-solarized-light'],
  ['Red', 'vscode-red'],
  ['Quiet Light', 'vscode-quietlight'],
  ['Abyss', 'vscode-abyss'],
  ['Kimbie Dark', 'vscode-kimbie-dark'],
  ['Tomorrow Night Blue', 'vscode-tomorrow-night-blue'],
]);
export class SettingsProvider {

  private static singletonInstance: SettingsProvider;

  isNetworkEnabled(): boolean {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const networkEnabled: boolean = settings.get('enableNetwork') || false;
    return networkEnabled;
  }

  // Legacy only: this function returns the theme for the legacy bundled DevTools
  getThemeSettings(): ThemeString {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const themeString: ThemeString = settings.get('themes') || 'System preference';
    return themeString;
  }

  // This function returns the theme for the new frame hosted DevTools by:
  // 1. Fetching the User configured Global VSCode theme, return it if supported
  // 2. Fall back to the extension Theme setting selector (light, dark, system preference)
  // 3. Fall back to system preference
  getThemeFromUserSetting(): string {
      const themeSetting = vscode.workspace.getConfiguration().get('workbench.colorTheme');
      const legacySetting = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME).get('themes');
      if (SUPPORTED_THEMES.has(themeSetting as string)) {
        return SUPPORTED_THEMES.get(themeSetting as string) || 'systemPreferred';
      }
      return SUPPORTED_THEMES.get(legacySetting as string) || 'systemPreferred';
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

  getScreencastSettings(): boolean {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const screencastSetting = settings.get('standaloneScreencast');
    const standaloneScreencast: boolean = screencastSetting !== undefined ? !!screencastSetting : false;
    return standaloneScreencast;
  }

  static get instance(): SettingsProvider {
    if (!SettingsProvider.singletonInstance) {
      SettingsProvider.singletonInstance = new SettingsProvider();
    }

    return SettingsProvider.singletonInstance;
  }
}
