// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS } from 'constants';
import { ScreencastCDPConnection } from './cdp';

export function initialize(): void {
    const cdpConnection = new ScreencastCDPConnection();
    const emulateTest = document.createElement('button');
    emulateTest.addEventListener('click', () => {
        const params = {
            width: 400,
            height: 700,
            deviceScaleFactor: 0,
            mobile: false
        }
        cdpConnection.sendMessageToBackend('Emulation.setDeviceMetricsOverride', params);
    });
    emulateTest.textContent = "Update Emulation";
    document.body.appendChild(emulateTest);

    const screencastImage = document.createElement('image') as HTMLImageElement;
    document.body.appendChild(screencastImage);


    function onFrame(result: unknown) {
        screencastImage.src = 'data:image/jpg;base64,' + result.data;
    }

    const screencastParams = {
        format: 'png',
        quality: 100,
        maxWidth: 400,
        maxHeight: 700
    }
    cdpConnection.sendMessageToBackend('Page.startScreencast', screencastParams);

    cdpConnection.registerForEvent('Page.screencastFrame', result => onFrame(result))
}
