import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { repository } from "../../lib/repository";
import { useWorkspace } from "../../lib/workspace";
import { useSession } from "../../lib/session";
import { POLL_INTERVAL_MS } from "../../lib/config";
import { eventScope, observeDevices } from "../notifications/store";
export function useActive() {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const s = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => s.remove();
  }, []);
  return active;
}
export function useDevices(detailed = false) {
  const { orgId, projectId } = useWorkspace();
  const session = useSession((s) => s.session);
  const focused = useIsFocused();
  const active = useActive();
  const query = useQuery({
    queryKey: [detailed ? "details" : "devices", orgId, projectId],
    queryFn: ({ signal }) =>
      (detailed ? repository.listDeviceDetails : repository.listDevices)(
        orgId,
        projectId,
        signal,
      ),
    enabled: !!session && !!orgId && !!projectId && focused && active,
    refetchInterval: focused && active ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (query.data && session && orgId && projectId && focused && active)
      void observeDevices(
        eventScope(session._id, orgId, projectId),
        query.data,
      );
  }, [query.data, session, orgId, projectId, focused, active]);
  return query;
}
export function useNow(interval = 1000) {
  const [now, setNow] = useState(0);
  const active = useActive();
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const start = setTimeout(tick, 0);
    const t = setInterval(tick, interval);
    return () => {
      clearTimeout(start);
      clearInterval(t);
    };
  }, [active, interval]);
  return now;
}
export function useDebouncedValue<T>(value: T, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
export function updateAge(dataUpdatedAt: number, now: number) {
  if (!dataUpdatedAt || !now) return null;
  const seconds = Math.max(0, Math.floor((now - dataUpdatedAt) / 1000));
  return { seconds, stale: now - dataUpdatedAt > POLL_INTERVAL_MS * 2 };
}
