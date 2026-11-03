import type { Device } from "../../lib/contracts";
import { deviceStatus, timestampMillis } from "../../lib/formatters";

export type HealthSeverity = "critical" | "warning" | "healthy" | "unknown";

export type HealthItem = {
  device: Device;
  severity: HealthSeverity;
  reason: string;
};

function numericNamedAttribute(device: Device, names: RegExp) {
  const attribute = (device.attributes ?? []).find((item) =>
    names.test(item.attributeName ?? ""),
  );
  if (!attribute) return null;
  const value =
    typeof attribute.value === "number"
      ? attribute.value
      : typeof attribute.value === "string"
        ? Number(attribute.value)
        : NaN;
  return Number.isFinite(value) ? value : null;
}

export function deriveHealthItems(
  devices: Device[],
  now: number,
): HealthItem[] {
  return devices
    .map((device) => {
      const status = deviceStatus(device.timestamp, now);
      const battery = numericNamedAttribute(device, /battery|charge|power/i);
      const signal = numericNamedAttribute(device, /signal|rssi|link/i);
      if (status === "Offline")
        return {
          device,
          severity: "critical" as const,
          reason: "No recent uplink",
        };
      if (status === "Unknown")
        return {
          device,
          severity: "unknown" as const,
          reason: "Last heard is not reported",
        };
      if (battery !== null && battery < 20)
        return {
          device,
          severity: "warning" as const,
          reason: `Battery ${battery}%`,
        };
      if (signal !== null && signal < -100)
        return {
          device,
          severity: "warning" as const,
          reason: `Weak signal ${signal} dBm`,
        };
      return {
        device,
        severity: "healthy" as const,
        reason: "Reporting normally",
      };
    })
    .sort((a, b) => {
      const order: Record<HealthSeverity, number> = {
        critical: 0,
        warning: 1,
        unknown: 2,
        healthy: 3,
      };
      return order[a.severity] - order[b.severity];
    });
}

export function healthSummary(items: HealthItem[]) {
  return items.reduce(
    (summary, item) => {
      summary[item.severity] += 1;
      return summary;
    },
    { critical: 0, warning: 0, healthy: 0, unknown: 0 },
  );
}

export function lastHeardMillis(device: Device) {
  return timestampMillis(device.timestamp);
}
