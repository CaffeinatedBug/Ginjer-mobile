import { test, expect } from "@jest/globals";
import {
  deriveMetrics,
  numericAttributes,
  observedAttributeMaxima,
} from "../src/features/analytics/metrics";
import { deviceSchema, type Device } from "../src/lib/contracts";

function device(
  id: string,
  timestamp: number | null,
  attributes?: Device["attributes"],
) {
  return deviceSchema.parse({
    _id: id,
    name: id,
    devEui: id,
    timestamp,
    attributes,
  });
}

test("status and last-heard buckets derive from device timestamps", () => {
  const now = 1_800_000_000_000;
  const metrics = deriveMetrics(
    [
      device("recent", now - 30_000),
      device("day", now - 7_200_000),
      device("old", now - 172_800_000),
      device("unknown", null),
    ],
    now,
  );
  expect(metrics.total).toBe(4);
  expect(metrics.underHour).toBe(1);
  expect(metrics.underDay).toBe(1);
  expect(metrics.older).toBe(1);
  expect(metrics.unknown).toBe(1);
});

test("only reported finite numeric attributes are included", () => {
  const values = numericAttributes([
    device("one", null, [
      { attributeId: "fill", attributeName: "Fill", value: 42 },
      { attributeId: "mode", attributeName: "Mode", value: "auto" },
    ]),
  ]);
  expect(values).toEqual([
    { id: "one:fill", deviceName: "one", label: "Fill", value: 42 },
  ]);
  expect(observedAttributeMaxima(values).get("Fill")).toBe(42);
});
