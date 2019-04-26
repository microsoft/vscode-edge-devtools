// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createFakeVSCode } from "./test/helpers";

// Allow us to mock the console object for testing
// tslint:disable: no-console

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });
jest.mock("vscode-extension-telemetry");

describe("debugTelemetryReporter", () => {
    it("gets created successfully", async () => {
        const { default: telemetryReporter } = await import("./debugTelemetryReporter");
        const reporter = new telemetryReporter();
        expect(reporter).toBeDefined();
    });

    it("sendTelemetryEvent writes to the console", async () => {
        const { default: telemetryReporter } = await import("./debugTelemetryReporter");
        const reporter = new telemetryReporter();

        global.console.log = jest.fn();
        const expectedName = "event";
        const expectedProps = { prop1: "hello" };
        const expectedMeasures = { measure1: 100 };
        reporter.sendTelemetryEvent(expectedName, expectedProps, expectedMeasures);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining(expectedName));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify(expectedProps)));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify(expectedProps)));
    });

    it("dispose completes", async () => {
        const { default: telemetryReporter } = await import("./debugTelemetryReporter");
        const reporter = new telemetryReporter();
        await reporter.dispose();
    });
});
