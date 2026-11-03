export type HistoryPoint = { timestamp: string; value: number };

export function extractHistoryPoints(data: unknown): HistoryPoint[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const timestamp = record.timestamp ?? record.timeStamp ?? record.date;
    const raw = record.value ?? record.outputValue ?? record.val;
    const value =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    return typeof timestamp === "string" && Number.isFinite(value)
      ? [{ timestamp, value }]
      : [];
  });
}
