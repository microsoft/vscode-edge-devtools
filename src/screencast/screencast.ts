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
    private inactiveOverlay: HTMLElement;
    private fixedWidth = 0;
    private fixedHeight = 0;
    private inspectMode = false;

    constructor() {
        this.backButton = document.getElementById('back') as HTMLButtonElement;
        this.forwardButton = document.getElementById('forward') as HTMLButtonElement;
        this.reloadButton = document.getElementById('reload') as HTMLButtonElement;
        this.rotateButton = document.getElementById('rotate') as HTMLButtonElement;
        this.urlInput = document.getElementById('url') as HTMLInputElement;
        this.screencastImage = document.getElementById('canvas') as HTMLImageElement;
        this.screencastWrapper = document.getElementById('canvas-wrapper') as HTMLElement;
        this.deviceSelect = document.getElementById('device') as HTMLSelectElement;
        this.inactiveOverlay = document.getElementById('inactive-overlay') as HTMLElement;

        this.backButton.addEventListener('click', () => this.onBackClick());
        this.forwardButton.addEventListener('click', () => this.onForwardClick());
        this.reloadButton.addEventListener('click', () => this.onReloadClick());
        this.rotateButton.addEventListener('click', () => this.onRotateClick());
        this.urlInput.addEventListener('keydown', event => this.onUrlKeyDown(event));

        this.deviceSelect.addEventListener('change', () => {
            if (this.deviceSelect.value.toLowerCase() === 'desktop') {
                this.fixedWidth = 0;
                this.fixedHeight = 0;
                this.screencastWrapper.classList.add('desktop');
            } else {
                const selectedOption = this.deviceSelect[this.deviceSelect.selectedIndex];
                const deviceWidth = selectedOption.getAttribute('devicewidth');
                const deviceHeight = selectedOption.getAttribute('deviceheight');
                if (deviceWidth && deviceHeight) {
                    this.fixedWidth = parseInt(deviceWidth);
                    this.fixedHeight = parseInt(deviceHeight);
                } else {
                    this.reportError(ErrorCodes.Error, 'Error while getting screencast width and height.', `Actual width: ${deviceWidth}, height: ${deviceHeight}`);
                }

                this.screencastWrapper.classList.remove('desktop');
            }
            this.updateEmulation();
        });

        this.cdpConnection.registerForEvent('Page.frameNavigated', result => this.onFrameNavigated(result));
        this.cdpConnection.registerForEvent('Page.screencastFrame', result => this.onScreencastFrame(result));
        this.cdpConnection.registerForEvent('Page.screencastVisibilityChanged', result => this.onScreencastVisibilityChanged(result));

        // This message comes from the DevToolsPanel instance.
        this.cdpConnection.registerForEvent('DevTools.toggleInspect', result => this.onToggleInspect(result));

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

    get width(): number {
        return this.fixedWidth || this.screencastWrapper.offsetWidth;
    }

    get height(): number {
        return this.fixedHeight || this.screencastWrapper.offsetHeight;
    }

    private registerInputListeners(): void {
        // Disable context menu on screencast image
        this.screencastImage.addEventListener('contextmenu', event => event.preventDefault());

        for (const eventName of Object.keys(MouseEventMap)) {
            this.screencastImage.addEventListener(eventName, event => {
                const scale = this.screencastImage.offsetWidth / this.screencastImage.naturalWidth * window.devicePixelRatio;
                const mouseEvent = event as MouseEvent;
                if (this.isDeviceTouch() && !this.inspectMode) {
                    this.inputHandler.emitTouchFromMouseEvent(mouseEvent, scale);
                } else if (mouseEvent.button !== 2 /* right click */) {
                    this.inputHandler.emitMouseEvent(mouseEvent, scale);
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
        const isTouch = this.isDeviceTouch();
        const deviceMetricsParams = {
            width: this.width,
            height: this.height,
            deviceScaleFactor: 0,
            mobile: isTouch,
        };
        const touchEmulationParams = {
            enabled: isTouch,
            maxTouchPoints: 1,
        };

        this.cdpConnection.sendMessageToBackend('Emulation.setUserAgentOverride', {
            userAgent: this.deviceUserAgent(),
        });
        this.cdpConnection.sendMessageToBackend('Emulation.setDeviceMetricsOverride', deviceMetricsParams);
        this.cdpConnection.sendMessageToBackend('Emulation.setTouchEmulationEnabled', touchEmulationParams);
        this.toggleTouchMode();
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

    private deviceUserAgent() {
        if (this.deviceSelect.value.toLowerCase() === 'desktop') {
            return '';
        }
        const selectedOption = this.deviceSelect[this.deviceSelect.selectedIndex];
        return unescape(selectedOption.getAttribute('userAgent') || '');
    }

    private updateScreencast(): void {
        const screencastParams = {
            format: 'png',
            quality: 100,
            maxWidth: Math.floor(this.width * window.devicePixelRatio),
            maxHeight: Math.floor(this.height * window.devicePixelRatio)
        };
        this.cdpConnection.sendMessageToBackend('Page.startScreencast', screencastParams);
    }

    private onBackClick(): void {
        if (this.historyIndex > 0) {
            const entryId = this.history[this.historyIndex - 1].id;
            this.cdpConnection.sendMessageToBackend('Page.navigateToHistoryEntry', {entryId})
        }
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
        }
    }

    private onReloadClick(): void {
        this.cdpConnection.sendMessageToBackend('Page.reload', {});
    }

    private onRotateClick(): void {
        const width = this.fixedHeight;
        const height = this.fixedWidth;
        this.fixedWidth = width;
        this.fixedHeight = height;
        this.updateEmulation();
    }

    private onUrlKeyDown(event: KeyboardEvent): void {
        let url = this.urlInput.value;
        if (event.key === 'Enter' && url) {
            if (!url.startsWith('http') && !url.startsWith('file')) {
                url = 'http://' + url;
            }

            this.cdpConnection.sendMessageToBackend('Page.navigate', {url});
        }
    }

    private onScreencastFrame({data, sessionId}: any): void {
        const expectedWidth = Math.floor(this.width * window.devicePixelRatio);
        const expectedHeight = Math.floor(this.height * window.devicePixelRatio);
        this.screencastImage.src = `data:image/png;base64,${data}`;
        this.screencastImage.style.width = `${this.width}px`;
        if (this.screencastImage.naturalWidth !== expectedWidth || this.screencastImage.naturalHeight !== expectedHeight) {
            this.updateEmulation();
        }
        this.cdpConnection.sendMessageToBackend('Page.screencastFrameAck', {sessionId});
    }

    private onScreencastVisibilityChanged({visible}: {visible: boolean}): void {
        this.inactiveOverlay.hidden = visible;
    }

    private onToggleInspect({ enabled }: any): void {
        this.inspectMode = enabled as boolean;
        this.toggleTouchMode();
    }

    private toggleTouchMode(): void {
        const touchEnabled = this.isDeviceTouch() && !this.inspectMode;
        const touchEventsParams = {
            enabled: touchEnabled,
            configuration: touchEnabled ? 'mobile' : 'desktop',
        };
        this.screencastImage.classList.toggle('touch', touchEnabled);
        this.cdpConnection.sendMessageToBackend('Emulation.setEmitTouchEventsForMouse', touchEventsParams);
    }
}
