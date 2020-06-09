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
  * Using `downloadAndExtractEdge.sh` (Windows Only)
    * In a bash shell, run `./scripts/downloadAndExtractEdge.sh [OUTPUT_DIR]` where `[OUTPUT_DIR]` is the desired extraction output directory
      * e.g. `./scripts/downloadAndExtractEdge.sh c:/edge`
    * This will download the current stable version of Edge that the extension supports (currently 81.0.416)
  * Traditional Method
    * Download a copy of the Microsoft Edge (Chromium) build from [https://thirdpartysource.microsoft.com](https://thirdpartysource.microsoft.com), current extension version builds from version 81.0.416.
      * Note: Download the 'Microsoft Edge DevTools' zip if available in the desired version and platform - it will be much faster.
    * Extract the necessary files from the zip
      * Use `unzipEdge.sh` (.zip format only)
        * In a bash shell, run `./scripts/unzipEdge.sh [EDGE_ZIP_PATH] [OUTPUT_DIR]`
          * e.g. `./scripts/unzipEdge.sh "C:\Users\username\Downloads\Microsoft Edge DevTools_81.0.416.72_Windows x64_chromium.zip" "C:/edge/"`
        * The script is designed to be compatible with both Microsoft Edge zips and Microsoft Edge DevTools zips
      * Manual approach (for .tar/.tgz or if scripts fail)
        * On an administrator prompt execute the following commands (assuming your drive is located at C:\)
          * `mkdir c:\edge\src\out\Release\gen\devtools`
          * `mkdir c:\edge\src\third_party\devtools-frontend\src\front_end`
        * **Open** the zip file and (inside the zip file) navigate to:
          * `[COMPRESSED_FILE]:\src\third_party\devtools-frontend\src\front_end`
          * copy the contents of the "front_end" folder and paste them into `c:\edge\src\third_party\devtools-frontend\src\front_end`
        * **Open** the zip file and (inside the zip file) navigate to:
          * `[COMPRESSED_FILE]:\src\out\Release\gen\devtools`
          * copy the contents of the "devtools" folder and paste them into `c:\edge\src\out\Release\gen\devtools`
* Set the `EDGE_CHROMIUM_PATH` environment variable to `c:\edge\src` (assuming your drive is located at C:\) or to `[OUTPUT_DIR]\src` if using the scripts
* Set the `EDGE_CHROMIUM_OUT_DIR` environment variable to `Release`
* Run `npm run build` or `npm run watch` in '/vscode-edge-devtools'
* Open the directory in VSCode
* Select `Launch Extension` debug configuration
* Press `F5` to launch the VSCode extension host environment and debug the extension

Here are a list of recommended VSCode extensions to use when developing for vscode-edge-devtools:
* [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
* [TSLint](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin)


## Testing
* There are a set of jest tests which can be run with `npm run test`.
* You may also run `npm run lint` separately to check your code against our tslint rules.
* Open the directory in VSCode
* Select `Launch Tests` debug configuration
* Press `F5` to attach the debugger and start the tests

## Issue tags
* "Bug": Something that should work is broken
* "Enhancement": AKA feature request - adds new functionality
* "Task": Something that needs to be done that doesn't really fix anything or add major functionality. Tests, engineering, documentation, etc.
