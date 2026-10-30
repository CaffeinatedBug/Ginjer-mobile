import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { request } from "../../lib/graphql";
import { operations } from "../../lib/operations";
import { downlinkResultSchema } from "../../lib/contracts";
import { ApiError } from "../../lib/errors";
import { API_URL } from "../../lib/config";
const inFlight = new Set<string>();
export const actionSchema = z.object({
  organisationId: z.string().min(1),
  deviceId: z.string().min(1),
  downlinkInterfaceId: z.string().min(1),
  value: z.object({
    value: z.union([z.number().finite(), z.string().trim().min(1).max(1024)]),
  }),
});
export type DownlinkAction = z.infer<typeof actionSchema>;
const lockKey = (org: string, device: string) =>
  `ginjer.downlink.${API_URL.includes("devapi") ? "dev" : "prod"}.${org}.${device}`;
export async function hasUnresolvedDownlink(org: string, device: string) {
  return !!(await AsyncStorage.getItem(lockKey(org, device)));
}
/** Explicit reconciliation only, never called after a timeout or merely after screen dismissal. */
export async function reconcileDownlink(org: string, device: string) {
  const key = lockKey(org, device);
  if (inFlight.has(key))
    throw new ApiError("A command is still pending.", "validation");
  await AsyncStorage.removeItem(key);
}
export async function sendDownlink(input: DownlinkAction) {
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(
      "Select a device, interface and valid value before sending.",
      "validation",
    );
  const action = parsed.data;
  const key = lockKey(action.organisationId, action.deviceId);
  if (inFlight.has(key))
    throw new ApiError(
      "A command is already pending for this device.",
      "validation",
    );
  inFlight.add(key);
  try {
    if (await AsyncStorage.getItem(key))
      throw new ApiError(
        "A previous command needs verification on the device before another can be sent.",
        "uncertain",
      );
    // Persist before network dispatch; crash/relaunch must not silently allow a duplicate.
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ state: "unresolved", submittedAt: Date.now() }),
    );
    try {
      const response = await request(
        operations.SendDownlink,
        { action },
        z.object({ sendDownlink: downlinkResultSchema }),
        { mutation: true },
      );
      if (!response.sendDownlink.message)
        throw new ApiError(
          "The server returned no delivery confirmation. Verify the device.",
          "uncertain",
        );
      await AsyncStorage.removeItem(key);
      return response.sendDownlink;
    } catch {
      // A server-side error does not prove that the controller never saw the command.
      // Keep the durable lock until the operator verifies the physical device state.
      throw new ApiError(
        "Delivery is uncertain. Verify the device before sending again.",
        "uncertain",
      );
    }
  } finally {
    inFlight.delete(key);
  }
}
