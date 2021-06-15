// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const fs = require('fs-extra');
const path = require('path');
const uglify = require('uglify-js');
const yargs = require('yargs');
const glob = require('glob');

const uglifyOptions = {
    mangle: false,
    compress: true,
};

const usageMessage =
`
Script to uglify all devtools-frontend files needed for extension
node scripts/uglifyDevtools --inputDir --outputDir
    inputDir: path to input dt-fe folder, default is './out/tools/front_end'
    outputDir: path to output dt-fe folder, default is inputDir (in-place replacement)
`;

const main = async function(){
  const args = yargs.parse(process.argv);
  if (args.usage) {
    console.log(usageMessage);
    return;
  }

  let inputDir = './out/tools/front_end';
  let outputDir = inputDir;

  if (args.inputDir) {
    inputDir = args.inputDir
  }
  if (args.outputDir) {
    outputDir = args.outputDir
  }

  const jsFiles = glob.sync(`${inputDir}/**/*.js`);
  console.log("Minifying code");

  for (file of jsFiles) {
    const relDir = path.relative(inputDir, path.dirname(file));
    const relPath = path.relative(inputDir, file);
    await fs.ensureDir(path.join(outputDir, relDir), {recursive: true});
    const inputCode = fs.readFileSync(file, "utf-8");
    const code = uglify.minify(
        {file: inputCode},
        uglifyOptions
    ).code;
    fs.writeFileSync(path.join(outputDir, relPath), code);
  }
  console.log("Done");
}

main();
