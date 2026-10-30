import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Screen,
  Header,
  Field,
  EmptyState,
  Icon,
  Sheet,
  Button,
} from "../../shared";
import { theme } from "../../lib/theme";
import { useSession } from "../../lib/session";
import { useWorkspace } from "../../lib/workspace";
import type { RootStackParamList } from "../../navigation/types";
import {
  useDebouncedValue,
  useDevices,
  useNow,
  updateAge,
} from "../uplink/hooks";
import { eventScope, useEvents } from "./store";
import type { DeviceEvent } from "./diff";
export function useCurrentEvents() {
  const userId = useSession((s) => s.session?._id ?? "");
  const { orgId, projectId } = useWorkspace();
  return useEvents(eventScope(userId, orgId, projectId));
}
function EventRow({
  item,
  onPress,
}: {
  item: DeviceEvent;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? "Read" : "Unread"}: ${item.deviceName}, ${item.title}`}
      onPress={onPress}
      style={[styles.row, !item.read && styles.unread]}
    >
      <View style={styles.icon}>
        <Icon name="bell" color={theme.accessibleGreen} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.deviceName}</Text>
        <Text style={styles.time}>
          Observed {new Date(item.observedAt).toLocaleString()}
        </Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </Pressable>
  );
}
export function NotificationsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const feed = useCurrentEvents();
  const query = useDevices(true);
  const now = useNow();
  const age = updateAge(query.dataUpdatedAt, now);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 200);
  const events = useMemo(
    () =>
      feed.events.filter((e) =>
        `${e.deviceName} ${e.title}`
          .toLowerCase()
          .includes(debounced.trim().toLowerCase()),
      ),
    [feed.events, debounced],
  );
  return (
    <Screen style={styles.screen}>
      <Header title="Notifications" back={() => navigation.goBack()} />
      <View style={styles.search}>
        <Field
          label="Search Notifications"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {age && (
        <Text style={styles.freshness}>
          Updated {age.seconds}s ago{age.stale ? " · Data may be stale" : ""}
        </Text>
      )}
      {query.isError && (
        <Text accessibilityRole="alert" style={styles.error}>
          Device updates are unavailable. Pull down to retry.
        </Text>
      )}
      {!!feed.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {feed.error}
        </Text>
      )}
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        renderItem={({ item }) => (
          <EventRow
            item={item}
            onPress={() => {
              void feed.markRead(item.id);
              navigation.navigate("DeviceDetails", { deviceId: item.deviceId });
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={
              feed.ready ? "No notifications found" : "Loading notifications"
            }
            body={
              search
                ? "Try a different search term"
                : "New uplinks and value changes observed on this phone will appear here."
            }
          />
        }
      />
    </Screen>
  );
}
export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const feed = useCurrentEvents();
  return (
    <Sheet title="Notifications" onClose={onClose}>
      {feed.events.slice(0, 4).map((item) => (
        <EventRow
          key={item.id}
          item={item}
          onPress={() => {
            void feed.markRead(item.id);
            onClose();
            navigation.navigate("DeviceDetails", { deviceId: item.deviceId });
          }}
        />
      ))}
      {!feed.events.length && (
        <EmptyState
          title="No notifications yet"
          body="Events appear after a real device update is observed."
        />
      )}
      <Button
        title="View all"
        onPress={() => {
          onClose();
          navigation.navigate("Notifications");
        }}
        variant="secondary"
      />
    </Sheet>
  );
}
const styles = StyleSheet.create({
  screen: { backgroundColor: theme.canvas },
  search: { padding: 12 },
  freshness: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    fontFamily: theme.font,
    fontSize: 12,
    color: theme.secondary,
  },
  row: {
    minHeight: 88,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: "#E6E6E6",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  unread: { backgroundColor: "#F8FCED" },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDF6DD",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 4 },
  title: { fontFamily: theme.bold, fontSize: 14, color: theme.text },
  body: { fontFamily: theme.font, fontSize: 12, color: theme.secondary },
  time: { fontFamily: theme.font, fontSize: 11, color: theme.secondary },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: theme.accessibleGreen,
  },
  error: { padding: 12, color: theme.error },
});
