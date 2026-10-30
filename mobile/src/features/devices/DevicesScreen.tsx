import React, { memo, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { type Device } from "../../lib/contracts";
import { repository } from "../../lib/repository";
import { useWorkspace } from "../../lib/workspace";
import { theme } from "../../lib/theme";
import { deviceStatus } from "../../lib/formatters";
import { useDebouncedValue, useDevices, useNow } from "../uplink/hooks";
import {
  EmptyState,
  Button,
  Icon,
  IconButton,
  Screen,
  Sheet,
  Skeleton,
} from "../../shared";
import {
  DEVICE_ROW_HEIGHT,
  filterDevices,
  mergeDeviceDetails,
  type StatusFilter,
} from "./model";
const offsets = new Map<string, number>();
export function DevicesScreen({
  onSelectDevice,
  onNotifications,
  onSelectWorkspace,
  onAddDevice,
}: {
  onSelectDevice?: (id: string) => void;
  onNotifications?: () => void;
  onSelectWorkspace?: () => void;
  onAddDevice?: () => void;
}) {
  const { orgId, projectId, projectName } = useWorkspace();
  const scope = `${orgId}/${projectId}`;
  const query = useDevices();
  const now = useNow();
  const statusNow = useNow(30_000);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 200);
  const [status, setStatus] = useState<StatusFilter>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const listRef = useRef<FlatList<Device>>(null);
  const details = useQuery({
    queryKey: ["details", orgId, projectId],
    queryFn: ({ signal }) =>
      repository.listDeviceDetails(orgId, projectId, signal),
    enabled: !!orgId && !!projectId,
    staleTime: 60_000,
  });
  const merged = useMemo(
    () => mergeDeviceDetails(query.data ?? [], details.data ?? []),
    [query.data, details.data],
  );
  const filtered = useMemo(
    () => filterDevices(merged, debounced, status, statusNow),
    [merged, debounced, status, statusNow],
  );
  const age = query.dataUpdatedAt
    ? Math.max(0, Math.floor((now - query.dataUpdatedAt) / 1000))
    : null;
  return (
    <Screen style={{ backgroundColor: theme.canvas }}>
      <View style={s.top}>
        <View style={s.search}>
          <TextInput
            accessibilityLabel="Search Devices"
            placeholder="Search Devices"
            placeholderTextColor={theme.secondary}
            value={search}
            onChangeText={setSearch}
            style={s.input}
          />
          {!!search && (
            <IconButton
              name="close"
              label="Clear search"
              onPress={() => setSearch("")}
            />
          )}
          <Icon name="search" />
          <View style={s.divider} />
          <IconButton
            name="filter"
            label={`Filter devices, ${status}`}
            onPress={() => setFilterOpen(true)}
          />
          <IconButton
            name="bell"
            label="Notifications"
            onPress={() => onNotifications?.()}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select project"
          onPress={() => onSelectWorkspace?.()}
          style={s.workspace}
        >
          <Text style={s.workspaceText}>{projectName || "Select project"}</Text>
          <Icon name="next" size={16} />
        </Pressable>
        <Button
          title="Add device"
          onPress={() => onAddDevice?.()}
          disabled={!orgId || !projectId}
          variant="secondary"
        />
        {age !== null && (
          <Text
            accessibilityLiveRegion={age > 90 ? "polite" : "none"}
            style={[s.updated, age > 90 && { color: theme.error }]}
          >
            Updated {age}s ago{age > 90 ? " · Data may be stale" : ""}
          </Text>
        )}
      </View>
      {!orgId || !projectId ? (
        <EmptyState
          title="Choose a project"
          body="Select an organization and project to view devices."
          action="Select project"
          onAction={() => onSelectWorkspace?.()}
        />
      ) : query.isPending ? (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </>
      ) : query.isError && !query.data ? (
        <EmptyState
          title="Couldn’t load devices"
          body={query.error.message}
          action="Retry"
          onAction={() => void query.refetch()}
        />
      ) : (
        <FlatList
          key={scope}
          ref={listRef}
          contentContainerStyle={s.list}
          data={filtered}
          keyExtractor={(d) => d._id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          getItemLayout={(_, index) => ({
            length: DEVICE_ROW_HEIGHT,
            offset: DEVICE_ROW_HEIGHT * index,
            index,
          })}
          onScroll={(e) => offsets.set(scope, e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            const offset = offsets.get(scope);
            if (offset && filtered.length && !search)
              listRef.current?.scrollToOffset({ offset, animated: false });
          }}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListHeaderComponent={
            query.isError ? (
              <Text accessibilityRole="alert" style={s.error}>
                Refresh failed. Showing previously received data.
              </Text>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              title={
                search || status !== "All"
                  ? "No matching devices"
                  : "No devices found"
              }
              body={
                search || status !== "All"
                  ? "Try another search or status filter."
                  : "No devices in this project yet."
              }
              action={
                search || status !== "All" ? "Clear filters" : "Refresh devices"
              }
              onAction={() => {
                if (search || status !== "All") {
                  setSearch("");
                  setStatus("All");
                } else void query.refetch();
              }}
            />
          }
          renderItem={({ item }) => (
            <DeviceRow
              device={item}
              status={deviceStatus(item.timestamp, now)}
              onPress={() => onSelectDevice?.(item._id)}
            />
          )}
        />
      )}
      <Sheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter devices"
      >
        {(["All", "Online", "Offline", "Unknown"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: status === value }}
            onPress={() => {
              setStatus(value);
              setFilterOpen(false);
            }}
            style={s.filter}
          >
            <Text style={s.name}>{value}</Text>
            {status === value && (
              <Icon name="check" color={theme.accessibleGreen} />
            )}
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}
const DeviceRow = memo(function DeviceRow({
  device,
  status,
  onPress,
}: {
  device: Device;
  status: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${status}, DevEUI ${device.devEui}`}
      onPress={onPress}
      style={s.card}
    >
      <View style={s.image}>
        {/busy/i.test(device.hardwareType ?? "") ? (
          <Image
            source={require("../../assets/80bd2.png")}
            contentFit="contain"
            style={s.deviceImage}
            accessibilityLabel={device.name}
          />
        ) : (
          <Icon name="devices" size={30} color={theme.accessibleGreen} />
        )}
      </View>
      <View style={s.copy}>
        <Text numberOfLines={1} style={s.name}>
          {device.name}
        </Text>
        <Text numberOfLines={1} style={s.small}>
          DevEUI: {device.devEui}
        </Text>
        <Text numberOfLines={1} style={s.place}>
          {device.position?.placeName || "No location"}
        </Text>
      </View>
      <View style={s.trailing}>
        <Text style={[s.status, status === "Online" ? s.online : s.offline]}>
          {status}
        </Text>
        <Icon name="next" size={18} />
      </View>
    </Pressable>
  );
});
const s = StyleSheet.create({
  top: { paddingTop: 16, paddingHorizontal: 12, gap: 6 },
  search: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: 8,
    paddingLeft: 12,
    elevation: 3,
  },
  input: {
    flex: 1,
    minWidth: 30,
    minHeight: 56,
    fontFamily: theme.font,
    fontSize: 14,
    color: theme.text,
  },
  divider: { width: 1, height: 24, backgroundColor: "#AFAFAE", marginLeft: 6 },
  workspace: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  workspaceText: {
    color: theme.accessibleGreen,
    fontFamily: theme.bold,
    flex: 1,
  },
  updated: {
    fontSize: 12,
    fontFamily: theme.font,
    color: theme.secondary,
    paddingBottom: 6,
  },
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 20 },
  card: {
    height: 106,
    marginBottom: 12,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 1,
  },
  image: {
    height: 58,
    width: 58,
    borderRadius: 8,
    backgroundColor: "#EEF6DF",
    alignItems: "center",
    justifyContent: "center",
  },
  deviceImage: { height: 58, width: 58 },
  copy: { flex: 1, gap: 6 },
  name: { fontFamily: theme.bold, fontSize: 16, color: theme.text },
  small: { fontFamily: theme.font, fontSize: 11, color: theme.secondary },
  place: { fontFamily: theme.font, fontSize: 12, color: theme.text },
  trailing: {
    alignItems: "flex-end",
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
  status: { fontSize: 10, fontFamily: theme.font, padding: 4, borderRadius: 8 },
  online: { color: theme.accessibleGreen, backgroundColor: "#EDF6DD" },
  offline: { color: theme.secondary, backgroundColor: theme.canvas },
  filter: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  error: { color: theme.error, padding: 8 },
});
