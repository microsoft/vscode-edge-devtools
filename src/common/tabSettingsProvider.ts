// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from "vscode";
import { SETTINGS_STORE_NAME } from "../utils";

export class TabSettingsProvider {

  private static singletonInstance: TabSettingsProvider;

  public static get instance() {
    if (!TabSettingsProvider.singletonInstance) {
      TabSettingsProvider.singletonInstance = new TabSettingsProvider();
    }

    return TabSettingsProvider.singletonInstance;
  }

  public isNetworkEnabled(): boolean {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const networkEnabled: boolean = settings.get("enableNetwork") || false;
    return networkEnabled;
  }
}
