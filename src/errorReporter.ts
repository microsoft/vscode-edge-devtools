
import * as vscode from 'vscode';
import { ErrorCodes } from './common/errorCodes';

export interface ErrorEventInterface {
  title: string,
  message: string | unknown,
  errorCode: ErrorCodes
}

export class ErrorReporter {
  static async showErrorDialog(
    error: ErrorEventInterface): Promise<void> {

    const template = `<!-- Please delete any private information -->
        **Version:**
        ${// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          vscode.extensions.getExtension('ms-edgedevtools.vscode-edge-devtools')?.packageJSON.version || 'N/A'}

        **OS:**
        <!-- Add your hosting platform e.g Microsoft Windows, WSL, MacOs or Linux -->

        **Stack :**
        ${error.message}

        **Additional context:**
        <!-- Add any other context or about the problem or screenshots here. -->`;

    // cannot do multiline due to:
    // https://github.com/Microsoft/vscode/issues/48900
    const answer = await vscode.window
      .showErrorMessage(
        `An error occurred: ${error.title} ${error.message}`,
        ...['File a bug']
      );

    if (answer === 'File a bug') {
      let base = 'https://github.com/microsoft/vscode-edge-devtools/issues/new?';
      const params: Map<string, string> = new Map<string, string>();

      params.set('title',encodeURIComponent(`[${error.errorCode}] ${error.title}`));
      params.set('body', encodeURIComponent(template));
      params.set('labels', 'error');

      // As this are GET request params there is no need to take out the last
      // ampersand
      params.forEach((value, key) => {
        base += `${key}=${value}&`;
      });

      void vscode.env.openExternal(vscode.Uri.parse(base));
    }
  }

  static async showInformationDialog(
    error: ErrorEventInterface): Promise<void> {
    // cannot do multiline due to:
    // https://github.com/Microsoft/vscode/issues/48900
    await vscode.window.showInformationMessage(
      `${error.title} ${error.message}`
    );
  }
}
