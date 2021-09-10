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
            clickCount: eventType === 'mousePressed' || eventType === 'mouseReleased' ? 1 : 0,
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
        const text = keyboardEvent.type === 'keypress' ? String.fromCharCode(keyboardEvent.charCode) : undefined;
        this.cdpConnection.sendMessageToBackend('Input.dispatchKeyEvent', {
            type: keyboardEvent.type,
            modifiers: this.modifiersForEvent(keyboardEvent),
            text: text,
            unmodifiedText: text ? text.toLowerCase() : undefined,
            keyIdentifier: (keyboardEvent as { keyIdentifier?: string }).keyIdentifier,
            code: keyboardEvent.code,
            key: keyboardEvent.key,
            windowsVirtualKeyCode: keyboardEvent.keyCode,
            nativeVirtualKeyCode: keyboardEvent.keyCode,
            autoRepeat: false,
            isKeypad: false,
            isSystemKey: false,
        });
    }

    emitTouchFromMouseEvent(mouseEvent: MouseEvent): void {
        const buttons = ['none', 'left', 'middle', 'right'];
        const eventType = MouseEventMap[mouseEvent.type as keyof typeof MouseEventMap];
        if (!eventType) {
            return;
        }

        if (!(mouseEvent.which in buttons)) {
            return;
        }
        if (eventType !== 'wheel' && buttons[mouseEvent.which] === 'none') {
            return;
        }

        const params: any = {
            type: eventType,
            x: mouseEvent.offsetX,
            y: mouseEvent.offsetY,
            modifiers: 0,
            button: buttons[mouseEvent.which],
            clickCount: 0,
        };
        if (mouseEvent.type === 'wheel') {
            const wheelEvent = mouseEvent as WheelEvent;
            params.deltaX = wheelEvent.deltaX;
            params.deltaY = -wheelEvent.deltaY;
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
