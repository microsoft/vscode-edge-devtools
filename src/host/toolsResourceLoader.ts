// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { encodeMessageForChannel } from "../common/webviewEvents";
import { applyCreateElementPatch, applyUIUtilsPatch } from "./polyfills/customElements";
import applySetupTextSelectionPatch from "./polyfills/textSelection";
import getWebviewVersion from "./polyfills/webviewVersion";

export interface IRuntimeResourceLoader {
    loadResourcePromise: (url: string) => Promise<string>;
}

export default class ToolsResourceLoader {
    private originalLoadResource: (url: string) => Promise<string>;
    private urlLoadNextId: number = 0;
    private urlLoadResolvers: Map<number, (url: string) => void> = new Map();
    private webviewVersion = getWebviewVersion();

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
                encodeMessageForChannel((msg) => window.parent.postMessage(msg, "*"), "getUrl", [{ id, url }]);
            });
        } else if (!this.webviewVersion || this.webviewVersion.major < 67) {
            // Patch older versions of the webview with our workarounds
            if (url.endsWith("ui/UIUtils.js")) {
                // Patch custom elements v1 usage with workaround until it is supported in VSCode/Electron version
                return applyUIUtilsPatch(await this.originalLoadResource(url));
            } else if (url.endsWith("/dom_extension/DOMExtension.js")) {
                // Patch custom elements v1 usage with workaround until it is supported in VSCode/Electron version
                return applyCreateElementPatch(await this.originalLoadResource(url));
            } else if (url.endsWith("elements/ElementsPanel.js")) {
                // Remove the text selection hack as that causes issues when hosted in a webview
                return applySetupTextSelectionPatch(await this.originalLoadResource(url));
            }
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
