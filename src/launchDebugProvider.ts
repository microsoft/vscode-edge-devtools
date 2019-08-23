// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { IUserConfig, SETTINGS_STORE_NAME } from "./utils";

type AttachCallback = (
    context: vscode.ExtensionContext,
    targetUrl?: string,
    config?: Partial<IUserConfig>) => void;
type LaunchCallback = (
    context: vscode.ExtensionContext,
    launchUrl?: string,
    config?: Partial<IUserConfig>) => void;

export default class LaunchDebugProvider implements vscode.DebugConfigurationProvider {
    private readonly context: vscode.ExtensionContext;
    private readonly telemetryReporter: Readonly<TelemetryReporter>;
    private readonly attach: AttachCallback;
    private readonly launch: LaunchCallback;

    constructor(
        context: vscode.ExtensionContext,
        telemetryReporter: Readonly<TelemetryReporter>,
        attach: AttachCallback,
        launch: LaunchCallback) {
        this.context = context;
        this.telemetryReporter = telemetryReporter;
        this.attach = attach;
        this.launch = launch;
    }

    public provideDebugConfigurations(
        folder: vscode.WorkspaceFolder | undefined,
        token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {
        return Promise.resolve([{
            name: "Launch Microsoft Edge and open the Elements tool",
            request: "launch",
            type: `${SETTINGS_STORE_NAME}.debug`,
            url: "http://localhost:8080",
        }]);
    }

    public resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration, token?: vscode.CancellationToken):
        vscode.ProviderResult<vscode.DebugConfiguration> {
        const userConfig = config as Partial<IUserConfig>;

        if (config && config.type === `${SETTINGS_STORE_NAME}.debug`) {
            const targetUri: string = this.getUrlFromConfig(folder, config);
            if (config.request && config.request === "attach") {
                this.telemetryReporter.sendTelemetryEvent("debug/attach");
                this.attach(this.context, targetUri, userConfig);
            } else if (config.request && config.request === "launch") {
                this.telemetryReporter.sendTelemetryEvent("debug/launch");
                this.launch(this.context, targetUri, userConfig);
            }
        } else if (config && config.type === "edge") {
            const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
            const time = (settings.get("debugAttachTimeoutMs") || 3000) as number;
            setTimeout(() => {
                if (!userConfig.port) {
                    userConfig.port = 2015;
                }
                this.attach(this.context, userConfig.url, userConfig);
            }, time);
            return Promise.resolve(config);
        } else {
            this.telemetryReporter.sendTelemetryEvent("debug/error/config_not_found");
            vscode.window.showErrorMessage("No supported launch config was found.");
        }

        return undefined;
    }

    private getUrlFromConfig(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration) {
        let outUrlString = "";

        if (config.file) {
            outUrlString = config.file;
            if (folder) {
                outUrlString = outUrlString.replace("${workspaceFolder}", folder.uri.path);
            }
            outUrlString = (outUrlString.startsWith("/") ? "file://" : "file:///") + outUrlString;
        } else if (config.url) {
            outUrlString = config.url;
        }

        return outUrlString;
    }
}
