import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { request } from "../../lib/graphql";
import { operations } from "../../lib/operations";
import { downlinkResultSchema } from "../../lib/contracts";
import { ApiError } from "../../lib/errors";
import { API_URL, DOWNLINK_API_URL } from "../../lib/config";
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
        {
          action: {
            ...action,
            // prodapi's downlink resolver expects the controller value itself,
            // not the devapi { value } wrapper.
            value: action.value.value,
          },
        },
        z.object({ sendDownlink: downlinkResultSchema }),
        { mutation: true, url: DOWNLINK_API_URL },
      );
      if (!response.sendDownlink.message)
        throw new ApiError(
          "The server returned no delivery confirmation. Verify the device.",
          "uncertain",
        );
      await AsyncStorage.removeItem(key);
      return response.sendDownlink;
    } catch (error) {
      // Authentication and GraphQL validation reject a request before the
      // controller can receive it. Do not strand the operator behind an
      // "uncertain" lock when the server has given us a deterministic answer.
      if (
        error instanceof ApiError &&
        (error.kind === "auth" ||
          error.kind === "validation" ||
          error.kind === "server")
      ) {
        await AsyncStorage.removeItem(key);
        throw error;
      }
      // A timeout, transport failure, or server failure does not prove that the
      // controller never saw the command. Keep the durable lock in those cases.
      throw new ApiError(
        "Delivery is uncertain. Verify the device before sending again.",
        "uncertain",
      );
    }
  } finally {
    inFlight.delete(key);
  }
}
