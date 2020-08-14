const TARGET_VERSION = '83.0.478.45';
var isWindows = true;

function fetchJsonFromUrl(url){
  var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
  var Httpreq = new XMLHttpRequest();
  Httpreq.open("GET", url, false);
  Httpreq.send(null);
  return Httpreq.responseText;
}

function fetchDownloadUrl(platform) {
  const jsonString = fetchJsonFromUrl('https://thirdpartysource.microsoft.com/downloads');
  const jsonObjects = JSON.parse(jsonString);
  const platformString = retrievePlatform(platform);
  console.log('Downloading Microsoft Edge DevTools version ' + TARGET_VERSION + ' for ' + platformString);
  for (let object of jsonObjects) {
    if (object.product === 'Microsoft Edge DevTools' && object.release === TARGET_VERSION && object.platform === platformString) {
      return object.url;
    }
  }
}

function retrievePlatform(platform) {
  if (!platform) {
    switch (process.platform) {
      case 'win32':
        return 'Windows x64';
      default:
        isWindows = false;
        return 'Mac OS x64';
    }
  }
  switch (platform.toLowerCase()) {
    case 'win':
      return 'Windows x64';
    default:
      isWindows = false;
      return 'Mac OS x64';
  }
}

function removeLastDirectory(filepath) {
    const splitChar = isWindows ? '\\' : '/';
    var arr = filepath.split(splitChar);
    arr.pop();
    return( arr.join(splitChar) );
}

async function downloadZipFile(downloadUrl) {
  const https = require('https');
  const fs = require('fs-extra');
  const unzipper = require('unzipper');
  await fs.remove('out/edge');

  const file = fs.createWriteStream('edge.zip');
  const request = https.get(downloadUrl, function(response) {
    response.pipe(file);
    response.on('end', ()=>{
      fs.createReadStream('edge.zip').pipe(unzipper.Extract({path: 'out/edge/'}));
      fs.unlink('edge.zip', () => {} );
      let dirName = __dirname;
      if (isWindows) {
        flipSlashDirName = dirName.replace(/\//g, '\\');
        const rootPath = removeLastDirectory(flipSlashDirName);
        console.log('Edge files extracted to: ' + rootPath + '\\out\\edge\n');
        console.log('Run this in cmd to set env variables: "set EDGE_CHROMIUM_PATH=' + rootPath + '\\out\\edge\\src&&set EDGE_CHROMIUM_OUT_DIR=Release"\n');
      } else {
        const rootPath = removeLastDirectory(dirName);
        console.log('Edge files extracted to: ' + rootPath + '/out/edge');
        console.log('Run this in terminal to set env variables: "export EDGE_CHROMIUM_PATH=' + rootPath + '/out/edge/src&&export EDGE_CHROMIUM_OUT_DIR=Release"\n');
      }
      console.log('*Note: this command only sets the environment variables for this session.');
    });
  });
}

const platform = process.argv.slice(2)[0];
const downloadUrl = fetchDownloadUrl(platform);
downloadZipFile(downloadUrl);
