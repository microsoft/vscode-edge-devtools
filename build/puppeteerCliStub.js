/**
 * Stub for @puppeteer/browsers/lib/CLI.js.
 *
 * The @puppeteer/browsers barrel re-exports a yargs-based command line
 * interface used to download and manage browser binaries. This extension never
 * uses it: it launches an already installed browser via `executablePath`, so
 * webpack tree-shakes the CLI out of the bundle anyway.
 *
 * Parsing the real module still emits a "Critical dependency: require function
 * is used in a way in which dependencies cannot be statically extracted"
 * warning, because the yargs ESM shim passes a bare `require` around. Swapping
 * in this stub avoids parsing yargs entirely while keeping the `CLI` export
 * that the barrel expects.
 */

export class CLI {
    constructor() {
        throw new Error('@puppeteer/browsers CLI is not bundled with this extension.');
    }
}
