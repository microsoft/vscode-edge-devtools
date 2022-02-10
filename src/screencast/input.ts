// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScreencastCDPConnection } from './cdp';

export const MouseEventMap = {
  mousedown: 'mousePressed',
  mouseup: 'mouseReleased',
  mousemove: 'mouseMoved',
  wheel: 'mouseWheel',
};

const MouseButtonMap = [
    'left',
    'middle',
    'right',
    'back',
    'forward',
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
            clickCount: eventType === 'mousePressed' || eventType === 'mouseReleased' ? 1 : 0,
            x: Math.round(mouseEvent.offsetX / scale),
            y: Math.round(mouseEvent.offsetY / scale),
            modifiers: this.modifiersForEvent(mouseEvent),
            button: MouseButtonMap[mouseEvent.button],
            buttons: mouseEvent.buttons,
            deltaX: (mouseEvent as WheelEvent).deltaX,
            deltaY: (mouseEvent as WheelEvent).deltaY,
        });
    }

    emitKeyEvent(keyboardEvent: KeyboardEvent): void {
        // For what seems a bug to me on CDP:
        // - non printable key events only respond to object with type keydown and virtual key codes.
        // - printable characters respond only to object with type char and text property set to key.
        // This could be related:
        // https://github.com/ChromeDevTools/devtools-protocol/issues/45
        if (keyboardEvent.type === 'keydown' && keyboardEvent.key.length > 1 && keyboardEvent.key !== 'Enter') {
            this.cdpConnection.sendMessageToBackend('Input.dispatchKeyEvent', {
                type: 'keyDown',
                windowsVirtualKeyCode: keyboardEvent.keyCode,
                nativeVirtualKeyCode: keyboardEvent.keyCode,
            });
        } else if (keyboardEvent.type === 'keypress') {
            const cdpObject = {
                type: 'char',
                text: keyboardEvent.key,
            };

            if (keyboardEvent.key === 'Enter') {
                cdpObject.text = '\r';
            }

            this.cdpConnection.sendMessageToBackend('Input.dispatchKeyEvent', cdpObject);
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

    private modifiersForEvent(event: MouseEvent | KeyboardEvent): number {
        return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
    }
}
