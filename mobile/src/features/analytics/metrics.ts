import type { Device } from "../../lib/contracts";
import { timestampMillis, deviceStatus } from "../../lib/formatters";
export function deriveMetrics(devices: Device[], now: number) {
  const counts = {
    total: devices.length,
    online: 0,
    offline: 0,
    unknown: 0,
    underHour: 0,
    underDay: 0,
    older: 0,
  };
  for (const d of devices) {
    const status = deviceStatus(d.timestamp, now);
    if (status === "Online") counts.online++;
    else if (status === "Offline") counts.offline++;
    else counts.unknown++;
    const t = timestampMillis(d.timestamp);
    if (t === null || t > now) continue;
    const age = now - t;
    if (age < 3600000) counts.underHour++;
    else if (age < 86400000) counts.underDay++;
    else counts.older++;
  }
  return counts;
}
export function numericAttributes(devices: Device[]) {
  return devices.flatMap((d) =>
    (d.attributes ?? []).flatMap((a) =>
      typeof a.value === "number" && Number.isFinite(a.value)
        ? [
            {
              id: `${d._id}:${a.attributeId}`,
              deviceName: d.name,
              label: a.attributeName || a.attributeId,
              value: a.value,
            },
          ]
        : [],
    ),
  );
}
export function observedAttributeMaxima(
  values: ReturnType<typeof numericAttributes>,
) {
  const maxima = new Map<string, number>();
  for (const item of values)
    if (item.value >= 0)
      maxima.set(item.label, Math.max(item.value, maxima.get(item.label) ?? 0));
  return maxima;
}
