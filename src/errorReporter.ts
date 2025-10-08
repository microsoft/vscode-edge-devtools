
import * as vscode from 'vscode';
import { ErrorCodes } from './common/errorCodes';

export interface ErrorEventInterface {
  title: string,
  message: string,
  errorCode: ErrorCodes
}

export class ErrorReporter {
  static async showErrorDialog(
    error: ErrorEventInterface): Promise<void> {

    // cannot do multiline due to:
    // https://github.com/Microsoft/vscode/issues/48900
    const answer = await vscode.window
      .showWarningMessage(
        `${error.title} ${error.message}`,
        ...['Check settings', 'Search issues']
      );

    if (answer === 'Check settings') {
      void vscode.commands.executeCommand('workbench.action.openSettings', '@ext:ms-edgedevtools.vscode-edge-devtools');
    } else if (answer === 'Search issues') {
      const searchUrl = `https://github.com/microsoft/vscode-edge-devtools/issues?q=is%3Aissue+is%3Aopen+${error.title}`;

      void vscode.env.openExternal(vscode.Uri.parse(searchUrl));
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
