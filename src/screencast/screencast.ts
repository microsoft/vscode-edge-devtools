// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScreencastCDPConnection } from './cdp';
import { MouseEventMap, ScreencastInputHandler } from './input';

export class Screencast {
    private cdpConnection = new ScreencastCDPConnection();
    private inputHandler: ScreencastInputHandler;
    private screencastImage: HTMLImageElement;
    private deviceSelect: HTMLSelectElement;
    private mobileCheckbox: HTMLInputElement;

    constructor() {
        this.screencastImage = document.getElementById('canvas') as HTMLImageElement;
        this.deviceSelect = document.getElementById('device') as HTMLSelectElement;
        this.mobileCheckbox = document.getElementById('mobile') as HTMLInputElement;

        // Screencast image for demo
        this.initScreencastImage();
        
        this.deviceSelect.addEventListener('change', () => this.updateEmulation());

        this.cdpConnection.registerForEvent('Page.screencastFrame', result => this.onFrame(result));

        this.inputHandler = new ScreencastInputHandler(this.cdpConnection, false);

        this.mobileCheckbox.addEventListener('input', () => {
            // TODO: flip between mobile/desktop emulation
        });

        this.cdpConnection.sendMessageToBackend('Page.enable', {});
        window.addEventListener('resize', () => this.updateEmulation());
        
        // Start screencast
        this.updateEmulation();
    }

    private updateEmulation(): void {
        // Button to emulate
        const params = {
            width: this.screencastImage.offsetWidth || 400,
            height: this.screencastImage.offsetHeight || 700,
            deviceScaleFactor: 0,
            mobile: false
        }
        this.cdpConnection.sendMessageToBackend('Emulation.setDeviceMetricsOverride', params);
        this.updateScreencast();
    }

    private updateScreencast(): void {
        const screencastParams = {
            format: 'png',
            quality: 100,
            maxWidth: this.screencastImage.offsetWidth || 400,
            maxHeight: this.screencastImage.offsetHeight || 700
        };
        this.cdpConnection.sendMessageToBackend('Page.startScreencast', screencastParams);
    }

    private initScreencastImage(): void {
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
