// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const fs = require('fs-extra');
const path = require('path');
const yargs = require('yargs');
const https = require('https');
const unzipper = require('unzipper');
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;


const TARGET_VERSION = '91.0.864.48';
const targetVersionMap = new Map([
  ['88', '88.0.705.9'],
  ['91', '91.0.864.48'],
]);

function fetchJsonFromUrl(url){
  const Httpreq = new XMLHttpRequest();
  Httpreq.open("GET", url, false);
  Httpreq.send(null);
  return Httpreq.responseText;
}

function fetchDownloadUrl(version) {
  const jsonString = fetchJsonFromUrl('https://thirdpartysource.microsoft.com/downloads');
  const jsonObjects = JSON.parse(jsonString);
  const fullVersion = targetVersionMap.get(version) || TARGET_VERSION;

  console.log(`Downloading Microsoft Edge DevTools version ${fullVersion}`);
  for (let object of jsonObjects) {
    if (object.product === 'Microsoft Edge DevTools' && object.release === fullVersion) {
      return object.url;
    }
  }
}

async function downloadZipFile(downloadUrl) {
  await fs.remove('out/edge');

  const file = fs.createWriteStream('edge.zip');
  https.get(downloadUrl, function(response) {
    response.pipe(file);
    response.on('end', async ()=>{
      await fs.createReadStream('edge.zip').pipe(unzipper.Extract({path: 'out/edge/'}));
      await fs.unlink('edge.zip', () => {} );
      const outdir = path.join(__dirname, 'out', 'edge');
      console.log(`Edge files extracted to: ${outdir}`);
    });
  });
}

const usageMessage =
`
Script to download the devtools frontend files needed to build the extension
node scripts/downloadAndExtractEdge --version
    version: optional version number to build a specific version of devtools.
    Defaults to latest version.
`;

async function main() {
  const args = yargs.parse(process.argv);
  if (args.usage) {
    console.log(usageMessage);
    return;
  }
  const version = args.version || undefined;
  const downloadUrl = fetchDownloadUrl(version);
  await downloadZipFile(downloadUrl);
}

main();
