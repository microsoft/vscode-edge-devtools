// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { SETTINGS_STORE_NAME } from '../utils';

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

  // This function returns the theme for the new frame hosted DevTools by:
  // 1. Fetching the User configured Global VSCode theme, return it if supported
  // 2. Fall back to the extension Theme setting selector (light, dark, system preference)
  // 3. Fall back to system preference
  getThemeFromUserSetting(): string {
      const themeSetting = vscode.workspace.getConfiguration().get('workbench.colorTheme') as string;
      let theme = SUPPORTED_THEMES.get(themeSetting);
      if (!theme) {
        switch (vscode.window.activeColorTheme.kind as number) {
          case 1: // Light theme
          case 4: // Light high contrast theme
            theme = 'default';
          case 2: // Dark theme
          case 3: // Dark high contrast theme
            theme = 'dark';
          default:
            theme = 'systemPreferred';
        }
      }
      return theme;
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
