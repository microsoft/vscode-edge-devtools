// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Allow unused variables in the mocks to have leading underscore
// tslint:disable: variable-name

import { ExtensionContext } from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";

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
 * Create a fake VSCode API object that can be used in tests
 * Since the VSCode API is only available in the extension host you must use this as a virtual mock:
 * E.g. jest.mock("vscode", () => createFakeVSCode(), { virtual: true });
 * Tests can then override the default behavior for their specific scenario by using requireMock:
 * E.g. const mock = await jest.requireMock("vscode"); mock.window.showErrorMessage = () => null;
 */
export function createFakeVSCode() {
    return {
        EventEmitter: jest.fn(),
        Range: function Range() { /* constructor */ },
        TreeDataProvider: jest.fn(),
        TreeItem: jest.fn(),
        TreeItemCollapsibleState: { None: 0, Collapsed: 1 },
        Uri: {
            file: jest.fn().mockReturnValue({ with: jest.fn() }),
            parse: jest.fn().mockReturnValue({ with: jest.fn() }),
        },
        ViewColumn: { One: 1, Two: 2 },
        commands: {
            registerCommand: jest.fn(),
        },
        debug: {
            registerDebugConfigurationProvider: jest.fn(),
        },
        env: {
            clipboard: { writeText: jest.fn() },
            machineId: "someValue.machineId",
        },
        window: {
            createWebviewPanel: jest.fn(),
            registerTreeDataProvider: jest.fn(),
            showErrorMessage: jest.fn(),
            showQuickPick: jest.fn().mockResolvedValue(null),
            showTextDocument: jest.fn(),
        },
        workspace: {
            getConfiguration: jest.fn(() => {
                return { get: (name: string) => "" };
            }),
            onDidChangeConfiguration: jest.fn(),
            openTextDocument: jest.fn().mockResolvedValue(null),
        },
    };
}

/**
 * Create a fake VSCode extension context that can be used in tests
 */
export function createFakeExtensionContext() {
    return {
        extensionPath: "",
        subscriptions: [],
        workspaceState: {
            get: jest.fn(),
            update: jest.fn(),
        },
    } as object as ExtensionContext;
}

/**
 * Create a fake TelemetryReporter that can be used in tests
 */
export function createFakeTelemetryReporter(): Mocked<Readonly<TelemetryReporter>> {
    return {
        dispose: jest.fn(),
        sendTelemetryEvent: jest.fn(),
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
