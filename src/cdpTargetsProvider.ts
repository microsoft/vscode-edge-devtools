// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from "vscode";
import CDPTarget from "./cdpTarget";
import { fixRemoteWebSocket, getListOfTargets, getRemoteEndpointSettings, IRemoteTargetJson } from "./utils";

export default class CDPTargetsProvider implements vscode.TreeDataProvider<CDPTarget> {
    public readonly onDidChangeTreeData: vscode.Event<CDPTarget | undefined>;
    private changeDataEvent: vscode.EventEmitter<CDPTarget | undefined>;
    private extensionPath: string;

    constructor(context: vscode.ExtensionContext) {
        this.changeDataEvent = new vscode.EventEmitter<CDPTarget | undefined>();
        this.onDidChangeTreeData = this.changeDataEvent.event;
        this.extensionPath = context.extensionPath;
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
                responseArray.forEach((i: IRemoteTargetJson) => {
                    i = fixRemoteWebSocket(hostname, port, i);
                    targets.push(new CDPTarget(i, "", this.extensionPath));
                });
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
        this.changeDataEvent.fire();
    }
}
