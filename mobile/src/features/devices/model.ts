import type { Device } from "../../lib/contracts";
import { deviceStatus, timestampMillis } from "../../lib/formatters";
export type StatusFilter = "All" | "Online" | "Offline" | "Unknown";
export function filterDevices(
  devices: Device[],
  search: string,
  status: StatusFilter,
  now: number,
) {
  const q = search.trim().toLocaleLowerCase();
  return devices.filter(
    (d) =>
      (status === "All" || deviceStatus(d.timestamp, now) === status) &&
      (!q ||
        `${d.name} ${d.devEui} ${d.position?.placeName ?? ""}`
          .toLocaleLowerCase()
          .includes(q)),
  );
}
export function mergeDeviceDetails(devices: Device[], details: Device[]) {
  const lookup = new Map(details.map((d) => [d._id, d]));
  return devices.flatMap((light) => {
    const detail = lookup.get(light._id);
    if (detail?.deleted) return [];
    const lightTime = timestampMillis(light.timestamp);
    const detailTime = timestampMillis(detail?.timestamp);
    const timestamp =
      lightTime === null
        ? (detail?.timestamp ?? light.timestamp)
        : detailTime !== null && detailTime > lightTime
          ? detail?.timestamp
          : light.timestamp;
    return [{ ...light, ...detail, timestamp }];
  });
}
export const DEVICE_ROW_HEIGHT = 118;
