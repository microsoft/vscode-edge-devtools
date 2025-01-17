// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ExtensionContext } from "vscode";
import TelemetryReporter from "@vscode/extension-telemetry";

// Allow unused variables in the mocks to have leading underscore
// tslint:disable: variable-name

export type Mocked<T> = {
    -readonly [P in keyof T]:
    T[P] extends (...args: any[]) => any ? jest.Mock<ReturnType<T[P]>, jest.ArgsType<T[P]>> :
    // tslint:disable-next-line: ban-types
    T[P] extends Function ? jest.Mocked<T[P]> :
    T[P] extends object ? Mocked<T[P]> : T[P];
} & T;

export type Writable<T> = {
    -readonly [P in keyof T]: T[P];
};

/**
 * Create a fake VS Code API object that can be used in tests
 * Since the VS Code API is only available in the extension host you must use this as a virtual mock:
 * E.g. jest.mock("vscode", () => createFakeVSCode(), { virtual: true });
 * Tests can then override the default behavior for their specific scenario by using requireMock:
 * E.g. const mock = await jest.requireMock("vscode"); mock.window.showErrorMessage = () => null;
 */
export function createFakeVSCode() {
    return {
        CompletionItem: jest.fn(),
        CodeLens: jest.fn(),
        DocumentLink: jest.fn(),
        CodeAction: jest.fn(),
        Diagnostic: jest.fn(),
        CallHierarchyItem: jest.fn(),
        CodeActionKind: jest.fn(),
        Disposable: jest.fn(),
        ExtensionMode: {
            Production: 1
        },
        version: '1.60.0',
        EventEmitter: jest.fn(),
        Range: function Range() { /* constructor */ },
        TreeDataProvider: jest.fn(),
        TreeItem: jest.fn(),
        TreeItemCollapsibleState: { None: 0, Collapsed: 1 },
        Uri: {
            file: jest.fn().mockReturnValue({ with: jest.fn() }),
            parse: jest.fn().mockReturnValue({ with: jest.fn() }),
            joinPath: jest.fn().mockReturnValue({ with: jest.fn() })
        },
        ViewColumn: { One: 1, Two: 2 },
        commands: {
            executeCommand: jest.fn(),
            registerCommand: jest.fn(),
        },
        debug: {
            registerDebugConfigurationProvider: jest.fn(),
            activeDebugSession: {
                id: 'vscode-session-debug-id',
                name: 'someName',
            },
            startDebugging: jest.fn().mockResolvedValue(true),
        },
        extensions: {
            getExtension: jest.fn().mockReturnValue({ 
                packageJSON: {
                    version: '1.3.0' // can be any version.
                }
            }),
        },
        env: {
            clipboard: { writeText: jest.fn() },
            machineId: "someValue.machineId",
            remoteName: '',
        },
        languages: {
            createDiagnosticCollection: jest.fn(),
            registerHoverProvider: jest.fn(),
        },
        window: {
            createOutputChannel: jest.fn().mockReturnValue({ appendLine: jest.fn(), dispose: jest.fn() }),
            createWebviewPanel: jest.fn(),
            registerTreeDataProvider: jest.fn(),
            showErrorMessage: jest.fn(),
            showQuickPick: jest.fn().mockResolvedValue(null),
            showTextDocument: jest.fn(),
            showInformationMessage: jest.fn(),
            showWarningMessage: jest.fn().mockResolvedValue({}),
            activeColorTheme: {
                kind: 1
            }
        },
        workspace: {
            createFileSystemWatcher: jest.fn(),
            findFiles: jest.fn(() => {
                return [
                    {path: '/c:/test/main.js'},
                    {path: '/c:/test/styles.css'},
                    {path: '/c:/test/react/test.jsx'},
                    {path: '/c:/.vscode/launch.json'}
                ];
            }),
            getConfiguration: jest.fn(() => {
                return {
                    get: (name: string) => {
                        switch(name) {
                            case "isHeadless":
                                return false;
                            case "mirrorEdits":
                                return true;
                            default:
                                return undefined;
                        }
                    },
                    inspect: (name: string) => {
                        switch(name) {
                            case "isHeadless":
                                return {defaultValue: false};
                            default:
                                return {defaultValue: undefined};
                        }
                    },
                    update: jest.fn(),
                    has: jest.fn()
                };
            }),
            onDidChangeConfiguration: jest.fn(),
            openTextDocument: jest.fn().mockResolvedValue(null),
            workspaceFolders: [
                {
                    uri:  'file:///g%3A/GIT/testPage'
                }
            ],
            fs: {
                writeFile: jest.fn()
            }
        },
    };
}

/**
 * Create a fake VS Code extension context that can be used in tests
 */
export function createFakeExtensionContext() {
    const mockedGlobalState = new Map();
    return {
        extensionPath: "",
        subscriptions: [],
        globalState: mockedGlobalState,
        workspaceState: {
            get: jest.fn(),
            update: jest.fn(),
        },
        asAbsolutePath: jest.fn(),
    } as object as ExtensionContext;
}

/**
 * Create a fake TelemetryReporter that can be used in tests
 */
export function createFakeTelemetryReporter(): Mocked<Readonly<TelemetryReporter>> {
    return {
        dispose: jest.fn(),
        sendTelemetryEvent: jest.fn(),
        sendRawTelemetryEvent: jest.fn(),
        sendDangerousTelemetryEvent: jest.fn(),
        sendTelemetryErrorEvent: jest.fn(),
        sendDangerousTelemetryErrorEvent: jest.fn(),
        onDidChangeTelemetryLevel: jest.fn(),
        telemetryLevel: "all"
    };
}

/**
 * Create a fake node http/https get object that can be used in tests
 * @param getResponse A function that will return the expected response from the get call
 * @param getStatusCode A function that will return the expected status code for the get call
 * @param onMock An optional custom mock to use for the 'on' callback used inside the get call
 */
export function createFakeGet(getResponse: () => string, getStatusCode: () => number, onMock?: jest.Mock) {
    const getOnMock = onMock || jest.fn()
        .mockImplementationOnce((_name, onCallback) => {
            onCallback(getResponse());
        }).mockImplementationOnce((_name, onCallback) => {
            onCallback();
        });

    const fakeGet = (_options: object, callback: (resp: object) => void) => {
        const resp = {
            on: getOnMock,
            statusCode: getStatusCode(),
        };
        callback(resp);
        return {
            on: jest.fn(),
        };
    };

    return { get: fakeGet, on: getOnMock };
}

export function createFakeDebugCore() {
    const urlPathTransformerMock = jest.fn().mockImplementation(() => {
        return {
            launch: jest.fn(),
            fixSource: jest.fn(),
        }
    });
    return { UrlPathTransformer: urlPathTransformerMock }
}

/**
 * Get a callable function from the first invocation of a mock function
 * @param mock The mock function that got passed the callback as an argument
 * @param callbackArgIndex The index of the argument that contains the callback
 */
export function getFirstCallback(mock: jest.Mock, callbackArgIndex: number = 0):
    // Allow us to type the callback as a general 'Function' so that we at least get enough typing to use .call();
    // tslint:disable-next-line: ban-types
    { callback: Function, thisObj: object } {
    return { callback: mock.mock.calls[0][callbackArgIndex], thisObj: mock.mock.instances[0] };
}

export function createFakeLanguageClient() {
    const createFakeLanguageClient = jest.fn().mockImplementation(() => {
        return {
            LanguageClient: function LanguageClient() { /* constructor */ }
        }
    });
    const createFakeLTransportKind = jest.fn().mockImplementation(() => {
        return {
            TransportKind: function TransportKind() { /* constructor */ }
        }
    });
    return { LanguageClient: createFakeLanguageClient,
            TransportKind: createFakeLTransportKind
     }
}
