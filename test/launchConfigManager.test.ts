// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {createFakeVSCode} from "./helpers/helpers";
import { extensionCompoundConfigs, extensionConfigs, LaunchConfigManager, providedDebugConfig } from "../src/launchConfigManager";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });
jest.mock("fs-extra");

describe("launchConfigManager", () => {

    describe('getLaunchJson', () => {
        it('updates launchJsonStatus with "None" when launch.json does not exist', async () => {
            const vscodeMock = jest.requireMock("vscode");
            const fse = jest.requireMock("fs-extra");
            vscodeMock.workspace.getConfiguration.mockImplementation(() => {
                return {
                    get: (name: string) => [{type: 'vscode-edge-devtools.debug'}]
                }
            });
            fse.pathExistsSync.mockImplementation(() => false);
            const launchConfigManager = LaunchConfigManager.instance;
            expect(launchConfigManager.getLaunchConfig()).toEqual('None');
            expect(vscodeMock.commands.executeCommand).toBeCalledWith('setContext', 'launchJsonStatus', 'None');
        });

        it('updates launchJsonStatus with "Unsupported" when there is no supported debug config', async () => {
            const vscodeMock = jest.requireMock("vscode");
            const fse = jest.requireMock("fs-extra");
            fse.pathExistsSync.mockImplementation(() => true);
            vscodeMock.workspace.getConfiguration.mockImplementation(() => {
                return {
                    get: (name: string) => [{type: ''}]
                }
            });
            const launchConfigManager = LaunchConfigManager.instance;
            expect(launchConfigManager.getLaunchConfig()).toEqual('Unsupported');
            expect(vscodeMock.commands.executeCommand).toBeCalledWith('setContext', 'launchJsonStatus', 'Unsupported');
        });

        it('returns a supported debug config when one exists', async () => {
            const vscodeMock = jest.requireMock("vscode");
            const fse = jest.requireMock("fs-extra");
            fse.pathExistsSync.mockImplementation(() => true);
            vscodeMock.workspace.getConfiguration.mockImplementation(() => {
                return {
                    get: (name: string) => {
                        if (name === 'configurations') {
                            return extensionConfigs;
                        } else {
                            return extensionCompoundConfigs;
                        }
                    }
                }
            });
            const launchConfigManager = LaunchConfigManager.instance;
            expect(launchConfigManager.getLaunchConfig()).toEqual('Launch Edge Headless and attach DevTools');
            expect(vscodeMock.commands.executeCommand).toBeCalledWith('setContext', 'launchJsonStatus', 'Supported');
        });

        it('updates launchJsonStatus with "None" when there is no folder open', async () => {
            const vscodeMock = jest.requireMock("vscode");
            const launchConfigManager = LaunchConfigManager.instance;
            vscodeMock.workspace.workspaceFolders = null;
            expect(launchConfigManager.getLaunchConfig()).toEqual('None');
            expect(vscodeMock.commands.executeCommand).toBeCalledWith('setContext', 'launchJsonStatus', 'None');
        });
    });

    describe('configureLaunchJson', () => {
        it('adds a debug config to launch.json', async () => {
            const vscodeMock = jest.requireMock("vscode");
            const fse = jest.requireMock("fs-extra");
            fse.readFileSync.mockImplementation((() => ''));
            vscodeMock.workspace.workspaceFolders = [{
                uri:  'file:///g%3A/GIT/testPage'
            }];
            vscodeMock.WorkspaceConfiguration = {
                update: jest.fn((name: string, value: any) => {}),
            };
            vscodeMock.workspace.getConfiguration.mockImplementation(() => {
                return {
                        get: jest.fn((name: string) => []),
                        update: vscodeMock.WorkspaceConfiguration.update,
                }
            });
            vscodeMock.Uri.joinPath = jest.fn();
            const launchConfigManager = LaunchConfigManager.instance;
            launchConfigManager.configureLaunchJson();
            expect(vscodeMock.WorkspaceConfiguration.update).toBeCalledWith('configurations', expect.arrayContaining([expect.any(Object)]));
        });

        it('inserts a comment after the url property', async () => {
            const fse = jest.requireMock("fs-extra");
            const expectedText = '// Provide your project\'s url to finish configuring';
            fse.readFileSync.mockImplementation(() => JSON.stringify(providedDebugConfig));
            const launchConfigManager = LaunchConfigManager.instance;
            await launchConfigManager.configureLaunchJson();
            expect(fse.writeFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining(expectedText));
        });
    });

    afterAll(() => {
        jest.resetModules();
    });
});
