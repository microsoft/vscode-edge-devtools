// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import {
    SETTINGS_STORE_NAME,
    SETTINGS_DEFAULT_URL,
} from './utils';
export type LaunchConfig = 'None' | 'Unsupported' | string;
export type CompoundConfig = {
    name: string,
    configurations: string[],
}

const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
const defaultUrl: string = settings.get('defaultUrl') || SETTINGS_DEFAULT_URL;

export const providedDebugConfig: vscode.DebugConfiguration = {
    type: 'pwa-msedge',
    name: 'Launch Microsoft Edge',
    request: 'launch',
    runtimeArgs: ['--remote-debugging-port=9222'],
    url: defaultUrl,
    presentation: {
        hidden: true,
    },
};

export const providedHeadlessDebugConfig: vscode.DebugConfiguration = {
    type: 'pwa-msedge',
    name: 'Launch Microsoft Edge in headless mode',
    request: 'launch',
    runtimeArgs: ['--headless', '--remote-debugging-port=9222'],
    url: defaultUrl,
    presentation: {
        hidden: true,
    },
};

const providedLaunchDevToolsConfig: vscode.DebugConfiguration = {
    type: 'vscode-edge-devtools.debug',
    name: 'Open Edge DevTools',
    request: 'attach',
    url: defaultUrl,
    presentation: {
        hidden: true,
    },
};

const providedCompoundDebugConfig: CompoundConfig = {
    name: 'Launch Edge and attach DevTools',
    configurations: [
        'Launch Microsoft Edge',
        'Open Edge DevTools',
    ],
};

const providedCompoundDebugConfigHeadless: CompoundConfig = {
    name: 'Launch Edge Headless and attach DevTools',
    configurations: [
        'Launch Microsoft Edge in headless mode',
        'Open Edge DevTools',
    ],
};

export const extensionCompoundConfigs: CompoundConfig[] = [
    providedCompoundDebugConfigHeadless,
    providedCompoundDebugConfig,
];

export const extensionConfigs: vscode.DebugConfiguration[] = [
    providedDebugConfig,
    providedHeadlessDebugConfig,
    providedLaunchDevToolsConfig,
];

export class LaunchConfigManager {
    private launchConfig: LaunchConfig;
    private isValidConfig: boolean;
    private static launchConfigManagerInstance: LaunchConfigManager;

    private constructor() {
        this.launchConfig = 'None';
        this.isValidConfig = false;
        this.updateLaunchConfig();
    }

    static get instance(): LaunchConfigManager {
        if (!LaunchConfigManager.launchConfigManagerInstance) {
            LaunchConfigManager.launchConfigManagerInstance = new LaunchConfigManager();
        }
        return LaunchConfigManager.launchConfigManagerInstance;
    }

    getLaunchConfig(): LaunchConfig {
        this.updateLaunchConfig();
        return this.launchConfig;
    }

    updateLaunchConfig(): void {
        // Check if there is a folder open
        if (!vscode.workspace.workspaceFolders) {
            void vscode.commands.executeCommand('setContext', 'launchJsonStatus', 'None');
            this.launchConfig = 'None';
            this.isValidConfig = false;
            return;
        }

        // Check if there's a launch.json file
        const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
        const filePath = `${workspaceUri.fsPath}/.vscode/launch.json`;
        if (fse.pathExistsSync(filePath)) {
            // Check if there is a supported debug config
            const configs = vscode.workspace.getConfiguration('launch', workspaceUri).get('configurations') as vscode.DebugConfiguration[];
            const compoundConfigs = vscode.workspace.getConfiguration('launch', workspaceUri).get('compounds') as CompoundConfig[];
            if (this.getMissingConfigs(configs, extensionConfigs).length === 0 && this.getMissingConfigs(compoundConfigs, extensionCompoundConfigs).length === 0) {
                void vscode.commands.executeCommand('setContext', 'launchJsonStatus', 'Supported');
                this.launchConfig = extensionCompoundConfigs[0].name; // extensionCompoundConfigs[0].name => 'Launch Edge Headless and attach DevTools'
                this.isValidConfig = true;
                return;
            }
            void vscode.commands.executeCommand('setContext', 'launchJsonStatus', 'Unsupported');
            this.launchConfig = 'Unsupported';
            this.isValidConfig = false;
            return;
        }
        void vscode.commands.executeCommand('setContext', 'launchJsonStatus', 'None');
        this.launchConfig = 'None';
        this.isValidConfig = false;
    }

    /**
     * Add a template for a supported debug configuration to launch.json
     * @returns {void}
     */
    async configureLaunchJson(): Promise<void> {
        if (!vscode.workspace.workspaceFolders) {
            void vscode.window.showErrorMessage('Cannot configure launch.json for an empty workspace. Please open a folder in the editor.');
            return;
        }

        // Create ./.vscode/launch.json if it doesn't already exist
        const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
        const relativePath = '/.vscode/launch.json';
        fse.ensureFileSync(workspaceUri.fsPath + relativePath);

        // Append a supported debug config to their list of configurations and update workspace configuration
        const launchJson = vscode.workspace.getConfiguration('launch', workspaceUri);
        let configs = launchJson.get('configurations') as vscode.DebugConfiguration[];
        configs = this.replaceDuplicateNameConfigs(configs, extensionConfigs) as vscode.DebugConfiguration[];

        const missingConfigs = this.getMissingConfigs(configs, extensionConfigs);
        for (const missingConfig of missingConfigs) {
            configs.push((missingConfig as vscode.DebugConfiguration));
        }
        await launchJson.update('configurations', configs) as unknown as Promise<void>;

        // Add compound configs
        let compounds = launchJson.get('compounds') as CompoundConfig[];
        compounds = this.replaceDuplicateNameConfigs(compounds, extensionCompoundConfigs) as CompoundConfig[];
        const missingCompoundConfigs = this.getMissingConfigs(compounds, extensionCompoundConfigs);
        for (const missingCompoundConfig of missingCompoundConfigs) {
            compounds.push((missingCompoundConfig as CompoundConfig));
        }
        await launchJson.update('compounds', compounds) as unknown as Promise<void>;

        // Insert instruction comment
        let launchText = fse.readFileSync(workspaceUri.fsPath + relativePath).toString();
        const re = /("url":.*startpage[\/\\]+index\.html",)/gm;
        const match = re.exec(launchText);
        const instructions = ' // Provide your project\'s url to finish configuring';
        launchText = launchText.replace(re, `${match ? match[0] : ''}${instructions}`);
        fse.writeFileSync(workspaceUri.fsPath + relativePath, launchText);

        // Open launch.json in editor
        void vscode.commands.executeCommand('vscode.open', vscode.Uri.joinPath(workspaceUri, relativePath));
        this.updateLaunchConfig();
    }

    isValidLaunchConfig(): boolean {
        return this.isValidConfig;
    }

    replaceDuplicateNameConfigs(userConfigs: Record<string, unknown>[], extensionConfigs: Record<string, unknown>[]): Record<string, unknown>[] {
        const configs = [];
        const extensionConfigMap: Map<string, Record<string, unknown>> = new Map();
        for (const extensionConfig of extensionConfigs) {
            extensionConfigMap.set((extensionConfig.name as string), extensionConfig);
        }
        for (const userConfig of userConfigs) {
            const duplicateNameConfig = extensionConfigMap.get((userConfig.name as string));
            const addConfig = duplicateNameConfig ? duplicateNameConfig : userConfig;
            configs.push(addConfig);
        }
        return configs;
    }

    getMissingConfigs(userConfigs: Record<string, unknown>[], extensionConfigs: Record<string, unknown>[]): Record<string, unknown>[] {
        const missingConfigs: Record<string, unknown>[] = [];
        for (const extensionConfig of extensionConfigs) {
            let configExists = false;
            for (const userConfig of userConfigs) {
                if (this.compareConfigs(userConfig, extensionConfig)) {
                    configExists = true;
                    break;
                }
            }
            if (!configExists) {
                missingConfigs.push(extensionConfig);
            }
        }

        return missingConfigs;
    }

    compareConfigs(userConfig: Record<string, unknown>, extensionConfig: Record<string, unknown>): boolean {
        for (const property of Object.keys(extensionConfig)) {
            if (property === 'url' || property === 'presentation') {
                continue;
            }
            if (Array.isArray(extensionConfig[property]) && Array.isArray(userConfig[property])) {
                const userPropertySet = new Set((userConfig[property] as Array<string>));
                for (const extensionConfigProperty of (extensionConfig[property] as Array<string>)) {
                    if (!userPropertySet.has(extensionConfigProperty)) {
                        return false;
                    }
                }
            } else if (userConfig[property] !== extensionConfig[property]) {
                return false;
            }
        }
        return true;
    }
}
