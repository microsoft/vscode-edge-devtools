// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fse from 'fs-extra';
import path from 'path';

import { applyContentSecurityPolicyPatch } from './src/host/polyfills/inspectorContentPolicy';
import { applyRuntimeImportScriptPathPrefixPatch } from './src/host/polyfills/runtime';
import {applyAnnouncementNamePatch, applyReleaseNotePatch, applySettingsCheckboxPatch, applyShowMorePatch} from './src/host/polyfills/releaseNote';
import {
    applyAppendTabOverridePatch,
    applyAppendTabConditionsPatch,
    applyCommonRevealerPatch,
    applyCommandMenuPatch,
    applyCreateExtensionSettingsLegacyPatch,
    applyDefaultTabPatch,
    applyDrawerTabLocationPatch,
    applyExtensionSettingsInstantiatePatch,
    applyExtensionSettingsRuntimeObjectPatch,
    applyPortSettingsFunctionCallPatch,
    applyQuickOpenPatch,
    applyInspectorCommonContextMenuPatch,
    applyInspectorCommonCssPatch,
    applyInspectorCommonCssRightToolbarPatch,
    applyUnhideRightToolbarElementsPatch,
    applyInspectorCommonCssTabSliderPatch,
    applyInspectorCommonNetworkPatch,
    applyInspectorViewCloseDrawerPatch,
    applyInspectorViewShowDrawerPatch,
    applyMainViewPatch,
    applyMoveToContextMenuPatch,
    applyRemoveBreakOnContextMenuItem,
    applyRerouteConsoleMessagePatch,
    applyContextMenuRevealOption,
    applyRemovePreferencePatch,
    applyScreencastCursorPatch,
    applyScreencastTelemetry,
    applyScreencastHeadlessPatch,
    applySetTabIconPatch,
    applyShowDrawerTabs,
    applyStylesRevealerPatch,
    applyStylesToggleFocusPatch,
    applyThemePatch,
    applyNoMatchingStylesPatch,
    applyExtensionSettingExportPatch,
    applyPortSettingsFunctionCreationPatch,
    applyConsoleImportPatch,
    applyExperimentsEnabledPatch,
} from './src/host/polyfills/simpleView';
import { applySetupTextSelectionPatch } from './src/host/polyfills/textSelection';
import { applyThirdPartyI18nLocalesPatch } from './src/host/polyfills/thirdPartyI18n';

async function copyFile(srcDir: string, outDir: string, name: string) {
    await fse.copy(
        path.join(srcDir, name),
        path.join(outDir, name),
    );
}

async function copyStaticFiles() {
    // Copy the static css file to the out directory
    const commonSrcDir = './src/common/';
    const commonOutDir = './out/common/';
    await fse.ensureDir(commonOutDir);
    await copyFile(commonSrcDir, commonOutDir, 'styles.css');

    const sourceFilesPath = path.normalize(__dirname + '/out/edge/src');

    const toolsGenDir = path.normalize(`${sourceFilesPath}/out/Release/gen/devtools/`);
    if (!isDirectory(toolsGenDir)) {
        throw new Error(`Could not find Microsoft Edge output path at '${toolsGenDir}'. ` +
            "Did you run the 'npm run download-edge' script?");
    }

    const toolsResDir = path.normalize(`${sourceFilesPath}/out/Release/resources/inspector/`);

    // Copy the devtools to the out directory
    const toolsOutDir = './out/tools/front_end/';
    await fse.remove('./out/tools/front_end/');
    await fse.ensureDir(toolsOutDir);

    // Copy the devtools generated files to the out directory
    await fse.copy(toolsGenDir, toolsOutDir);

    // Copy the optional devtools resource files to the out directory
    if (isDirectory(toolsResDir)) {
        await copyFile(toolsResDir, toolsOutDir, 'InspectorBackendCommands.js');
        await copyFile(toolsResDir, toolsOutDir, 'SupportedCSSProperties.js');
        await copyFile(
            path.join(toolsResDir, 'accessibility'),
            path.join(toolsOutDir, 'accessibility'),
            'ARIAProperties.js',
        );
    }

    // Patch older versions of the webview with our workarounds
    await patchFilesForWebView(toolsOutDir);
}

async function patchFilesForWebView(toolsOutDir: string) {
    // eslint-disable-next-line no-console
    console.log('Patching files.');
    await patchFileForWebViewWrapper('shell.js', toolsOutDir, [
        applyInspectorCommonContextMenuPatch,
        applyInspectorCommonCssRightToolbarPatch,
        applyUnhideRightToolbarElementsPatch,
        applyInspectorCommonCssPatch,
        applyInspectorCommonNetworkPatch,
        applyInspectorCommonCssTabSliderPatch,
    ]);
    await patchFileForWebViewWrapper('main/MainImpl.js', toolsOutDir, [
        applyInspectorViewCloseDrawerPatch,
        applyMainViewPatch,
        applyExperimentsEnabledPatch,
    ]);
    await patchFileForWebViewWrapper('core/common/Revealer.js', toolsOutDir, [
        applyCommonRevealerPatch,
    ]);
    await patchFileForWebViewWrapper('components/Linkifier.js', toolsOutDir, [
        applyContextMenuRevealOption,
    ]);
    // Post built files swap upstream and downstream names
    await patchFileForWebViewWrapper('panels/elements/StylesSidebarPane_edge.js', toolsOutDir, [
        applyNoMatchingStylesPatch
    ]);
    await patchFileForWebViewWrapper('panels/elements/ElementsPanel.js', toolsOutDir, [
        applySetupTextSelectionPatch,
    ]);
    await patchFileForWebViewWrapper('panels/elements/StylePropertyTreeElement.js', toolsOutDir, [
        applyStylesRevealerPatch,
        applyStylesToggleFocusPatch,
    ]);
    await patchFileForWebViewWrapper('core/host/InspectorFrontendHost.js', toolsOutDir, [
        applyRemovePreferencePatch,
    ]);
    await patchFileForWebViewWrapper('inspector.html', toolsOutDir, [
        applyContentSecurityPolicyPatch,
    ]);
    await patchFileForWebViewWrapper('screencast/screencast.js', toolsOutDir, [
        applyScreencastCursorPatch,
    ]);
    await patchFileForWebViewWrapper('screencast/ScreencastApp.js', toolsOutDir, [
        applyScreencastTelemetry,
        applyScreencastHeadlessPatch,
    ]);
    await patchFileForWebViewWrapper('ui/legacy/TabbedPane.js', toolsOutDir, [
        applyAppendTabOverridePatch,
        applyAppendTabConditionsPatch,
        applySetTabIconPatch,
    ]);
    await patchFileForWebViewWrapper('ui/legacy/InspectorView.js', toolsOutDir, [
        applyMoveToContextMenuPatch,
    ]);
    await patchFileForWebViewWrapper('ui/legacy/InspectorView_edge.js', toolsOutDir, [
        applyDrawerTabLocationPatch,
        applyInspectorViewShowDrawerPatch,
    ]);
    await patchFileForWebViewWrapper('ui/legacy/ViewManager.js', toolsOutDir, [
        applyDefaultTabPatch,
        applyShowDrawerTabs,
    ]);
    await patchFileForWebViewWrapper('core/root/Runtime_edge.js', toolsOutDir, [
        applyRuntimeImportScriptPathPrefixPatch,
    ]);
    await patchFileForWebViewWrapper('core/root/Runtime.js', toolsOutDir, [
        applyExtensionSettingsInstantiatePatch,
        applyExtensionSettingsRuntimeObjectPatch,
        applyExtensionSettingExportPatch,
        applyPortSettingsFunctionCallPatch,
        applyPortSettingsFunctionCreationPatch,
        applyRuntimeImportScriptPathPrefixPatch,
    ]);
    await patchFileForWebViewWrapper('core/root/root-legacy.js', toolsOutDir, [
        applyCreateExtensionSettingsLegacyPatch,
    ]);
    await patchFileForWebViewWrapper('quick_open/CommandMenu_edge.js', toolsOutDir, [
        applyCommandMenuPatch,
    ]);
    await patchFileForWebViewWrapper('quick_open/QuickOpen.js', toolsOutDir, [
        applyQuickOpenPatch,
    ]);
    await patchFileForWebViewWrapper('panels/browser_debugger/DOMBreakpointsSidebarPane.js', toolsOutDir, [
        applyRemoveBreakOnContextMenuItem,
    ]);
    await patchFileForWebViewWrapper('themes/ThemesImpl.js', toolsOutDir, [
        applyThemePatch,
    ]);
    await patchFileForWebViewWrapper('welcome/WelcomePanel.js', toolsOutDir, [
        applyAnnouncementNamePatch,
        applySettingsCheckboxPatch,
    ]);
    await patchFileForWebViewWrapper('panels/help/ReleaseNoteText.js', toolsOutDir, [
        applyReleaseNotePatch,
    ]);
    await patchFileForWebViewWrapper('core/sdk/ConsoleModel.js', toolsOutDir, [
        applyRerouteConsoleMessagePatch,
        applyConsoleImportPatch,
    ]);
    await patchFileForWebViewWrapper('third_party/i18n/i18n-bundle.js', toolsOutDir, [
        applyThirdPartyI18nLocalesPatch,
    ]);
    await patchFileForWebViewWrapper('welcome/WhatsNewList.js', toolsOutDir, [
        applyShowMorePatch,
    ]);
}

// This function wraps the patchFileForWebView function to catch any errors thrown, log them
// and return with an exit code of 1.
// Returning the exit code of 1 will ensure that the Azure Pipeline will fail when patching fails.
async function patchFileForWebViewWrapper(
    filename: string,
    dir: string,
    patches: ((content: string) => string | null)[]) {
    await patchFileForWebView(filename, dir, patches)
        .catch(errorMessage => {
            // tslint:disable-next-line:no-console
            console.error(errorMessage);
            process.exit(1);
        });
}

async function patchFileForWebView(
    filename: string,
    dir: string,
    patches: ((content: string) => string | null)[]) {
    const file = path.join(dir, filename);

    if (!await fse.pathExists(file)) {
        const template = `An expected file was not found: ${file}`;
        throw new Error(template);
    }

    // Read in the file
    let content = (await fse.readFile(file)).toString();

    // Apply each patch in order
    patches.forEach(patchFunction => {
        const patchResult: string | null = patchFunction(content);
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
    copyStaticFiles()
        .catch(errorMessage => {
            // tslint:disable-next-line:no-console
            console.error(errorMessage);
            process.exit(1);
        });
}

main();
