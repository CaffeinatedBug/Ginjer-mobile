import type { Project } from "../../lib/contracts";

export function reportedDeviceCount(project: Project): number | null {
  const values = project.deviceCount
    ?.map((entry) => entry.deviceCount)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );
  return values?.length ? values.reduce((sum, value) => sum + value, 0) : null;
}
