import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
} from "react-native";
import { useSession } from "../../lib/session";
import { useWorkspace } from "../../lib/workspace";
import { theme } from "../../lib/theme";
import { eventScope, useEvents } from "./store";
import type { DeviceEvent } from "./diff";

export function EventBanner({
  onDevice,
  onNotifications,
}: {
  onDevice: (id: string) => void;
  onNotifications: () => void;
}) {
  const userId = useSession((state) => state.session?._id ?? "");
  const { orgId, projectId } = useWorkspace();
  const scope = eventScope(userId, orgId, projectId);
  return (
    <ScopedEventBanner
      key={scope}
      scope={scope}
      userId={userId}
      orgId={orgId}
      projectId={projectId}
      onDevice={onDevice}
      onNotifications={onNotifications}
    />
  );
}

function ScopedEventBanner({
  scope,
  userId,
  orgId,
  projectId,
  onDevice,
  onNotifications,
}: {
  scope: string;
  userId: string;
  orgId: string;
  projectId: string;
  onDevice: (id: string) => void;
  onNotifications: () => void;
}) {
  const feed = useEvents(scope);
  const seen = useRef(new Set<string>());
  const initialized = useRef(false);
  const [queue, setQueue] = useState<DeviceEvent[]>([]);
  const [summary, setSummary] = useState(0);
  const resumed = useRef(false);
  const [slide] = useState(() => new Animated.Value(-90));
  useEffect(() => {
    let backgrounded = AppState.currentState !== "active";
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active" && backgrounded) resumed.current = true;
      backgrounded = state !== "active";
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!feed.ready || !userId || !orgId || !projectId) return;
    if (!initialized.current) {
      feed.events.forEach((event) => seen.current.add(event.id));
      initialized.current = true;
      return;
    }
    const added = feed.events.filter((event) => !seen.current.has(event.id));
    feed.events.forEach((event) => seen.current.add(event.id));
    if (added.length && resumed.current) {
      setSummary((count) => count + added.length);
      resumed.current = false;
    } else if (added.length)
      setQueue((current) => [...current, ...added.reverse()]);
  }, [feed.events, feed.ready, orgId, projectId, userId]);
  const current = summary ? null : queue[0];
  useEffect(() => {
    if (!current && !summary) return;
    Vibration.vibrate(20);
    slide.setValue(-90);
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
    const timer = setTimeout(() => {
      if (summary) setSummary(0);
      else setQueue((items) => items.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [current, summary, slide]);
  if (!current && !summary) return null;
  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slide }] }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          summary
            ? `${summary} new events. Open notifications`
            : `${current?.title} on ${current?.deviceName}. Open device`
        }
        onPress={() => {
          if (summary) {
            setSummary(0);
            onNotifications();
            return;
          }
          if (!current) return;
          setQueue((items) => items.slice(1));
          onDevice(current.deviceId);
        }}
        style={styles.banner}
      >
        <Text style={styles.title}>
          {summary ? `${summary} new events` : current?.title}
        </Text>
        <Text style={styles.device}>
          {summary ? "View notifications" : current?.deviceName}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", top: 54, left: 12, right: 12 },
  banner: {
    minHeight: 60,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: theme.green,
    backgroundColor: theme.surface,
    elevation: 8,
  },
  title: { color: theme.text, fontFamily: theme.bold, fontSize: 14 },
  device: { color: theme.secondary, fontFamily: theme.font, fontSize: 13 },
});
