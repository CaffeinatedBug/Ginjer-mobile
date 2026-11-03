import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  Button,
  EmptyState,
  Header,
  Icon,
  Screen,
  Skeleton,
} from "../../shared";
import { theme } from "../../lib/theme";
import {
  deviceStatus,
  formatTimestamp,
  formatValue,
} from "../../lib/formatters";
import { useDevices, useNow } from "../uplink/hooks";
import { DownlinkSheet } from "../downlink";
import { useWorkspace } from "../../lib/workspace";
import { devicePoint } from "../locations/clusters";
import { useQuery } from "@tanstack/react-query";
import { repository } from "../../lib/repository";
import { extractHistoryPoints } from "./history";

export function DeviceDetailsScreen({
  deviceId,
  onBack,
  onViewMap,
}: {
  deviceId: string;
  onBack?: () => void;
  onViewMap?: (id: string) => void;
}) {
  const query = useDevices(true);
  const { orgId, projectId } = useWorkspace();
  const now = useNow();
  const [downlinkOpen, setDownlinkOpen] = useState(false);
  const device = query.data?.find((item) => item._id === deviceId);
  const history = useQuery({
    queryKey: [
      "history",
      orgId,
      deviceId,
      device?.outputs?.map((o) => o.outputId),
    ],
    queryFn: ({ signal }) =>
      repository.getHistoricalData(
        orgId,
        deviceId,
        (device?.outputs ?? []).map((output) => output.outputId),
        signal,
      ),
    enabled: !!orgId && !!device && (device.outputs?.length ?? 0) > 0,
    staleTime: 60_000,
  });
  const historyPoints = extractHistoryPoints(history.data);
  const point = device ? devicePoint(device) : null;
  const age =
    query.dataUpdatedAt && now
      ? Math.max(0, Math.floor((now - query.dataUpdatedAt) / 1000))
      : null;
  return (
    <Screen>
      <Header title="Device Details" back={onBack} />
      {!orgId || !projectId ? (
        <EmptyState
          title="Choose a project"
          body="Select a project before viewing device details."
          action="Back to devices"
          onAction={onBack}
        />
      ) : query.isPending ? (
        <View style={styles.content}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </View>
      ) : query.isError && !query.data ? (
        <EmptyState
          title="Couldn’t load device details"
          body={query.error.message}
          action="Retry"
          onAction={() => void query.refetch()}
        />
      ) : !device ? (
        <EmptyState
          title="Device not found"
          body="This device may have been removed or moved to another project."
          action="Back to devices"
          onAction={onBack}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {age !== null ? (
            <Text
              style={[styles.secondary, age > 90 && { color: theme.error }]}
            >
              Updated {age}s ago{age > 90 ? " · Data may be stale" : ""}
            </Text>
          ) : null}
          {query.isError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              Refresh failed. Showing previously received data.
            </Text>
          ) : null}
          <View style={styles.identity}>
            <View style={styles.deviceIcon}>
              {/busy/i.test(device.hardwareType ?? "") ? (
                <Image
                  source={require("../../assets/80bd2.png")}
                  contentFit="contain"
                  style={styles.deviceImage}
                  accessibilityLabel={device.name}
                />
              ) : (
                <Icon name="devices" size={48} color={theme.accessibleGreen} />
              )}
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{device.name}</Text>
              <Text style={styles.secondary}>DevEUI: {device.devEui}</Text>
              <Text style={styles.secondary}>
                Last heard: {formatTimestamp(device.timestamp)}
              </Text>
              <Text style={styles.secondary}>
                Status: {deviceStatus(device.timestamp, now)}
              </Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>
              {device.position?.placeName || "No location"}
            </Text>
            {device.description ? (
              <Text style={styles.secondary}>{device.description}</Text>
            ) : null}
          </View>
          <Text style={styles.section}>Outputs</Text>
          {device.outputs?.length ? (
            <View style={styles.grid}>
              {device.outputs.map((output) => (
                <View key={output.outputId} style={styles.output}>
                  <Text style={styles.value}>
                    {output.outputName || "Output"}
                  </Text>
                  {output.label ? (
                    <Text style={styles.secondary}>{output.label}</Text>
                  ) : null}
                  <Text style={styles.outputValue}>
                    {formatValue(output.value)}
                  </Text>
                  {output.color ? (
                    <Text style={styles.secondary}>Colour: {output.color}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.secondary}>No outputs reported.</Text>
          )}
          <Text style={styles.section}>Digital twin</Text>
          {device.outputs?.length || device.attributes?.length ? (
            <View style={styles.twinCard}>
              <View style={styles.twinDevice}>
                {device.outputs?.slice(0, 6).map((output) => (
                  <View
                    key={`twin-${output.outputId}`}
                    style={styles.twinOutput}
                  >
                    <View
                      accessibilityLabel={`${output.outputName || "Output"} state`}
                      style={[
                        styles.twinLight,
                        output.color && /^#[0-9a-f]{3,8}$/i.test(output.color)
                          ? { backgroundColor: output.color }
                          : null,
                      ]}
                    />
                    <Text style={styles.twinLabel}>
                      {output.outputName || "Output"}
                    </Text>
                    <Text style={styles.twinValue}>
                      {formatValue(output.value)}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.secondary}>
                State mirrors the latest reported outputs and attributes.
                Adjustments use Send Downlink.
              </Text>
            </View>
          ) : (
            <Text style={styles.secondary}>
              No reported state to visualize.
            </Text>
          )}
          <Text style={styles.section}>Attributes</Text>
          {device.attributes?.length ? (
            device.attributes.map((attribute) => (
              <View key={attribute.attributeId} style={styles.attribute}>
                <Text style={styles.secondary}>
                  {attribute.attributeName || "Attribute"}
                </Text>
                <Text style={styles.value}>{formatValue(attribute.value)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.secondary}>No attributes reported.</Text>
          )}
          <Text style={styles.section}>History (7 days)</Text>
          {history.isLoading ? (
            <Text style={styles.secondary}>Loading historical data…</Text>
          ) : history.isError ? (
            <Text accessibilityRole="alert" style={styles.secondary}>
              Historical data is unavailable: {history.error.message}
            </Text>
          ) : historyPoints.length ? (
            <View style={styles.historyCard}>
              <View style={styles.chart}>
                {historyPoints.slice(-24).map((point, index, points) => {
                  const max = Math.max(...points.map((item) => item.value), 1);
                  return (
                    <View
                      key={`${point.timestamp}-${index}`}
                      accessibilityLabel={`${point.value} at ${point.timestamp}`}
                      style={[
                        styles.chartBar,
                        { height: Math.max(4, (point.value / max) * 96) },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.secondary}>
                Showing {Math.min(historyPoints.length, 24)} latest reported
                values.
              </Text>
            </View>
          ) : (
            <Text style={styles.secondary}>
              No numeric history reported for this device.
            </Text>
          )}
          {point ? (
            <View style={styles.mapPreview}>
              <MapView
                key={`${point.latitude}:${point.longitude}`}
                provider={PROVIDER_GOOGLE}
                pointerEvents="none"
                style={styles.map}
                initialRegion={{
                  latitude: point.latitude,
                  longitude: point.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: point.latitude,
                    longitude: point.longitude,
                  }}
                  pinColor={theme.green}
                />
              </MapView>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Button
              title="View Map"
              variant="secondary"
              disabled={!point}
              onPress={() => onViewMap?.(deviceId)}
            />
            <Button
              title="Send Downlink"
              onPress={() => setDownlinkOpen(true)}
            />
          </View>
        </ScrollView>
      )}
      <DownlinkSheet
        visible={downlinkOpen && !!device}
        deviceId={deviceId}
        hardwareId={device?.hardwareId}
        onClose={() => setDownlinkOpen(false)}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 12,
    backgroundColor: theme.background,
  },
  identity: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: theme.surface,
    padding: 12,
    borderRadius: 8,
  },
  deviceIcon: {
    width: 82,
    height: 82,
    borderRadius: 8,
    backgroundColor: "#EEF6DF",
    alignItems: "center",
    justifyContent: "center",
  },
  deviceImage: { width: 80, height: 80 },
  identityText: { flex: 1, gap: 5 },
  name: { fontFamily: theme.bold, color: theme.text, fontSize: 20 },
  secondary: { fontFamily: theme.font, color: theme.secondary, fontSize: 13 },
  card: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: theme.surface,
    gap: 6,
  },
  label: { fontFamily: theme.font, color: theme.secondary, fontSize: 12 },
  value: { fontFamily: theme.bold, color: theme.text, fontSize: 15 },
  section: {
    fontFamily: theme.bold,
    color: theme.text,
    fontSize: 17,
    marginTop: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  output: {
    width: "48%",
    minHeight: 100,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 8,
    gap: 8,
  },
  outputValue: {
    fontFamily: theme.bold,
    color: theme.accessibleGreen,
    fontSize: 18,
  },
  twinCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: theme.surface,
    gap: 12,
  },
  twinDevice: {
    minHeight: 96,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#EEF6DF",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  twinOutput: { minWidth: 72, alignItems: "center", gap: 3 },
  twinLight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.muted,
  },
  twinLabel: { fontFamily: theme.font, color: theme.secondary, fontSize: 11 },
  twinValue: { fontFamily: theme.bold, color: theme.text, fontSize: 12 },
  attribute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 8,
  },
  historyCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: theme.surface,
    gap: 10,
  },
  chart: {
    height: 108,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  chartBar: {
    flex: 1,
    minWidth: 3,
    backgroundColor: theme.green,
    borderRadius: 2,
  },
  mapPreview: {
    height: 170,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
  },
  map: { flex: 1 },
  actions: { marginTop: 12, gap: 10 },
  error: { fontFamily: theme.font, color: theme.error, fontSize: 13 },
});
