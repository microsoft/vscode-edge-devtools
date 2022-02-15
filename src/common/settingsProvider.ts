// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { SETTINGS_STORE_NAME } from '../utils';
import { ThemeString } from './webviewEvents';

const SUPPORTED_THEMES = new Map<string, string>([
  ['Default Light+', 'light'],
  ['Visual Studio Light', 'light'],
  ['Default Dark+', 'dark'],
  ['Visual Studio Dark', 'dark'],
  ['Monokai', 'vscode-monokai'],
  ['Monokai Dimmed', 'vscode-monokai-dimmed'],
  ['Solarized Dark', 'vscode-solarized-dark'],
  ['Solarized Light', 'vscode-solarized-light'],
  ['Red', 'vscode-red'],
  ['Quiet Light', 'vscode-quietlight'],
  ['Abyss', 'vscode-abyss'],
  ['Kimbie Dark', 'vscode-kimbie-dark'],
  ['Tomorrow Night Blue', 'vscode-tomorrow-night-blue'],
  // Legacy Theme string mappings
  ['Light', 'light'],
  ['Dark', 'dark'],
  ['System Preference', 'systemPreference'],
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
      return SUPPORTED_THEMES.get((themeSetting || legacySetting) as string) || 'systemPreference';
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
