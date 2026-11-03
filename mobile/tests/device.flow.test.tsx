import React from "react";
import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { cleanup, render, screen } from "@testing-library/react-native";
import { deviceSchema, projectSchema } from "../src/lib/contracts";
import { mergeDeviceDetails } from "../src/features/devices/model";
import { reportedDeviceCount } from "../src/features/projects/model";
import { useWorkspace } from "../src/lib/workspace";
import { useDevices } from "../src/features/uplink/hooks";
import { DeviceDetailsScreen } from "../src/features/devices/DeviceDetailsScreen";
import { DevicesScreen } from "../src/features/devices/DevicesScreen";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/lib/query";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(),
    multiRemove: jest.fn(),
  },
}));
jest.mock("../src/features/uplink/hooks", () => ({
  useDevices: jest.fn(),
  useNow: () => 0,
  useDebouncedValue: (value: unknown) => value,
}));
jest.mock("../src/features/downlink", () => ({ DownlinkSheet: () => null }));
jest.mock("../src/lib/repository", () => ({
  repository: { getHistoricalData: jest.fn(() => Promise.resolve(null)) },
}));
jest.mock("react-native-maps", () => ({
  __esModule: true,
  default: () => null,
  Marker: () => null,
  PROVIDER_GOOGLE: "google",
}));

const device = (fields: Record<string, unknown> = {}) =>
  deviceSchema.parse({
    _id: "d1",
    name: "Test sensor",
    devEui: "test-eui",
    ...fields,
  });
const setQuery = (value: unknown) =>
  jest
    .mocked(useDevices)
    .mockReturnValue(value as ReturnType<typeof useDevices>);
afterEach(async () => {
  await cleanup();
  queryClient.clear();
});

describe("device and project presentation", () => {
  test("keeps the newest uplink and detailed fields while excluding a deleted device", () => {
    const old = "2026-10-29T00:00:00Z";
    const fresh = "2026-10-30T00:00:00Z";
    const detail = device({
      timestamp: fresh,
      position: { placeName: "Test lab", lat: 12, lng: 77 },
      outputs: [
        {
          outputId: "o1",
          outputName: "Relay",
          value: 1,
          label: null,
          color: null,
        },
      ],
    });
    const lightweight = device({ timestamp: old });
    expect(mergeDeviceDetails([lightweight], [detail])[0]).toMatchObject({
      timestamp: fresh,
      position: detail.position,
      outputs: detail.outputs,
    });
    expect(
      mergeDeviceDetails([lightweight], [device({ deleted: true })]),
    ).toEqual([]);
  });

  test("shows a loading state then actual empty detail values without a map", async () => {
    useWorkspace.setState({
      orgId: "o1",
      projectId: "p1",
      orgName: "",
      projectName: "",
    });
    setQuery({
      isPending: true,
      data: undefined,
      isError: false,
      dataUpdatedAt: 0,
    });
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <DeviceDetailsScreen deviceId="d1" />
      </QueryClientProvider>,
    );
    expect(screen.getAllByLabelText("Loading").length).toBeGreaterThan(0);
    setQuery({
      isPending: false,
      data: [device({ position: null, outputs: [], attributes: [] })],
      isError: false,
      dataUpdatedAt: 0,
    });
    await view.rerender(
      <QueryClientProvider client={queryClient}>
        <DeviceDetailsScreen deviceId="d1" />
      </QueryClientProvider>,
    );
    expect(screen.getByText("No location")).toBeTruthy();
    expect(screen.getByText("No outputs reported.")).toBeTruthy();
    expect(screen.getByText("No attributes reported.")).toBeTruthy();
    expect(
      screen.getByLabelText("View Map").props.accessibilityState.disabled,
    ).toBe(true);
  }, 60000);

  test("shows no fabricated device count when overview count is absent", () => {
    const project = projectSchema.parse({
      _id: "p1",
      name: "Test project",
      active: true,
    });
    expect(reportedDeviceCount(project)).toBeNull();
    expect(
      reportedDeviceCount(
        projectSchema.parse({
          _id: "p1",
          name: "Test project",
          active: true,
          deviceCount: [
            { _id: "a", deviceCount: 2 },
            { _id: "b", deviceCount: 3 },
          ],
        }),
      ),
    ).toBe(5);
  });

  test("shows an actual empty project instead of a sample device", async () => {
    useWorkspace.setState({
      orgId: "o1",
      projectId: "p1",
      orgName: "",
      projectName: "Test project",
    });
    queryClient.setQueryData(["details", "o1", "p1"], []);
    setQuery({
      isPending: false,
      data: [],
      isError: false,
      dataUpdatedAt: 0,
      isRefetching: false,
    });
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <DevicesScreen />
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByText("No devices found")).toBeTruthy();
    expect(screen.queryByText("Busylight")).toBeNull();
  });
});
