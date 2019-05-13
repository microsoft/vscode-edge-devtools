// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import CDPTarget from "./cdpTarget";
import { fixRemoteWebSocket, getListOfTargets, getRemoteEndpointSettings, IRemoteTargetJson } from "./utils";

export default class CDPTargetsProvider implements vscode.TreeDataProvider<CDPTarget> {
    public readonly onDidChangeTreeData: vscode.Event<CDPTarget | undefined>;
    private changeDataEvent: vscode.EventEmitter<CDPTarget | undefined>;
    private extensionPath: string;
    private telemetryReporter: Readonly<TelemetryReporter>;

    constructor(context: vscode.ExtensionContext, telemetryReporter: Readonly<TelemetryReporter>) {
        this.changeDataEvent = new vscode.EventEmitter<CDPTarget | undefined>();
        this.onDidChangeTreeData = this.changeDataEvent.event;
        this.extensionPath = context.extensionPath;
        this.telemetryReporter = telemetryReporter;
    }

    public getTreeItem(element: CDPTarget): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: CDPTarget): Promise<CDPTarget[]> {
        let targets: CDPTarget[] = [];

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

                responseArray.forEach((target: IRemoteTargetJson) => {
                    const actualTarget = fixRemoteWebSocket(hostname, port, target);
                    targets.push(new CDPTarget(actualTarget, "", this.extensionPath));
                });
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
        } else {
            // Just expand the element to show its properties
            targets = element.getChildren();
        }

        return targets;
    }

    public refresh(): void {
        this.telemetryReporter.sendTelemetryEvent("view/refresh");
        this.changeDataEvent.fire();
    }
}
