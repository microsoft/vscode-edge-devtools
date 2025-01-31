## 2.1.8
* **[Bug Fix]**: Updating application insights key - [PR #2743](https://github.com/microsoft/vscode-edge-devtools/pull/2743)

## 2.1.7
* **[Bug Fix]**: Use substituted config instead of raw - [PR #2485](https://github.com/microsoft/vscode-edge-devtools/pull/2485)
* **[Upgrade]**: Updating puppeteer-core and jest dependencies - [PR #2702](https://github.com/microsoft/vscode-edge-devtools/pull/2702)
* **[Upgrade]**: Upgrading typescript and vscode-extension-telemetry - [PR #2704](https://github.com/microsoft/vscode-edge-devtools/pull/2704)
* **[Feature]**: Adding launchURL argument for the vscode-edge-devtools.launch command - [PR #2721](https://github.com/microsoft/vscode-edge-devtools/pull/2721)
* **[Upgrade]**: Bump undici from 6.19.8 to 6.21.1 - [PR #2714](https://github.com/microsoft/vscode-edge-devtools/pull/2714)
* **[Bug Fix]**: Copy element as any selector is not working ( > 134.0.3109.0) - [PR #2727](https://github.com/microsoft/vscode-edge-devtools/pull/2727)
* **[Upgrade]**:Ramping up fallback version - [PR #2740](https://github.com/microsoft/vscode-edge-devtools/pull/2740)

## 2.1.6
* **[Bug Fix]**: Fixing an issue where webhint was not being loaded - [PR #2418](https://github.com/microsoft/vscode-edge-devtools/pull/2418)
* **[Bug Fix]**: Updating fallback version to 127 - [PR #2425](https://github.com/microsoft/vscode-edge-devtools/pull/2425)
* **[Upgrade]**: Bump puppeteer to v18 - [PR #2423](https://github.com/microsoft/vscode-edge-devtools/pull/2423)
* **[Upgrade]**: Bumping several dependencies to newer versions - [PR #2417](https://github.com/microsoft/vscode-edge-devtools/pull/2417)

## 2.1.5
* **[Bug Fix]**: Fixing relaunch scenario on headless - [PR #1979](https://github.com/microsoft/vscode-edge-devtools/pull/1979)
* **[Bug Fix]**: Patch for missing icons - [PR #2045](https://github.com/microsoft/vscode-edge-devtools/pull/2045)
* **[Bug Fix]**: Updating fallback version to 120 - [PR #2046](https://github.com/microsoft/vscode-edge-devtools/pull/2046)

## 2.1.4
* **[Bug Fix]**: Extension fails to relaunch an instance (headless) - [PR #1978](https://github.com/microsoft/vscode-edge-devtools/pull/1978)
* **[Bug Fix]**: Error while fetching list of available targets No available targets to attach - [PR #1804](https://github.com/microsoft/vscode-edge-devtools/pull/1804)
* **[Bug Fix]**: Updates most dependencies to latest versions - [PR #1642](https://github.com/microsoft/vscode-edge-devtools/pull/1642)

## 2.1.3
* **[Bug Fix]**: Adding dashes for passing arguments to scripts  - [PR #1624](https://github.com/microsoft/vscode-edge-devtools/pull/1624)
* **[Feature]**: Reducing size of extension bundle (Produce production builds by default) - [PR #1598](https://github.com/microsoft/vscode-edge-devtools/pull/1598)
* **[Feature]**: Updating vscode-webhint version to 2.1.10  - [PR #1560](https://github.com/microsoft/vscode-edge-devtools/pull/1560)
* **[Bug Fix]**: Changed screencast label to toggle browser to comply with docs  - [PR #1331](https://github.com/microsoft/vscode-edge-devtools/pull/1331)

## 2.1.2
* **[Bug Fix]**: Updating fallback version for the devtools revision - [PR #1290](https://github.com/microsoft/vscode-edge-devtools/pull/1290)

## 2.1.1
* **[Feature]**: Add Code Actions and Autofix - [PR #1086](https://github.com/microsoft/vscode-edge-devtools/pull/1086), [PR #1122](https://github.com/microsoft/vscode-edge-devtools/pull/1122), [PR #1173](https://github.com/microsoft/vscode-edge-devtools/pull/1173)

## 2.1.0
* **[Feature]**: Add context menu option to open html file with Edge DevTools - [PR #1057](https://github.com/microsoft/vscode-edge-devtools/pull/1057)
* **[Feature]**: Add text-only clipboard functionality - [PR #1035](https://github.com/microsoft/vscode-edge-devtools/pull/1035)
* **[Feature]**: Bump min DevTools version to include the Application panel - [PR #1030](https://github.com/microsoft/vscode-edge-devtools/pull/1030)
* **[Feature]**: Support file system paths in screencast address bar - [PR #1015](https://github.com/microsoft/vscode-edge-devtools/pull/1015)
* **[Bug Fix]**: Fix CSS mirroring for CRLF - [PR #1085](https://github.com/microsoft/vscode-edge-devtools/pull/1085)
* **[Bug Fix]**: Route no config debug session to default launch experience - [PR #1040](https://github.com/microsoft/vscode-edge-devtools/pull/1040)
* **[Bug Fix]**: Stop CSS Mirroring warning from re-firing if active - [PR #1037](https://github.com/microsoft/vscode-edge-devtools/pull/1037)
* **[Bug Fix]**: Change Open DevTools button to Toggle DevTools - [PR #1032](https://github.com/microsoft/vscode-edge-devtools/pull/1032)
* **[Bug Fix]**: Clean up obsolete settings and debugger types - [PR #1026](https://github.com/microsoft/vscode-edge-devtools/pull/1026), [PR #1024](https://github.com/microsoft/vscode-edge-devtools/pull/1024), [PR #1022](https://github.com/microsoft/vscode-edge-devtools/pull/1022), [PR #1021](https://github.com/microsoft/vscode-edge-devtools/pull/1021), [PR #1020](https://github.com/microsoft/vscode-edge-devtools/pull/1020), [PR #1017](https://github.com/microsoft/vscode-edge-devtools/pull/1017), [PR #1016](https://github.com/microsoft/vscode-edge-devtools/pull/1016)

## 2.0.0
* **[Feature]**: Screencast V2 - adds media feature emulation, vision deficiency emulation, and updates the Screencast UI - [PR #983](https://github.com/microsoft/vscode-edge-devtools/pull/983)
* **[Feature]**: Better sourcemap support for CSS Mirroring
* **[Bug Fix]**: Fix mapping input coordinates when VS Code is zoomed [#978](https://github.com/microsoft/vscode-edge-devtools/pull/978)
* **[Bug Fix]**: Fix scaling down emulated devices to fit available space [#981](https://github.com/microsoft/vscode-edge-devtools/pull/981)
* **[Bug Fix]**: Forward keyboard shortcuts via screencast [#984](https://github.com/microsoft/vscode-edge-devtools/pull/984)
* **[Bug Fix]**: Add Edge icon to webviews and s/Screencast/Browser/ [#995](https://github.com/microsoft/vscode-edge-devtools/pull/995)
* **[Bug Fix]**: Add an inspect button to open DevTools from the screencast [#991](https://github.com/microsoft/vscode-edge-devtools/pull/991)

## 1.4.8
* **[Feature]**: Support CSS Mirroring Enablement from DevTools frontend - [PR #932](https://github.com/microsoft/vscode-edge-devtools/pull/932)
* **[Bug Fix]**: Stop debugging session on a headless target when both DevToolsPanel and Screencast are closed - [PR #966](https://github.com/microsoft/vscode-edge-devtools/pull/966)
* **[Feature]**: Warn and pause mirroring CSS if it would override local edits - [PR #963](https://github.com/microsoft/vscode-edge-devtools/pull/963)
* **[Bug Fix]**: Remove theme settings + add auto-detection for light/dark theme for unsupported vscode themes - [PR #975](https://github.com/microsoft/vscode-edge-devtools/pull/975)
* **[Feature]**: Add telemetry for webhint hover events - [PR #986](https://github.com/microsoft/vscode-edge-devtools/pull/986)
* **[Bug Fix]**: Updating webhint version - [PR #992](https://github.com/microsoft/vscode-edge-devtools/pull/992)

## 1.4.7
* **[Bug Fix]**: Update vscode-webhint to version 1.6.6. Fixes "Unable to start webhint" errors - [PR #951](https://github.com/microsoft/vscode-edge-devtools/pull/951)
* **[Bug Fix]**: Improve logic for configuring existing launch.json - [PR #945](https://github.com/microsoft/vscode-edge-devtools/pull/945)

## 1.4.6
* **[Feature]**: Enable console tool in DevTools (Only available on Edge version 101.0.1193.0+) - [PR #905](https://github.com/microsoft/vscode-edge-devtools/pull/905)
* **[Feature]**: Updated auto-generated launch.json configs to use JSDebug workflows - [PR #927](https://github.com/microsoft/vscode-edge-devtools/pull/927)
* **[Feature]**: Extension now caches and copies the last successful connection to the DevTools. This enables offline usage and overall availability. - [PR #916](https://github.com/microsoft/vscode-edge-devtools/pull/916)
* **[Feature]**: Updated webhint to 1.6.5. - [PR #920](https://github.com/microsoft/vscode-edge-devtools/pull/920)
* **[Bug Fix]**: Use webRoot config for source path resolution. Improves stability of openInEditor/CSS sync functionalities - [PR #885](https://github.com/microsoft/vscode-edge-devtools/pull/885)

## 1.4.5
* **[Bug Fix]**: Fixes browser comparison bug that caused extension to fetch wrong DevTools UI bundle from CDN - [PR #886](https://github.com/microsoft/vscode-edge-devtools/pull/886)

## 1.4.4
* **[Bug Fix]**: Fixing bug where missing UserDataDir causes failure preventing extension from launching - [PR #871](https://github.com/microsoft/vscode-edge-devtools/pull/871)
* **[Bug Fix]**: Fixing a bug where the screencast is not initialized correctly on first launch with JSDebug - [PR #869](https://github.com/microsoft/vscode-edge-devtools/pull/869)

## 1.4.3
* **[Feature]**: Switch to headless by default - [PR #751](https://github.com/microsoft/vscode-edge-devtools/pull/751)
* **[Feature]**: Refine prompt informing users of errors - [PR #807](https://github.com/microsoft/vscode-edge-devtools/pull/807)
* **[Bug Fix]**: Fix open folder link to be a button - [PR #803](https://github.com/microsoft/vscode-edge-devtools/pull/803)

## 1.4.2
* **[Feature]**: Launch Microsoft Edge with specified args - [PR #623](https://github.com/microsoft/vscode-edge-devtools/pull/623)
* **[Feature]**: Warn when using deprecated 'edge' or 'msedge' launch types - [PR #690](https://github.com/microsoft/vscode-edge-devtools/pull/690)
* **[Bug Fix]**: Fix using screencast with js-debug session - [PR #688](https://github.com/microsoft/vscode-edge-devtools/pull/688)
* **[Bug Fix]**: Fix screencast incorrectly prefixing URLs with http:// - [PR #689](https://github.com/microsoft/vscode-edge-devtools/pull/689)

## 1.4.1
* **[Feature]**: Updating webhint version to fix bug where static analysis squigglies underline only the first letter. - [PR #608](https://github.com/microsoft/vscode-edge-devtools/pull/608)
* **[Feature]**: Update list of devices for device emulation in standalone screencast - [PR #595](https://github.com/microsoft/vscode-edge-devtools/pull/595)
* **[Bug Fix]**: Set correct user agent string in device emulation - [PR #604](https://github.com/microsoft/vscode-edge-devtools/pull/604)

## 1.4.0
* **[Feature]**: Introducing the new standalone screencast with device emulation as the default screencast experience!  - [PR #513](https://github.com/microsoft/vscode-edge-devtools/pull/513), [PR #564](https://github.com/microsoft/vscode-edge-devtools/pull/564)
* **[Feature]**: Implemented static analysis using webhint language server which offers inline feedback on your source code. - [PR #566](https://github.com/microsoft/vscode-edge-devtools/pull/566)
* **[Bug Fix]**: Screencast quality of life improvements  - [PR #522](https://github.com/microsoft/vscode-edge-devtools/pull/475), [PR #555](https://github.com/microsoft/vscode-edge-devtools/pull/555), [PR #559](https://github.com/microsoft/vscode-edge-devtools/pull/559)
* **[Bug Fix]**: Screencast bug fixes  - [PR #556](https://github.com/microsoft/vscode-edge-devtools/pull/475), [PR #558](https://github.com/microsoft/vscode-edge-devtools/pull/555), [PR #561](https://github.com/microsoft/vscode-edge-devtools/pull/559)

## 1.3.1
* **[Feature]**: Error handling implementation. - [PR #475](https://github.com/microsoft/vscode-edge-devtools/pull/475)
* **[Feature]**: Implement CSS mirror editing - [PR #462](https://github.com/microsoft/vscode-edge-devtools/pull/462)
* **[Bug Fix]**: Properly resolve index.html and other entrypoint links - [PR #469](https://github.com/microsoft/vscode-edge-devtools/pull/469)
* **[Feature]**: Introducing error reporter. - [PR #474](https://github.com/microsoft/vscode-edge-devtools/pull/474)
* **[Bug Fix]**: Supporting following CSS links on WSL remotes - [PR #467](https://github.com/microsoft/vscode-edge-devtools/pull/467)

## 1.3.0
* **[Feature]**: The Extension now retrieves DevTools that directly match supported browser targets - Microsoft Edge 94.0.988.0 and newer. - [PR #449](https://github.com/microsoft/vscode-edge-devtools/pull/449)
* **[Feature]**: Targeting Microsoft Edge Version 94.0.988.0 and newer now supports automatically changing themes to match built in Visual Studio Code themes. - [PR #455](https://github.com/microsoft/vscode-edge-devtools/pull/455)
* **[Deprecation]**: The Extension's DevTools Console output has been deprecated in favor of Visual Studio Code's Debug Console. - [PR #460](https://github.com/microsoft/vscode-edge-devtools/pull/460)
* **[Documentation]**: The Extension sidebar now provides direct links to our documentation and issue pages. - [PR #459](https://github.com/microsoft/vscode-edge-devtools/pull/459)

## 1.2.1
* **[Feature]**: The Extension now has limited support for Visual Studio Code's Workspace Trust Feature - [PR #431](https://github.com/microsoft/vscode-edge-devtools/pull/431)
* **[Bug Fix]**: DevTools Drawer now shows close button - [PR #426](https://github.com/microsoft/vscode-edge-devtools/pull/426)
* **[Bug Fix]**: Add support for JavaScript Debugger connections on remote workspaces - [PR #444](https://github.com/microsoft/vscode-edge-devtools/pull/444)
* **[Documentation]**: Updated Github default branch and documentation to main - [PR #425](https://github.com/microsoft/vscode-edge-devtools/pull/425)

## 1.2.0
* **[Feature]**: The active DevTools window can now swtich between targets in the Target's list without needing to close and reopen. - [PR #415](https://github.com/microsoft/vscode-edge-devtools/pull/415)
* **[Update]**: Edge DevTools Update - We have updated the DevTools version from 88 to 91. - [PR #414](https://github.com/microsoft/vscode-edge-devtools/pull/414)
* **[Documentation]**: New home for Microsoft Edge DevTools for VS Code documentation. - [vscode-edge-devtools](https://microsoft.github.io/vscode-edge-devtools/)
* **[Bug Fix]**: Styles pane informs users to refresh if attached to an initially paused target - [PR #410](https://github.com/microsoft/vscode-edge-devtools/pull/410)
* **[Bug Fix]**: Updating Webpack Sourcemapping Overrides - [PR #423](https://github.com/microsoft/vscode-edge-devtools/pull/423)
* **[Bug Fix]**: DevTools Console Output channel disabled when using Visual Studio Code JavaScript Debugger's Inspect entrypoint - [PR #412](https://github.com/microsoft/vscode-edge-devtools/pull/412)

## 1.1.9
* **[Feature]**: New integration with VSCode's JavaScript Debugger for attaching Microsoft Edge Devtools to the active debug target - [PR #391](https://github.com/microsoft/vscode-edge-devtools/pull/391)
* **[Bug Fix]**: Accessibility - Screen readers now announces a success message for when using the "Toggle Property and continue editing" option in the style property context menu - [PR #390](https://github.com/microsoft/vscode-edge-devtools/pull/390)

## 1.1.8
* **[Feature]**: New default start page when launching Edge DevTools with useful instructions and links - [PR #350](https://github.com/microsoft/vscode-edge-devtools/pull/350)
* **[Feature]**: New landing sidebar view for empty target lists with buttons to help launch a target or set up the launch.json file - [PR #357](https://github.com/microsoft/vscode-edge-devtools/pull/357)
* **[Bug Fix]**: Adding and applying ESLint rules
 [PR #335](https://github.com/microsoft/vscode-edge-devtools/pull/335)
* **[Bug Fix]**: Edge DevTools instance now hosted directly inside the WebView - [PR #367](https://github.com/microsoft/vscode-edge-devtools/pull/367)

## 1.1.7
* **[Bug Fix]**: Retain focus on property after toggling with context menu
 [PR #332](https://github.com/microsoft/vscode-edge-devtools/pull/332)
* **[Bug Fix]**: Extension does not work and panel is blank - [PR #342](https://github.com/microsoft/vscode-edge-devtools/pull/342)

## 1.1.6
* **[Feature]**: Update Edge version to 88.0.705.9 - [PR #302](https://github.com/microsoft/vscode-edge-devtools/pull/302)
* **[Bug Fix]**: Support for ARM devices [PR #293](https://github.com/microsoft/vscode-edge-devtools/pull/318)
* **[Bug Fix]**: Side panel auto-refreshes when targets are created or destroyed - [PR #300](https://github.com/microsoft/vscode-edge-devtools/pull/300)
* **[Bug Fix]**: Fixed bug where extension would be frozen loading favicons - [PR #293](https://github.com/microsoft/vscode-edge-devtools/pull/299)
* **[Bug Fix]**: Increased stability to close target functionality - [PR #316](https://github.com/microsoft/vscode-edge-devtools/pull/316)
* **[Bug Fix]**: Removed Debugger for Microsoft Edge as a dependency - [PR #329](https://github.com/microsoft/vscode-edge-devtools/pull/329)

## 1.1.5
* **[Feature]**: Add dropdown menu in title view containing link to settings and changelog - [PR #288](https://github.com/microsoft/vscode-edge-devtools/pull/288)
* **[Feature]**: Created setting to show/hide service and shared workers from the target list - [PR #284](https://github.com/microsoft/vscode-edge-devtools/pull/284)
* **[Bug Fix]**: Fixed vscode-edge-devtools-view.launch/refresh not found - [PR #287](https://github.com/microsoft/vscode-edge-devtools/pull/287)
* **[Bug Fix]**: Fixed bug where multiple DevTools console output channels would persist - [PR #292](https://github.com/microsoft/vscode-edge-devtools/pull/292)

## 1.1.4
* **[Feature]**: DevTools Console messages now reroute to the VSCode output window - [PR #275](https://github.com/microsoft/vscode-edge-devtools/pull/275)
* **[Feature]**: Target website favicon displays in the extension's target list - [PR #278](https://github.com/microsoft/vscode-edge-devtools/pull/278)
* **[Bug Fix]**: Links to source code in Elements pane now redirect as expected - [PR #264](https://github.com/microsoft/vscode-edge-devtools/pull/264)
* **[Bug Fix]**: Screencast cursor now uses default cursor - [PR #279](https://github.com/microsoft/vscode-edge-devtools/pull/279)
* **[Feature]**: Read about the latest changes like these in the What's New tab - [PR #281](https://github.com/microsoft/vscode-edge-devtools/pull/281)

## 1.1.3
* Bumping Edge Devtools version from 85.0.564.40 to 87.0.668.0 - [PR #235](https://github.com/microsoft/vscode-edge-devtools/pull/251)

## 1.1.2
* Bumping Edge Devtools version from 84.0.522.63 to 85.0.564.40 - [PR #235](https://github.com/microsoft/vscode-edge-devtools/pull/235)
* Included Debugger for Microsoft Edge as a dependency - [PR #233](https://github.com/microsoft/vscode-edge-devtools/pull/233)
* Implemented settings option to change extension themes - [PR #229](https://github.com/microsoft/vscode-edge-devtools/pull/229)
* Added a "Close instance" button to each item on the target list - [PR #248](https://github.com/microsoft/vscode-edge-devtools/pull/248)

## 1.1.1
* Adding support for Linux - [PR #225](https://github.com/microsoft/vscode-edge-devtools/pull/225)
* Fixing command key shortcuts for Mac users - [PR #223](https://github.com/microsoft/vscode-edge-devtools/pull/223)
* Tools rename to "Microsoft Edge Tools for VS Code" - [PR #206](https://github.com/microsoft/vscode-edge-devtools/pull/206)

## 1.1.0
* Updated to version 84.0.522.63
* Improved Mac contributing workflow - [PR #174](https://github.com/microsoft/vscode-edge-devtools/pull/174)
* Webview resources fix to work with newer versions of vscode - [PR #176](https://github.com/microsoft/vscode-edge-devtools/pull/176)
* Debug mode removed - [PR #183](https://github.com/microsoft/vscode-edge-devtools/pull/183)
* Introduced headless browser mode - [PR #185](https://github.com/microsoft/vscode-edge-devtools/pull/185)

## 1.0.9
* Updated to version 83.0.478.45
* Added extension settings toggle to toggle network panel on and off - [PR #136](https://github.com/microsoft/vscode-edge-devtools/pull/136)
* Upgraded DevOps pipeline to build and test using Edge source code - [PR #145](https://github.com/microsoft/vscode-edge-devtools/pull/145)
* Improved contributing workflow by implementing a download script - [PR #167](https://github.com/microsoft/vscode-edge-devtools/pull/167)
* Other bug fixes and quality of life improvements

## 1.0.8
* Downgraded Edge DevTools version to 81.0.416 (Microsoft Edge Stable)
* Merged Network Tool into the extension - [PR #128](https://github.com/microsoft/vscode-edge-devtools/pull/128)
* Renaming tool to "Microsoft Edge Tools for VS Code"

## 1.0.7
* Updated to version 82.0.423
* Fixing issue with Styles panel links

## 1.0.6
* Updating icon

## 1.0.5
* Fixed issue with extension and VSCode 1.40 - [PR #109](https://github.com/microsoft/vscode-edge-devtools/pull/109)
* Bumped elements tool version to `80.0.331.0`

## 1.0.4
* Minor change to icon

## 1.0.3
* Added Debugger for Microsoft Edge integration - [PR #96](https://github.com/microsoft/vscode-edge-devtools/pull/96)
* Fixed content-security-policy - [PR #95](https://github.com/microsoft/vscode-edge-devtools/pull/95)
* Fixed closing browser now also closes elements tool - [PR #89](https://github.com/microsoft/vscode-edge-devtools/pull/89)
* Bumped elements tool version to `78.0.273.0`
* Updated readme

## 1.0.2
* Added open links in editor feature - [PR #83](https://github.com/microsoft/vscode-edge-devtools/pull/83)
* Added new settings and launch.json configs for sourcemaps - See [Sourcemaps](https://github.com/microsoft/vscode-edge-devtools#sourcemaps)
* Bumped elements tool version to `77.0.223.0`
* Updated readme

## 1.0.1
* Fixed launch procedure so that remote debugging will be enabled correctly - [PR #67](https://github.com/microsoft/vscode-edge-devtools/pull/67)
* Updated readme

## 1.0.0
* Initial preview release
