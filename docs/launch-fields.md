
# Optional launch config fields

* `browserPath`: The full path to the browser executable that will be launched. If not specified the most stable channel of Microsoft Edge will be launched from the default install location instead.
* `hostname`: By default the extension searches for debuggable instances using `localhost`. If you are hosting your web app on a remote machine you can specify the hostname using this setting.
* `port`: By default the extension will set the remote-debugging-port to `9222`. Use this option to specify a different port on which to connect.
* `userDataDir`: Normally, if Microsoft Edge is already running when you start debugging with a launch config, then the new instance won't start in remote debugging mode. So by default, the extension launches Microsoft Edge with a separate user profile in a temp folder. Use this option to set a different path to use, or set to false to launch with your default user profile instead.
* `useHttps`: By default the extension will search for attachable instances using the `http` protocol. Set this to true if you are hosting your web app over `https` instead.
* `sourceMaps`: By default, the extension will use sourcemaps and your original sources whenever possible. You can disable this by setting `sourceMaps` to false.
* `pathMapping`: This property takes a mapping of URL paths to local paths, to give you more flexibility in how URLs are resolved to local files. `"webRoot": "${workspaceFolder}"` is just shorthand for a pathMapping like `{ "/": "${workspaceFolder}" }`.
* `sourceMapPathOverrides`: A mapping of source paths from the sourcemap, to the locations of these sources on disk. 
* `urlFilter`: A string that can contain wildcards that will be used for finding a browser target, for example, "localhost:*/app" will match either "http://localhost:123/app" or "http://localhost:456/app", but not "https://stackoverflow.com". This property will only be used if `url` and `file` are not specified.
* `timeout`: The number of milliseconds that the Microsoft Edge Tools will keep trying to attach to the browser before timing out. Defaults to 10000ms.

Go [back to documentation](./index.md)