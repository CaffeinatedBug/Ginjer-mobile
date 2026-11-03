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
import { type Device } from "../../lib/contracts";
import { useWorkspace } from "../../lib/workspace";
import { theme } from "../../lib/theme";
import {
  deviceStatus,
  formatTimestamp,
  formatValue,
} from "../../lib/formatters";
import { DownlinkSheet } from "../downlink";
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
import { filterDevices, type StatusFilter } from "./model";
const offsets = new Map<string, number>();
const EXPANDED_ROW_HEIGHT = 188;
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
  // Cards are a live device surface, so always request the complete payload.
  const query = useDevices(true);
  const now = useNow();
  const statusNow = useNow(30_000);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 200);
  const [status, setStatus] = useState<StatusFilter>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [commandDeviceId, setCommandDeviceId] = useState<string | null>(null);
  const listRef = useRef<FlatList<Device>>(null);
  const filtered = useMemo(
    () => filterDevices(query.data ?? [], debounced, status, statusNow),
    [query.data, debounced, status, statusNow],
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
            length: EXPANDED_ROW_HEIGHT,
            offset: EXPANDED_ROW_HEIGHT * index,
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
              onCommand={() => setCommandDeviceId(item._id)}
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
      {commandDeviceId && (
        <DownlinkSheet
          visible
          deviceId={commandDeviceId}
          hardwareId={
            query.data?.find((device) => device._id === commandDeviceId)
              ?.hardwareId
          }
          onClose={() => setCommandDeviceId(null)}
        />
      )}
    </Screen>
  );
}
const DeviceRow = memo(function DeviceRow({
  device,
  status,
  onPress,
  onCommand,
}: {
  device: Device;
  status: string;
  onPress: () => void;
  onCommand: () => void;
}) {
  const compact = false;
  const keyValue = device.outputs?.[0] ?? device.attributes?.[0];
  const keyLabel = device.outputs?.[0]
    ? device.outputs[0].outputName || device.outputs[0].outputId
    : device.attributes?.[0]?.attributeName ||
      device.attributes?.[0]?.attributeId;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${status}, DevEUI ${device.devEui}`}
      onPress={onPress}
      style={s.card}
    >
      {!compact && (
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
      )}
      <View style={s.copy}>
        <Text numberOfLines={1} style={s.name}>
          {device.name}
        </Text>
        <Text numberOfLines={1} style={s.small}>
          Last heard: {formatTimestamp(device.timestamp)}
        </Text>
        {keyValue && (
          <Text numberOfLines={1} style={s.small}>
            {keyLabel}: {formatValue(keyValue.value)}
          </Text>
        )}
        {!compact && (
          <>
            <Text numberOfLines={1} style={s.place}>
              {device.position?.placeName || "No location"}
            </Text>
            <Text numberOfLines={1} style={s.small}>
              DevEUI: {device.devEui}
            </Text>
            {(device.outputs ?? []).slice(0, 2).map((output) => (
              <View key={output.outputId} style={s.outputRow}>
                <Icon
                  name="chart"
                  size={14}
                  color={outputColour(output.color)}
                />
                <Text numberOfLines={1} style={s.outputText}>
                  {output.outputName || output.outputId}
                  {output.label ? ` · ${output.label}` : ""}:{" "}
                  {formatValue(output.value)}
                </Text>
              </View>
            ))}
            {!device.outputs?.length && (
              <Text numberOfLines={1} style={s.small}>
                No outputs reported
              </Text>
            )}
            <Text numberOfLines={1} style={s.small}>
              {(device.attributes ?? [])
                .map(
                  (attribute) =>
                    `${attribute.attributeName}: ${formatValue(attribute.value)}`,
                )
                .join(" · ") || "No attributes reported"}
            </Text>
          </>
        )}
      </View>
      <View style={s.trailing}>
        <Text
          style={[
            s.status,
            status === "Online"
              ? s.online
              : status === "Unknown"
                ? s.unknown
                : s.offline,
          ]}
        >
          {status}
        </Text>
        <Icon name="next" size={18} />
        {!compact && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Send command to ${device.name}`}
            onPress={(event) => {
              event.stopPropagation();
              onCommand();
            }}
            style={s.command}
          >
            <Text style={s.commandText}>Command</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});
function outputColour(colour: string | null | undefined) {
  return colour && /^#[0-9a-f]{3,8}$/i.test(colour)
    ? colour
    : theme.accessibleGreen;
}
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
    height: 188,
    marginBottom: 12,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 1,
  },
  command: { minHeight: 44, justifyContent: "center", paddingHorizontal: 5 },
  commandText: {
    color: theme.accessibleGreen,
    fontFamily: theme.bold,
    fontSize: 12,
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
  outputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  outputText: {
    flex: 1,
    fontFamily: theme.font,
    fontSize: 11,
    color: theme.secondary,
  },
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
  unknown: { color: "#8B5E00", backgroundColor: "#FFF3D7" },
  filter: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  error: { color: theme.error, padding: 8 },
});
