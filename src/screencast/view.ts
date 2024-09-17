// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Uri } from 'vscode';

export class ScreencastView {
    private webviewCSP: string;
    private cssPath: Uri
    private codiconsUri: Uri;
    private inspectorUri: Uri
    private isDevToolsOpen: boolean;
    private htmlTemplate = (webviewCSP: string, cssPath: Uri, codiconsUri: Uri, inspectorUri: Uri, isDevToolsOpen: boolean) => `<!doctype html>
  <html>
  <head>
      <meta http-equiv="content-type" content="text/html; charset=utf-8">
      <meta http-equiv="Content-Security-Policy"
          content="default-src;
          font-src ${webviewCSP};
          img-src 'self' data: ${webviewCSP};
          style-src 'self' 'unsafe-inline' ${webviewCSP};
          script-src 'self' 'unsafe-eval' ${webviewCSP};
          frame-src 'self' ${webviewCSP};
          connect-src 'self' data: ${webviewCSP};
      ">
      <meta name="referrer" content="no-referrer">
      <link href="${codiconsUri}" rel="stylesheet" />
      <link href="${cssPath}" rel="stylesheet" />
      <script type="module" src="${inspectorUri}"></script>
  </head>
  <body>
      <div id="main">
          <div id="infobar"></div>
          <div id="toolbar">
              <button id="back" title="Back">
                  <i class="codicon codicon-arrow-left"></i>
              </button>
              <button id="forward" title="Forward">
                  <i class="codicon codicon-arrow-right"></i>
              </button>
              <button id="reload" title="Reload">
                  <i class="codicon codicon-refresh"></i>
              </button>
              <input id="url" />
              <button id="inspect" title="${isDevToolsOpen ? 'Close DevTools' : 'Open DevTools'}">
                  <i class="codicon codicon-inspect ${isDevToolsOpen ? 'devtools-open' : ''}"></i>
              </button>
          </div>
          <div id="canvas-wrapper">
              <img id="canvas" draggable="false" tabindex="0" />
          </div>
        <div id="emulation-bar">
            <div id="emulation-bar-right"></div>
            <div id="emulation-bar-center"></div>
            <div id="emulation-bar-left"></div>
        </div>
      </div>
      <div id="inactive-overlay" hidden>
        The tab is inactive
      </div>
  </body>
  </html>
  `;

    constructor(webviewCSP: string, cssPath: Uri, codiconsUri: Uri, inspectorUri: Uri, isDevToolsOpen: boolean) {
        this.webviewCSP = webviewCSP;
        this.cssPath = cssPath;
        this.codiconsUri = codiconsUri;
        this.inspectorUri = inspectorUri;
        this.isDevToolsOpen = isDevToolsOpen;
    }

    render(): string {
        return this.htmlTemplate(this.webviewCSP, this.cssPath, this.codiconsUri, this.inspectorUri, this.isDevToolsOpen);
    }
}
