import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, Header, Screen, Skeleton } from "../../shared";
import { theme } from "../../lib/theme";
import { repository } from "../../lib/repository";
import { useWorkspace } from "../../lib/workspace";
import { useDevices, useNow, updateAge } from "../uplink/hooks";
import {
  deriveMetrics,
  numericAttributes,
  observedAttributeMaxima,
} from "./metrics";
export function AnalyticsScreen() {
  const query = useDevices(true);
  const now = useNow(10000);
  const { orgId, projectId } = useWorkspace();
  const projects = useQuery({
    queryKey: ["projects", orgId],
    queryFn: ({ signal }) => repository.listProjects(orgId, signal),
    enabled: !!orgId,
  });
  const counts = useMemo(
    () => deriveMetrics(query.data ?? [], now),
    [query.data, now],
  );
  const attributes = useMemo(
    () => numericAttributes(query.data ?? []),
    [query.data],
  );
  const maxima = useMemo(
    () => observedAttributeMaxima(attributes),
    [attributes],
  );
  const project = projects.data?.find((p) => p._id === projectId);
  const overview = [
    ["Users", project?.userCount, "userCount"],
    ["Clusters", project?.clusterCount, "clusterCount"],
    [
      "Non-LoRaWAN devices",
      project?.nonLoRaWANDeviceCount,
      "nonLoRaWANDeviceCount",
    ],
  ] as const;
  const age = updateAge(query.dataUpdatedAt, now);
  return (
    <Screen style={styles.screen}>
      <Header title="Analytics" />
      {age && (
        <Text accessibilityLiveRegion="polite" style={styles.freshness}>
          Updated {age.seconds}s ago{age.stale ? " · Data may be stale" : ""}
        </Text>
      )}
      {query.isError && !!query.data && (
        <Text accessibilityRole="alert" style={styles.freshness}>
          Refresh failed. Showing last received analytics.
        </Text>
      )}
      {query.isLoading ? (
        <Skeleton />
      ) : query.isError && !query.data ? (
        <EmptyState
          title="Couldn't load analytics"
          body={query.error.message}
          action="Retry"
          onAction={() => void query.refetch()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.stats}>
            {[
              ["Total Devices", counts.total],
              ["Online", counts.online],
              ["Offline", counts.offline],
              ["Unknown", counts.unknown],
            ].map(([label, value]) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.number}>{value}</Text>
              </View>
            ))}
          </View>
          {!counts.total && (
            <EmptyState
              title="No device data yet"
              body="Analytics will appear when devices are available in this project."
            />
          )}
          <View style={styles.card}>
            <Text style={styles.heading}>Devices by last heard</Text>
            <Text style={styles.label}>
              Based on the latest reported uplink
            </Text>
            {[
              ["Under 1 hour", counts.underHour],
              ["1–24 hours", counts.underDay],
              ["24 hours or older", counts.older],
            ].map(([label, value]) => (
              <View key={label} style={styles.metric}>
                <View style={styles.metricLabel}>
                  <Text style={styles.body}>{label}</Text>
                  <Text style={styles.body}>{value}</Text>
                </View>
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={String(label)}
                  accessibilityValue={{
                    min: 0,
                    max: Math.max(counts.total, 1),
                    now: Number(value),
                  }}
                  style={styles.track}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${counts.total ? (Number(value) / counts.total) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
          {!!project && (
            <View style={styles.card}>
              <Text style={styles.heading}>Project overview</Text>
              {overview.map(([label, entries, key]) => {
                const values = (entries ?? [])
                  .map((e) => e[key])
                  .filter(
                    (v): v is number =>
                      typeof v === "number" && Number.isFinite(v),
                  );
                return (
                  <View key={label} style={styles.metricLabel}>
                    <Text style={styles.body}>{label}</Text>
                    <Text style={styles.body}>
                      {values.length
                        ? values.reduce((a, b) => a + b, 0)
                        : "Not reported"}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          <View style={styles.card}>
            <Text style={styles.heading}>Sensor overview</Text>
            {attributes.length ? (
              attributes.map((a) => {
                const max = maxima.get(a.label);
                return (
                  <View key={a.id} style={styles.metric}>
                    <Text style={styles.label}>{a.deviceName}</Text>
                    <View style={styles.metricLabel}>
                      <Text style={styles.body}>{a.label}</Text>
                      <Text style={styles.body}>
                        {a.value.toLocaleString()}
                      </Text>
                    </View>
                    {max && a.value >= 0 ? (
                      <View
                        accessibilityRole="progressbar"
                        accessibilityLabel={`${a.deviceName} ${a.label}, relative to highest observed ${a.label}`}
                        accessibilityValue={{ min: 0, max, now: a.value }}
                        style={styles.track}
                      >
                        <View
                          style={[
                            styles.bar,
                            {
                              width: `${Math.min(100, (a.value / max) * 100)}%`,
                            },
                          ]}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <Text style={styles.body}>No numeric attributes reported.</Text>
            )}
            <Text style={styles.label}>
              Bars compare devices with the same attribute name to the highest
              observed value in this project. No device-defined range is
              assumed.
            </Text>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { backgroundColor: theme.canvas },
  freshness: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    fontFamily: theme.font,
    fontSize: 12,
    color: theme.secondary,
  },
  content: { padding: 16, gap: 16 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: {
    minWidth: "45%",
    flexGrow: 1,
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  label: { fontFamily: theme.font, fontSize: 12, color: theme.secondary },
  number: { fontFamily: theme.bold, fontSize: 24, color: theme.text },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  heading: { fontFamily: theme.bold, fontSize: 16, color: theme.text },
  metric: { gap: 8, marginTop: 8 },
  metricLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  body: {
    fontFamily: theme.font,
    fontSize: 14,
    color: theme.text,
    flexShrink: 1,
  },
  track: {
    height: 8,
    backgroundColor: "#E8EEDF",
    borderRadius: 8,
    overflow: "hidden",
  },
  bar: { height: 8, backgroundColor: theme.green, borderRadius: 8 },
});
