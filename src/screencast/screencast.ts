// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ErrorCodes } from '../common/errorCodes';
import { encodeMessageForChannel, TelemetryData } from '../common/webviewEvents';
import { ScreencastCDPConnection, vscode } from './cdp';
import { MouseEventMap, ScreencastInputHandler } from './input';

type NavigationEntry = {
    id: number;
    url: string;
};

export class Screencast {
    private cdpConnection = new ScreencastCDPConnection();
    private history: NavigationEntry[] = [];
    private historyIndex = 0;
    private inputHandler: ScreencastInputHandler;
    private backButton: HTMLButtonElement;
    private forwardButton: HTMLButtonElement;
    private reloadButton: HTMLButtonElement;
    private rotateButton: HTMLButtonElement;
    private urlInput: HTMLInputElement;
    private screencastImage: HTMLImageElement;
    private screencastWrapper: HTMLElement;
    private deviceSelect: HTMLSelectElement;
    private width = 0;
    private height = 0;

    constructor() {
        this.backButton = document.getElementById('back') as HTMLButtonElement;
        this.forwardButton = document.getElementById('forward') as HTMLButtonElement;
        this.reloadButton = document.getElementById('reload') as HTMLButtonElement;
        this.rotateButton = document.getElementById('rotate') as HTMLButtonElement;
        this.urlInput = document.getElementById('url') as HTMLInputElement;
        this.screencastImage = document.getElementById('canvas') as HTMLImageElement;
        this.screencastWrapper = document.getElementById('canvas-wrapper') as HTMLElement;
        this.deviceSelect = document.getElementById('device') as HTMLSelectElement;

        this.backButton.addEventListener('click', () => this.onBackClick());
        this.forwardButton.addEventListener('click', () => this.onForwardClick());
        this.reloadButton.addEventListener('click', () => this.onReloadClick());
        this.rotateButton.addEventListener('click', () => this.onRotateClick());
        this.urlInput.addEventListener('keydown', event => this.onUrlKeyDown(event));

        this.deviceSelect.addEventListener('change', () => {
            if (this.deviceSelect.value.toLowerCase() === 'desktop') {
                this.width = 0;
                this.height = 0;
                this.screencastWrapper.classList.add('desktop');
            } else {
                const selectedOption = this.deviceSelect[this.deviceSelect.selectedIndex];
                const deviceWidth = selectedOption.getAttribute('devicewidth');
                const deviceHeight = selectedOption.getAttribute('deviceheight');
                if (deviceWidth && deviceHeight) {
                    this.width = parseInt(deviceWidth);
                    this.height = parseInt(deviceHeight);
                } else {
                    this.reportError(ErrorCodes.Error, 'Error while getting screencast width and height.', `Actual width: ${deviceWidth}, height: ${deviceHeight}`);
                }

                this.screencastWrapper.classList.remove('desktop');
            }
            this.updateEmulation();
        });

        this.cdpConnection.registerForEvent('Page.domContentEventFired', () => this.onDomContentEventFired());
        this.cdpConnection.registerForEvent('Page.frameNavigated', result => this.onFrameNavigated(result));
        this.cdpConnection.registerForEvent('Page.screencastFrame', result => this.onScreencastFrame(result));

        this.inputHandler = new ScreencastInputHandler(this.cdpConnection);

        this.cdpConnection.sendMessageToBackend('Page.enable', {});

        // Optimizing the resize event to limit how often can it be called.
        let resizeTimeout = 0 as unknown as NodeJS.Timeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.updateEmulation(), 100);
        });

        this.registerInputListeners();

        // Start screencast
        this.updateEmulation();
        this.updateHistory();
    }

    private registerInputListeners(): void {
        for (const eventName of Object.keys(MouseEventMap)) {
            this.screencastImage.addEventListener(eventName, event => {
                const scale = this.screencastImage.offsetWidth / this.screencastImage.naturalWidth;
                if (this.isDeviceTouch()) {
                    this.inputHandler.emitTouchFromMouseEvent(event as MouseEvent, scale);
                } else {
                    this.inputHandler.emitMouseEvent(event as MouseEvent, scale);
                }
            });
        }

        for (const eventName of ['keydown', 'keypress']) {
            this.screencastImage.addEventListener(eventName, event => {
                this.inputHandler.emitKeyEvent(event as KeyboardEvent);
            });
        }
    }

    private updateHistory(): void {
        this.cdpConnection.sendMessageToBackend('Page.getNavigationHistory', {}, result => {
            const {currentIndex, entries} = result;
            this.history = entries;
            this.historyIndex = currentIndex;
            this.backButton.disabled = this.historyIndex < 1;
            this.forwardButton.disabled = this.historyIndex >= this.history.length - 1;
            this.urlInput.value = this.history[this.historyIndex].url;
        });
    }

    private updateEmulation(): void {
        const deviceMetricsParams = {
            width: this.width || this.screencastWrapper.offsetWidth,
            height: this.height || this.screencastWrapper.offsetHeight,
            deviceScaleFactor: 0,
            mobile: this.isDeviceTouch(),
        };
        const touchEmulationParams = {
            enabled: this.isDeviceTouch(),
            maxTouchPoints: 1,
        };
        const touchEventsParams = {
            enabled: this.isDeviceTouch(),
            configuration: this.isDeviceTouch() ? 'mobile' : 'desktop',
        };
        this.cdpConnection.sendMessageToBackend('Emulation.setDeviceMetricsOverride', deviceMetricsParams);
        this.cdpConnection.sendMessageToBackend('Emulation.setTouchEmulationEnabled', touchEmulationParams);
        this.cdpConnection.sendMessageToBackend('Emulation.setEmitTouchEventsForMouse', touchEventsParams);
        this.updateScreencast();
    }

    private reportError(type: ErrorCodes.Error, message: string, stack: string) {

        // Package up the error info to send to the extension
        const data = { type, message, stack };

        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data,
            event: 'error',
            name: 'screencast error',
        });
    }

    private sendTelemetry(telemetry: TelemetryData) {
        // Forward the data to the extension
        encodeMessageForChannel(msg => vscode.postMessage(msg, '*'), 'telemetry', telemetry);
    }

    private isDeviceTouch(){
        const selectedOption = this.deviceSelect[this.deviceSelect.selectedIndex];
        return selectedOption.getAttribute('touch') === 'true' || selectedOption.getAttribute('mobile') === 'true';
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

    private onBackClick(): void {
        if (this.historyIndex > 0) {
            const entryId = this.history[this.historyIndex - 1].id;
            this.cdpConnection.sendMessageToBackend('Page.navigateToHistoryEntry', {entryId})
        }
    }

    private onDomContentEventFired(): void {
        setTimeout(() => this.updateEmulation(), 100);
    }

    private onForwardClick(): void {
        if (this.historyIndex < this.history.length - 1) {
            const entryId = this.history[this.historyIndex + 1].id;
            this.cdpConnection.sendMessageToBackend('Page.navigateToHistoryEntry', {entryId})
        }
    }

    private onFrameNavigated({frame}: any): void {
        if (!frame.parentId) {
            this.updateHistory();
            this.updateEmulation();
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
        let url = this.urlInput.value;
        if (event.key === 'Enter' && url) {
            if (!url.startsWith('http') || !url.startsWith('file')) {
                url = 'http://' + url;
            }

            this.cdpConnection.sendMessageToBackend('Page.navigate', {url});
        }
    }

    private onScreencastFrame({data, sessionId}: any): void {
        this.screencastImage.src = `data:image/png;base64,${data}`;
        this.screencastImage.style.width = `${this.screencastImage.naturalWidth}px`;
        this.cdpConnection.sendMessageToBackend('Page.screencastFrameAck', {sessionId});
    }
}
