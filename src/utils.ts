// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as http from "http";
import * as https from "https";
import * as url from "url";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import packageJson from "../package.json";
import DebugTelemetryReporter from "./debugTelemetryReporter";

export const SETTINGS_STORE_NAME = "vscode-edge-devtools";
export const SETTINGS_DEFAULT_USE_HTTPS = false;
export const SETTINGS_DEFAULT_HOSTNAME = "localhost";
export const SETTINGS_DEFAULT_PORT = 9222;
export const SETTINGS_WEBVIEW_NAME = "DevTools";
export const SETTINGS_PREF_NAME = "devtools-preferences";
export const SETTINGS_PREF_DEFAULTS = {
    screencastEnabled: false,
    uiTheme: '"dark"',
};

export interface IRemoteTargetJson {
    description: string;
    devtoolsFrontendUrl: string;
    faviconUrl: string;
    id: string;
    title: string;
    type: string;
    url: string;
    webSocketDebuggerUrl: string;
}

/**
 * Fetch the response for the given uri.
 * @param uri The uri to request
 * @param options The options that should be used for the request
 */
export function fetchUri(uri: string, options: https.RequestOptions = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(uri);
        const get = (parsedUrl.protocol === "https:" ? https.get : http.get);
        options = {
            rejectUnauthorized: false,
            ...parsedUrl,
            ...options,
        } as http.RequestOptions;

        get(options, (response) => {
            let responseData = "";
            response.on("data", (chunk) => {
                responseData += chunk.toString();
            });
            response.on("end", () => {
                // Sometimes the 'error' event is not fired. Double check here.
                if (response.statusCode === 200) {
                    resolve(responseData);
                } else {
                    reject(new Error(responseData.trim()));
                }
            });
        }).on("error", (e) => {
            reject(e);
        });
    });
}

/**
 * Replace the json target payload's websocket address with the ones used to attach.
 * This makes sure that even on a remote machine with custom port forwarding, we will always connect to the address
 * specified in the options rather than what the remote Edge is actually using on the other machine.
 * If a websocket address is not found, the target will be returned unchanged.
 * @param remoteAddress The address of the remote instance of Edge
 * @param remotePort The port used by the remote instance of Edge
 * @param target The target object from the json/list payload
 */
export function fixRemoteWebSocket(
    remoteAddress: string,
    remotePort: number,
    target: IRemoteTargetJson): IRemoteTargetJson {
    if (target.webSocketDebuggerUrl) {
        const addressMatch = target.webSocketDebuggerUrl.match(/ws:\/\/([^/]+)\/?/);
        if (addressMatch) {
            const replaceAddress = `${remoteAddress}:${remotePort}`;
            target.webSocketDebuggerUrl = target.webSocketDebuggerUrl.replace(addressMatch[1], replaceAddress);
        }
    }
    return target;
}

/**
 * Query the list endpoint and return the parsed Json result which is the list of targets
 * @param hostname The remote hostname
 * @param port The remote port
 */
export async function getListOfTargets(hostname: string, port: number, useHttps: boolean): Promise<any[]> {
    const checkDiscoveryEndpoint = (uri: string) => {
        return fetchUri(uri, { headers: { Host: "localhost" } });
    };

    const protocol = (useHttps ? "https" : "http");

    let jsonResponse: string;
    try {
        jsonResponse = await checkDiscoveryEndpoint(`${protocol}://${hostname}:${port}/json/list`);
    } catch (ex) {
        jsonResponse = await checkDiscoveryEndpoint(`${protocol}://${hostname}:${port}/json`);
    }

    let result: IRemoteTargetJson[];
    try {
        result = JSON.parse(jsonResponse);
    } catch (ex) {
        vscode.window.showErrorMessage(`Could not list targets: ${ex.message}`);
        result = [];
    }
    return result;
}

/**
 * Get the remote endpoint settings from the vscode configuration
 */
export function getRemoteEndpointSettings(): { hostname: string, port: number, useHttps: boolean } {
    const settings = vscode.workspace.getConfiguration(SETTINGS_STORE_NAME);
    const hostname: string = settings.get("hostname") || SETTINGS_DEFAULT_HOSTNAME;
    const port: number = settings.get("port") || SETTINGS_DEFAULT_PORT;
    const useHttps: boolean = settings.get("useHttps") || SETTINGS_DEFAULT_USE_HTTPS;

    return { hostname, port, useHttps };
}

/**
 * Create a telemetry reporter that can be used for this extension
 * @param context The vscode context
 */
export function createTelemetryReporter(context: vscode.ExtensionContext): Readonly<TelemetryReporter> {
    if (packageJson && vscode.env.machineId !== "someValue.machineId") {
        // Use the real telemetry reporter
        return new TelemetryReporter(packageJson.name, packageJson.version, packageJson.aiKey);
    } else {
        // Fallback to a fake telemetry reporter
        return new DebugTelemetryReporter();
    }
}
