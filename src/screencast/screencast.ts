// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScreencastCDPConnection } from './cdp';
import { MouseEventMap, ScreencastInputHandler } from './input';

export class Screencast {
    private cdpConnection = new ScreencastCDPConnection();
    private inputHandler: ScreencastInputHandler;
    private screencastImage = document.createElement('img');

    constructor() {
        // Button to emulate
        const emulateTest = document.createElement('button');
        emulateTest.addEventListener('click', () => {
            const params = {
                width: 400,
                height: 700,
                deviceScaleFactor: 0,
                mobile: false
            }
            this.cdpConnection.sendMessageToBackend('Emulation.setDeviceMetricsOverride', params);
        });
        emulateTest.textContent = "Update Emulation";
        document.body.appendChild(emulateTest);

        // Start screencast
        const startScreencastbutton = document.createElement('button');
        startScreencastbutton.addEventListener('click', () => {
            const screencastParams = {
                format: 'png',
                quality: 100,
                maxWidth: 400,
                maxHeight: 700
            };
            this.cdpConnection.sendMessageToBackend('Page.enable', {});
            this.cdpConnection.sendMessageToBackend('Page.startScreencast', screencastParams);
        });
        startScreencastbutton.textContent = "Start Screencast";
        document.body.appendChild(startScreencastbutton);

        // Screencast image for demo
        this.initScreencastImage();

        this.cdpConnection.registerForEvent('Page.screencastFrame', result => this.onFrame(result));

        this.inputHandler = new ScreencastInputHandler(this.cdpConnection, false);
    }

    private initScreencastImage(): void {
        document.body.appendChild(this.screencastImage);

        for (const eventName of Object.keys(MouseEventMap)) {
            this.screencastImage.addEventListener(eventName, (event) => {
                this.inputHandler.emitMouseEvent(event as MouseEvent);
            });
        }
    }

    private onFrame({data, sessionId}: any): void {
        this.screencastImage.src = 'data:image/png;base64,' + data;
        this.cdpConnection.sendMessageToBackend('Page.screencastFrameAck', {sessionId});
    }
}
