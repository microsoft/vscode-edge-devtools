// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScreencastCDPConnection } from './cdp';
import { MouseEventMap, ScreencastInputHandler } from './input';

export class Screencast {
    private cdpConnection = new ScreencastCDPConnection();
    private inputHandler: ScreencastInputHandler;
    private reloadButton: HTMLButtonElement;
    private rotateButton: HTMLButtonElement;
    private urlInput: HTMLInputElement;
    private screencastImage: HTMLImageElement;
    private screencastWrapper: HTMLElement;
    private deviceSelect: HTMLSelectElement;
    private mobileCheckbox: HTMLInputElement;
    private width = 0;
    private height = 0;

    constructor() {
        this.reloadButton = document.getElementById('reload') as HTMLButtonElement;
        this.rotateButton = document.getElementById('rotate') as HTMLButtonElement;
        this.urlInput = document.getElementById('url') as HTMLInputElement;
        this.mobileCheckbox = document.getElementById('mobile') as HTMLInputElement;
        this.screencastImage = document.getElementById('canvas') as HTMLImageElement;
        this.screencastWrapper = document.getElementById('canvas-wrapper') as HTMLElement;
        this.deviceSelect = document.getElementById('device') as HTMLSelectElement;

        this.reloadButton.addEventListener('click', () => this.onReloadClick());
        this.rotateButton.addEventListener('click', () => this.onRotateClick());
        this.urlInput.addEventListener('keydown', event => this.onUrlKeyDown(event));

        // Screencast image for demo
        this.initScreencastImage();
        
        this.deviceSelect.addEventListener('change', () => {
            switch (this.deviceSelect.value) {
                case 'fill':
                    this.width = 0;
                    this.height = 0;
                    this.screencastWrapper.classList.add('fill');
                    break;
                case 'phone':
                    this.width = 414;
                    this.height = 750;
                    this.screencastWrapper.classList.remove('fill');
                    break;
            }
            this.updateEmulation();
        });

        this.cdpConnection.registerForEvent('Page.screencastFrame', result => this.onFrame(result));

        this.inputHandler = new ScreencastInputHandler(this.cdpConnection);

        this.mobileCheckbox.addEventListener('input', () => {
            // TODO: flip between mobile/desktop emulation
        });

        this.cdpConnection.sendMessageToBackend('Page.enable', {});
        let resizeTimeout = 0 as unknown as NodeJS.Timeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.updateEmulation(), 100);
        });
        
        // Start screencast
        this.updateEmulation();
    }

    private updateEmulation(): void {
        // Button to emulate
        const params = {
            width: this.width || this.screencastWrapper.offsetWidth,
            height: this.height || this.screencastWrapper.offsetHeight,
            deviceScaleFactor: 0,
            mobile: this.mobileCheckbox.checked
        }
        this.cdpConnection.sendMessageToBackend('Emulation.setDeviceMetricsOverride', params);
        this.updateScreencast();
    }

    private updateScreencast(): void {
        const screencastParams = {
            format: 'png',
            quality: 100,
            maxWidth: this.width || this.screencastWrapper.offsetWidth,
            maxHeight: this.height || this.screencastWrapper.offsetHeight
        };
        this.cdpConnection.sendMessageToBackend('Page.startScreencast', screencastParams);
    }

    private initScreencastImage(): void {
        for (const eventName of Object.keys(MouseEventMap)) {
            this.screencastImage.addEventListener(eventName, (event) => {
                const scale = this.screencastImage.offsetWidth / this.screencastImage.naturalWidth;
                if (this.mobileCheckbox.checked) {
                    this.inputHandler.emitTouchFromMouseEvent(event as MouseEvent, scale);
                } else {
                    this.inputHandler.emitMouseEvent(event as MouseEvent, scale);
                }
            });
        }
    }

    private onReloadClick(): void {
        this.cdpConnection.sendMessageToBackend('Page.reload', {});
    }

    private onRotateClick(): void {
        const width = this.height;
        const height = this.width;
        this.width = width;
        this.height = height;
        this.updateEmulation();
    }

    private onUrlKeyDown(event: KeyboardEvent): void {
        const url = this.urlInput.value;
        if (event.key === 'Enter' && url) {
            this.cdpConnection.sendMessageToBackend('Page.navigate', {url});
        }
    }

    private onFrame({data, sessionId}: any): void {
        this.screencastImage.src = 'data:image/png;base64,' + data;
        this.screencastImage.style.width = `${this.screencastImage.naturalWidth}px`;
        this.cdpConnection.sendMessageToBackend('Page.screencastFrameAck', {sessionId});
    }
}
