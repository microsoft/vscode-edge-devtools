// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import * as vscode from 'vscode';
import { IRemoteTargetJson } from './utils';

export class CDPTarget extends vscode.TreeItem {
    readonly targetJson: IRemoteTargetJson;
    readonly propertyName: string | null = null;
    readonly iconPath: { dark: string, light: string } | undefined;
    contextValue: 'cdpTarget' | 'cdpTargetProperty' | 'cdpTargetClosing';

    private readonly extensionPath: string | undefined;
    private children: CDPTarget[] = [];

    constructor(targetJson: IRemoteTargetJson, propertyName: string, extensionPath?: string, iconPath?: string) {
        super(propertyName || targetJson.title || 'Target',
              (propertyName ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed));
        this.targetJson = targetJson;
        this.propertyName = propertyName;
        this.extensionPath = extensionPath;
        this.contextValue = (this.propertyName ? 'cdpTargetProperty' : 'cdpTarget');
        const treeItemLabel = `${this.label}: ${this.description}.`;

        // collapsibleState = 1 means the treeItem is the base CDPTarget treeItem.
        // collapsibleState = 0 means the treeItem is a child description treeItem (e.g. id, title, type, etc.)
        const label = this.collapsibleState ?
            `${treeItemLabel}. 'Press tab to access action button list. Use left and right arrow keys to navigate action button list.'`
            : treeItemLabel;
        this.accessibilityInformation = {label, role: 'treeitem'};

        // Get the icon for this type of target
        if (this.extensionPath) {
            if (iconPath) {
                this.iconPath = {
                    dark: iconPath,
                    light: iconPath,
                };
            } else {
                const icon = `${this.targetJson.type}.svg`;
                this.iconPath = {
                    dark: path.join(this.extensionPath, 'resources', 'dark', icon),
                    light: path.join(this.extensionPath, 'resources', 'light', icon),
                };
            }
        }
    }

    /**
     * Issue: https://github.com/microsoft/vscode-edge-devtools/issues/199
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    get description(): string {
        return (this.propertyName ? this.targetJson[this.propertyName] : this.targetJson.url);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    get tooltip(): string {
        return `${this.label} - ${this.description}`;
    }

    get websocketUrl(): string {
        return this.targetJson.webSocketDebuggerUrl;
    }

    getChildren(): CDPTarget[] {
        // Populate the child nodes if we don't have any yet
        if (!this.propertyName && this.children.length === 0) {
            this.children = [];
            for (const i of Object.getOwnPropertyNames(this.targetJson)) {
                this.children.push(new CDPTarget(this.targetJson, i));
            }
        }

        return this.children;
    }
}
