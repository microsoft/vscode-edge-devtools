// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { SETTINGS_STORE_NAME } from './utils';
export type LaunchConfig = 'None' | 'Unsupported' | vscode.DebugConfiguration;

export const providedDebugConfig: vscode.DebugConfiguration = {
    name: 'Launch Microsoft Edge and open the Edge DevTools',
    request: 'launch',
    type: `${SETTINGS_STORE_NAME}.debug`,
    url: '',
};

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
            for (const config of configs) {
                if (config.type === 'vscode-edge-devtools.debug' || config.type === 'msedge' || config.type === 'edge') {
                    void vscode.commands.executeCommand('setContext', 'launchJsonStatus', 'Supported');
                    this.launchConfig = config;
                    this.isValidConfig = true;
                    return;
                }
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
        const configs = launchJson.get('configurations') as vscode.DebugConfiguration[];
        configs.push(providedDebugConfig);
        await launchJson.update('configurations', configs) as unknown as Promise<void>;

        // Insert instruction comment
        let launchText = fse.readFileSync(workspaceUri.fsPath + relativePath).toString();
        const re = new RegExp(`{(.|\\n|\\s)*(${providedDebugConfig.type})(.|\\n|\\s)*(${providedDebugConfig.url}")`, 'm');
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
}
