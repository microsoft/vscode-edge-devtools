// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { SETTINGS_STORE_NAME } from '../utils';

// Map of VS Code theme to Edge DevTools theme
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

  // Determine the new frame hosted DevTools theme in the following order of preference:
  // 1. Map current VS Code theme setting (workbench.colorTheme) to DevTools theme
  // 2. Set DevTools theme based on current VS Code ColorThemeKind (enum: Light, Dark, HighContrast, HighContrastLight)
  // 3. Use the system theme
  getThemeFromUserSetting(): string {
      const themeSetting = vscode.workspace.getConfiguration().get('workbench.colorTheme') as string;
      let theme = SUPPORTED_THEMES.get(themeSetting);
      if (!theme) {
        switch (vscode.window.activeColorTheme.kind as number) {
          case 1: // Light theme
          case 4: // Light high contrast theme
            theme = 'default';
            break;
          case 2: // Dark theme
          case 3: // Dark high contrast theme
            theme = 'dark';
            break;
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
