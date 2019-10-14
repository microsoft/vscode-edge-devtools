// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fse from "fs-extra";
import path from "path";
import applyPaddingInlineCssPatch from "./src/host/polyfills/cssPaddingInline";
import { applyCreateElementPatch, applyUIUtilsPatch } from "./src/host/polyfills/customElements";
import {
    applyCommonRevealerPatch,
    applyInspectorCommonCssPatch,
    applyInspectorViewPatch,
    applyMainViewPatch,
    applySelectTabPatch,
} from "./src/host/polyfills/simpleView";
import applySetupTextSelectionPatch from "./src/host/polyfills/textSelection";

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

    // Copy the static css file to the out directory
    const commonSrcDir = "./src/common/";
    const commonOutDir = "./out/common/";
    await fse.ensureDir(commonOutDir);
    await copyFile(commonSrcDir, commonOutDir, "styles.css");

    // Must set environment variables EDGE_CHROMIUM_PATH and EDGE_CHROMIUM_OUT_DIR
    // E.g. set EDGE_CHROMIUM_PATH=F:/git/Edge/src
    //      set EDGE_CHROMIUM_OUT_DIR=debug_x64
    // See CONTRIBUTING.md for more details

    const toolsSrcDir =
        `${process.env.EDGE_CHROMIUM_PATH}/third_party/blink/renderer/devtools/front_end/`;
    if (!isDirectory(toolsSrcDir)) {
        throw new Error(`Could not find Microsoft Edge (Chromium) DevTools path at '${toolsSrcDir}'. ` +
            "Did you set the EDGE_CHROMIUM_PATH environment variable?");
    }

    const toolsGenDir =
        `${process.env.EDGE_CHROMIUM_PATH}/out/${process.env.EDGE_CHROMIUM_OUT_DIR}/gen/devtools/`;
    if (!isDirectory(toolsGenDir)) {
        throw new Error(`Could not find Microsoft Edge (Chromium) output path at '${toolsGenDir}'. ` +
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
    await patchFileForWebView("shell.js", toolsOutDir, true, [
        applyUIUtilsPatch,
        applyCreateElementPatch,
        applyInspectorCommonCssPatch,
        applyCommonRevealerPatch,
        applyMainViewPatch,
        applyInspectorViewPatch,
        applySelectTabPatch,
    ]);
    await patchFileForWebView("elements/elements_module.js", toolsOutDir, true, [
        applySetupTextSelectionPatch,
        applyPaddingInlineCssPatch,
    ]);

    // Debug file versions
    await patchFileForWebView("ui/UIUtils.js", toolsOutDir, false, [applyUIUtilsPatch]);
    await patchFileForWebView("dom_extension/DOMExtension.js", toolsOutDir, false, [applyCreateElementPatch]);
    await patchFileForWebView("elements/ElementsPanel.js", toolsOutDir, false, [applySetupTextSelectionPatch]);
    await patchFileForWebView("ui/inspectorCommon.css", toolsOutDir, false, [applyInspectorCommonCssPatch]);
    await patchFileForWebView("common/ModuleExtensionInterfaces.js", toolsOutDir, false, [applyCommonRevealerPatch]);
    await patchFileForWebView("main/Main.js", toolsOutDir, false, [applyMainViewPatch]);
    await patchFileForWebView("ui/InspectorView.js", toolsOutDir, false, [applyInspectorViewPatch]);
    await patchFileForWebView("ui/TabbedPane.js", toolsOutDir, false, [applySelectTabPatch]);
    await patchFileForWebView("elements/elementsTreeOutline.js", toolsOutDir, false, [applyPaddingInlineCssPatch]);
    await patchFileForWebView("elements/stylesSectionTree.js", toolsOutDir, false, [applyPaddingInlineCssPatch]);
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
    await fse.writeFile(file, content);
}

function isDirectory(fullPath: string) {
    try {
        return fse.statSync(fullPath).isDirectory();
    } catch {
        return false;
    }
}

copyStaticFiles();
