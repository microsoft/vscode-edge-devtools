
import * as vscode from 'vscode';

export const enum ErrorCodes {
  Error,
  Warning,
  Informational
}

export interface ErrorEventInterface {
  title: string,
  message: string | unknown,
  errorCode: ErrorCodes
}

export class ErrorReporter {
  static async showErrorDialog(
    error: ErrorEventInterface): Promise<void> {

    const template = `<!-- Please delete any private information -->
        **Stack :**
        ${error.message}

        **Additional context:**
        <!-- Add any other context or about the problem or screenshots here. -->`;

    // cannot do multiline due to:
    // https://github.com/Microsoft/vscode/issues/48900
    const answer = await vscode.window
      .showErrorMessage(
        `An error occurred:\n${error.title}\n${error.message}`,
        ...['File a bug', 'Close dialog']
      );

    if (answer === 'File a bug') {
      let base = 'https://github.com/microsoft/vscode-edge-devtools/issues/new?';
      const params: Map<string, string> = new Map<string, string>();

      params.set('title', `[${error.errorCode}] ${encodeURIComponent(error.title)}`);
      params.set('body', encodeURIComponent(template));
      params.set('labels', 'bug');

      // As this are GET request params there is no need to take out the last
      // ampersand
      params.forEach((key, value) => {
        base += `${key}=${value}&`;
      });

      void vscode.env.openExternal(vscode.Uri.parse(base));
    }
  }
}
