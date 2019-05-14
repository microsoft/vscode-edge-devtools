// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import CDPTarget from "./cdpTarget";
import CDPTargetsProvider from "./cdpTargetsProvider";
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
    SETTINGS_VIEW_NAME,
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

    // Register the launch provider
    vscode.debug.registerDebugConfigurationProvider(`${SETTINGS_STORE_NAME}.debug`,
        new LaunchDebugProvider(context, telemetryReporter, attach, launch));

    // Register the side-panel view and its commands
    const cdpTargetsProvider = new CDPTargetsProvider(context, telemetryReporter);
    context.subscriptions.push(vscode.window.registerTreeDataProvider(
        `${SETTINGS_VIEW_NAME}.targets`,
        cdpTargetsProvider));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.launch`,
        async () => {
            await launch(context);
            cdpTargetsProvider.refresh();
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.refresh`,
        () => cdpTargetsProvider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.attach`,
        (target: CDPTarget) => {
            telemetryReporter.sendTelemetryEvent("view/devtools");
            DevToolsPanel.createOrShow(context, telemetryReporter, target.websocketUrl);
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.copyItem`,
        (target: CDPTarget) => vscode.env.clipboard.writeText(target.tooltip)));
}

export async function attach(context: vscode.ExtensionContext, viaConfig: boolean, targetUrl?: string) {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    const telemetryProps = { viaConfig: `${viaConfig}`, withTargetUrl: `${!!targetUrl}` };
    telemetryReporter.sendTelemetryEvent("command/attach", telemetryProps);

    const { hostname, port, useHttps } = getRemoteEndpointSettings();
    const responseArray = await getListOfTargets(hostname, port, useHttps);
    if (Array.isArray(responseArray)) {
        telemetryReporter.sendTelemetryEvent(
            "command/attach/list",
            telemetryProps,
            { targetCount: responseArray.length },
        );

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
        if (targetUrl) {
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
            telemetryReporter.sendTelemetryEvent("command/attach/devtools", telemetryProps);
            DevToolsPanel.createOrShow(context, telemetryReporter, targetWebsocketUrl);
        } else {
            // Show the target list and allow the user to select one
            const selection = await vscode.window.showQuickPick(items);
            if (selection && selection.detail) {
                telemetryReporter.sendTelemetryEvent("command/attach/devtools", telemetryProps);
                DevToolsPanel.createOrShow(context, telemetryReporter, selection.detail);
            }
        }
    } else {
        telemetryReporter.sendTelemetryEvent("command/attach/error/no_json_array", telemetryProps);
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
    const target = await openNewTab(hostname, port, launchUrl);
    if (target && target.webSocketDebuggerUrl) {
        // Show the devtools
        telemetryReporter.sendTelemetryEvent("command/launch/devtools", telemetryProps);
        DevToolsPanel.createOrShow(context, telemetryReporter, target.webSocketDebuggerUrl);
    } else {
        // Launch a new instance
        const browserPath = getBrowserPath(browserPathFromLaunchConfig);
        if (!browserPath) {
            telemetryReporter.sendTelemetryEvent("command/launch/error/browser_not_found", telemetryProps);
            vscode.window.showErrorMessage(
                "Microsoft Edge could not be found. " +
                "Ensure you have installed Microsoft Edge, " +
                "or try specifying a custom path via the 'browserPath' setting.");
            return;
        }

        const url = launchUrl || DEFAULT_LAUNCH_URL;
        launchBrowser(browserPath, port, url);
        await attach(context, viaConfig, url);
    }
}
