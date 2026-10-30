import { z } from "zod";
import type { Device } from "../../lib/contracts";
import { timestampMillis } from "../../lib/formatters";
export const eventSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  deviceName: z.string(),
  title: z.string(),
  observedAt: z.number(),
  read: z.boolean(),
});
export type DeviceEvent = z.infer<typeof eventSchema>;
export const snapshotSchema = z.object({
  timestamp: z.union([z.string(), z.number(), z.null()]),
  values: z.string().nullable(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export type SnapshotMap = Record<string, Snapshot>;
export function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map(
      (k) =>
        `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`,
    )
    .join(",")}}`;
}
export function diffDevices(
  previous: SnapshotMap,
  devices: Device[],
  observedAt: number,
): { snapshots: SnapshotMap; events: DeviceEvent[] } {
  const snapshots: SnapshotMap = { ...previous };
  const events: DeviceEvent[] = [];
  for (const device of devices) {
    const id = device._id;
    const before = previous[id];
    const hasValues =
      device.outputs !== undefined || device.attributes !== undefined;
    const values = hasValues
      ? canonical({
          outputs: (device.outputs ?? [])
            .map((o) => ({ id: o.outputId, value: o.value }))
            .sort((a, b) => a.id.localeCompare(b.id)),
          attributes: (device.attributes ?? [])
            .map((a) => ({ id: a.attributeId, value: a.value }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        })
      : (before?.values ?? null);
    const after = {
      timestamp: device.timestamp ?? before?.timestamp ?? null,
      values,
    };
    const oldTime = timestampMillis(before?.timestamp),
      newTime = timestampMillis(after.timestamp);
    if (before && oldTime !== null && newTime !== null && newTime < oldTime) {
      snapshots[id] = before;
      continue;
    }
    snapshots[id] = after;
    if (!before) continue;
    const uplink = newTime !== null && (oldTime === null || newTime > oldTime);
    const changed =
      before.values !== null &&
      after.values !== null &&
      before.values !== after.values;
    if (uplink || changed)
      events.push({
        id: `${id}:${observedAt}:${after.timestamp ?? "value"}:${events.length}`,
        deviceId: id,
        deviceName: device.name,
        title:
          uplink && changed
            ? "New uplink and values changed"
            : uplink
              ? "New uplink received"
              : "Device values changed",
        observedAt,
        read: false,
      });
  }
  return { snapshots, events };
}
