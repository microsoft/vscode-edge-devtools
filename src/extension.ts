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
    IUserConfig,
    launchBrowser,
    openNewTab,
    removeTrailingSlash,
    SETTINGS_STORE_NAME,
    SETTINGS_VIEW_NAME,
} from "./utils";

let telemetryReporter: Readonly<TelemetryReporter>;

export function activate(context: vscode.ExtensionContext) {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    context.subscriptions.push(vscode.commands.registerCommand(`${SETTINGS_STORE_NAME}.attach`, async () => {
        attach(context);
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

export async function attach(context: vscode.ExtensionContext, attachUrl?: string, config?: Partial<IUserConfig>) {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    const telemetryProps = { viaConfig: `${!!config}`, withTargetUrl: `${!!attachUrl}` };
    telemetryReporter.sendTelemetryEvent("command/attach", telemetryProps);

    const { hostname, port, useHttps } = getRemoteEndpointSettings(config);
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
        if (attachUrl) {
            const noTrailingSlashTarget = removeTrailingSlash(attachUrl);
            const matches = items.filter((i) => {
                if (i.description) {
                    const noTrailingSlash = removeTrailingSlash(i.description);
                    return noTrailingSlashTarget.localeCompare(noTrailingSlash, "en", { sensitivity: "base" }) === 0;
                }
                return false;
            });
            if (matches && matches.length > 0 && matches[0].detail) {
                targetWebsocketUrl = matches[0].detail;
            } else {
                vscode.window.showErrorMessage(`Couldn't attach to ${attachUrl}.`);
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

export async function launch(context: vscode.ExtensionContext, launchUrl?: string, config?: Partial<IUserConfig>) {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    const telemetryProps = { viaConfig: `${!!config}` };
    telemetryReporter.sendTelemetryEvent("command/launch", telemetryProps);

    const { hostname, port, defaultUrl, userDataDir } = getRemoteEndpointSettings(config);
    const url = launchUrl || defaultUrl;
    const target = await openNewTab(hostname, port, url);
    if (target && target.webSocketDebuggerUrl) {
        // Show the devtools
        telemetryReporter.sendTelemetryEvent("command/launch/devtools", telemetryProps);
        DevToolsPanel.createOrShow(context, telemetryReporter, target.webSocketDebuggerUrl);
    } else {
        // Launch a new instance
        const browserPath = await getBrowserPath(config);
        if (!browserPath) {
            telemetryReporter.sendTelemetryEvent("command/launch/error/browser_not_found", telemetryProps);
            vscode.window.showErrorMessage(
                "Microsoft Edge could not be found. " +
                "Ensure you have installed Microsoft Edge, " +
                "or try specifying a custom path via the 'browserPath' setting.");
            return;
        }

        launchBrowser(browserPath, port, url, userDataDir);
        await attach(context, url, config);
    }
}
