import { test, expect } from "@jest/globals";
import { devicePoint, clusterPoints } from "../src/features/locations/clusters";
import { deviceSchema } from "../src/lib/contracts";

function device(lat: number | null, lng: number | null, id: string) {
  return deviceSchema.parse({
    _id: id,
    name: id,
    devEui: id,
    position: { placeName: null, lat, lng },
  });
}

test("devices without valid coordinates are excluded", () => {
  expect(devicePoint(device(null, null, "missing"))).toBeNull();
  expect(devicePoint(device(91, 0, "invalid"))).toBeNull();
  expect(devicePoint(device(0, 0, "equator"))).not.toBeNull();
});

test("nearby devices cluster without changing their reported coordinates", () => {
  const a = devicePoint(device(12.1, 77.1, "a"))!;
  const b = devicePoint(device(12.1001, 77.1001, "b"))!;
  const groups = clusterPoints([a, b], 0.05, 360);
  expect(groups).toHaveLength(1);
  expect(groups[0].points.map((p) => p.device._id)).toEqual(["a", "b"]);
  expect(a.latitude).toBe(12.1);
});
