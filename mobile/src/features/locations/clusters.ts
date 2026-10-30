import type { Device } from "../../lib/contracts";
export type DevicePoint = {
  device: Device;
  latitude: number;
  longitude: number;
};
export type Cluster = {
  key: string;
  latitude: number;
  longitude: number;
  points: DevicePoint[];
};
export function devicePoint(device: Device): DevicePoint | null {
  const latitude = device.position?.lat,
    longitude = device.position?.lng;
  return typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180
    ? { device, latitude, longitude }
    : null;
}
/** Spatial bins scale with the visible longitude span; never manufacture a device position. */
export function clusterPoints(
  points: DevicePoint[],
  longitudeDelta: number,
  width: number,
): Cluster[] {
  const cell = Math.max((longitudeDelta * 56) / Math.max(width, 1), 0.000001);
  const groups = new Map<string, DevicePoint[]>();
  for (const point of points) {
    const key = `${Math.floor(point.latitude / cell)}:${Math.floor(point.longitude / cell)}`;
    const group = groups.get(key);
    if (group) group.push(point);
    else groups.set(key, [point]);
  }
  return [...groups].map(([key, group]) => ({
    key,
    latitude: group.reduce((s, p) => s + p.latitude, 0) / group.length,
    longitude: group.reduce((s, p) => s + p.longitude, 0) / group.length,
    points: group,
  }));
}
