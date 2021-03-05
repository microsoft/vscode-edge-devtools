// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from "vscode";
import { SETTINGS_STORE_NAME } from "../utils";
import { ThemeString } from "./webviewEvents";

export class SettingsProvider {

  private static singletonInstance: SettingsProvider;

  public isNetworkEnabled(): boolean {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const networkEnabled: boolean = settings.get("enableNetwork") || false;
    return networkEnabled;
  }

  public getThemeSettings(): ThemeString {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const themeString: ThemeString = settings.get("themes") || "System preference";
    return themeString;
  }

  public getWhatsNewSettings(): boolean {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const whatsNewEnabled: boolean = settings.get("whatsNew") || false;
    return whatsNewEnabled;
  }

  public static get instance() {
    if (!SettingsProvider.singletonInstance) {
      SettingsProvider.singletonInstance = new SettingsProvider();
    }

    return SettingsProvider.singletonInstance;
  }
}
