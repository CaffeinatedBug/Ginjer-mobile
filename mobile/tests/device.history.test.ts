import { describe, expect, it } from "@jest/globals";
import { extractHistoryPoints } from "../src/features/devices/history";

describe("device history parser", () => {
  it("keeps only real timestamped numeric values", () => {
    expect(
      extractHistoryPoints([
        { timestamp: "2026-10-30T10:00:00Z", value: 3.7 },
        { timeStamp: "2026-10-30T10:01:00Z", outputValue: "4" },
        { timestamp: "2026-10-30T10:02:00Z", value: "unavailable" },
        { value: 1 },
      ]),
    ).toEqual([
      { timestamp: "2026-10-30T10:00:00Z", value: 3.7 },
      { timestamp: "2026-10-30T10:01:00Z", value: 4 },
    ]);
  });

  it("does not manufacture chart points for opaque data", () => {
    expect(extractHistoryPoints({ packets: [] })).toEqual([]);
  });
});
