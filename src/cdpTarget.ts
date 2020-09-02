// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from "path";
import * as vscode from "vscode";
import { IRemoteTargetJson } from "./utils";

export default class CDPTarget extends vscode.TreeItem {
    public readonly targetJson: IRemoteTargetJson;
    public readonly propertyName: string | null = null;
    public readonly iconPath: { dark: string, light: string } | undefined;
    public readonly contextValue: "cdpTarget" | "cdpTargetProperty";
    private readonly extensionPath: string | undefined;
    private children: CDPTarget[] = [];

    public description: string = this.getDescription();
    public tooltip: string = this.getTooltip();
    public websocketUrl: string = this.getWebsocketUrl();

    constructor(targetJson: IRemoteTargetJson, propertyName: string, extensionPath?: string) {
        super(propertyName || targetJson.title || "Target",
              (propertyName ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed));
        this.targetJson = targetJson;
        this.propertyName = propertyName;
        this.extensionPath = extensionPath;
        this.contextValue = (this.propertyName ? "cdpTargetProperty" : "cdpTarget");

        // Get the icon for this type of target
        if (this.extensionPath) {
            const icon = `${this.targetJson.type}.svg`;
            this.iconPath = {
                dark: path.join(this.extensionPath, "resources", "dark", icon),
                light: path.join(this.extensionPath, "resources", "light", icon),
            };
        }
    }

    public getChildren() {
        // Populate the child nodes if we don't have any yet
        if (!this.propertyName && this.children.length === 0) {
            this.children = [];
            for (const i of Object.getOwnPropertyNames(this.targetJson)) {
                this.children.push(new CDPTarget(this.targetJson, i));
            }
        }

        return this.children;
    }

    private getDescription() {
        return this.propertyName ? this.targetJson[this.propertyName] : this.targetJson.url;
    }

    private getTooltip() {
        return `${this.label} - ${this.description}`;
    }

    private getWebsocketUrl() {
        return this.targetJson.webSocketDebuggerUrl;
    }
}
