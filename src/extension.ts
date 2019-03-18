// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from "vscode";
import { DevToolsPanel } from "./devtoolsPanel";
import {
    fixRemoteWebSocket,
    getListOfTargets,
    getRemoteEndpointSettings,
    IRemoteTargetJson,
    SETTINGS_STORE_NAME,
} from "./utils";

export const DEFAULT_LAUNCH_URL: string = "about:blank";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_STORE_NAME}.attach`, async () => {
        attach(context, /*viaConfig=*/ false);
    }));
}

export async function attach(context: vscode.ExtensionContext, viaConfig: boolean, targetUrl?: string) {
    const { hostname, port } = getRemoteEndpointSettings();
    const responseArray = await getListOfTargets(hostname, port);
    if (Array.isArray(responseArray)) {
        const items: vscode.QuickPickItem[] = [];

        // Fix up the response targets with the correct web socket
        responseArray.forEach((i: IRemoteTargetJson) => {
            i = fixRemoteWebSocket(hostname, port, i);
            items.push({
                description: i.url,
                detail: i.webSocketDebuggerUrl,
                label: i.title,
            });
        });

        // Try to match the given target with the list of targets we received from the endpoint
        let targetWebsocketUrl = "";
        if (targetUrl && targetUrl !== DEFAULT_LAUNCH_URL) {
            const matches = items.filter((i) =>
                targetUrl.localeCompare(i.description, "en", { sensitivity: "base" }) === 0);
            if (matches && matches.length > 0) {
                targetWebsocketUrl = matches[0].detail;
            } else {
                vscode.window.showErrorMessage(`Couldn't attach to ${targetUrl}.`);
            }
        }

        if (targetWebsocketUrl) {
            // Auto connect to found target
            DevToolsPanel.createOrShow(context, targetWebsocketUrl as string);
        } else {
            // Show the target list and allow the user to select one
            const selection = await vscode.window.showQuickPick(items);
            if (selection) {
                DevToolsPanel.createOrShow(context, selection.detail as string);
            }
        }
    }
}
