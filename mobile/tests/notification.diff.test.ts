import { test, expect } from "@jest/globals";
import { diffDevices } from "../src/features/notifications/diff";
import { deviceSchema, type Device } from "../src/lib/contracts";

function device(overrides: Partial<Device> = {}): Device {
  return deviceSchema.parse({
    _id: "device-1",
    name: "Device",
    devEui: "EUI",
    timestamp: 1000,
    position: null,
    ...overrides,
  });
}

test("first observation establishes a baseline without a fabricated event", () => {
  const result = diffDevices({}, [device()], 2000);
  expect(result.events).toHaveLength(0);
});

test("a later uplink creates one event", () => {
  const first = diffDevices({}, [device()], 2000);
  const second = diffDevices(
    first.snapshots,
    [device({ timestamp: 1001 })],
    3000,
  );
  expect(second.events).toHaveLength(1);
  expect(second.events[0].title).toBe("New uplink received");
});

test("lightweight polling preserves detailed values and only value changes create events", () => {
  const detailed = device({
    outputs: [
      {
        outputId: "out-1",
        outputName: "Lamp",
        value: 1,
        label: "On",
        color: "green",
      },
    ],
  });
  const baseline = diffDevices({}, [detailed], 2000);
  const lightweight = diffDevices(baseline.snapshots, [device()], 3000);
  expect(lightweight.events).toHaveLength(0);
  const metadataOnly = diffDevices(
    lightweight.snapshots,
    [
      device({
        outputs: [
          {
            outputId: "out-1",
            outputName: "New label",
            value: 1,
            label: "Changed",
            color: "red",
          },
        ],
      }),
    ],
    4000,
  );
  expect(metadataOnly.events).toHaveLength(0);
  const changed = diffDevices(
    metadataOnly.snapshots,
    [
      device({
        outputs: [
          {
            outputId: "out-1",
            outputName: "Lamp",
            value: 2,
            label: "On",
            color: "green",
          },
        ],
      }),
    ],
    5000,
  );
  expect(changed.events).toHaveLength(1);
  expect(changed.events[0].title).toBe("Device values changed");
});

test("older poll does not overwrite a newer timestamp", () => {
  const baseline = diffDevices({}, [device({ timestamp: 2000 })], 3000);
  const older = diffDevices(
    baseline.snapshots,
    [device({ timestamp: 1000 })],
    4000,
  );
  expect(older.events).toHaveLength(0);
  expect(older.snapshots["device-1"].timestamp).toBe(2000);
});
