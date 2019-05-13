// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtensionContext } from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { createFakeExtensionContext, createFakeTelemetryReporter, createFakeVSCode, Mocked } from "./test/helpers";
import { IRemoteTargetJson, SETTINGS_STORE_NAME, SETTINGS_VIEW_NAME } from "./utils";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });

describe("extension", () => {
    describe("activate", () => {
        let context: ExtensionContext;
        let commandMock: jest.Mock;
        let mockUtils: Partial<Mocked<typeof import("./utils")>>;
        let mockRegisterTree: jest.Mock;
        let mockProviderRefresh: jest.Mock;
        let mockClipboard: jest.Mock;

        beforeEach(() => {
            // Initialize a fake context
            context = createFakeExtensionContext();

            // Mock out the imported utils
            mockUtils = {
                SETTINGS_STORE_NAME,
                SETTINGS_VIEW_NAME,
                createTelemetryReporter: jest.fn((_: ExtensionContext) => createFakeTelemetryReporter()),
                getListOfTargets: jest.fn(),
                getRemoteEndpointSettings: jest.fn(),
            };
            jest.doMock("./utils", () => mockUtils);

            mockProviderRefresh = jest.fn();
            jest.doMock("./cdpTargetsProvider", () => function CDPTargetsProvider() {
                return {
                    refresh: mockProviderRefresh,
                };
            });

            // Mock out vscode command registration
            const mockVSCode = createFakeVSCode();
            commandMock = mockVSCode.commands.registerCommand;
            mockRegisterTree = mockVSCode.window.registerTreeDataProvider;
            mockClipboard = mockVSCode.env.clipboard.writeText;
            jest.doMock("vscode", () => mockVSCode, { virtual: true });
            jest.resetModules();
        });

        it("creates a telemetry reporter", async () => {
            const newExtension = await import("./extension");

            // Activation should create a new reporter
            newExtension.activate(context);
            expect(mockUtils.createTelemetryReporter).toHaveBeenCalled();
        });

        it("registers commands correctly", async () => {
            const newExtension = await import("./extension");

            // Activation should add the commands as subscriptions on the context
            newExtension.activate(context);
            expect(context.subscriptions.length).toBe(5);
            expect(commandMock).toHaveBeenCalledTimes(4);
            expect(commandMock)
                .toHaveBeenNthCalledWith(1, `${SETTINGS_STORE_NAME}.attach`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(2, `${SETTINGS_VIEW_NAME}.refresh`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(3, `${SETTINGS_VIEW_NAME}.attach`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(4, `${SETTINGS_VIEW_NAME}.copyItem`, expect.any(Function));
            expect(mockRegisterTree)
                .toHaveBeenNthCalledWith(1, `${SETTINGS_VIEW_NAME}.targets`, expect.any(Object));
        });

        it("requests targets on attach command", async () => {
            // Store the attach command that will be subscribed by extension activation
            let attachCommand: (() => Promise<void>) | undefined;
            commandMock.mockImplementation((name, callback) => {
                if (name === `${SETTINGS_STORE_NAME}.attach`) {
                    attachCommand = callback;
                }
            });

            // Activate the extension
            const newExtension = await import("./extension");
            newExtension.activate(context);
            expect(attachCommand).toBeDefined();

            // Ensure that attaching will request targets
            mockUtils.getRemoteEndpointSettings!.mockReturnValue({
                hostname: "localhost",
                port: 9222,
                useHttps: false,
            });
            mockUtils.getListOfTargets!.mockResolvedValue([]);
            attachCommand!();
            expect(mockUtils.getListOfTargets).toBeCalled();
        });

        it("performs registered commands correctly", async () => {
            const mockPanelShow = jest.fn();
            jest.doMock("./devtoolsPanel", () => ({
                DevToolsPanel: {
                    createOrShow: mockPanelShow,
                },
            }));
            jest.resetModules();

            const newExtension = await import("./extension");
            newExtension.activate(context);

            function getCommandCallback(index: number) {
                return { callback: commandMock.mock.calls[index][1], thisObj: commandMock.mock.instances[index] };
            }

            const refresh = getCommandCallback(1);
            refresh.callback.call(refresh.thisObj);
            expect(mockProviderRefresh).toHaveBeenCalled();

            const attach = getCommandCallback(2);
            attach.callback.call(attach.thisObj, { websocketUrl: "" });
            expect(mockPanelShow).toHaveBeenCalled();

            const copy = getCommandCallback(3);
            copy.callback.call(copy.thisObj, { tooltip: "something" });
            expect(mockClipboard).toHaveBeenCalledWith("something");
        });
    });

    describe("attach", () => {
        let target: IRemoteTargetJson;
        let mocks: {
            panel: any,
            utils: Partial<Mocked<typeof import("./utils")>>,
            vscode: any,
        };
        let mockTelemetry: Mocked<Readonly<TelemetryReporter>>;

        beforeEach(() => {
            target = {
                title: "title",
                url: "url",
                webSocketDebuggerUrl: "ws",
            } as IRemoteTargetJson;

            mockTelemetry = createFakeTelemetryReporter();

            mocks = {
                panel: {
                    DevToolsPanel: {
                        createOrShow: jest.fn(),
                    },
                },
                utils: {
                    createTelemetryReporter: jest.fn((_: ExtensionContext) => mockTelemetry),
                    fixRemoteWebSocket: jest.fn().mockReturnValue(target),
                    getListOfTargets: jest.fn().mockResolvedValue([target]),
                    getRemoteEndpointSettings: jest.fn().mockReturnValue({
                        hostname: "hostname",
                        port: "port",
                        useHttps: false,
                    }),
                },
                vscode: createFakeVSCode(),
            };

            jest.doMock("vscode", () => mocks.vscode, { virtual: true });
            jest.doMock("./devtoolsPanel", () => mocks.panel);
            jest.doMock("./utils", () => mocks.utils);
            jest.resetModules();
        });

        it("creates a telemetry reporter", async () => {
            const newExtension = await import("./extension");

            // Activation should create a new reporter
            await newExtension.attach(createFakeExtensionContext(), false);
            expect(mocks.utils.createTelemetryReporter).toHaveBeenCalled();
        });

        it("calls fixRemoteWebSocket for all targets", async () => {
            const expectedCount = 5;
            const allTargets = [];
            for (let i = 0; i < expectedCount; i++) {
                allTargets.push(target);
            }

            mocks.utils.getListOfTargets!.mockResolvedValueOnce(allTargets);

            const newExtension = await import("./extension");
            await newExtension.attach(createFakeExtensionContext(), false);
            expect(mocks.utils.fixRemoteWebSocket).toBeCalledTimes(expectedCount);
        });

        it("shows quick pick window if no target", async () => {
            const newExtension = await import("./extension");
            await newExtension.attach(createFakeExtensionContext(), false);
            expect(mocks.vscode.window.showQuickPick).toBeCalledTimes(1);
        });

        it("opens devtools against quick pick target", async () => {
            const expectedPick = {
                detail: "http://target:9222",
            };
            mocks.vscode.window.showQuickPick.mockResolvedValueOnce(expectedPick);

            const expectedContext = createFakeExtensionContext();
            const newExtension = await import("./extension");
            await newExtension.attach(expectedContext, false);
            expect(mocks.panel.DevToolsPanel.createOrShow).toHaveBeenCalledWith(
                expectedContext,
                mockTelemetry,
                expectedPick.detail,
            );
        });

        it("opens devtools against given target", async () => {
            const expectedUrl = "http://target:9222";
            const expectedWS = "ws://target:9222";
            target = {
                title: "title",
                url: expectedUrl,
                webSocketDebuggerUrl: expectedWS,
            } as IRemoteTargetJson;

            mocks.utils.fixRemoteWebSocket!.mockReturnValueOnce(target);

            const expectedContext = createFakeExtensionContext();
            const newExtension = await import("./extension");
            await newExtension.attach(expectedContext, false, expectedUrl);
            expect(mocks.panel.DevToolsPanel.createOrShow).toHaveBeenCalledWith(
                expectedContext,
                mockTelemetry,
                expectedWS,
            );
        });

        it("shows error if it can't find given target", async () => {
            const expectedMissingUrl = "some non-existent target";

            const newExtension = await import("./extension");
            await newExtension.attach(createFakeExtensionContext(), false, expectedMissingUrl);
            expect(mocks.vscode.window.showErrorMessage).toBeCalledWith(expect.stringContaining(expectedMissingUrl));
        });

        it("reports telemetry if failed to get targets", async () => {
            mocks.utils.getListOfTargets!.mockResolvedValueOnce(null as any);

            const newExtension = await import("./extension");
            await newExtension.attach(createFakeExtensionContext(), false);
            expect(mockTelemetry.sendTelemetryEvent).toHaveBeenCalled();
        });
    });
});
