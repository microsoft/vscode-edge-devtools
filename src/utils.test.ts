// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Allow unused variables in the mocks to have leading underscore
// tslint:disable: variable-name

import * as http from "http";
import * as https from "https";
import { createFakeGet } from "./test/helpers";
import * as utils from "./utils";

jest.mock("http");
jest.mock("https");
jest.mock("vscode", () => "mock", { virtual: true });

describe("utils", () => {
    describe("fixRemoteWebSocket", () => {
        it("replaces address and port correctly", async () => {
            const target = {
                webSocketDebuggerUrl: "ws://127.0.0.1:1000/devtools/page/ABC",
            } as utils.IRemoteTargetJson;

            const expectedHostName = "machine";
            const expectedPort = 8080;
            const fixed = utils.fixRemoteWebSocket(expectedHostName, expectedPort, target);
            expect(fixed.webSocketDebuggerUrl).toBe(`ws://${expectedHostName}:${expectedPort}/devtools/page/ABC`);
        });

        it("replaces no port with the specified port correctly", async () => {
            const target = {
                webSocketDebuggerUrl: "ws://localhost/devtools/page/DEF",
            } as utils.IRemoteTargetJson;

            const expectedHostName = "remote";
            const expectedPort = 8081;
            const fixed = utils.fixRemoteWebSocket(expectedHostName, expectedPort, target);
            expect(fixed.webSocketDebuggerUrl).toBe(`ws://${expectedHostName}:${expectedPort}/devtools/page/DEF`);
        });

        it("makes no changes to invalid websocket url", async () => {
            const expectedWSUrl = "unknown websocket";
            const target = {
                webSocketDebuggerUrl: expectedWSUrl,
            } as utils.IRemoteTargetJson;

            const fixed = utils.fixRemoteWebSocket("localhost", 9222, target);
            expect(fixed.webSocketDebuggerUrl).toBe(expectedWSUrl);
        });
    });

    describe("fetchUri", () => {
        beforeEach(() => {
            (http.get as jest.Mock).mockClear();
            (https.get as jest.Mock).mockClear();
        });

        it("uses 'get' response object correctly for chunking", async () => {
            const fake = createFakeGet(() => "[]", () => 200);
            (http.get as jest.Mock).mockImplementation(fake.get);

            await utils.fetchUri("http://somedomain.com/json/list");
            expect(fake.on).toHaveBeenNthCalledWith(1, "data", expect.any(Function));
            expect(fake.on).toHaveBeenNthCalledWith(2, "end", expect.any(Function));
        });

        it("requests http url correctly", async () => {
            const expectedHttpResponse = "[{},{}]";
            (http.get as jest.Mock).mockImplementation(
                createFakeGet(() => expectedHttpResponse, () => 200).get);

            const response = await utils.fetchUri("http://fake-http-url/json/list");
            expect(response).toBe(expectedHttpResponse);
        });

        it("requests https url correctly", async () => {
            const expectedHttpsResponse = "[{}]";
            (https.get as jest.Mock).mockImplementation(
                createFakeGet(() => expectedHttpsResponse, () => 200).get);

            const response = await utils.fetchUri("https://fake-https-url/json/list");
            expect(response).toBe(expectedHttpsResponse);
        });

        it("rejects 'get' errors correctly", async () => {
            let onErrorCallback: ((e: string) => void) | undefined;

            // Setup the get mock so that we store the on("error") callback
            const httpGetMock = (http.get as jest.Mock);
            const mockOnReturn = jest.fn((_name, callback) => {
                onErrorCallback = callback;
            });
            httpGetMock.mockImplementationOnce((_options: object, _callback: (resp: object) => void) => {
                return {
                    on: mockOnReturn,
                };
            });

            // Call the fetchUri api and handle the rejection so that debugging won't stop on an
            // unhandled exception
            let promiseRejectCount = 0;
            const responsePromise = utils.fetchUri("http://fake-http-url/json/list").catch((e) => {
                promiseRejectCount++;
                return Promise.reject(e);
            });

            // Trigger the error callback to simulate an http get error
            const expectedErrorReason = "some error";
            expect(onErrorCallback).toBeDefined();
            onErrorCallback!(expectedErrorReason);

            // Ensure that the fetchUri call rejects with the expected reason
            await expect(responsePromise).rejects.toBe(expectedErrorReason);
            expect(promiseRejectCount).toEqual(1);
            expect(mockOnReturn).toBeCalledWith("error", expect.any(Function));
        });

        it("rejects 'statusCode' errors correctly", async () => {
            let onEndCallback: ((e: string) => void) | undefined;

            // Setup the get mock so that we store the on("end") callback
            const expectedResponse = "";
            const getOnMock = jest.fn()
                .mockImplementationOnce((_name, onCallback) => {
                    onCallback(expectedResponse);
                }).mockImplementationOnce((_name, onCallback) => {
                    onEndCallback = onCallback;
                });
            const fake = createFakeGet(
                () => expectedResponse,
                () => 404,
                getOnMock,
            );
            const httpGetMock = (http.get as jest.Mock);
            httpGetMock.mockImplementation(fake.get);

            // Call the fetchUri api and handle the rejection so that debugging won't stop on an
            // unhandled exception
            const responsePromise = utils.fetchUri("http://fake-http-url/json/list").catch((e) => {
                return Promise.reject(e);
            });

            // Trigger the end callback to simulate an status code of fakeStatusCode 404
            expect(onEndCallback).toBeDefined();
            onEndCallback!(expectedResponse);

            // Ensure that the fetchUri call rejects with the current response
            await expect(responsePromise).rejects.toThrow(expectedResponse);
        });
    });

    describe("getListOfTargets", () => {
        let expectedListResponse = "";

        beforeEach(() => {
            (http.get as jest.Mock).mockClear();
            (http.get as jest.Mock).mockImplementation(
                createFakeGet(() => expectedListResponse, () => 200).get);

            (https.get as jest.Mock).mockClear();
            (https.get as jest.Mock).mockImplementation(
                createFakeGet(() => expectedListResponse, () => 200).get);
        });

        it("returns a parsed json result", async () => {
            const expectedTargets = [{ title: "1" }, { title: "2" }];
            expectedListResponse = JSON.stringify(expectedTargets);

            const targets = await utils.getListOfTargets(
                utils.SETTINGS_DEFAULT_HOSTNAME,
                utils.SETTINGS_DEFAULT_PORT,
                utils.SETTINGS_DEFAULT_USE_HTTPS);
            expect(targets).toEqual(expect.arrayContaining(expectedTargets));
        });

        it("returns empty array for bad json", async () => {
            expectedListResponse = "Error: 404";

            const targets = await utils.getListOfTargets(
                utils.SETTINGS_DEFAULT_HOSTNAME,
                utils.SETTINGS_DEFAULT_PORT,
                utils.SETTINGS_DEFAULT_USE_HTTPS);
            expect(targets).toEqual([]);
        });

        it("uses correct remote address", async () => {
            const expectedHostName = "127.0.0.1";
            const expectedPort = 8080;
            const httpGetMock = (http.get as jest.Mock);

            await utils.getListOfTargets(expectedHostName, expectedPort, utils.SETTINGS_DEFAULT_USE_HTTPS);
            expect(httpGetMock).toHaveBeenCalledWith(expect.objectContaining({
                hostname: expectedHostName,
                port: "" + expectedPort,
            }), expect.any(Function));
        });

        it("uses correct protocol", async () => {
            const httpsGetMock = (https.get as jest.Mock);
            const httpGetMock = (http.get as jest.Mock);

            // HTTPS
            await utils.getListOfTargets(
                utils.SETTINGS_DEFAULT_HOSTNAME,
                utils.SETTINGS_DEFAULT_PORT,
                /* useHttps = */ true);
            expect(httpsGetMock).toHaveBeenCalledWith(expect.objectContaining({
                protocol: "https:",
            }), expect.any(Function));

            // HTTP
            await utils.getListOfTargets(
                utils.SETTINGS_DEFAULT_HOSTNAME,
                utils.SETTINGS_DEFAULT_PORT,
                /* useHttps = */ false);
            expect(httpGetMock).toHaveBeenCalledWith(expect.objectContaining({
                protocol: "http:",
            }), expect.any(Function));
        });

        it("retries with alternative endpoint if the first one fails", async () => {
            const expectedTargets = [{ title: "1" }];
            expectedListResponse = JSON.stringify(expectedTargets);

            // Setup the get mock so that we fail the first get but succeed on subsequent ones
            const httpGetMock = (http.get as jest.Mock);
            httpGetMock.mockClear();

            const mockOn = jest.fn()
                .mockImplementationOnce((_name, callback) => {
                    setTimeout(() => callback("error"), 0); // Async to allow the await to work
                }).mockImplementationOnce((_name, onCallback) => {
                    onCallback(expectedListResponse);
                }).mockImplementationOnce((_name, onCallback) => {
                    onCallback();
                });

            httpGetMock.mockImplementationOnce((_options: object, callback: (resp: object) => void) => {
                return {
                    on: mockOn,
                };
            }).mockImplementationOnce((_options: object, callback: (resp: object) => void) => {
                const resp = {
                    on: mockOn,
                    statusCode: 200,
                };
                callback(resp);
                return {
                    on: jest.fn(),
                };
            });

            // Ensure that calling getListOfTargets ends up calling both json endpoints
            const targets = await utils.getListOfTargets(
                utils.SETTINGS_DEFAULT_HOSTNAME,
                utils.SETTINGS_DEFAULT_PORT,
                utils.SETTINGS_DEFAULT_USE_HTTPS);
            expect(targets).toEqual(expect.arrayContaining(expectedTargets));
            expect(httpGetMock)
                .toHaveBeenNthCalledWith(1, expect.objectContaining({ path: "/json/list" }), expect.any(Function));
            expect(httpGetMock)
                .toHaveBeenNthCalledWith(2, expect.objectContaining({ path: "/json" }), expect.any(Function));
        });
    });

    describe("getRemoteEndpointSettings", () => {
        it("returns the stored settings", async () => {
            const expected = {
                hostname: "someHost",
                port: 9999,
                useHttps: true,
            };

            const configMock = jest.fn().mockReturnValue({
                get: (name: string) => (expected as any)[name],
            });
            const mockVSCode = { workspace: { getConfiguration: configMock } };

            jest.doMock("vscode", () => mockVSCode, { virtual: true });
            jest.resetModules();

            const newUtils = await import("./utils");
            const { hostname, port, useHttps } = newUtils.getRemoteEndpointSettings();
            expect(hostname).toBe(expected.hostname);
            expect(port).toBe(expected.port);
            expect(useHttps).toBe(expected.useHttps);
            expect(configMock).toBeCalledWith(newUtils.SETTINGS_STORE_NAME);
        });

        it("uses correct fallbacks on failure", async () => {
            const configMock = jest.fn().mockReturnValue({
                get: (name: string) => "",
            });
            const mockVSCode = { workspace: { getConfiguration: configMock } };

            jest.doMock("vscode", () => mockVSCode, { virtual: true });
            jest.resetModules();

            const newUtils = await import("./utils");
            const { hostname, port, useHttps } = newUtils.getRemoteEndpointSettings();
            expect(hostname).toBe(utils.SETTINGS_DEFAULT_HOSTNAME);
            expect(port).toBe(utils.SETTINGS_DEFAULT_PORT);
            expect(useHttps).toBe(utils.SETTINGS_DEFAULT_USE_HTTPS);
        });
    });
});
