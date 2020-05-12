function fetchJsonFromUrl(url){
  var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
  var Httpreq = new XMLHttpRequest();
  Httpreq.open("GET", url, false);
  Httpreq.send(null);
  return Httpreq.responseText;
}

function fetchDownloadUrl() {
  const jsonString = fetchJsonFromUrl("https://thirdpartysource.microsoft.com/downloads");
  const jsonObjects = JSON.parse(jsonString);
  for (let object of jsonObjects) {
    if (object.product === 'Microsoft Edge DevTools' && object.release === '81.0.416.72') {
      console.log(object.url);
    }
  }
}

fetchDownloadUrl();