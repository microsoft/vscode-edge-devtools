// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtensionContext } from "vscode";
import { IRemoteTargetJson, SETTINGS_STORE_NAME } from "./utils";

jest.mock("vscode", () => "mock", { virtual: true });

describe("extension", () => {
    describe("activate", () => {
        let context: ExtensionContext;
        let commandMock: jest.Mock;

        beforeEach(() => {
            // Initialize a fake context
            context = {
                subscriptions: [],
            } as ExtensionContext;

            // Mock out vscode command registration
            commandMock = jest.fn();
            const mockVSCode = { commands: { registerCommand: commandMock } };
            jest.doMock("vscode", () => mockVSCode, { virtual: true });
            jest.resetModules();
        });

        it("registers commands correctly", async () => {
            const newExtension = await import("./extension");

            // Activation should add the commands as subscriptions on the context
            newExtension.activate(context);
            expect(context.subscriptions.length).toBe(1);
            expect(commandMock).toHaveBeenCalledTimes(1);
            expect(commandMock)
                .toHaveBeenNthCalledWith(1, `${SETTINGS_STORE_NAME}.attach`, expect.any(Function));
        });

        it("requests targets on attach command", async () => {
            // Store the attach command that will be subscribed by extension activation
            let attachCommand: () => Promise<void>;
            commandMock.mockImplementation((name, callback) => {
                if (name === `${SETTINGS_STORE_NAME}.attach`) {
                    attachCommand = callback;
                }
            });

            // Mock out the imported utils
            const mockUtils = {
                SETTINGS_STORE_NAME,
                getListOfTargets: jest.fn(),
                getRemoteEndpointSettings: jest.fn(),
            };
            jest.doMock("./utils", () => mockUtils);

            // Activate the extension
            const newExtension = await import("./extension");
            newExtension.activate(context);
            expect(attachCommand).toBeDefined();

            // Ensure that attaching will request targets
            mockUtils.getRemoteEndpointSettings.mockReturnValue({ host: "localhost", port: 9222 });
            mockUtils.getListOfTargets.mockResolvedValue(null);
            attachCommand();
            expect(mockUtils.getListOfTargets).toBeCalled();
        });
    });

    describe("attach", () => {
        let target: IRemoteTargetJson;
        let mocks: {
            panel: any,
            utils: any,
            vscode: any,
        };

        beforeEach(() => {
            target = {
                title: "title",
                url: "url",
                webSocketDebuggerUrl: "ws",
            } as IRemoteTargetJson;

            mocks = {
                panel: {
                    DevToolsPanel: {
                        createOrShow: jest.fn(),
                    },
                },
                utils: {
                    fixRemoteWebSocket: jest.fn().mockReturnValue(target),
                    getListOfTargets: jest.fn().mockResolvedValue([target]),
                    getRemoteEndpointSettings: jest.fn().mockReturnValue({ hostname: "hostname", port: "port" }),
                },
                vscode: {
                    showErrorMessage: jest.fn(),
                    showQuickPick: jest.fn().mockResolvedValue(null),
                },
            };

            const mockVSCode = { window: mocks.vscode };
            jest.doMock("vscode", () => mockVSCode, { virtual: true });
            jest.doMock("./devtoolsPanel", () => mocks.panel);
            jest.doMock("./utils", () => mocks.utils);
            jest.resetModules();
        });

        it("calls fixRemoteWebSocket for all targets", async () => {
            const expectedCount = 5;
            const allTargets = [];
            for (let i = 0; i < expectedCount; i++) {
                allTargets.push(target);
            }

            mocks.utils.getListOfTargets.mockResolvedValueOnce(allTargets);

            const newExtension = await import("./extension");
            await newExtension.attach(null, false);
            expect(mocks.utils.fixRemoteWebSocket).toBeCalledTimes(expectedCount);
        });

        it("shows quick pick window if no target", async () => {
            const newExtension = await import("./extension");
            await newExtension.attach(null, false);
            expect(mocks.vscode.showQuickPick).toBeCalledTimes(1);
        });

        it("opens devtools against quick pick target", async () => {
            const expectedPick = {
                detail: "http://target:9222",
            };
            mocks.vscode.showQuickPick.mockResolvedValueOnce(expectedPick);

            const newExtension = await import("./extension");
            await newExtension.attach(null, false);
            expect(mocks.panel.DevToolsPanel.createOrShow).toBeCalledWith(null, expectedPick.detail);
        });

        it("opens devtools against given target", async () => {
            const expectedUrl = "http://target:9222";
            const expectedWS = "ws://target:9222";
            target = {
                title: "title",
                url: expectedUrl,
                webSocketDebuggerUrl: expectedWS,
            } as IRemoteTargetJson;

            mocks.utils.fixRemoteWebSocket.mockReturnValueOnce(target);

            const newExtension = await import("./extension");
            await newExtension.attach(null, false, expectedUrl);
            expect(mocks.panel.DevToolsPanel.createOrShow).toBeCalledWith(null, expectedWS);
        });

        it("shows error if it can't find given target", async () => {
            const expectedMissingUrl = "some non-existent target";

            const newExtension = await import("./extension");
            await newExtension.attach(null, false, expectedMissingUrl);
            expect(mocks.vscode.showErrorMessage).toBeCalledWith(expect.stringContaining(expectedMissingUrl));
        });
    });
});
