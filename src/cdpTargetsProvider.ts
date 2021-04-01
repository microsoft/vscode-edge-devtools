// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import * as path from "path";
import * as fs from "fs";
import CDPTarget from "./cdpTarget";
import { fixRemoteWebSocket, getListOfTargets, getRemoteEndpointSettings, IRemoteTargetJson, SETTINGS_STORE_NAME } from "./utils";

export default class CDPTargetsProvider implements vscode.TreeDataProvider<CDPTarget> {
    public readonly onDidChangeTreeData: vscode.Event<CDPTarget | null>;
    public readonly changeDataEvent: vscode.EventEmitter<CDPTarget | null>;
    private extensionPath: string;
    private telemetryReporter: Readonly<TelemetryReporter>;

    constructor(context: vscode.ExtensionContext, telemetryReporter: Readonly<TelemetryReporter>) {
        this.changeDataEvent = new vscode.EventEmitter<CDPTarget | null>();
        this.onDidChangeTreeData = this.changeDataEvent.event;
        this.extensionPath = context.extensionPath;
        this.telemetryReporter = telemetryReporter;
    }

    public getTreeItem(element: CDPTarget): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: CDPTarget): Promise<CDPTarget[]> {
        let targets: CDPTarget[] = [];

        const willShowWorkers = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME).get('showWorkers');

        if (!element) {
            // Get a list of the targets available
            const { hostname, port, useHttps } = getRemoteEndpointSettings();
            const responseArray = await getListOfTargets(hostname, port, useHttps);
            if (Array.isArray(responseArray)) {
                this.telemetryReporter.sendTelemetryEvent(
                    "view/list",
                    undefined,
                    { targetCount: responseArray.length },
                );
                if (responseArray.length) {
                    await new Promise<void>((resolve) => {
                        let targetsProcessed = 0;
                        responseArray.forEach(async (target: IRemoteTargetJson) => {
                            const actualTarget = fixRemoteWebSocket(hostname, port, target);
                            if (actualTarget.type === 'page' || actualTarget.type === 'iframe') {
                                const iconPath = await this.downloadFaviconFromSitePromise(actualTarget.url);
                                if (iconPath) {
                                    targets.push(new CDPTarget(actualTarget, "", this.extensionPath, iconPath));
                                } else {
                                    targets.push(new CDPTarget(actualTarget, "", this.extensionPath));
                                }
                            } else if ((actualTarget.type !== 'service_worker' && actualTarget.type !== 'shared_worker') || willShowWorkers) {
                                targets.push(new CDPTarget(actualTarget, "", this.extensionPath));
                            }
                            targetsProcessed++;
                            if (targetsProcessed === responseArray.length) {
                                resolve();
                            }
                        });
                    });
                }
            } else {
                this.telemetryReporter.sendTelemetryEvent("view/error/no_json_array");
            }
            // Sort the targets by type and then title, but keep 'page' types at the top
            // since those are the ones most likely to be the ones the user wants.
            targets.sort((a: CDPTarget, b: CDPTarget) => {
                if (a.targetJson.type === b.targetJson.type) {
                    return a.targetJson.title < b.targetJson.title ? -1 : 1;
                } else if (a.targetJson.type === "page") {
                    return -1;
                } else if (b.targetJson.type === "page") {
                    return 1;
                } else {
                    return a.targetJson.type < b.targetJson.type ? -1 : 1;
                }
            });
            // Raise and quickly hide a notification so the screen reader announces the new state of the targets list
            vscode.window.showInformationMessage(`Target list refreshed. ${targets.length} ${targets.length === 1 ? "target": "targets"} found.`);
            setTimeout(() => vscode.commands.executeCommand("notifications.hideToasts"), 10)
        } else {
            // Just expand the element to show its properties
            targets = element.getChildren();
        }

        return targets;
    }

    public refresh(): void {
        this.telemetryReporter.sendTelemetryEvent("view/refresh");
        this.changeDataEvent.fire(null);
        this.clearFaviconResourceDirectory();
    }

    public async clearFaviconResourceDirectory(): Promise<void> {
      const directory = path.join(this.extensionPath, "resources", "favicons");
      let finalFile = false;

      const promise = new Promise<void>((resolve) => {
        fs.readdir(directory, (readdirError: Error | null, files: string[]) => {
            if (readdirError) throw readdirError;
            for (let i = 0; i < files.length; i++) {
              if (i === files.length - 1) {
                  finalFile = true;
              }
              const file = files[i];
              const fileString = file.toString();
              if (fileString !== ".gitkeep") {
                fs.unlink(path.join(directory, fileString), (unlinkError) => {
                  if (unlinkError) throw unlinkError;
                  if (finalFile) {
                      resolve();
                  }
                });
              } else if (finalFile) {
                  resolve();
              }
            }
          });
      });
      await promise;
    }

    public downloadFaviconFromSitePromise(url: string) : Promise<string | null> | null {
        if (!url || !url.startsWith('https')) {
            return null;
        }
        const https = require('https');
        const faviconRegex = /((?:\/\/|\.)([^\.]*)\.[^\.^\/]+\/).*/;

        // Example regex match: https://docs.microsoft.com/en-us/microsoft-edge/
        // urlMatch[0] = .microsoft.com/en-us/microsoft-edge/
        // urlMatch[1] = .microsoft.com/
        // urlMatch[2] = microsoft
        const urlMatch = url.match(faviconRegex);
        let filename;
        if (urlMatch) {
            filename = `${urlMatch[2]}Favicon.ico`;
        } else {
            return null;
        }

        // Replacing ".microsoft.com/en-us/microsoft-edge/" with ".microsoft.com/favicon.ico"
        const faviconUrl = url.replace(faviconRegex, "$1favicon.ico");

        const filePath = path.join(this.extensionPath, "resources", "favicons", filename);

        const file = fs.createWriteStream(filePath);
        const promise = new Promise<string | null>((resolve) => {
            https.get(faviconUrl, (response: any) => {
                if (response.headers["content-type"].includes('icon')) {
                  response.pipe(file);
                  file.on('error', () => {
                      resolve(null);
                  });
                  file.on('finish', () => {
                      if (file.bytesWritten) {
                          resolve(filePath);
                      } else {
                          resolve(null);
                      }
                  });
                } else {
                  resolve(null);
                }
            });
        });

        const timeout = new Promise<null>((resolve) => {
            const id = setTimeout(() => {
              clearTimeout(id);
              resolve(null);
            }, 1000);
        });

        // If it takes over a second to download, we will resolve null and use default icons.
        return Promise.race([promise, timeout]);
    }
}
