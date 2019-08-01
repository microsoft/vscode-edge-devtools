// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export default class StringsProvider {
    public static dtWindow: any;

    private static singletonInstance: StringsProvider;
    private initialized: boolean = false;
    private fallbackMap: Map<string, []> = new Map<string, []>();

    private constructor() {
        // private initialization for singleton.
        this.fallBackInitialization();
    }

    public getStringsCallback(message: any): void {
        if (!message) {
            return;
        }

        if (!this.initialized) {
            // initialize
            const localizedStringsMap = JSON.parse(message.data);
            StringsProvider.dtWindow.Localization = { localizedStringsMap };
            this.initialized = true;
        }

        return;
    }

    private fallBackInitialization() {
        // implement custom fallback logic here as follows:
        // this._fallBackMap.set('en-us', []): if a language is available (json provided)
        // this._fallBackMap.set('test', ['es-mx']): fallback list for test language
        this.fallbackMap.set("en-us", []);
        this.fallbackMap.set("qps-ploc", []);
    }

    public static get instance() {
        if (!StringsProvider.singletonInstance) {
            StringsProvider.singletonInstance = new StringsProvider();
        }

        return StringsProvider.singletonInstance;
    }

    public static getFallback(locale: string | undefined): string {
        if (locale && StringsProvider.instance) {
            const fallbackLocale: string[] | undefined = StringsProvider.instance.fallbackMap.get(locale);

            // the provided locale is not supported
            if (!fallbackLocale) {
                return "en-us";
            }

            if (fallbackLocale.length === 0) {
                // this is a "leaf node" so a locale is assumed to
                // be provided by developer
                return locale;
            } else {
                return StringsProvider.getFallback(fallbackLocale.pop());
            }
        }

        // not even the last locale worked so we default to en-us
        return locale ? locale : "en-us";
    }
}
