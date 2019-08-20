export interface IDevToolsLocalization {
    _localizedStringsMap: Map<string>;
}

export interface IDevToolsCommon {
    localizedStrings: IDevToolsCommonLocalizedStrings;
}

export interface IDevToolsCommonLocalizedStrings {
    _getString: (string) => string
}
