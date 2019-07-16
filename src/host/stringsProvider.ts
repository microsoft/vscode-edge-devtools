export default class StringsProvider {

    private static _instance: StringsProvider;
    private _initialized: boolean = false;

    public static dtWindow: any;

    private constructor() {
        // private initialization for singleton.
    }

    public static get instance() {
        if (!StringsProvider._instance)
            StringsProvider._instance = new StringsProvider();

        return StringsProvider._instance;
    }

    public getStringsCallback(message: any): void {
        if (!message)
            return;

        if (!this._initialized) {
            // initialize
            let data = JSON.parse(message.data);
            StringsProvider.dtWindow.loadTimeData = { data };
            this._initialized = true;
        }

        return;
    }
}