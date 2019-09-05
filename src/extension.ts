// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from "vscode";
import * as debugCore from "vscode-chrome-debug-core";
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
    getRuntimeConfig,
    IRemoteTargetJson,
    IUserConfig,
    launchBrowser,
    openNewTab,
    SETTINGS_DEFAULT_ATTACH_INTERVAL,
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

    // Register the Microsoft Edge (Chromium) debugger types
    vscode.debug.registerDebugConfigurationProvider("edge",
        new LaunchDebugProvider(context, telemetryReporter, attach, launch));
    vscode.debug.registerDebugConfigurationProvider("msedge",
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
            const runtimeConfig = getRuntimeConfig();
            DevToolsPanel.createOrShow(context, telemetryReporter, target.websocketUrl, runtimeConfig);
        }));
    context.subscriptions.push(vscode.commands.registerCommand(
        `${SETTINGS_VIEW_NAME}.copyItem`,
        (target: CDPTarget) => vscode.env.clipboard.writeText(target.tooltip)));
}

export async function attach(
    context: vscode.ExtensionContext, attachUrl?: string, config?: Partial<IUserConfig>, useRetry?: boolean) {
    if (!telemetryReporter) {
        telemetryReporter = createTelemetryReporter(context);
    }

    const telemetryProps = { viaConfig: `${!!config}`, withTargetUrl: `${!!attachUrl}` };
    telemetryReporter.sendTelemetryEvent("command/attach", telemetryProps);

    const { hostname, port, useHttps, timeout } = getRemoteEndpointSettings(config);

    // Get the attach target and keep trying until reaching timeout
    const startTime = Date.now();
    do {
        let responseArray: any[] | undefined;
        try {
            // Keep trying to attach to the list endpoint until timeout
            responseArray = await debugCore.utils.retryAsync(
                () => getListOfTargets(hostname, port, useHttps),
                timeout,
                /*intervalDelay=*/ SETTINGS_DEFAULT_ATTACH_INTERVAL);
        } catch {
            // Timeout so make sure we error out with no json result
            responseArray = undefined;
        }

        if (Array.isArray(responseArray)) {
            telemetryReporter.sendTelemetryEvent(
                "command/attach/list",
                telemetryProps,
                { targetCount: responseArray.length },
            );

            // Try to match the given target with the list of targets we received from the endpoint
            let targetWebsocketUrl = "";
            if (attachUrl) {
                // Match the targets using the edge debug adapter logic
                let matchedTargets: debugCore.chromeConnection.ITarget[] | undefined;
                try {
                    matchedTargets = debugCore.chromeUtils.getMatchingTargets(responseArray, attachUrl);
                } catch {
                    matchedTargets = undefined;
                }

                if (matchedTargets && matchedTargets.length > 0 && matchedTargets[0].webSocketDebuggerUrl) {
                    const actualTarget = fixRemoteWebSocket(hostname, port, matchedTargets[0] as any);
                    targetWebsocketUrl = actualTarget.webSocketDebuggerUrl;
                }

                if (!useRetry) {
                    vscode.window.showErrorMessage(`Couldn't attach to ${attachUrl}.`);
                }
            }

            if (targetWebsocketUrl) {
                // Auto connect to found target
                useRetry = false;
                telemetryReporter.sendTelemetryEvent("command/attach/devtools", telemetryProps);
                const runtimeConfig = getRuntimeConfig(config);
                DevToolsPanel.createOrShow(context, telemetryReporter, targetWebsocketUrl, runtimeConfig);
            } else if (useRetry) {
                // Wait for a little bit until we retry
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve();
                    }, SETTINGS_DEFAULT_ATTACH_INTERVAL);
                });
            } else {
                // Create the list of items to show with fixed websocket addresses
                const items = responseArray.map((i: IRemoteTargetJson) => {
                    i = fixRemoteWebSocket(hostname, port, i);
                    return {
                        description: i.url,
                        detail: i.webSocketDebuggerUrl,
                        label: i.title,
                    } as vscode.QuickPickItem;
                });

                // Show the target list and allow the user to select one
                const selection = await vscode.window.showQuickPick(items);
                if (selection && selection.detail) {
                    telemetryReporter.sendTelemetryEvent("command/attach/devtools", telemetryProps);
                    const runtimeConfig = getRuntimeConfig(config);
                    DevToolsPanel.createOrShow(context, telemetryReporter, selection.detail, runtimeConfig);
                }
            }
        } else {
            telemetryReporter.sendTelemetryEvent("command/attach/error/no_json_array", telemetryProps);
        }
    } while (useRetry && Date.now() - startTime < timeout);
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
        const runtimeConfig = getRuntimeConfig(config);
        DevToolsPanel.createOrShow(context, telemetryReporter, target.webSocketDebuggerUrl, runtimeConfig);
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
        } else {
            // Here we grab the last part of the path (using either forward or back slashes to account for mac/win),
            // Then we search that part for either chrome or edge to best guess identify the browser that is launching.
            // If it is one of those names we use that, otherwise we default it to "other".
            // Then we upload just one of those 3 names to telemetry.
            const exeName = browserPath.split(/\\|\//).pop();
            const match = exeName!.match(/(chrome|edge)/gi) || [];
            const knownBrowser = match.length > 0 ? match[0] : "other";
            const browserProps = { exe: `${knownBrowser.toLowerCase()}` };
            telemetryReporter.sendTelemetryEvent("command/launch/browser", browserProps);
        }

        launchBrowser(browserPath, port, url, userDataDir);
        await attach(context, url, config);
    }
}
