// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import TelemetryReporter from '@vscode/extension-telemetry';
import {
    IUserConfig,
    SETTINGS_STORE_NAME,
} from './utils';
import { providedDebugConfig } from './launchConfigManager';

type AttachCallback = (
    context: vscode.ExtensionContext,
    targetUrl?: string,
    config?: Partial<IUserConfig>,
    useRetry?: boolean) => void | Promise<void>;
type LaunchCallback = (
    context: vscode.ExtensionContext,
    launchUrl?: string,
    config?: Partial<IUserConfig>) => void | Promise<void>;

export class LaunchDebugProvider implements vscode.DebugConfigurationProvider {
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

    provideDebugConfigurations(
        _folder: vscode.WorkspaceFolder | undefined,
        _token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {
        return Promise.resolve([providedDebugConfig]);
    }

    resolveDebugConfigurationWithSubstitutedVariables(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration, _token?: vscode.CancellationToken):
        vscode.ProviderResult<vscode.DebugConfiguration> {
        const userConfig = config as Partial<IUserConfig>;

        // In the case where the launch.json is missing or empty and the user attempts to launch
        // a Microsoft Edge Tools debug session, the extension will defer to the default launch
        // experience.
        const debugWithoutConfig = config && !config.type && !config.request && !config.name;

        if ((config && config.type === `${SETTINGS_STORE_NAME}.debug`) || debugWithoutConfig) {
            const targetUri: string = this.getUrlFromConfig(folder, config);
            if (config.request && config.request === 'attach') {
                this.telemetryReporter.sendTelemetryEvent('debug/attach');
                void this.attach(this.context, targetUri, userConfig, true);
            } else if ((config.request && config.request === 'launch') || debugWithoutConfig) {
                this.telemetryReporter.sendTelemetryEvent('debug/launch');
                void this.launch(this.context, targetUri, userConfig);
            }
        } else {
            this.telemetryReporter.sendTelemetryEvent('debug/error/config_not_found');
            void vscode.window.showErrorMessage('No supported launch config was found.');
        }

        return undefined;
    }

    private getUrlFromConfig(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration) {
        let outUrlString = '';

        if (config.file) {
            outUrlString = config.file as string;
            if (folder) {
                outUrlString = outUrlString.replace('${workspaceFolder}', folder.uri.path);
            }
            outUrlString = (outUrlString.startsWith('/') ? 'file://' : 'file:///') + outUrlString;
        } else if (config.url) {
            outUrlString = config.url as string;
        } else if (config.urlFilter) {
            outUrlString = config.urlFilter as string;
        }

        return outUrlString;
    }
}
