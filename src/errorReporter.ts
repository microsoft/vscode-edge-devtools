
import * as vscode from 'vscode';

export const enum ErrorCodes {
  Error,
  Warning,
  Informational
}

export interface ErrorEventInterface{ 
  title: string,
  message: string,
  errorCode: ErrorCodes
}

export class ErrorReporter {
    static async showErrorDialog(
        error: ErrorEventInterface): Promise<void> {

        const template = `<!-- Please delete any private information -->
        **Stack :**
        ${error.message}

        **Additional context:**
        <!-- Add any other context or about the problem or screenshots here. -->`

        // cannot do multiline due to:
        // https://github.com/Microsoft/vscode/issues/48900
        const answer = await vscode.window
        .showErrorMessage(
            `An error occurred:\n${error.title}\n${error.message}`,
            ...['File a bug', 'Close dialog']
        );

        if(answer === 'File a bug') {
          const encodedTitle = encodeURIComponent(error.title);
          const encodedTemplate = encodeURIComponent(template);
          vscode.env.openExternal(vscode.Uri.parse(`https://github.com/microsoft/vscode-edge-devtools/issues/new?title=[${error.errorCode}]${encodedTitle}&body=${encodedTemplate}&labels=bug`));
        }
    }
}
