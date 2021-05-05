// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    createFakeVSCode,
    Mocked,
} from "./helpers/helpers";
import { LaunchConfigManager, providedDebugConfig } from "../src/LaunchConfigManager";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });
jest.mock("fs-extra");

describe("launchConfigManager", () => {
    describe('getLaunchJson', () => {
        let fse: Mocked<typeof import("fs-extra")>;
        let launchConfigManager: LaunchConfigManager;

        beforeEach(async () => {
            fse = require("fs-extra");
            launchConfigManager = LaunchConfigManager.instance;
        });

        it('updates launchJsonStatus with "None" when launch.json does not exist', async () => {
            const vscodeMock = await jest.requireMock("vscode");
            fse.pathExistsSync.mockImplementation(() => false);
            expect(launchConfigManager.getLaunchConfig()).toEqual('None');
            expect(vscodeMock.commands.executeCommand).toBeCalledWith('setContext', 'launchJsonStatus', 'None');
        });

        it('updates launchJsonStatus with "None" when launch.json does not exist', async () => {
            const vscodeMock = await jest.requireMock("vscode");
            const launchConfigManager = LaunchConfigManager.instance;
            fse.pathExistsSync.mockImplementation(() => false);
            expect(launchConfigManager.getLaunchConfig()).toEqual('None');
            expect(vscodeMock.commands.executeCommand).toBeCalledWith('setContext', 'launchJsonStatus', 'None');
        });

        it('updates launchJsonStatus with "Unsupported" when there is no supported debug config', async () => {
            const vscodeMock = await jest.requireMock("vscode");
            // eslint-disable-next-line no-console
            fse.pathExistsSync.mockImplementation(() => true);
            vscodeMock.workspace.getConfiguration.mockImplementation(() => {
                return {
                    get: (name: string) => [{type: ''}]
                }
            });
            expect(launchConfigManager.getLaunchConfig()).toEqual('Unsupported');
            expect(vscodeMock.commands.executeCommand).toBeCalledWith('setContext', 'launchJsonStatus', 'Unsupported');
        });

        it('returns a supported debug config when one exists', async () => {
            const vscodeMock = await jest.requireMock("vscode");
            const launchConfigManager = LaunchConfigManager.instance;
            fse.pathExistsSync.mockImplementation(() => true);
            vscodeMock.workspace.getConfiguration.mockImplementation(() => {
                return {
                    get: (name: string) => [{type: 'vscode-edge-devtools.debug'}]
                }
            });
            expect(launchConfigManager.getLaunchConfig()).toEqual({type: 'vscode-edge-devtools.debug'});
            expect(vscodeMock.commands.executeCommand).toBeCalledWith('setContext', 'launchJsonStatus', 'Supported');
        });

        it('updates launchJsonStatus with "None" when there is no folder open', async () => {
            const vscodeMock = await jest.requireMock("vscode");
            const launchConfigManager = LaunchConfigManager.instance;
            vscodeMock.workspace.workspaceFolders = null;
            expect(launchConfigManager.getLaunchConfig()).toEqual('None');
            expect(vscodeMock.commands.executeCommand).toBeCalledWith('setContext', 'launchJsonStatus', 'None');
        });
    });

    describe('configureLaunchJson', () => {
        let fse: Mocked<typeof import("fs-extra")>;
        let launchConfigManager: LaunchConfigManager;

        beforeEach(async () => {
            jest.doMock("fs-extra");
            fse = require("fs-extra");
            launchConfigManager = LaunchConfigManager.instance;
            fse.readFileSync.mockImplementation((() => ''));
        });

        it('adds a debug config to launch.json', async () => {
            const vscodeMock = await jest.requireMock("vscode");
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
            launchConfigManager.configureLaunchJson();
            expect(vscodeMock.WorkspaceConfiguration.update).toBeCalledWith('configurations', expect.arrayContaining([expect.any(Object)]));
        });

        it('inserts a comment after the url property', async () => {
            const expectedText = '\"url\":\"' + providedDebugConfig.url + '\" // Provide your project\'s url to finish configuring';
            fse.readFileSync.mockImplementation(() => JSON.stringify(providedDebugConfig));
            await launchConfigManager.configureLaunchJson();
            expect(fse.writeFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining(expectedText));
        });
    });
});
