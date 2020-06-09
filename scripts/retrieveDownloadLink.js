const TARGET_VERSION = '81.0.416.72';

function fetchJsonFromUrl(url){
  var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
  var Httpreq = new XMLHttpRequest();
  Httpreq.open("GET", url, false);
  Httpreq.send(null);
  return Httpreq.responseText;
}

function fetchDownloadUrl(platform) {
  const jsonString = fetchJsonFromUrl("https://thirdpartysource.microsoft.com/downloads");
  const jsonObjects = JSON.parse(jsonString);
  const platformString = retrievePlatform(platform);
  for (let object of jsonObjects) {
    if (object.product === 'Microsoft Edge DevTools' && object.release === TARGET_VERSION && object.platform === platformString) {
      console.log(object.url);
      return;
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

const platform = process.argv.slice(2)[0];
fetchDownloadUrl(platform);
