// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as http from "http";
import * as https from "https";
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

            const fixed = utils.fixRemoteWebSocket("localhost", 9222, target);
            expect(fixed.webSocketDebuggerUrl).toBe("ws://localhost:9222/devtools/page/ABC");
        });

        it("replaces no port with the specified port correctly", async () => {
            const target = {
                webSocketDebuggerUrl: "ws://localhost/devtools/page/DEF",
            } as utils.IRemoteTargetJson;

            const fixed = utils.fixRemoteWebSocket("remote", 9222, target);
            expect(fixed.webSocketDebuggerUrl).toBe("ws://remote:9222/devtools/page/DEF");
        });

        it("makes no changes to invalid websocket url", async () => {
            const target = {
                webSocketDebuggerUrl: "unknown websocket",
            } as utils.IRemoteTargetJson;

            const fixed = utils.fixRemoteWebSocket("localhost", 9222, target);
            expect(fixed.webSocketDebuggerUrl).toBe("unknown websocket");
        });
    });

    describe("fetchUri", () => {
        (http.get as jest.Mock).mockClear();
        (https.get as jest.Mock).mockClear();

        const expectedResponse = "[{},{},{}]";
        let getOnMock: jest.Mock;
        let fakeGet: (options: any, callback?: (res: any) => void) => any;
        let fakeStatusCode = 200;

        beforeEach(() => {
            getOnMock = jest.fn()
                .mockImplementationOnce((_name, onCallback) => {
                    onCallback(expectedResponse);
                }).mockImplementationOnce((_name, onCallback) => {
                    onCallback();
                });

            fakeGet = (_options: any, callback: (resp: any) => void) => {
                const resp = {
                    on: getOnMock,
                    statusCode: fakeStatusCode,
                };
                callback(resp);
                return {
                    on: jest.fn(),
                };
            };
        });

        it("uses 'get' response object correctly for chunking", async () => {
            const httpGetMock = (http.get as jest.Mock);
            httpGetMock.mockImplementation(fakeGet);

            await utils.fetchUri("http://somedomain.com/json/list");
            expect(getOnMock).toHaveBeenNthCalledWith(1, "data", expect.any(Function));
            expect(getOnMock).toHaveBeenNthCalledWith(2, "end", expect.any(Function));
        });

        it("requests http url correctly", async () => {
            const httpGetMock = (http.get as jest.Mock);
            httpGetMock.mockImplementation(fakeGet);

            const response = await utils.fetchUri("http://fake-http-url/json/list");
            expect(response).toBe(expectedResponse);
        });

        it("requests https url correctly", async () => {
            const httpsGetMock = (https.get as jest.Mock);
            httpsGetMock.mockImplementation(fakeGet);

            const response = await utils.fetchUri("https://fake-https-url/json/list");
            expect(response).toBe(expectedResponse);
        });

        it("rejects 'get' errors correctly", async () => {
            let onErrorCallback: (e: string) => void;

            // Setup the get mock so that we store the on("error") callback
            const httpGetMock = (http.get as jest.Mock);
            const mockOnReturn = jest.fn((_name, callback) => {
                onErrorCallback = callback;
            });
            httpGetMock.mockImplementationOnce((_options: any, _callback: (resp: any) => void) => {
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
            onErrorCallback(expectedErrorReason);

            // Ensure that the fetchUri call rejects with the expected reason
            await expect(responsePromise).rejects.toBe(expectedErrorReason);
            expect(promiseRejectCount).toEqual(1);
            expect(mockOnReturn).toBeCalledWith("error", expect.any(Function));
        });

        it("rejects 'statusCode' errors correctly", async () => {
            let onEndCallback: (e: string) => void;

            // Setup the get mock so that we store the on("end") callback
            fakeStatusCode = 404;
            getOnMock = jest.fn()
                .mockImplementationOnce((_name, onCallback) => {
                    onCallback(expectedResponse);
                }).mockImplementationOnce((_name, onCallback) => {
                    onEndCallback = onCallback;
                });
            const httpGetMock = (http.get as jest.Mock);
            httpGetMock.mockImplementation(fakeGet);

            // Call the fetchUri api and handle the rejection so that debugging won't stop on an
            // unhandled exception
            const responsePromise = utils.fetchUri("http://fake-http-url/json/list").catch((e) => {
                return Promise.reject(e);
            });

            // Trigger the end callback to simulate an status code of fakeStatusCode 404
            expect(onEndCallback).toBeDefined();
            onEndCallback(expectedResponse);

            // Ensure that the fetchUri call rejects with the current response
            await expect(responsePromise).rejects.toThrow(expectedResponse);
        });
    });

    describe("getListOfTargets", () => {
        let expectedListResponse = "";

        beforeEach(() => {
            (http.get as jest.Mock).mockClear();
            (https.get as jest.Mock).mockClear();

            const getOnMock = jest.fn()
                .mockImplementationOnce((name, onCallback) => {
                    onCallback(expectedListResponse);
                }).mockImplementationOnce((name, onCallback) => {
                    onCallback();
                });

            const fakeGet = (options: any, callback: (resp: any) => void) => {
                const resp = {
                    on: getOnMock,
                    statusCode: 200,
                };
                callback(resp);
                return {
                    on: jest.fn(),
                };
            };

            (http.get as jest.Mock).mockImplementation(fakeGet);
        });

        it("returns a parsed json result", async () => {
            const expectedTargets = [{ title: "1" }, { title: "2" }];
            expectedListResponse = JSON.stringify(expectedTargets);

            const targets = await utils.getListOfTargets("localhost", 9222);
            expect(targets).toEqual(expect.arrayContaining(expectedTargets));
        });

        it("returns undefined for bad json", async () => {
            expectedListResponse = "Error: 404";

            const targets = await utils.getListOfTargets("localhost", 9222);
            expect(targets).toBeUndefined();
        });

        it("uses correct remote address", async () => {
            const expectedHostName = "127.0.0.1";
            const expectedPort = 8080;
            const httpGetMock = (http.get as jest.Mock);

            await utils.getListOfTargets(expectedHostName, expectedPort);
            expect(httpGetMock).toHaveBeenCalledWith(expect.objectContaining({
                hostname: expectedHostName,
                port: "" + expectedPort,
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

            httpGetMock.mockImplementationOnce((_options: any, callback: (resp: any) => void) => {
                return {
                    on: mockOn,
                };
            }).mockImplementationOnce((_options: any, callback: (resp: any) => void) => {
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
            const targets = await utils.getListOfTargets("localhost", 9222);
            expect(targets).toEqual(expect.arrayContaining(expectedTargets));
            expect(httpGetMock)
                .toHaveBeenNthCalledWith(1, expect.objectContaining({ path: "/json/list" }), expect.any(Function));
            expect(httpGetMock)
                .toHaveBeenNthCalledWith(2, expect.objectContaining({ path: "/json" }), expect.any(Function));
        });
    });

    describe("getRemoteEndpointSettings", () => {
        it("returns the stored settings", async () => {
            const expectedHostName = "someHost";
            const expectedPort = 9999;

            const configMock = jest.fn().mockReturnValue({
                get: (name: string) => (name === "hostname" ? expectedHostName : expectedPort),
            });
            const mockVSCode = { workspace: { getConfiguration: configMock } };

            jest.doMock("vscode", () => mockVSCode, { virtual: true });
            jest.resetModules();

            const newUtils = await import("./utils");
            const { hostname, port } = newUtils.getRemoteEndpointSettings();
            expect(hostname).toBe(expectedHostName);
            expect(port).toBe(expectedPort);
            expect(configMock).toBeCalledWith(newUtils.SETTINGS_STORE_NAME);
        });

        it("uses correct fallbacks on failure", async () => {
            const configMock = jest.fn().mockReturnValue({
                get: (name: string) => null as string,
            });
            const mockVSCode = { workspace: { getConfiguration: configMock } };

            jest.doMock("vscode", () => mockVSCode, { virtual: true });
            jest.resetModules();

            const newUtils = await import("./utils");
            const { hostname, port } = newUtils.getRemoteEndpointSettings();
            expect(hostname).toBe("localhost");
            expect(port).toBe(9222);
        });
    });
});
