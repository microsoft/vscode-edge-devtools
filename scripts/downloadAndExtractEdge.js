const TARGET_VERSION = '81.0.416.72';

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
  for (let object of jsonObjects) {
    if (object.product === 'Microsoft Edge DevTools' && object.release === TARGET_VERSION && object.platform === platformString) {
      return object.url;
    }
  }
}

function retrievePlatform(platform) {
  if (!platform) {
    return 'Windows x64';
  }
  switch (platform.toLowerCase()) {
    case 'mac':
      return 'Mac OS x64';
    default:
      return 'Windows x64';
  }
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
      console.log('Edge files extracted to: ' + __dirname + '\\out\\edge');
      console.log('Run this in cmd: "set EDGE_CHROMIUM_PATH=' + __dirname + '\\out\\edge\\src && set EDGE_CHROMIUM_OUT_DIR=Release"');
    });
  });
}

const platform = process.argv.slice(2)[0];
const downloadUrl = fetchDownloadUrl(platform);
downloadZipFile(downloadUrl);
