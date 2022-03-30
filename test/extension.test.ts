// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtensionContext } from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { createFakeExtensionContext, createFakeTelemetryReporter, createFakeVSCode, Mocked } from "./helpers/helpers";
import {
    buttonCode,
    IRemoteTargetJson,
    IRuntimeConfig,
    removeTrailingSlash,
    SETTINGS_STORE_NAME,
    SETTINGS_VIEW_NAME,
} from "../src/utils";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });

describe("extension", () => {
    const fakeRuntimeConfig: Partial<IRuntimeConfig> = {};

    describe("activate", () => {
        let context: ExtensionContext;
        let commandMock: jest.Mock;
        let mockUtils: Partial<Mocked<typeof import("../src/utils")>>;
        let mockRegisterTree: jest.Mock;
        let mockProviderRefresh: jest.Mock;
        let mockProviderConstructor: jest.Mock;
        let mockClipboard: jest.Mock;

        beforeEach(() => {
            // Initialize a fake context
            context = createFakeExtensionContext();

            // Mock out the imported utils
            mockUtils = {
                buttonCode,
                SETTINGS_STORE_NAME,
                SETTINGS_VIEW_NAME,
                createTelemetryReporter: jest.fn((_: ExtensionContext) => createFakeTelemetryReporter()),
                getListOfTargets: jest.fn().mockReturnValue([]),
                getRemoteEndpointSettings: jest.fn(),
                getRuntimeConfig: jest.fn(),
                removeTrailingSlash: jest.fn(removeTrailingSlash),
                getJsDebugCDPProxyWebsocketUrl: jest.fn(),
                getActiveDebugSessionId: jest.fn(),
                reportFileExtensionTypes: jest.fn(),
                reportChangedExtensionSetting: jest.fn(),
                reportExtensionSettings: jest.fn(),
            };
            jest.doMock("../src/utils", () => mockUtils);
            jest.doMock("../src/launchDebugProvider");

            mockProviderRefresh = jest.fn();
            mockProviderConstructor = jest.fn(() => ({refresh: mockProviderRefresh}));
            jest.doMock("../src/cdpTargetsProvider", () => {
                return {
                    CDPTargetsProvider: mockProviderConstructor,
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
            const newExtension = await import("../src/extension");

            // Activation should create a new reporter
            newExtension.activate(context);
            expect(mockUtils.createTelemetryReporter).toHaveBeenCalled();
        });

        it("registers commands correctly", async () => {
            const newExtension = await import("../src/extension");

            // Activation should add the commands as subscriptions on the context
            newExtension.activate(context);

            expect(context.subscriptions.length).toBe(17);
            expect(commandMock).toHaveBeenCalledTimes(16);
            expect(commandMock)
                .toHaveBeenNthCalledWith(1, `${SETTINGS_STORE_NAME}.attach`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(2, `${SETTINGS_STORE_NAME}.launch`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(3, `${SETTINGS_STORE_NAME}.attachToCurrentDebugTarget`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(4, `${SETTINGS_VIEW_NAME}.launch`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(5, `${SETTINGS_VIEW_NAME}.refresh`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(6, `${SETTINGS_VIEW_NAME}.attach`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(7, `${SETTINGS_VIEW_NAME}.toggleScreencast`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(8, `${SETTINGS_VIEW_NAME}.toggleInspect`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(9, `${SETTINGS_VIEW_NAME}.openSettings`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(10, `${SETTINGS_VIEW_NAME}.viewChangelog`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(11, `${SETTINGS_VIEW_NAME}.close-instance`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(12, `${SETTINGS_VIEW_NAME}.copyItem`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(13, `${SETTINGS_VIEW_NAME}.configureLaunchJson`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(14, `${SETTINGS_VIEW_NAME}.launchProject`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(15, `${SETTINGS_VIEW_NAME}.viewDocumentation`, expect.any(Function));
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
            const newExtension = await import("../src/extension");
            newExtension.activate(context);
            expect(attachCommand).toBeDefined();

            // Ensure that attaching will request targets
            mockUtils.getRemoteEndpointSettings!.mockReturnValue({
                defaultUrl: "url",
                hostname: "localhost",
                port: 9222,
                timeout: 10000,
                useHttps: false,
                userDataDir: "profile",
            });
            mockUtils.getListOfTargets!.mockResolvedValue([]);
            attachCommand!();
            expect(mockUtils.getListOfTargets).toBeCalled();
        });

        it("performs registered commands correctly", async () => {
            const mockPanelShow = jest.fn();
            jest.doMock("../src/devtoolsPanel", () => ({
                DevToolsPanel: {
                    createOrShow: mockPanelShow,
                },
            }));
            jest.resetModules();

            const newExtension = await import("../src/extension");
            newExtension.activate(context);

            function getCommandCallback(index: number) {
                return { callback: commandMock.mock.calls[index][1], thisObj: commandMock.mock.instances[index] };
            }

            const refresh = getCommandCallback(4);
            refresh.callback.call(refresh.thisObj);
            expect(mockProviderRefresh).toHaveBeenCalled();

            const attach = getCommandCallback(5);
            attach.callback.call(attach.thisObj, { websocketUrl: "" });
            expect(mockPanelShow).toHaveBeenCalled();

            const copy = getCommandCallback(11);
            copy.callback.call(copy.thisObj, { tooltip: "something" });
            expect(mockClipboard).toHaveBeenCalledWith("something");
        });
    });

    describe("attach", () => {
        let target: any;
        let mocks: {
            panel: any,
            utils: Partial<Mocked<typeof import("../src/utils")>>,
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
                        timeout: 10000,
                        useHttps: false,
                    }),
                    getRuntimeConfig: jest.fn().mockReturnValue(fakeRuntimeConfig),
                    removeTrailingSlash: jest.fn(removeTrailingSlash),
                },
                vscode: createFakeVSCode(),
            };

            jest.doMock("vscode", () => mocks.vscode, { virtual: true });
            jest.doMock("../src/devtoolsPanel", () => mocks.panel);
            jest.doMock("../src/utils", () => mocks.utils);
            jest.resetModules();
        });

        it("creates a telemetry reporter", async () => {
            const newExtension = await import("../src/extension");

            // Activation should create a new reporter
            await newExtension.attach(createFakeExtensionContext());
            expect(mocks.utils.createTelemetryReporter).toHaveBeenCalled();
        });

        it("uses user config", async () => {
            const newExtension = await import("../src/extension");

            // Activation should create a new reporter
            const config = {
                port: 9273,
                url: "something",
            };
            await newExtension.attach(createFakeExtensionContext(), "url", config);
            expect(mocks.utils.getRemoteEndpointSettings).toHaveBeenCalledWith(config);
        });

        it("calls fixRemoteWebSocket for all targets", async () => {
            const expectedCount = 5;
            const allTargets = [];
            for (let i = 0; i < expectedCount; i++) {
                allTargets.push(target);
            }

            mocks.utils.getListOfTargets!.mockResolvedValueOnce(allTargets);

            const newExtension = await import("../src/extension");
            await newExtension.attach(createFakeExtensionContext());
            expect(mocks.utils.fixRemoteWebSocket).toBeCalledTimes(expectedCount);
        });

        it("shows quick pick window if no target", async () => {
            const newExtension = await import("../src/extension");
            await newExtension.attach(createFakeExtensionContext());
            expect(mocks.vscode.window.showQuickPick).toBeCalledTimes(1);
        });

        it("opens devtools against quick pick target", async () => {
            const expectedPick = {
                detail: "http://target:9222",
            };
            mocks.vscode.window.showQuickPick.mockResolvedValueOnce(expectedPick);

            const expectedContext = createFakeExtensionContext();
            const newExtension = await import("../src/extension");
            await newExtension.attach(expectedContext);
            expect(mocks.panel.DevToolsPanel.createOrShow).toHaveBeenCalledWith(
                expectedContext,
                mockTelemetry,
                expectedPick.detail,
                fakeRuntimeConfig,
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

            mocks.utils.getListOfTargets!.mockResolvedValue([target]),
            mocks.utils.fixRemoteWebSocket!.mockReturnValueOnce(target);

            const expectedContext = createFakeExtensionContext();
            const newExtension = await import("../src/extension");
            await newExtension.attach(expectedContext, expectedUrl);
            expect(mocks.panel.DevToolsPanel.createOrShow).toHaveBeenCalledWith(
                expectedContext,
                mockTelemetry,
                expectedWS,
                fakeRuntimeConfig,
            );
        });

        it("opens devtools against given target with unmatched trailing slashes", async () => {
            const expectedUrl = "http://www.bing.com";
            const expectedWS = "ws://target:9222";
            target = {
                title: "title",
                url: `${expectedUrl}/`,
                webSocketDebuggerUrl: expectedWS,
            } as IRemoteTargetJson;

            mocks.utils.getListOfTargets!.mockResolvedValue([target]),
            mocks.utils.fixRemoteWebSocket!.mockReturnValueOnce(target);

            const expectedContext = createFakeExtensionContext();
            const newExtension = await import("../src/extension");
            await newExtension.attach(expectedContext, expectedUrl);
            expect(mocks.panel.DevToolsPanel.createOrShow).toHaveBeenCalledWith(
                expectedContext,
                mockTelemetry,
                expectedWS,
                fakeRuntimeConfig,
            );

            // Reverse the mismatched slashes
            target.url = expectedUrl;
            await newExtension.attach(expectedContext, `${expectedUrl}/`);
            expect(mocks.panel.DevToolsPanel.createOrShow).toHaveBeenCalledWith(
                expectedContext,
                mockTelemetry,
                expectedWS,
                fakeRuntimeConfig,
            );
        });

        it("opens devtools against given filter", async () => {
            const expectedUrl = "http://target:9222";
            const expectedWS = "ws://target:9222";
            target = {
                title: "title",
                url: expectedUrl,
                webSocketDebuggerUrl: expectedWS,
            } as IRemoteTargetJson;

            mocks.utils.getListOfTargets!.mockResolvedValue([target]),
            mocks.utils.fixRemoteWebSocket!.mockReturnValueOnce(target);

            const expectedContext = createFakeExtensionContext();
            const newExtension = await import("../src/extension");
            await newExtension.attach(expectedContext, "http://*");
            expect(mocks.panel.DevToolsPanel.createOrShow).toHaveBeenCalledWith(
                expectedContext,
                mockTelemetry,
                expectedWS,
                fakeRuntimeConfig,
            );
        });

        it("shows error if it can't find given target", async () => {
            const expectedMissingUrl = "some non-existent target";

            const newExtension = await import("../src/extension");
            await newExtension.attach(createFakeExtensionContext(), expectedMissingUrl);
            expect(mocks.vscode.window.showErrorMessage).toBeCalledWith(expect.stringContaining(expectedMissingUrl));
        });

        it("shows error if it can't find given target due to missing urls", async () => {
            const expectedUrl = target.url;
            delete target.url;

            const newExtension = await import("../src/extension");
            await newExtension.attach(createFakeExtensionContext(), expectedUrl);
            expect(mocks.vscode.window.showErrorMessage).toBeCalledWith(expect.stringContaining(expectedUrl));
        });

        it("reports telemetry if failed to get targets", async () => {
            mocks.utils.getListOfTargets!.mockResolvedValueOnce([]);

            const newExtension = await import("../src/extension");
            await newExtension.attach(createFakeExtensionContext());
            expect(mockTelemetry.sendTelemetryEvent).toHaveBeenCalled();
        });
    });

    describe("launch", () => {
        const fakeBrowser = {on: () => null};
        let mockReporter: Mocked<Readonly<TelemetryReporter>>;
        let mockUtils: Partial<Mocked<typeof import("../src/utils")>>;
        let mockPanel: Partial<Mocked<typeof import("../src/devtoolsPanel")>>;

        beforeEach(() => {
            mockReporter = createFakeTelemetryReporter();

            mockUtils = {
                createTelemetryReporter: jest.fn((_: ExtensionContext) => mockReporter),
                getBrowserPath: jest.fn().mockResolvedValue("path"),
                getListOfTargets: jest.fn().mockResolvedValue([]),
                getRemoteEndpointSettings: jest.fn().mockReturnValue({
                    hostname: "hostname",
                    port: "port",
                    timeout: 10000,
                    useHttps: false,
                }),
                getRuntimeConfig: jest.fn().mockReturnValue(fakeRuntimeConfig),
                launchBrowser: jest.fn().mockResolvedValue(fakeBrowser),
                openNewTab: jest.fn().mockResolvedValue(null),
                removeTrailingSlash: jest.fn(removeTrailingSlash),
                getJsDebugCDPProxyWebsocketUrl: jest.fn(),
                buttonCode: { launch: '' },
                reportChangedExtensionSetting: jest.fn(),
                reportExtensionSettings: jest.fn(),
                reportUrlType: jest.fn(),
                reportFileExtensionTypes: jest.fn(),
            };

            mockPanel = {
                DevToolsPanel: {
                    createOrShow: jest.fn(),
                } as any,
            };

            jest.doMock("vscode", () => createFakeVSCode(), { virtual: true });
            jest.doMock("../src/utils", () => mockUtils);
            jest.doMock("../src/devtoolsPanel", () => mockPanel);
            jest.resetModules();
        });

        it("calls launch on launch command", async () => {
            const vscode = jest.requireMock("vscode");
            const context = createFakeExtensionContext();

            // Activate the extension
            const newExtension = await import("../src/extension");
            newExtension.activate(context);

            // Get the launch command that was added by extension activation
            const callback = vscode.commands.registerCommand.mock.calls[1][1];
            expect(callback).toBeDefined();

            const result = await callback!(context);
            expect(result).toBeUndefined();
        });

        it("calls launch on launch view command", async () => {
            const vscode = jest.requireMock("vscode");
            const context = createFakeExtensionContext();

            // Activate the extension
            const newExtension = await import("../src/extension");
            newExtension.activate(context);

            // Get the launch command that was added by extension activation
            const callback = vscode.commands.registerCommand.mock.calls[2][1];
            expect(callback).toBeDefined();

            const result = await callback!(context);
            expect(result).toBeUndefined();
        });

        it("creates a telemetry reporter", async () => {
            const target = {
                webSocketDebuggerUrl: "ws://localhost:9222",
            };
            mockUtils.openNewTab!.mockResolvedValueOnce(target as any);
            const newExtension = await import("../src/extension");

            // Activation should create a new reporter
            await newExtension.launch(createFakeExtensionContext());
            expect(mockUtils.createTelemetryReporter).toHaveBeenCalled();
        });

        it("uses user config", async () => {
            const newExtension = await import("../src/extension");

            // Activation should create a new reporter
            const config = {
                port: 9273,
                url: "something",
            };
            await newExtension.launch(createFakeExtensionContext(), "url", config);
            expect(mockUtils.getRemoteEndpointSettings).toHaveBeenCalledWith(config);
        });

        it("shows the devtools against the target", async () => {
            const target = {
                webSocketDebuggerUrl: "ws://localhost:9222",
            };
            mockUtils.openNewTab!.mockResolvedValueOnce(target as any);
            const newExtension = await import("../src/extension");

            await newExtension.launch(createFakeExtensionContext());
            expect(mockPanel.DevToolsPanel!.createOrShow).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                target.webSocketDebuggerUrl,
                fakeRuntimeConfig,
            );
        });

        it("shows the error with no browser path", async () => {
            mockUtils.getBrowserPath!.mockResolvedValueOnce("");

            const vscode = jest.requireMock("vscode");
            const newExtension = await import("../src/extension");

            const result = await newExtension.launch(createFakeExtensionContext());
            expect(result).toBeUndefined();
            expect(vscode.window.showErrorMessage).toHaveBeenCalled();
        });

        it("launches the browser", async () => {
            const target = {
                webSocketDebuggerUrl: "ws://localhost:9222",
            };
            mockUtils.openNewTab!.mockResolvedValueOnce(undefined);
            mockUtils.openNewTab!.mockResolvedValueOnce(target as any);
            const newExtension = await import("../src/extension");

            await newExtension.launch(createFakeExtensionContext());
            expect(mockUtils.launchBrowser).toHaveBeenCalled();
        });

        it("reports the browser type", async () => {
            mockUtils.openNewTab!.mockResolvedValue(undefined);
            const newExtension = await import("../src/extension");

            const tests = [
                { path: "some\\path\\to\\edge.exe -port", exe: "edge" },
                { path: "some\\path\\to\\msedge.exe -pii", exe: "edge" },
                { path: "some\\path\\to\\chrome.exe -hello", exe: "chrome" },
                { path: "some\\path\\to\\brave.exe", exe: "other" },
                { path: "a/mac/path/to/microsoft edge", exe: "edge" },
                { path: "a/mac/path/to/google chrome", exe: "chrome" },
                { path: "a/mac/path/to/some other browser", exe: "other" },
                { path: "some\\mixed/path\\to/a script.sh -some param", exe: "other" },
                { path: "some bad path that we will guess uses edge due to it containing that word", exe: "edge" },
            ];

            for (const t of tests) {
                (mockReporter.sendTelemetryEvent as jest.Mock).mockClear();
                mockUtils.getBrowserPath!.mockResolvedValueOnce(t.path);
                await newExtension.launch(createFakeExtensionContext());
                expect(mockReporter.sendTelemetryEvent).toHaveBeenNthCalledWith(
                    2,
                    "command/launch/browser",
                    expect.objectContaining({ exe: t.exe }),
                );
            }
        });
    });
    describe("attachToCurrentDebugTarget", () => {
        let mocks: {
            panel: any,
            utils: Partial<Mocked<typeof import("../src/utils")>>,
            vscode: any,
        };
        let mockTelemetry: Mocked<Readonly<TelemetryReporter>>;
        const websocketUrl = 'ws://127.0.0.1:9222/uniquePath';

        beforeEach(() => {
            mockTelemetry = createFakeTelemetryReporter();

            mocks = {
                panel: {
                    DevToolsPanel: {
                        createOrShow: jest.fn(),
                    },
                },
                utils: {
                    createTelemetryReporter: jest.fn((_: ExtensionContext) => mockTelemetry),
                    getRuntimeConfig: jest.fn().mockReturnValue(fakeRuntimeConfig),
                    getActiveDebugSessionId: jest.fn().mockReturnValue('vscode-active-debug-session-id'),
                    getJsDebugCDPProxyWebsocketUrl: jest.fn().mockResolvedValue(websocketUrl),
                },
                vscode: createFakeVSCode(),
            };

            jest.doMock("vscode", () => mocks.vscode, { virtual: true });
            jest.doMock("../src/devtoolsPanel", () => mocks.panel);
            jest.doMock("../src/utils", () => mocks.utils);
            jest.resetModules();
        });

        it("creates a telemetry reporter", async () => {
            const newExtension = await import("../src/extension");

            // Activation should create a new reporter
            await newExtension.attachToCurrentDebugTarget(createFakeExtensionContext());
            expect(mocks.utils.createTelemetryReporter).toHaveBeenCalled();
        });

        it("finds the active debug session id if one is not provided", async () => {
            const newExtension = await import("../src/extension");

            await newExtension.attachToCurrentDebugTarget(createFakeExtensionContext());
            expect(mocks.utils.getActiveDebugSessionId).toHaveBeenCalled();
        });

        it("throws an error if there is no active debug session", async () => {
            const expectedErrorMessage = 'No active debug session';

            mocks.utils.getActiveDebugSessionId!.mockReturnValueOnce(undefined);
            const newExtension = await import("../src/extension");

            await newExtension.attachToCurrentDebugTarget(createFakeExtensionContext());
            expect(mocks.vscode.window.showErrorMessage).toBeCalledWith(expect.stringContaining(expectedErrorMessage));
        });

        it("creates a panel with a constructed url", async () => {
            const newExtension = await import("../src/extension");

            await newExtension.attachToCurrentDebugTarget(createFakeExtensionContext());
            expect(mocks.utils.getJsDebugCDPProxyWebsocketUrl).toHaveBeenCalled();
            expect(mocks.panel.DevToolsPanel!.createOrShow).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                websocketUrl,
                {...fakeRuntimeConfig, isJsDebugProxiedCDPConnection: true},
            );
        });

        it("throws an error when unable to resolve the JsDebugCDPProxyWebSocketUrl", async () => {
            mocks.utils.getJsDebugCDPProxyWebsocketUrl?.mockResolvedValueOnce(Error('Error Message'));
            const newExtension = await import("../src/extension");

            await newExtension.attachToCurrentDebugTarget(createFakeExtensionContext());
            expect(mocks.utils.getJsDebugCDPProxyWebsocketUrl).toHaveBeenCalled();
            expect(mocks.vscode.window.showErrorMessage).toBeCalledWith(expect.stringContaining('Error Message'));
        });

        it("shows an error if JsDebugCDPProxyWebSocketUrl is undefined", async () => {
            mocks.utils.getJsDebugCDPProxyWebsocketUrl?.mockResolvedValueOnce(undefined);
            const newExtension = await import("../src/extension");

            await newExtension.attachToCurrentDebugTarget(createFakeExtensionContext());
            expect(mocks.utils.getJsDebugCDPProxyWebsocketUrl).toHaveBeenCalled();
            expect(mocks.vscode.window.showErrorMessage).toBeCalledWith(expect.stringContaining('Unable to attach DevTools to current debug session.'));
        });
    });
});
