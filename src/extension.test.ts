// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtensionContext } from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { createFakeExtensionContext, createFakeTelemetryReporter, createFakeVSCode, Mocked } from "./test/helpers";
import {
    IRemoteTargetJson,
    IRuntimeConfig,
    removeTrailingSlash,
    SETTINGS_STORE_NAME,
    SETTINGS_VIEW_NAME,
} from "./utils";

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });

describe("extension", () => {
    const fakeRuntimeConfig: Partial<IRuntimeConfig> = {};

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
                getRuntimeConfig: jest.fn(),
                removeTrailingSlash: jest.fn(removeTrailingSlash),
            };
            jest.doMock("./utils", () => mockUtils);
            jest.doMock("./launchDebugProvider");

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

            expect(context.subscriptions.length).toBe(7);
            expect(commandMock).toHaveBeenCalledTimes(6);
            expect(commandMock)
                .toHaveBeenNthCalledWith(1, `${SETTINGS_STORE_NAME}.attach`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(2, `${SETTINGS_STORE_NAME}.launch`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(3, `${SETTINGS_VIEW_NAME}.launch`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(4, `${SETTINGS_VIEW_NAME}.refresh`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(5, `${SETTINGS_VIEW_NAME}.attach`, expect.any(Function));
            expect(commandMock)
                .toHaveBeenNthCalledWith(6, `${SETTINGS_VIEW_NAME}.copyItem`, expect.any(Function));
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

            const refresh = getCommandCallback(3);
            refresh.callback.call(refresh.thisObj);
            expect(mockProviderRefresh).toHaveBeenCalled();

            const attach = getCommandCallback(4);
            attach.callback.call(attach.thisObj, { websocketUrl: "" });
            expect(mockPanelShow).toHaveBeenCalled();

            const copy = getCommandCallback(5);
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
                        timeout: 10000,
                        useHttps: false,
                    }),
                    getRuntimeConfig: jest.fn().mockReturnValue(fakeRuntimeConfig),
                    removeTrailingSlash: jest.fn(removeTrailingSlash),
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
            await newExtension.attach(createFakeExtensionContext());
            expect(mocks.utils.createTelemetryReporter).toHaveBeenCalled();
        });

        it("uses user config", async () => {
            const newExtension = await import("./extension");

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

            const newExtension = await import("./extension");
            await newExtension.attach(createFakeExtensionContext());
            expect(mocks.utils.fixRemoteWebSocket).toBeCalledTimes(expectedCount);
        });

        it("shows quick pick window if no target", async () => {
            const newExtension = await import("./extension");
            await newExtension.attach(createFakeExtensionContext());
            expect(mocks.vscode.window.showQuickPick).toBeCalledTimes(1);
        });

        it("opens devtools against quick pick target", async () => {
            const expectedPick = {
                detail: "http://target:9222",
            };
            mocks.vscode.window.showQuickPick.mockResolvedValueOnce(expectedPick);

            const expectedContext = createFakeExtensionContext();
            const newExtension = await import("./extension");
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
            const newExtension = await import("./extension");
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
            const newExtension = await import("./extension");
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
            const newExtension = await import("./extension");
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

            const newExtension = await import("./extension");
            await newExtension.attach(createFakeExtensionContext(), expectedMissingUrl);
            expect(mocks.vscode.window.showErrorMessage).toBeCalledWith(expect.stringContaining(expectedMissingUrl));
        });

        it("shows error if it can't find given target due to missing urls", async () => {
            const expectedUrl = target.url;
            delete target.url;

            const newExtension = await import("./extension");
            await newExtension.attach(createFakeExtensionContext(), expectedUrl);
            expect(mocks.vscode.window.showErrorMessage).toBeCalledWith(expect.stringContaining(expectedUrl));
        });

        it("reports telemetry if failed to get targets", async () => {
            mocks.utils.getListOfTargets!.mockResolvedValueOnce(null as any);

            const newExtension = await import("./extension");
            await newExtension.attach(createFakeExtensionContext());
            expect(mockTelemetry.sendTelemetryEvent).toHaveBeenCalled();
        });
    });

    describe("launch", () => {
        let mockReporter: Mocked<Readonly<TelemetryReporter>>;
        let mockUtils: Partial<Mocked<typeof import("./utils")>>;
        let mockPanel: Partial<Mocked<typeof import("./devtoolsPanel")>>;

        beforeEach(() => {
            mockReporter = createFakeTelemetryReporter();

            mockUtils = {
                createTelemetryReporter: jest.fn((_: ExtensionContext) => mockReporter),
                getBrowserPath: jest.fn().mockResolvedValue("path"),
                getListOfTargets: jest.fn().mockResolvedValue(null),
                getRemoteEndpointSettings: jest.fn().mockReturnValue({
                    hostname: "hostname",
                    port: "port",
                    timeout: 10000,
                    useHttps: false,
                }),
                getRuntimeConfig: jest.fn().mockReturnValue(fakeRuntimeConfig),
                launchBrowser: jest.fn(),
                openNewTab: jest.fn().mockResolvedValue(null),
                removeTrailingSlash: jest.fn(removeTrailingSlash),
            };

            mockPanel = {
                DevToolsPanel: {
                    createOrShow: jest.fn(),
                } as any,
            };

            jest.doMock("vscode", () => createFakeVSCode(), { virtual: true });
            jest.doMock("./utils", () => mockUtils);
            jest.doMock("./devtoolsPanel", () => mockPanel);
            jest.resetModules();
        });

        it("calls launch on launch command", async () => {
            const vscode = jest.requireMock("vscode");
            const context = createFakeExtensionContext();

            // Activate the extension
            const newExtension = await import("./extension");
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
            const newExtension = await import("./extension");
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
            const newExtension = await import("./extension");

            // Activation should create a new reporter
            await newExtension.launch(createFakeExtensionContext());
            expect(mockUtils.createTelemetryReporter).toHaveBeenCalled();
        });

        it("uses user config", async () => {
            const newExtension = await import("./extension");

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
            const newExtension = await import("./extension");

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
            const newExtension = await import("./extension");

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
            const newExtension = await import("./extension");

            await newExtension.launch(createFakeExtensionContext());
            expect(mockUtils.launchBrowser).toHaveBeenCalled();
        });

        it("reports the browser type", async () => {
            mockUtils.openNewTab!.mockResolvedValue(undefined);
            const newExtension = await import("./extension");

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
});
