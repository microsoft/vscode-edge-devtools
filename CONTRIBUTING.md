# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

Contributions are always welcome! We only ask that you open an issue first so we can discuss the problem and solution. We don't want you to waste any time headed in the wrong direction.

## Development setup
* Clone this repo
* Run `npm install` in '/vscode-edge-devtools'
* Download and Extract Edge source files
  * run `npm run download-edge`
    * If this step fails, see [Legacy Source File Setup](#legacy-source-file-setup)
    * See [Building with different Edge versions](#building-with-different-edge-versions) to target other versions of Edge
  * The files will be saved at `\vscode-edge-debug\out\edge`
  * Set the `EDGE_CHROMIUM_PATH` environment variable to `[PATH_TO_EXTENSION]\vscode-edge-devtools\scripts\out\edge\src` and the `EDGE_CHROMIUM_OUT_DIR` environment variable to `Release`
    * Check the `download-edge` script output for the command line to set the environment variables for the session
      * Note the command will only set the environment variable for the current session
* Run `npm run build` or `npm run watch` in '/vscode-edge-devtools'
* Open the directory in VS Code
* Select `Launch Extension` debug configuration
* Press `F5` to launch the VS Code extension host environment and debug the extension
* The extension should appear on the left sidebar.  Click the Edge icon on the sidebar to access the extension.

Here are a list of recommended VS Code extensions to use when developing for vscode-edge-devtools:
* [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
* [TSLint](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin)

## Building with different Edge versions
* Navigate to the root extension directory
* Run `node scripts/downloadAndExtractEdge [VERSION_NUMBER]` where `[VERSION_NUMBER]` is a version of Edge
  * The current set of accepted `[VERSION_NUMBER]` values is 83, 84 and 85.  Other numbers will target the currently supported version.
  * To target other versions that this script does not support, see [Legacy Source File Setup](#legacy-source-file-setup).
* This replaces the `npm run download-edge` script in the setup instructions, follow the rest of the instructions to complete setup.

## Legacy Source File Setup
Use this method if the automated methods fail or if the desired version is not supported by the download script.
* Download a copy of the Microsoft Edge build from [https://thirdpartysource.microsoft.com](https://thirdpartysource.microsoft.com), current extension version builds from version 84.0.522.63.
  * Note: Download the 'Microsoft Edge DevTools' zip if available in the desired version and platform - it will be much faster.
* Extract the necessary files from the zip
  * On an administrator prompt execute the following commands (assuming your drive is located at C:\)
    * **Windows**: `mkdir [PATH_TO_EXTENSION]\vscode-edge-devtools\out\edge\src\out\Release\gen\devtools&&mkdir [PATH_TO_EXTENSION]\out\edge\src\third_party\devtools-frontend\src\front_end`
    * **Mac/Linux**: `mkdir -p [PATH_TO_EXTENSION]/vscode-edge-devtools/out/edge/src/out/Release/gen/devtools&&mkdir -p [PATH_TO_EXTENSION]/out/edge/src/third_party/devtools-frontend/src/front_end`
  * **Open** the zip file and (inside the zip file) navigate to:
    * `[COMPRESSED_FILE]\src\third_party\devtools-frontend\src\front_end`
    * copy the contents of the "front_end" folder and paste them into `[PATH_TO_EXTENSION]/vscode-edge-devtools/out/edge/src/third_party/devtools-frontend/src/front_end`
  * **Open** the zip file and (inside the zip file) navigate to:
    * `[COMPRESSED_FILE]\src\out\Release\gen\devtools`
    * copy the contents of the "devtools" folder and paste them into `[PATH_TO_EXTENSION]/vscode-edge-devtools/out/edge/src/out/Release/gen/devtools`
* Set the `EDGE_CHROMIUM_PATH` environment variable to `[PATH_TO_EXTENSION]\vscode-edge-devtools\out\edge\src` and `EDGE_CHROMIUM_OUT_DIR` environment variable to `Release`
    * **Windows**: `set EDGE_CHROMIUM_PATH=[PATH_TO_EXTENSION]\vscode-edge-devtools\out\edge\src&&set EDGE_CHROMIUM_OUT_DIR=Release`
    * **Mac/Linux**: `export EDGE_CHROMIUM_PATH=[PATH_TO_EXTENSION]/vscode-edge-devtools/out/edge/src&&export EDGE_CHROMIUM_OUT_DIR=Release`

## Testing
* There are a set of jest tests which can be run with `npm run test`.
* You may also run `npm run lint` separately to check your code against our tslint rules.
* Open the directory in VS Code
* Select `Launch Tests` debug configuration
* Press `F5` to attach the debugger and start the tests

## Issue tags
* "Bug": Something that should work is broken
* "Enhancement": AKA feature request - adds new functionality
* "Task": Something that needs to be done that doesn't really fix anything or add major functionality. Tests, engineering, documentation, etc.
