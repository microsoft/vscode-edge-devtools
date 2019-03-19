// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Allow unused variables in the mocks to have leading underscore
// tslint:disable: variable-name

import { ExtensionContext } from "vscode";

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
