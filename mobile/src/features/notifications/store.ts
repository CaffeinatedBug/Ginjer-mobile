import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";
import { z } from "zod";
import type { Device } from "../../lib/contracts";
import {
  diffDevices,
  eventSchema,
  snapshotSchema,
  type DeviceEvent,
  type SnapshotMap,
} from "./diff";
const MAX_EVENTS = 500;
type Feed = { events: DeviceEvent[]; ready: boolean; error: string };
const EMPTY: Feed = { events: [], ready: false, error: "" };
const states = new Map<string, Feed>();
const snapshots = new Map<string, SnapshotMap>();
const queues = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let epoch = 0;
const persisted = z.object({
  events: z.array(eventSchema),
  snapshots: z.record(z.string(), snapshotSchema),
});
export function eventScope(userId: string, orgId: string, projectId: string) {
  return JSON.stringify([userId, orgId, projectId]);
}
function publish(scope: string, feed: Feed) {
  states.set(scope, feed);
  for (const listener of listeners) listener();
}
function queue(scope: string, action: (version: number) => Promise<void>) {
  const version = epoch;
  const next = (queues.get(scope) ?? Promise.resolve())
    .catch(() => {})
    .then(() => {
      if (version !== epoch) return;
      return action(version);
    });
  queues.set(scope, next);
  return next;
}
async function hydrate(scope: string, version: number) {
  if (states.get(scope)?.ready) return;
  try {
    const raw = await AsyncStorage.getItem(`ginjer.events.${scope}`);
    if (version !== epoch) return;
    const parsed = raw ? persisted.safeParse(JSON.parse(raw)) : null;
    snapshots.set(scope, parsed?.success ? parsed.data.snapshots : {});
    publish(scope, {
      events: parsed?.success ? parsed.data.events.slice(0, MAX_EVENTS) : [],
      ready: true,
      error:
        parsed && !parsed.success
          ? "Saved notifications could not be read."
          : "",
    });
  } catch {
    if (version === epoch) {
      snapshots.set(scope, {});
      publish(scope, {
        events: [],
        ready: true,
        error: "Notifications could not be restored.",
      });
    }
  }
}
async function persist(scope: string, version: number) {
  if (version !== epoch) return;
  try {
    await AsyncStorage.setItem(
      `ginjer.events.${scope}`,
      JSON.stringify({
        events: states.get(scope)?.events ?? [],
        snapshots: snapshots.get(scope) ?? {},
      }),
    );
  } catch {
    if (version === epoch)
      publish(scope, {
        ...(states.get(scope) ?? EMPTY),
        error: "Notification changes could not be saved.",
      });
  }
}
export function observeDevices(scope: string, devices: Device[]) {
  return queue(scope, async (version) => {
    await hydrate(scope, version);
    if (version !== epoch) return;
    const result = diffDevices(snapshots.get(scope) ?? {}, devices, Date.now());
    snapshots.set(scope, result.snapshots);
    const state = states.get(scope) ?? EMPTY;
    publish(scope, {
      ...state,
      events: [...result.events, ...state.events].slice(0, MAX_EVENTS),
    });
    await persist(scope, version);
  });
}
export function markEventRead(scope: string, id: string) {
  return queue(scope, async (version) => {
    await hydrate(scope, version);
    if (version !== epoch) return;
    const state = states.get(scope) ?? EMPTY;
    publish(scope, {
      ...state,
      events: state.events.map((e) => (e.id === id ? { ...e, read: true } : e)),
    });
    await persist(scope, version);
  });
}
export async function resetEventMemory() {
  epoch++;
  const pending = [...queues.values()];
  await Promise.allSettled(pending);
  states.clear();
  snapshots.clear();
  queues.clear();
  for (const listener of listeners) listener();
}
export function useEvents(scope: string) {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => states.get(scope) ?? EMPTY,
  );
  useEffect(() => {
    void queue(scope, (version) => hydrate(scope, version));
  }, [scope]);
  return { ...state, markRead: (id: string) => markEventRead(scope, id) };
}
