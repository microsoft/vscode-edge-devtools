async function createDevToolsZip(file) {
    const mkdirp = require('mkdirp');
    const fs = require('fs-extra');
    const unzipper = require('unzipper');
    await fs.remove('out/edge');
    fs.createReadStream(file)
    .pipe(unzipper.Parse())
    .on('entry', function (entry) {
        if (entry.path.includes('src/out/Release/gen/devtools') || entry.path.includes('src/third_party/devtools-frontend/src/front_end')) {
            console.log('Extracting file ' + entry.path);
            if (entry.path.includes('.')) {
                entry.pipe(fs.createWriteStream('out/edge/' + entry.path));
            } else {
                mkdirp.sync('out/edge/' + entry.path);
            }
        } else {
            entry.autodrain();
        }
    });
}

const file = process.argv.slice(2)[0];
createDevToolsZip(file);
