// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fse from "fs-extra";
import path from "path";
import { applyCreateElementPatch, applyUIUtilsPatch } from "./src/host/polyfills/customElements";

async function copyFile(srcDir: string, outDir: string, name: string) {
    await fse.copy(
        path.join(srcDir, name),
        path.join(outDir, name),
    );
}

async function copyStaticFiles() {
    // Copy the static html file to the out directory
    const hostSrcDir = "./src/host/";
    const hostOutDir = "./out/host/";
    await fse.ensureDir(hostOutDir);
    await copyFile(hostSrcDir, hostOutDir, "devtools.html");

    // Must set environment variables EDGE_CHROMIUM_PATH and EDGE_CHROMIUM_OUT_DIR
    // E.g. set EDGE_CHROMIUM_PATH=F:/git/Edge/src
    //      set EDGE_CHROMIUM_OUT_DIR=debug_x64
    // See CONTRIBUTING.md for more details

    const toolsSrcDir =
        `${process.env.EDGE_CHROMIUM_PATH}/third_party/blink/renderer/devtools/front_end/`;
    if (!isDirectory(toolsSrcDir)) {
        throw new Error(`Could not find Edge Chromium DevTools path at '${toolsSrcDir}'. ` +
            "Did you set the EDGE_CHROMIUM_PATH environment variable?");
    }

    const toolsGenDir =
        `${process.env.EDGE_CHROMIUM_PATH}/out/${process.env.EDGE_CHROMIUM_OUT_DIR}/gen/devtools/`;
    if (!isDirectory(toolsGenDir)) {
        throw new Error(`Could not find Edge Chromium output path at '${toolsGenDir}'. ` +
            "Did you set the EDGE_CHROMIUM_OUT_DIR environment variable?");
    }

    const toolsResDir =
        `${process.env.EDGE_CHROMIUM_PATH}/out/${process.env.EDGE_CHROMIUM_OUT_DIR}/resources/inspector/`;

    // Copy the devtools to the out directory
    const toolsOutDir = "./out/tools/front_end/";
    await fse.ensureDir(toolsOutDir);
    await fse.copy(toolsSrcDir, toolsOutDir);

    // Copy the devtools generated files to the out directory
    await fse.copy(toolsGenDir, toolsOutDir);

    // Copy the optional devtools resource files to the out directory
    if (isDirectory(toolsResDir)) {
        await copyFile(toolsResDir, toolsOutDir, "InspectorBackendCommands.js");
        await copyFile(toolsResDir, toolsOutDir, "SupportedCSSProperties.js");
        await copyFile(
            path.join(toolsResDir, "accessibility"),
            path.join(toolsOutDir, "accessibility"),
            "ARIAProperties.js",
        );
    }

    // Patch older versions of the webview with our workarounds
    await patchFilesForWebView(toolsOutDir);
}

async function patchFilesForWebView(toolsOutDir: string) {
    // Release file versions
    patchFileForWebView("shell.js", toolsOutDir, true, [
        applyUIUtilsPatch,
        applyCreateElementPatch,
    ]);

    // Debug file versions
    patchFileForWebView("ui/UIUtils.js", toolsOutDir, false, [applyUIUtilsPatch]);
    patchFileForWebView("dom_extension/DOMExtension.js", toolsOutDir, false, [applyCreateElementPatch]);
}

async function patchFileForWebView(
    filename: string,
    dir: string,
    isRelease: boolean,
    patches: Array<(content: string, isRelease?: boolean) => string>) {
    const file = path.join(dir, filename);

    // Ignore missing files
    if (!await fse.pathExists(file)) {
        return;
    }

    // Read in the file
    let content = (await fse.readFile(file)).toString();

    // Apply each patch in order
    patches.forEach((patchFunction) => {
        content = patchFunction(content, isRelease);
    });

    // Write out the final content
    fse.writeFile(file, content);
}

function isDirectory(fullPath: string) {
    try {
        return fse.statSync(fullPath).isDirectory();
    } catch {
        return false;
    }
}

copyStaticFiles();
