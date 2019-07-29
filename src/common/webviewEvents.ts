// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type WebviewEvent = "getState" | "getUrl" | "openInEditor" | "ready" | "setState" | "telemetry" | "websocket";
export const webviewEventNames: WebviewEvent[] = [
    "getState",
    "getUrl",
    "openInEditor",
    "ready",
    "setState",
    "telemetry",
    "websocket",
];

export type WebSocketEvent = "open" | "close" | "error" | "message";
export const webSocketEventNames: WebSocketEvent[] = [
    "open",
    "close",
    "error",
    "message",
];

export type TelemetryEvent = "enumerated" | "performance" | "error";

export interface ITelemetryMeasures { [key: string]: number; }
export interface ITelemetryProps { [key: string]: string; }

export interface ITelemetryDataNumber {
    event: "enumerated" | "performance";
    name: string;
    data: number;
}
export interface ITelemetryDataObject {
    event: "error";
    name: string;
    data: object;
}
export type TelemetryData = ITelemetryDataNumber | ITelemetryDataObject;

export interface IOpenEditorData {
    url: string;
    line: number;
    column: number;
    ignoreTabChanges: boolean;
}

/**
 * Parse out the WebviewEvents type from a message and call the appropriate emit event
 * @param message The message to parse
 * @param emit The emit callback to invoke with the event and args
 */
export function parseMessageFromChannel(
    message: string,
    emit: (eventName: WebviewEvent, args: string) => boolean): boolean {
    for (const e of webviewEventNames) {
        if (message.substr(0, e.length) === e && message[e.length] === ":") {
            emit(e, message.substr(e.length + 1));
            return true;
        }
    }

    return false;
}

/**
 * Encode an event and arguments into a string and then post that message across via the
 * supplied object containing the postMessage function.
 * The message can be parsed on the other side using parseMessageFromChannel
 * @param postMessageObject The object which contains the postMessage function
 * @param eventType The type of the message to post
 * @param args The argument object to encode and post
 * @param origin The origin (if any) to use with the postMessage call
 */
export function encodeMessageForChannel(
    postMessageCallback: (message: string) => void,
    eventType: WebviewEvent,
    args?: object) {
    const message = `${eventType}:${JSON.stringify(args)}`;
    postMessageCallback(message);
}
