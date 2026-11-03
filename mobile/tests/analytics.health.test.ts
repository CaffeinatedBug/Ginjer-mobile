import {
  deriveHealthItems,
  healthSummary,
} from "../src/features/analytics/health";
import type { Device } from "../src/lib/contracts";
import { describe, expect, it } from "@jest/globals";

const device = (
  id: string,
  timestamp: string | null,
  attributes: Device["attributes"] = [],
): Device => ({
  _id: id,
  name: id,
  devEui: id,
  hardwareId: null,
  timestamp,
  description: null,
  organisationId: null,
  projectId: null,
  clusterId: null,
  networkId: null,
  hardwareType: null,
  position: null,
  attributes,
  outputs: [],
});

describe("health derivation", () => {
  it("sorts real device health by severity and counts it", () => {
    const now = Date.parse("2026-10-30T10:00:00.000Z");
    const items = deriveHealthItems(
      [
        device("offline", "2026-10-28T10:00:00.000Z"),
        device("low", "2026-10-30T09:59:00.000Z", [
          { attributeId: "b", attributeName: "battery", value: 10 },
        ]),
        device("unknown", null),
        device("ok", "2026-10-30T09:59:00.000Z"),
      ],
      now,
    );
    expect(items.map((item) => item.device._id)).toEqual([
      "offline",
      "low",
      "unknown",
      "ok",
    ]);
    expect(healthSummary(items)).toEqual({
      critical: 1,
      warning: 1,
      healthy: 1,
      unknown: 1,
    });
  });
});
