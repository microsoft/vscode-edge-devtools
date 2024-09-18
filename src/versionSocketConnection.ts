// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { WebSocketEvent } from './common/webviewEvents';
import { CDN_FALLBACK_REVISION } from './utils';

export type IDevToolsPostMessageCallback = (e: WebSocketEvent, message?: string) => void;

export interface BrowserVersionCdpResponse {
   id: number;
   result?: {
       product?: string;
       revision?: string;
   }
}

// Minimum supported version of Edge
export const MIN_SUPPORTED_VERSION = '127.0.2592.0';
export const MIN_SUPPORTED_REVISION = CDN_FALLBACK_REVISION;

export class BrowserVersionDetectionSocket extends EventEmitter {
    private readonly targetUrl: string;
    private socket: WebSocket | undefined;

    constructor(targetUrl: string) {
        super();
        this.targetUrl = targetUrl;
    }

    dispose(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = undefined;
        }
    }

    detectVersion(): void {
        // Connect to target to determine browser version
        this.socket = new WebSocket(this.targetUrl);
        this.socket.onopen = () => this.onOpen();
        this.socket.onmessage = ev => this.onMessage(ev);
    }

    private onOpen(): void {
        // Send request to get browser version
        const requestMessage = {
            id: 0,
            method: 'Browser.getVersion',
            params: {},
        };
        if (this.socket) {
            this.socket.send(JSON.stringify(requestMessage));
        }
    }

    private onMessage(message: { data: WebSocket.Data }) {
        // Determine if this is the browser.getVersion response and send revision hash to devtoolsPanel
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const data = JSON.parse(message.data.toString()) as BrowserVersionCdpResponse;
        this.emit('setCdnParameters', this.calcBrowserRevision(data));
        // Dispose socket after version is determined
        this.dispose();
        return;
    }

    private calcBrowserRevision(data: BrowserVersionCdpResponse): {revision: string, isHeadless: boolean} {
        if (data.id !== 0 || !data.result || !data.result.product && !data.result.revision) {
            return {revision: '', isHeadless: false};
        }
        // product in the form [Edg, HeadlessEdg]/#.#.#.#
        const productParts = (data.result.product as string).split('/');
        const isHeadless = productParts[0].includes('Headless');
        const versionNum = productParts[1];
        const currentVersion = versionNum.split('.').map(part => Number(part));
        const minSupportedVersion = MIN_SUPPORTED_VERSION.split('.').map(part => Number(part));
        const currentRevision = data.result.revision || '';

        for (let i = 0; i < currentVersion.length; i++) {
            // Loop through from Major to minor numbers
            if (currentVersion[i] > minSupportedVersion[i]) {
                return {revision: currentRevision, isHeadless};
            }
            if (currentVersion[i] < minSupportedVersion[i]) {
                return {revision: MIN_SUPPORTED_REVISION, isHeadless};
            }
            // Continue to the next number
        }
        // All numbers matched, return supported revision
        return {revision: currentRevision, isHeadless};
    }
}
