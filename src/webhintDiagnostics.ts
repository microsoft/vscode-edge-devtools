// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import * as vscode from 'vscode';

const WEBHINT_TS_CONFIG_HINT = 'typescript-config/is-valid';
const TS_CONFIG_FILE_PATTERN = /^tsconfig(\..+)?\.json$/i;

type WebhintDiagnosticCode = {
    value?: string;
};

function isTsConfigFile(uri: vscode.Uri): boolean {
    return TS_CONFIG_FILE_PATTERN.test(path.basename(uri.fsPath));
}

function isWebhintTsConfigDiagnostic(diagnostic: vscode.Diagnostic): boolean {
    const diagnosticCode = diagnostic.code as WebhintDiagnosticCode | string | undefined;
    const diagnosticCodeValue = typeof diagnosticCode === 'string' ? diagnosticCode : diagnosticCode?.value;
    return diagnosticCodeValue === WEBHINT_TS_CONFIG_HINT;
}

function isUnsupportedEs2023Diagnostic(diagnostic: vscode.Diagnostic): boolean {
    return diagnostic.message.includes('ES2023');
}

export function shouldSuppressWebhintDiagnostic(uri: vscode.Uri, diagnostic: vscode.Diagnostic): boolean {
    return isTsConfigFile(uri) && isWebhintTsConfigDiagnostic(diagnostic) && isUnsupportedEs2023Diagnostic(diagnostic);
}
