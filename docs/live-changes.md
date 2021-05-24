# Setting up your project to show live changes in the extension

Out of the box the extension does not track live changes to the code you write. If you want the browser to automatically refresh when you changed a file, you need to set up a live reload environment. For this you need Node.js and npm on your machine.

Say you have a folder with your production files on your hard drive called `my-project`.

Preparation step: Install Node.js and the reload package

* Download and install [Node.js](https://www.nodejs.org) (you only need to do this once).
* Install the [reload NPM package](https://www.npmjs.com/package/reload?activeTab=readme)
  * Open command prompt and run `npm install reload -g` to install the package globally

Attach the extension to your live reloading project

* Navigate to your `my-project` folder in your command prompt and run `reload`
* Open VS Code and open the directory
* Go to the extension and launch an instance
* Navigate in the browser of the extension to `localhost:8080/{file name you want to open}`	
* All changes that are saved in this folder now trigger a refresh

Go [back to documentation](./index.md)