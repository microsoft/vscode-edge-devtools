// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createFakeVSCode } from "./helpers/helpers";

// Allow us to mock the console object for testing
// eslint-disable no-console

jest.mock("vscode", () => createFakeVSCode(), { virtual: true });
jest.mock("@vscode/extension-telemetry");

describe("debugTelemetryReporter", () => {
    it("gets created successfully", async () => {
        const dtr = await import("../src/debugTelemetryReporter");
        const reporter = new dtr.DebugTelemetryReporter();
        expect(reporter).toBeDefined();
    });

    it("sendTelemetryEvent writes to the console", async () => {
        const dtr = await import("../src/debugTelemetryReporter");
        const reporter = new dtr.DebugTelemetryReporter();

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
        const dtr = await import("../src/debugTelemetryReporter");
        const reporter = new dtr.DebugTelemetryReporter();
        await reporter.dispose();
    });
});
