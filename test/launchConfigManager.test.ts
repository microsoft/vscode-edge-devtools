// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { afterAll, describe, expect, it, jest } from '@jest/globals';
import {createFakeVSCode} from "./helpers/helpers";
import { extensionCompoundConfigs, extensionConfigs, LaunchConfigManager, providedDebugConfig } from "../src/launchConfigManager";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });
jest.mock("fs-extra");

const getVscodeMock = () => jest.requireMock("vscode") as ReturnType<typeof createFakeVSCode>;
const getFsExtraMock = () => jest.requireMock("fs-extra") as any;

describe("launchConfigManager", () => {

    describe('getLaunchJson', () => {
        it('updates launchJsonStatus with "None" when launch.json does not exist', async () => {
            const vscodeMock = getVscodeMock();
            const fse = getFsExtraMock();
            vscodeMock.workspace.getConfiguration.mockImplementation(() => ({
                get: (name: string) => [{type: 'vscode-edge-devtools.debug'}],
            } as any));
            fse.pathExistsSync.mockImplementation(() => false);
            const launchConfigManager = LaunchConfigManager.instance;
            expect(launchConfigManager.getLaunchConfig()).toEqual('None');
            expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith('setContext', 'launchJsonStatus', 'None');
        });

        it('updates launchJsonStatus with "Unsupported" when there is no supported debug config', async () => {
            const vscodeMock = getVscodeMock();
            const fse = getFsExtraMock();
            fse.pathExistsSync.mockImplementation(() => true);
            vscodeMock.workspace.getConfiguration.mockImplementation(() => ({
                get: (name: string) => [{type: ''}],
            } as any));
            const launchConfigManager = LaunchConfigManager.instance;
            expect(launchConfigManager.getLaunchConfig()).toEqual('Unsupported');
            expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith('setContext', 'launchJsonStatus', 'Unsupported');
        });

        it('returns a supported debug config when one exists', async () => {
            const vscodeMock = getVscodeMock();
            const fse = getFsExtraMock();
            fse.pathExistsSync.mockImplementation(() => true);
            vscodeMock.workspace.getConfiguration.mockImplementation(() => ({
                get: (name: string) => {
                    if (name === 'configurations') {
                        return extensionConfigs;
                    } else {
                        return extensionCompoundConfigs;
                    }
                },
            } as any));
            const launchConfigManager = LaunchConfigManager.instance;
            expect(launchConfigManager.getLaunchConfig()).toEqual('Launch Edge Headless and attach DevTools');
            expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith('setContext', 'launchJsonStatus', 'Supported');
        });

        it('updates launchJsonStatus with "None" when there is no folder open', async () => {
            const vscodeMock = getVscodeMock();
            const launchConfigManager = LaunchConfigManager.instance;
            (vscodeMock.workspace as any).workspaceFolders = null;
            expect(launchConfigManager.getLaunchConfig()).toEqual('None');
            expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith('setContext', 'launchJsonStatus', 'None');
        });
    });

    describe('configureLaunchJson', () => {
        it('adds extension configs/compounds to launch.json', async () => {
            const vscodeMock = getVscodeMock();
            const fse = getFsExtraMock();
            fse.readFileSync.mockImplementation((() => ''));
            (vscodeMock.workspace as any).workspaceFolders = [{
                uri:  'file:///g%3A/GIT/testPage'
            }];
            (vscodeMock as any).WorkspaceConfiguration = {
                update: jest.fn((name: string, value: any) => {}),
            };
            vscodeMock.workspace.getConfiguration.mockImplementation(() => ({
                get: jest.fn((name: string) => []),
                update: (vscodeMock as any).WorkspaceConfiguration.update,
            } as any));
            vscodeMock.Uri.joinPath = jest.fn();
            const launchConfigManager = LaunchConfigManager.instance;
            await launchConfigManager.configureLaunchJson();
            expect((vscodeMock as any).WorkspaceConfiguration.update).toHaveBeenCalledWith('configurations', expect.arrayContaining([...extensionConfigs]));
            expect((vscodeMock as any).WorkspaceConfiguration.update).toHaveBeenCalledWith('compounds', expect.arrayContaining([...extensionCompoundConfigs]));
        });

        it('inserts a comment after the url property', async () => {
            const fse = getFsExtraMock();
            const expectedText = '// Provide your project\'s url to finish configuring';
            fse.readFileSync.mockImplementation(() => JSON.stringify(providedDebugConfig));
            const launchConfigManager = LaunchConfigManager.instance;
            await launchConfigManager.configureLaunchJson();
            expect(fse.writeFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining(expectedText));
        });

        it('replaces config with duplicate name with extension config', async () => {
            const vscodeMock = getVscodeMock();
            const fse = getFsExtraMock();
            fse.readFileSync.mockImplementation((() => ''));
            (vscodeMock.workspace as any).workspaceFolders = [{
                uri:  'file:///g%3A/GIT/testPage'
            }];
            (vscodeMock as any).WorkspaceConfiguration = {
                update: jest.fn((name: string, value: any) => {}),
            };
            vscodeMock.workspace.getConfiguration.mockImplementation(() => ({
                get: jest.fn((name: string) => [{name: 'Launch Microsoft Edge in headless mode'}]),
                update: (vscodeMock as any).WorkspaceConfiguration.update,
            } as any));
            vscodeMock.Uri.joinPath = jest.fn();
            const launchConfigManager = LaunchConfigManager.instance;
            launchConfigManager.configureLaunchJson();
            expect((vscodeMock as any).WorkspaceConfiguration.update).toHaveBeenCalledWith('configurations', Array(3).fill(expect.anything()));
        });

        it('retains user config', async () => {
            const vscodeMock = getVscodeMock();
            const fse = getFsExtraMock();
            fse.readFileSync.mockImplementation((() => ''));
            (vscodeMock.workspace as any).workspaceFolders = [{
                uri:  'file:///g%3A/GIT/testPage'
            }];
            (vscodeMock as any).WorkspaceConfiguration = {
                update: jest.fn((name: string, value: any) => {}),
            };
            vscodeMock.workspace.getConfiguration.mockImplementation(() => ({
                get: jest.fn((name: string) => [{name: 'Personal config'}]),
                update: (vscodeMock as any).WorkspaceConfiguration.update,
            } as any));
            vscodeMock.Uri.joinPath = jest.fn();
            const launchConfigManager = LaunchConfigManager.instance;
            launchConfigManager.configureLaunchJson();
            expect((vscodeMock as any).WorkspaceConfiguration.update).toHaveBeenCalledWith('configurations', Array(4).fill(expect.anything()));
        });
    });

    afterAll(() => {
        jest.resetModules();
    });
});
