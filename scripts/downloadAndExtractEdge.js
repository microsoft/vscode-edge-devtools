// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const TARGET_VERSION = '91.0.864.48';
const targetVersionMap = new Map([
  ['83', '83.0.478.45'],
  ['84', '84.0.522.63'],
  ['85', '85.0.564.40'],
  ['86', '86.0.623.0'],
  ['87', '87.0.668.0'],
  ['88', '88.0.705.9'],
  ['91', '91.0.864.48'],
]);
var isWindows = true;

function getTargetVersion(version) {
  let fullVersion = targetVersionMap.get(version);
  if (!fullVersion) {
    fullVersion = TARGET_VERSION;
  }
  return fullVersion;
}

function fetchJsonFromUrl(url){
  var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
  var Httpreq = new XMLHttpRequest();
  Httpreq.open("GET", url, false);
  Httpreq.send(null);
  return Httpreq.responseText;
}

function fetchDownloadUrl(version) {
  const jsonString = fetchJsonFromUrl('https://thirdpartysource.microsoft.com/downloads');
  const jsonObjects = JSON.parse(jsonString);
  let fullVersion = TARGET_VERSION;
  if (version) {
    fullVersion = getTargetVersion(version);
  }
  console.log(`Downloading Microsoft Edge DevTools version ${fullVersion}`);
  for (let object of jsonObjects) {
    if (object.product === 'Microsoft Edge DevTools' && object.release === fullVersion) {
      return object.url;
    }
  }
}

function removeLastDirectory(filepath) {
  const splitChar = isWindows ? '\\' : '/';
  const arr = filepath.split(splitChar);
  arr.pop();
  return( arr.join(splitChar) );
}

async function downloadZipFile(downloadUrl) {
  const https = require('https');
  const fs = require('fs-extra');
  const unzipper = require('unzipper');
  await fs.remove('out/edge');

  const file = fs.createWriteStream('edge.zip');
  https.get(downloadUrl, function(response) {
    response.pipe(file);
    response.on('end', async ()=>{
      await fs.createReadStream('edge.zip').pipe(unzipper.Extract({path: 'out/edge/'}));
      await fs.unlink('edge.zip', () => {} );
      let dirName = __dirname;
      if (isWindows) {
        const flipSlashDirName = dirName.replace(/\//g, '\\');
        const rootPath = removeLastDirectory(flipSlashDirName);
        console.log('Edge files extracted to: ' + rootPath + '\\out\\edge\n');
      } else {
        const rootPath = removeLastDirectory(dirName);
        console.log('Edge files extracted to: ' + rootPath + '/out/edge');
      }
    });
  });
}

const version = process.argv.slice(2)[0];
const downloadUrl = fetchDownloadUrl(version);
downloadZipFile(downloadUrl);
