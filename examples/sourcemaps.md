# Sourcemaps

The elements tool uses sourcemaps to correctly open original source files when you click links in the UI, but sometimes the sourcemaps aren't generated properly and overrides are needed. In the config we support `sourceMapPathOverrides`, a mapping of source paths from the sourcemap, to the locations of these sources on disk. Useful when the sourcemap isn't accurate or can't be fixed in the build process.

The left hand side of the mapping is a pattern that can contain a wildcard, and will be tested against the `sourceRoot` + `sources` entry in the source map. If it matches, the source file will be resolved to the path on the right hand side, which should be an absolute path to the source file on disk.

A few mappings are applied by default, corresponding to some common default configs for Webpack and Meteor:
Note: These are the mappings that are included by default out of the box, with examples of how they could be resolved in different scenarios. These are not mappings that would make sense together in one project.

```javascript
"sourceMapPathOverrides": {
    "webpack:///./~/*": "${webRoot}/node_modules/*",
    "webpack:///./*": "${webRoot}/*",
    "webpack:///*": "*",
    "webpack:///src/*": "${webRoot}/*",
     "webpack://*": "${webRoot}/*",
    "meteor://💻app/*": "${webRoot}/*"
}
```

If you set `sourceMapPathOverrides` in your launch config, that will override these defaults. `${workspaceFolder}` and `${webRoot}` can be used there.

See the following examples for each entry in the default mappings (`webRoot = /Users/me/project`):

```javascript
"webpack:///./~/*": "${webRoot}/node_modules/*" 
Example:
"webpack:///./~/querystring/index.js"
-> "/Users/me/project/node_modules/querystring/index.js"
"webpack:///./*":   "${webRoot}/*"
Example:
"webpack:///./src/app.js" -> "/Users/me/project/src/app.js"
"webpack:///*": "*"
Example:
"webpack:///project/app.ts" -> "/project/app.ts"
"webpack:///src/*": "${webRoot}/*"
Example:
"webpack:///src/app.js" -> "/Users/me/project/app.js"
"webpack://*": "${webRoot}/*"
Example:
"webpack://src/app.js" -> "/Users/me/project/src/app.js"
"meteor://💻app/*": "${webRoot}/*"
Example:
"meteor://💻app/main.ts"` -> `"/Users/me/project/main.ts"
```

#### Ionic and gulp sourcemaps note

Ionic and gulp-sourcemaps output a sourceRoot of `"/source/"` by default. If you can't fix this via your build config, try this setting:

```javascript
"sourceMapPathOverrides": {
    "/source/*": "${workspaceFolder}/*"
}
```