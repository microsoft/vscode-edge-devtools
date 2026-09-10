/**
 * Runtime stub for `puppeteer-core` used by Jest only, wired up through
 * `moduleNameMapper` in the jest config.
 *
 * `puppeteer-core` is ESM-only, so requiring it from Jest's CommonJS runtime
 * fails with "Must use import to load ES Module". No test exercises real
 * puppeteer behaviour -- browser launching is always asserted against a mock --
 * so the whole package is replaced here rather than transformed.
 *
 * Only the members used at runtime by `src/` need to exist. `Browser` and
 * `Target` are type-only imports and are erased at compile time, and
 * TypeScript still checks against the real package because `moduleNameMapper`
 * only affects Jest's module resolution.
 */

// Values must match puppeteer-core's TargetType enum exactly: `extension.ts`
// compares against `TargetType.PAGE`, and a missing member would silently turn
// that comparison into `=== undefined`.
export enum TargetType {
    PAGE = 'page',
    BACKGROUND_PAGE = 'background_page',
    SERVICE_WORKER = 'service_worker',
    SHARED_WORKER = 'shared_worker',
    BROWSER = 'browser',
    WEBVIEW = 'webview',
    OTHER = 'other',
    TAB = 'tab',
}

// `src/utils.ts` uses a default import and calls `puppeteer.launch(...)`.
export default {
    launch: jest.fn(),
};
