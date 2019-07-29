// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export default class StringsProvider {
    private _initialized: boolean = false;

    public static dtWindow: any;
    private static _instance: StringsProvider;

    private constructor() {
        // private initialization for singleton.
    }

    public getStringsCallback(message: any): void {
        if (!message)
            return;

        if (!this._initialized) {
            // initialize
            let data = JSON.parse(message.data);
            StringsProvider.dtWindow.loadTimeData = { data };
            this._initialized = true;
        }

        return;
    }

    public static get instance() {
        if (!StringsProvider._instance)
            StringsProvider._instance = new StringsProvider();

        return StringsProvider._instance;
    }


}