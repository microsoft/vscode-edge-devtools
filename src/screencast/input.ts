// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScreencastCDPConnection } from "./cdp";

export const MouseEventMap = {
  mousedown: 'mousePressed',
  mouseup: 'mouseReleased',
  mousemove: 'mouseMoved',
  wheel: 'mouseWheel'
};

const MouseButtonMap = [
    'left',
    'middle',
    'right',
    'back',
    'forward'
];

export class ScreencastInputHandler {
    private cdpConnection: ScreencastCDPConnection;
    private activeTouchParams: any | null;

    constructor(cdpConnection: ScreencastCDPConnection) {
        this.cdpConnection = cdpConnection;
        this.activeTouchParams = null;
    }

    emitMouseEvent(mouseEvent: MouseEvent, scale: number): void {
        const eventType = MouseEventMap[mouseEvent.type as keyof typeof MouseEventMap];
        if (!eventType) {
            return;
        }
        this.cdpConnection.sendMessageToBackend('Input.dispatchMouseEvent', {
            type: eventType,
            clickCount: mouseEvent.detail, // per https://developer.mozilla.org/docs/Web/API/UIEvent/detail
            x: Math.round(mouseEvent.offsetX / scale),
            y: Math.round(mouseEvent.offsetY / scale),
            modifiers: this.modifiersForEvent(mouseEvent),
            button: MouseButtonMap[mouseEvent.button],
            buttons: mouseEvent.buttons,
            deltaX: (mouseEvent as WheelEvent).deltaX,
            deltaY: (mouseEvent as WheelEvent).deltaY
        });
    }

    emitKeyEvent(keyboardEvent: KeyboardEvent): void {
        const hasNonShiftModifier = !!(keyboardEvent.ctrlKey || keyboardEvent.altKey || keyboardEvent.metaKey);
        if (hasNonShiftModifier || keyboardEvent.key === 'Tab') {
            // Prevent keyboard shortcuts from acting on the screencast image.
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
        }
        if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && (keyboardEvent.key === 'c' || keyboardEvent.key === 'x') && keyboardEvent.type === 'keydown') {
            // We make a call to CDP to get the currently selected text in the screencast.
            // By passing "true" for the "isCutOrCopy" parameter in "sendMessageToBackend", the cdpConnection class will
            // handle the response to the Runtime.evaluate call and update the user's system clipboard.
            this.cdpConnection.sendMessageToBackend('Runtime.evaluate', {
                expression: 'document.getSelection().toString()',
            }, undefined, true);
        }
        if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && keyboardEvent.key === 'v' && keyboardEvent.type === 'keydown') {
            // If the user inputs a paste command shortcut, we send a request to VSCode to retrieve the user's system clipboard contents.
            // When the clipboard contents are sent back to the screencast, we insert that text into the screencast-focused input via "pasteClipboardContents"
            this.cdpConnection.readClipboardAndPasteRequest();
        } else if (keyboardEvent.type === 'keydown' || keyboardEvent.type === 'keyup') {
            const text = hasNonShiftModifier ? '' : this.textFromEvent(keyboardEvent);
            this.cdpConnection.sendMessageToBackend('Input.dispatchKeyEvent', {
                type: keyboardEvent.type === 'keyup' ? 'keyUp' : (text ? 'keyDown' : 'rawKeyDown'),
                autoRepeat: keyboardEvent.repeat,
                code: keyboardEvent.code,
                key: keyboardEvent.key,
                location: keyboardEvent.location,
                modifiers: this.modifiersForEvent(keyboardEvent),
                windowsVirtualKeyCode: keyboardEvent.keyCode,
                nativeVirtualKeyCode: keyboardEvent.keyCode,
                text,
            });
        }
    }

    emitTouchFromMouseEvent(mouseEvent: MouseEvent, scale: number): void {
        const buttons = ['none', 'left', 'middle', 'right'];
        const eventType = MouseEventMap[mouseEvent.type as keyof typeof MouseEventMap];
        if (!eventType) {
            return;
        }

        if (!(mouseEvent.which in buttons)) {
            return;
        }
        if (eventType !== 'mouseWheel' && buttons[mouseEvent.which] === 'none') {
            return;
        }

        const params: any = {
            type: eventType,
            x: Math.round(mouseEvent.offsetX / scale),
            y: Math.round(mouseEvent.offsetY / scale),
            modifiers: 0,
            button: MouseButtonMap[mouseEvent.button],
            clickCount: 0,
        };
        if (mouseEvent.type === 'wheel') {
            const wheelEvent = mouseEvent as WheelEvent;
            params.deltaX = wheelEvent.deltaX;
            params.deltaY = -wheelEvent.deltaY;
            params.button = 'none';
        } else {
            this.activeTouchParams = params;
        }
        this.cdpConnection.sendMessageToBackend('Input.emulateTouchFromMouseEvent', params);
    }

    cancelTouch(): void {
        if (this.activeTouchParams !== null) {
            const params = this.activeTouchParams;
            this.activeTouchParams = null;
            params.type = 'mouseReleased';
            this.cdpConnection.sendMessageToBackend('Input.emulateTouchFromMouseEvent', params);
        }
    }

    private textFromEvent(event: KeyboardEvent): string {
        if (event.type === 'keyup') {
            return '';
        }
        if (event.key === 'Enter') {
            return '\r';
        }
        if (event.key.length > 1) {
            return '';
        }
        return event.key;
    }

    private modifiersForEvent(event: MouseEvent | KeyboardEvent): number {
        return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
    }
}
