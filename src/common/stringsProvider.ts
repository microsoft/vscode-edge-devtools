// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { IDevToolsWindow } from "../host/host";
import { englishLocale, pseudoLocale } from "./stringProviderConstants";

export default class StringsProvider {
    private static singletonInstance: StringsProvider;
    private initialized: boolean = false;
    private fallbackMap: Map<string, string[]> = new Map<string, string[]>();
    private dtWindow: IDevToolsWindow | undefined;

    private constructor() {
        // private initialization for singleton.
        this.fallBackInitialization();
    }

    public overrideFrontendStrings(message: string) {
        if (!this.initialized && this.dtWindow) {
            const injectedFunction = (stringId: string) => {
                if (StringsProvider.instance.dtWindow && stringId) {
                    return StringsProvider.instance.dtWindow.DevToolsLocalization._localizedStringsMap.get(stringId)
                        || stringId;
                }

                return stringId;
            };

            // initialize
            const localizedStringsMap = new Map();
            JSON.parse(message, (key, value) => {
                localizedStringsMap.set(key, value);
            });

            this.dtWindow.DevToolsLocalization._localizedStringsMap = localizedStringsMap;
            this.dtWindow.DevToolsLocalization.getString = injectedFunction;
        }
    }

    public initializeStringsProvider(dtWindow: IDevToolsWindow) {
        StringsProvider.instance.dtWindow = dtWindow;
        dtWindow.InspectorFrontendHost.setStringsProvider(StringsProvider.instance);
    }

    private fallBackInitialization() {
        // implement custom fallback logic here as follows:
        // this._fallBackMap.set('en-us', []): if a language is available (json provided)
        // this._fallBackMap.set('test', ['es-mx']): fallback list for test language
        this.fallbackMap.set(englishLocale, []);
        this.fallbackMap.set(pseudoLocale, []);
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
                return englishLocale;
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
        return locale ? locale : englishLocale;
    }
}
