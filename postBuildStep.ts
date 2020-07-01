// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fse from "fs-extra";
import path from "path";

import applyPaddingInlineCssPatch from "./src/host/polyfills/cssPaddingInline";
import { applyContentSecurityPolicyPatch } from "./src/host/polyfills/inspectorContentPolicy";
import applyRuntimeImportScriptPathPrefixPatch from "./src/host/polyfills/runtime";
import {
    applyAppendTabPatch,
    applyCommonRevealerPatch,
    applyDrawerTabLocationPatch,
    applyHandleActionPatch,
    applyInspectorCommonContextMenuPatch,
    applyInspectorCommonCssPatch,
    applyInspectorCommonCssRightToolbarPatch,
    applyInspectorCommonCssTabSliderPatch,
    applyInspectorCommonNetworkPatch,
    applyMainViewPatch,
    applyPersistRequestBlockingTab,
    applySetTabIconPatch,
    applyShowElementsTab,
    applyShowRequestBlockingTab,
} from "./src/host/polyfills/simpleView";
import applySetupTextSelectionPatch from "./src/host/polyfills/textSelection";

async function copyFile(srcDir: string, outDir: string, name: string) {
    await fse.copy(
        path.join(srcDir, name),
        path.join(outDir, name),
    );
}

async function copyStaticFiles(debugMode: boolean) {
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
        `${process.env.EDGE_CHROMIUM_PATH}/third_party/devtools-frontend/src/front_end/`;
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
    await patchFilesForWebView(toolsOutDir, debugMode);
}

async function patchFilesForWebView(toolsOutDir: string, debugMode: boolean) {
    // Release file versions
    if (!debugMode) {
        // tslint:disable-next-line:no-console
        console.log("Patching files for release version");
        await patchFileForWebViewWrapper("shell.js", toolsOutDir, true, [
            applyInspectorCommonContextMenuPatch,
            applyInspectorCommonCssRightToolbarPatch,
            applyInspectorCommonCssPatch,
            applyInspectorCommonNetworkPatch,
            applyInspectorCommonCssTabSliderPatch,
        ]);
        await patchFileForWebViewWrapper("main/main.js", toolsOutDir, true, [
            applyMainViewPatch,
        ]);
        await patchFileForWebViewWrapper("elements/elements.js", toolsOutDir, true, [
            applySetupTextSelectionPatch,
        ]);
        await patchFileForWebViewWrapper("common/common.js", toolsOutDir, true, [
            applyCommonRevealerPatch,
        ]);
        await patchFileForWebViewWrapper("elements/elements_module.js", toolsOutDir, true, [
            applyPaddingInlineCssPatch,
        ]);
        await patchFileForWebViewWrapper("inspector.html", toolsOutDir, true, [
            applyContentSecurityPolicyPatch,
        ]);
        await patchFileForWebViewWrapper("ui/ui.js", toolsOutDir, true, [
            applyDrawerTabLocationPatch,
            applyAppendTabPatch,
            applyPersistRequestBlockingTab,
            applySetTabIconPatch,
            applyShowElementsTab,
            applyShowRequestBlockingTab,
        ]);

        await patchFileForWebViewWrapper("root/root.js", toolsOutDir, true, [
            applyRuntimeImportScriptPathPrefixPatch,
        ]);

        await patchFileForWebViewWrapper("ui/ui.js", toolsOutDir, true, [
            applyHandleActionPatch,
        ]);
        await patchFileForWebViewWrapper("ui/ui.js", toolsOutDir, true, [
            applyHandleActionPatch,
        ]);
    } else {
        // tslint:disable-next-line:no-console
        console.log("Patching files for debug version");
        await patchFileForWebViewWrapper("main/main.js", toolsOutDir, false, [
            applyMainViewPatch,
        ]);
        await patchFileForWebViewWrapper("common/common.js", toolsOutDir, false, [
            applyCommonRevealerPatch,
        ]);
        await patchFileForWebViewWrapper("elements/elements_module.js", toolsOutDir, false, [
            applyPaddingInlineCssPatch,
        ]);
        await patchFileForWebViewWrapper("inspector.html", toolsOutDir, false, [
            applyContentSecurityPolicyPatch,
        ]);
        await patchFileForWebViewWrapper("ui/ui.js", toolsOutDir, false, [
            applyDrawerTabLocationPatch,
            applyAppendTabPatch,
            applyPersistRequestBlockingTab,
            applySetTabIconPatch,
            applyShowElementsTab,
            applyShowRequestBlockingTab,
        ]);
        await patchFileForWebViewWrapper("quick_open/QuickOpen.js", toolsOutDir, true, [
            applyHandleActionPatch,
        ]);
        await patchFileForWebViewWrapper("quick_open/CommandMenu.js", toolsOutDir, true, [
            applyHandleActionPatch,
        ]);
        // Debug file versions
        await patchFileForWebViewWrapper("elements/ElementsPanel.js", toolsOutDir, false, [
            applySetupTextSelectionPatch,
        ]);
        await patchFileForWebViewWrapper("themes/base.css", toolsOutDir, false, [
            applyInspectorCommonContextMenuPatch,
            applyInspectorCommonCssPatch,
            applyInspectorCommonNetworkPatch,
            applyInspectorCommonCssRightToolbarPatch,
            applyInspectorCommonCssTabSliderPatch,
        ]);
        await patchFileForWebViewWrapper("elements/elementsTreeOutline.css", toolsOutDir, false, [
            applyPaddingInlineCssPatch,
        ]);
        await patchFileForWebViewWrapper("elements/stylesSectionTree.css", toolsOutDir, false, [
            applyPaddingInlineCssPatch,
        ]);
    }
}

// This function wraps the patchFileForWebView function to catch any errors thrown, log them
// and return with an exit code of 1.
// Returning the exit code of 1 will ensure that the Azure Pipeline will fail when patching fails.
async function patchFileForWebViewWrapper(
  filename: string,
  dir: string,
  isRelease: boolean,
  patches: Array<(content: string, isRelease?: boolean) => string | null>) {
  await patchFileForWebView(filename, dir, isRelease, patches)
      .catch((errorMessage) => {
        // tslint:disable-next-line:no-console
        console.error(errorMessage);
        process.exit(1);
      });
}

async function patchFileForWebView(
    filename: string,
    dir: string,
    isRelease: boolean,
    patches: Array<(content: string, isRelease?: boolean) => string | null>) {
    const file = path.join(dir, filename);

    if (!await fse.pathExists(file)) {
        const template = `An expected file was not found: ${file}`;
        throw new Error(template);
    }

    // Read in the file
    let content = (await fse.readFile(file)).toString();

    // Apply each patch in order
    patches.forEach((patchFunction) => {
        const patchResult: string | null = patchFunction(content, isRelease);
        if (patchResult) {
            content = patchResult;
        } else {
            const template = `An expected function was not patched correctly: ${patchFunction} on file: ${filename}`;
            throw new Error(template);
        }
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

function main() {
    let debugMode = false;
    if (process.argv && process.argv.length === 3 && process.argv[2] === "debug") {
        debugMode = true;
    }

    copyStaticFiles(debugMode)
        .catch((errorMessage) => {
          // tslint:disable-next-line:no-console
          console.error(errorMessage);
          process.exit(1);
        });
}

main();
