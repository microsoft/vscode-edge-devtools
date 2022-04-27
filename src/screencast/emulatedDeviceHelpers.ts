// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { emulatedDevices } from './emulatedDevices';
import { MenuItem } from './flyoutMenuComponent';

export function groupEmulatedDevicesByType(): Map<string, MenuItem[]> {
    const groupedDevices = new Map() as Map<string, MenuItem[]>;

    for (const device of emulatedDevices) {
        const deviceEntry = {
            name: device.title,
            value: device.title
        }
        const groupedDeviceList = groupedDevices.get(device.type);
        if (!groupedDeviceList) {
            groupedDevices.set(device.type, [deviceEntry]);
            continue;
        }
        let shouldAdd = true;
        for (const entry of groupedDeviceList) {
            if (entry.name === device.title) {
                shouldAdd = false;
                break;
            }
        }
        if (!shouldAdd) {
            continue;
        }
        groupedDeviceList?.push(deviceEntry);
    }

    return groupedDevices;
}

export function getEmulatedDeviceDetails(deviceName: string) {
    return emulatedDevices.find((device) => {
        return device.title === deviceName;
    });
}
