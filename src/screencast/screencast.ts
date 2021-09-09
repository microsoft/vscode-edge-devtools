// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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
}
