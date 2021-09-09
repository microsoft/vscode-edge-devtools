// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScreencastCDPConnection } from './cdp';

export function initialize(): void {
    // Button to emulate
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

    // Start screencast
    const startScreencastbutton = document.createElement('button');
    startScreencastbutton.addEventListener('click', () => {
        const screencastParams = {
            format: 'png',
            quality: 100,
            maxWidth: 400,
            maxHeight: 700
        };
        cdpConnection.sendMessageToBackend('Page.enable', {});
        cdpConnection.sendMessageToBackend('Page.startScreencast', screencastParams);
    });
    startScreencastbutton.textContent = "Start Screencast";
    document.body.appendChild(startScreencastbutton);

    // Screencast image for demo
    const screencastImage = document.createElement('img');
    document.body.appendChild(screencastImage);


    function onFrame(params: any) {
        screencastImage.src = 'data:image/png;base64,' + params.data;
    }
    cdpConnection.registerForEvent('Page.screencastFrame', result => onFrame(result));
}
