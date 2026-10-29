import { ONLINE_THRESHOLD_MS } from "./config";
export function timestampMillis(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+(\.\d+)?$/.test(value)
        ? Number(value)
        : null;
  const ms =
    numeric !== null
      ? numeric < 1e11
        ? numeric * 1000
        : numeric
      : typeof value === "string"
        ? Date.parse(value)
        : NaN;
  return Number.isFinite(ms) ? ms : null;
}
export function deviceStatus(
  timestamp: unknown,
  now = Date.now(),
): "Online" | "Offline" | "Unknown" {
  const ms = timestampMillis(timestamp);
  return ms === null || ms > now + 60_000
    ? "Unknown"
    : now - ms <= ONLINE_THRESHOLD_MS
      ? "Online"
      : "Offline";
}
export function formatTimestamp(value: unknown) {
  const ms = timestampMillis(value);
  return ms === null ? "Not reported" : new Date(ms).toLocaleString();
}
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "Not reported";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
