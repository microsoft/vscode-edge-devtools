## 1.1.8
* **[Feature]**: New default start page when launching Edge DevTools with useful instructions and links - [PR #350](https://github.com/microsoft/vscode-edge-devtools/pull/350)
* **[Feature]**: New landing sidebar view for empty target lists with buttons to help launch a target or set up the launch.json file - [PR #357](https://github.com/microsoft/vscode-edge-devtools/pull/357)

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
