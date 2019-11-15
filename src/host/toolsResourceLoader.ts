// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { encodeMessageForChannel } from "../common/webviewEvents";

export interface IRuntimeResourceLoader {
    loadResourcePromise: (url: string) => Promise<string>;
}

export default class ToolsResourceLoader {
    private originalLoadResource: (url: string) => Promise<string>;
    private urlLoadNextId: number = 0;
    private urlLoadResolvers: Map<number, (url: string) => void> = new Map();

    private constructor(originalLoadResource: (url: string) => Promise<string>) {
        this.originalLoadResource = originalLoadResource;
    }

    public onResolvedUrlFromChannel(id: number, content: string) {
        if (this.urlLoadResolvers.has(id)) {
            const resolve = this.urlLoadResolvers.get(id);
            if (resolve) {
                resolve(content);
            }
            this.urlLoadResolvers.delete(id);
        }
    }

    private async loadResource(url: string) {
        if (url.substr(0, 7) === "http://" || url.substr(0, 8) === "https://") {
            // Forward the cross domain request over to the extension
            const id = this.urlLoadNextId++;
            return new Promise((resolve: (url: string) => void) => {
                this.urlLoadResolvers.set(id, resolve);
                encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "getUrl", { id, url });
            });
        }

        return this.originalLoadResource(url);
    }

    public static overrideResourceLoading(loaderObject: IRuntimeResourceLoader) {
        const originalLoadResource = loaderObject.loadResourcePromise;

        // Replace the loader promise with our override version so we can control cross domain requests
        const loader = new ToolsResourceLoader(originalLoadResource);
        loaderObject.loadResourcePromise = loader.loadResource.bind(loader);

        return loader;
    }
}
