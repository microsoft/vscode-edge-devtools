//
// Copyright (C) Microsoft. All rights reserved.
//

import * as fse from "fs-extra";

async function copyFile(srcDir: string, outDir: string, name: string) {
    await fse.copy(`${srcDir}${name}`, `${outDir}${name}`);
}

async function copyStaticFiles() {
    // Copy the static html file to the out directory
    const hostSrcDir = "./src/host/";
    const hostOutDir = "./out/host/";
    await fse.ensureDir(hostOutDir);
    await copyFile(hostSrcDir, hostOutDir, "devtools.html");
}

copyStaticFiles();
