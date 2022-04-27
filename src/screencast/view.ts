// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Uri } from 'vscode';
import { emulatedDevices } from './emulatedDevices';

export class ScreencastView {
    private webviewCSP: string;
    private cssPath: Uri
    private codiconsUri: Uri;
    private inspectorUri: Uri
    private htmlTemplate = (webviewCSP: string, cssPath: Uri, codiconsUri: Uri, inspectorUri: Uri, deviceList: string) => `<!doctype html>
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
          <div id="toolbar">
              <button id="back">
                  <i class="codicon codicon-arrow-left"></i>
              </button>
              <button id="forward">
                  <i class="codicon codicon-arrow-right"></i>
              </button>
              <button id="reload">
                  <i class="codicon codicon-refresh"></i>
              </button>
              <input id="url" />
              <select id="device">
                  <option selected value="desktop">Desktop</option>
                  ${deviceList}
              </select>
              <button id="rotate">
                  <i class="codicon codicon-editor-layout"></i>
              </button>
          </div>
          <div id="canvas-wrapper">
              <img id="canvas" draggable="false" tabindex="0" />
          </div>
      </div>
      <div id="inactive-overlay" hidden>
        The tab is inactive
      </div>
  </body>
  </html>
  `;

    constructor(webviewCSP: string, cssPath: Uri, codiconsUri: Uri, inspectorUri: Uri) {
        this.webviewCSP = webviewCSP;
        this.cssPath = cssPath;
        this.codiconsUri = codiconsUri;
        this.inspectorUri = inspectorUri;
    }

    private getDeviceList(devicesArray: Object[]) {
        let templatedString = '';

        for (const device of devicesArray) {
            // @ts-ignore ignoring as this is a static template.
            templatedString += `<option deviceWidth=${device.screen.vertical.width} deviceHeight=${device.screen.vertical.height} ${ScreencastView.getDeviceCapabilities(device.capabilities)} userAgent=${escape(device['user-agent'])} value="${ScreencastView.getDeviceValueFromTitle(device.title)}">${device.title}</option>`;
        }

        return templatedString;
    }

    static getDeviceCapabilities(deviceCapabilities: string[]): string{
        let result = '';
        for (const device of deviceCapabilities){
            if (device === 'touch' || device === 'mobile') {
                result += `${device}=true `
            }
        }

        return result;
    }

    static getDeviceValueFromTitle(title: string): string {
        return title.replace(/['/' || ' ' || '-']/g, '');
    }

    render(): string {
        const deviceList = this.getDeviceList(emulatedDevices);
        return this.htmlTemplate(this.webviewCSP, this.cssPath, this.codiconsUri, this.inspectorUri, deviceList);
    }
}
