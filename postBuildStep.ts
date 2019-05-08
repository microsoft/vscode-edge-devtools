// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fse from "fs-extra";
import path from "path";

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
        `${process.env.EDGE_CHROMIUM_PATH}/out/${process.env.EDGE_CHROMIUM_OUT_DIR}/resources/inspector/`;
    if (!isDirectory(toolsGenDir)) {
        throw new Error(`Could not find Edge Chromium output path at '${toolsGenDir}'. ` +
            "Did you set the EDGE_CHROMIUM_OUT_DIR environment variable?");
    }

    // Copy the devtools to the out directory
    const toolsOutDir = "./out/tools/front_end/";
    await fse.ensureDir(toolsOutDir);
    await fse.copy(toolsSrcDir, toolsOutDir);

    // Copy the devtools generated files to the out directory
    await copyFile(toolsGenDir, toolsOutDir, "InspectorBackendCommands.js");
    await copyFile(toolsGenDir, toolsOutDir, "SupportedCSSProperties.js");
    await copyFile(
        path.join(toolsGenDir, "accessibility"),
        path.join(toolsOutDir, "accessibility"),
        "ARIAProperties.js",
    );

}

function isDirectory(fullPath: string) {
    try {
        return fse.statSync(fullPath).isDirectory();
    } catch {
        return false;
    }
}

copyStaticFiles();
