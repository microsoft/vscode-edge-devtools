// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { DevToolsPanel } from "./devtoolsPanel";
import LaunchDebugProvider from "./launchDebugProvider";
import {
    createTelemetryReporter,
    fixRemoteWebSocket,
    getBrowserPath,
    getListOfTargets,
    getRemoteEndpointSettings,
    IRemoteTargetJson,
    launchBrowser,
    openNewTab,
    SETTINGS_STORE_NAME,
} from "./utils";

export const DEFAULT_LAUNCH_URL: string = "about:blank";

let telemetryReporter: Readonly<TelemetryReporter>;

export function activate(context: vscode.ExtensionContext) {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_STORE_NAME}.attach`, async () => {
        attach(context, /*viaConfig=*/ false);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_STORE_NAME}.launch`, async () => {
        launch(context);
    }));

    vscode.debug.registerDebugConfigurationProvider(`${SETTINGS_STORE_NAME}.debug`,
        new LaunchDebugProvider(context, telemetryReporter, attach, launch));
}

export async function attach(context: vscode.ExtensionContext, viaConfig: boolean, targetUrl?: string) {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    const telemetryProps = { viaConfig: `${viaConfig}` };
    telemetryReporter.sendTelemetryEvent("attach", telemetryProps);

    const { hostname, port, useHttps } = getRemoteEndpointSettings();
    const responseArray = await getListOfTargets(hostname, port, useHttps);
    if (Array.isArray(responseArray)) {
        telemetryReporter.sendTelemetryEvent("attach/list", telemetryProps, { targetCount: responseArray.length });

        // Fix up the response targets with the correct web socket
        const items = responseArray.map((i: IRemoteTargetJson) => {
            i = fixRemoteWebSocket(hostname, port, i);
            return {
                description: i.url,
                detail: i.webSocketDebuggerUrl,
                label: i.title,
            } as vscode.QuickPickItem;
        });

        // Try to match the given target with the list of targets we received from the endpoint
        let targetWebsocketUrl = "";
        if (targetUrl && targetUrl !== DEFAULT_LAUNCH_URL) {
            const matches = items.filter((i) =>
                i.description && targetUrl.localeCompare(i.description, "en", { sensitivity: "base" }) === 0);
            if (matches && matches.length > 0 && matches[0].detail) {
                targetWebsocketUrl = matches[0].detail;
            } else {
                vscode.window.showErrorMessage(`Couldn't attach to ${targetUrl}.`);
            }
        }

        if (targetWebsocketUrl) {
            // Auto connect to found target
            DevToolsPanel.createOrShow(context, telemetryReporter, targetWebsocketUrl);
        } else {
            // Show the target list and allow the user to select one
            const selection = await vscode.window.showQuickPick(items);
            if (selection && selection.detail) {
                DevToolsPanel.createOrShow(context, telemetryReporter, selection.detail);
            }
        }
    } else {
        telemetryReporter.sendTelemetryEvent("attach/error/no_json_array", telemetryProps);
    }
}

export async function launch(
    context: vscode.ExtensionContext, launchUrl?: string, browserPathFromLaunchConfig?: string) {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    const viaConfig = !!(launchUrl || browserPathFromLaunchConfig);
    const telemetryProps = { viaConfig: `${viaConfig}` };
    telemetryReporter.sendTelemetryEvent("command/launch", telemetryProps);

    const { hostname, port } = getRemoteEndpointSettings();
    let target = await openNewTab(hostname, port, launchUrl);
    if (!target) {
        const browserPath = getBrowserPath(browserPathFromLaunchConfig);

        if (!browserPath) {
            telemetryReporter.sendTelemetryEvent("command/launch/error/browser_not_found", telemetryProps);
            vscode.window.showErrorMessage(
                "Microsoft Edge could not be found. " +
                "Ensure you have installed Microsoft Edge, " +
                "or try specifying a custom path via the 'browserPath' setting.");
            return;
        }

        launchBrowser(browserPath, port, DEFAULT_LAUNCH_URL);

        target = await openNewTab(hostname, port, launchUrl);
    }

    if (target && target.webSocketDebuggerUrl) {
        // Show the devtools
        telemetryReporter.sendTelemetryEvent("command/launch/devtools", telemetryProps);
        DevToolsPanel.createOrShow(context, telemetryReporter, target.webSocketDebuggerUrl);
    } else {
        // Error
        telemetryReporter.sendTelemetryEvent("command/launch/error/tab_not_found", telemetryProps);
        vscode.window.showErrorMessage(`Could not find the launched browser tab: (${launchUrl}).`);
        attach(context, viaConfig, DEFAULT_LAUNCH_URL);
    }
}
