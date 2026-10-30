import { describe, expect, test } from "@jest/globals";
import { deviceSchema } from "../src/lib/contracts";
import {
  deviceStatus,
  formatTimestamp,
  timestampMillis,
} from "../src/lib/formatters";
import {
  filterDevices,
  mergeDeviceDetails,
} from "../src/features/devices/model";
import {
  deriveMetrics,
  numericAttributes,
} from "../src/features/analytics/metrics";
import { diffDevices } from "../src/features/notifications/diff";

const now = Date.parse("2026-10-30T12:00:00.000Z");
const device = (id: string, fields: Record<string, unknown> = {}) =>
  deviceSchema.parse({
    _id: id,
    name: `Sensor ${id}`,
    devEui: `EUI-${id}`,
    ...fields,
  });

describe("real device derivations", () => {
  test("handles seconds, milliseconds, ISO timestamps and missing/future values", () => {
    expect(timestampMillis(now / 1000)).toBe(now);
    expect(timestampMillis(String(now))).toBe(now);
    expect(timestampMillis("2026-10-30T12:00:00.000Z")).toBe(now);
    expect(deviceStatus(null, now)).toBe("Unknown");
    expect(deviceStatus(now + 120_000, now)).toBe("Unknown");
    expect(deviceStatus(now - 60_000, now)).toBe("Online");
    expect(deviceStatus(now - 25 * 3_600_000, now)).toBe("Offline");
    expect(formatTimestamp(null)).toBe("Not reported");
  });

  test("searches name, DevEUI and place while preserving status text", () => {
    const devices = [
      device("a", {
        timestamp: now,
        position: { placeName: "West Wing", lat: 1, lng: 2 },
      }),
      device("b", { timestamp: null }),
    ];
    expect(
      filterDevices(devices, "west", "All", now).map((d) => d._id),
    ).toEqual(["a"]);
    expect(
      filterDevices(devices, "EUI-B", "Unknown", now).map((d) => d._id),
    ).toEqual(["b"]);
    expect(filterDevices(devices, "", "Offline", now)).toEqual([]);
  });

  test("preserves detail fields when a lightweight refresh omits them", () => {
    const detail = device("a", {
      timestamp: now - 1_000,
      position: { placeName: "West Wing", lat: 1, lng: 2 },
      outputs: [
        {
          outputId: "one",
          outputName: "Relay",
          value: 1,
          label: null,
          color: null,
        },
      ],
      attributes: [{ attributeId: "fill", attributeName: "Fill", value: 42 }],
    });
    const lightweight = device("a", { timestamp: now });
    const merged = mergeDeviceDetails([lightweight], [detail]);
    expect(merged[0].timestamp).toBe(now);
    expect(merged[0].position?.placeName).toBe("West Wing");
    expect(merged[0].outputs?.[0].value).toBe(1);
    expect(merged[0].attributes?.[0].value).toBe(42);
  });

  test("counts only received data and finite numeric attributes", () => {
    const devices = [
      device("a", {
        timestamp: now - 1_000,
        attributes: [{ attributeId: "fill", attributeName: "Fill", value: 42 }],
      }),
      device("b", {
        timestamp: now - 2 * 3_600_000,
        attributes: [
          { attributeId: "text", attributeName: "Mode", value: "ready" },
        ],
      }),
      device("c", { timestamp: now - 48 * 3_600_000 }),
      device("d", { timestamp: null }),
    ];
    expect(deriveMetrics(devices, now)).toEqual({
      total: 4,
      online: 2,
      offline: 1,
      unknown: 1,
      underHour: 1,
      underDay: 1,
      older: 1,
    });
    expect(numericAttributes(devices)).toEqual([
      { id: "a:fill", deviceName: "Sensor a", label: "Fill", value: 42 },
    ]);
  });

  test("emits no event on first snapshot and only real changes thereafter", () => {
    const first = diffDevices(
      {},
      [
        device("a", {
          timestamp: now,
          outputs: [
            {
              outputId: "one",
              outputName: "Relay",
              value: 0,
              label: null,
              color: null,
            },
          ],
        }),
      ],
      now,
    );
    expect(first.events).toEqual([]);
    const unchanged = diffDevices(
      first.snapshots,
      [
        device("a", {
          timestamp: now,
          outputs: [
            {
              outputId: "one",
              outputName: "Relay",
              value: 0,
              label: null,
              color: null,
            },
          ],
        }),
      ],
      now + 1,
    );
    expect(unchanged.events).toEqual([]);
    const changed = diffDevices(
      unchanged.snapshots,
      [
        device("a", {
          timestamp: now + 1_000,
          outputs: [
            {
              outputId: "one",
              outputName: "Relay",
              value: 1,
              label: null,
              color: null,
            },
          ],
        }),
      ],
      now + 2,
    );
    expect(changed.events).toHaveLength(1);
    expect(changed.events[0].title).toBe("New uplink and values changed");
    expect(
      diffDevices(
        changed.snapshots,
        [device("a", { timestamp: now - 1_000 })],
        now + 3,
      ).events,
    ).toEqual([]);
  });
});
