import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { deriveHealthItems, healthSummary } from "./health";

export function AnalyticsScreen({
  onSelectDevice,
}: {
  onSelectDevice?: (deviceId: string) => void;
}) {
  const [customLabels, setCustomLabels] = useState<string[]>([]);
  const query = useDevices(true);
  const now = useNow(10000);
  const { orgId, projectId } = useWorkspace();
  const projects = useQuery({
    queryKey: ["projects", orgId],
    queryFn: ({ signal }) => repository.listProjects(orgId, signal),
    enabled: !!orgId,
  });
  const automation = useQuery({
    queryKey: ["automation", orgId, projectId],
    queryFn: ({ signal }) =>
      repository.listAutomation(orgId, projectId, signal),
    enabled: !!orgId && !!projectId,
    staleTime: 30_000,
  });
  const counts = useMemo(
    () => deriveMetrics(query.data ?? [], now),
    [query.data, now],
  );
  const attributes = useMemo(
    () => numericAttributes(query.data ?? []),
    [query.data],
  );
  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem("ginjer.analytics.custom-attributes").then(
      (raw) => {
        if (!mounted || !raw) return;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (
            Array.isArray(parsed) &&
            parsed.every((value) => typeof value === "string")
          )
            setCustomLabels(parsed);
        } catch {
          // Ignore an invalid local preference and keep the real-data default.
        }
      },
    );
    return () => {
      mounted = false;
    };
  }, []);
  const customAttributes = useMemo(
    () =>
      attributes.filter((attribute) => customLabels.includes(attribute.label)),
    [attributes, customLabels],
  );
  const toggleCustom = (label: string) => {
    const next = customLabels.includes(label)
      ? customLabels.filter((value) => value !== label)
      : [...customLabels, label];
    setCustomLabels(next);
    void AsyncStorage.setItem(
      "ginjer.analytics.custom-attributes",
      JSON.stringify(next),
    );
  };
  const maxima = useMemo(
    () => observedAttributeMaxima(attributes),
    [attributes],
  );
  const project = projects.data?.find((p) => p._id === projectId);
  const healthItems = useMemo(
    () => deriveHealthItems(query.data ?? [], now),
    [query.data, now],
  );
  const health = useMemo(() => healthSummary(healthItems), [healthItems]);
  const automationSummary = useMemo(() => {
    if (!automation.data) return null;
    const active = automation.data.alerts.filter(
      (alert) => alert.active && !alert.deleted,
    ).length;
    const latest = [...automation.data.runs].sort(
      (a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt),
    )[0];
    const cutoff = now - 24 * 60 * 60 * 1000;
    const stoppedLastDay = automation.data.runs.filter(
      (run) =>
        (run.state === "ABORTED" || run.state === "CANCELLED") &&
        Date.parse(run.triggeredAt) >= cutoff,
    ).length;
    return { active, latest, stoppedLastDay };
  }, [automation.data, now]);
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
          {!!project && (
            <View style={styles.card}>
              <Text style={styles.heading}>Automation summary</Text>
              {automation.isLoading ? (
                <Text style={styles.body}>Loading automation data…</Text>
              ) : automation.isError ? (
                <Text accessibilityRole="alert" style={styles.body}>
                  Automation data is unavailable: {automation.error.message}
                </Text>
              ) : automation.data?.alerts.length ? (
                <>
                  <View style={styles.metricLabel}>
                    <Text style={styles.body}>Configured automations</Text>
                    <Text style={styles.body}>
                      {automation.data.alerts.length}
                    </Text>
                  </View>
                  <View style={styles.metricLabel}>
                    <Text style={styles.body}>Active</Text>
                    <Text style={styles.body}>
                      {automationSummary?.active ?? 0}
                    </Text>
                  </View>
                  <View style={styles.metricLabel}>
                    <Text style={styles.body}>Runs loaded</Text>
                    <Text style={styles.body}>
                      {automation.data.runs.length}
                    </Text>
                  </View>
                  <Text style={styles.label}>
                    {
                      automation.data.runs.filter(
                        (run) => run.state === "SUCCEEDED",
                      ).length
                    }{" "}
                    succeeded ·{" "}
                    {
                      automation.data.runs.filter(
                        (run) => run.state === "RUNNING",
                      ).length
                    }{" "}
                    running ·{" "}
                    {
                      automation.data.runs.filter(
                        (run) =>
                          run.state === "ABORTED" || run.state === "CANCELLED",
                      ).length
                    }{" "}
                    stopped
                  </Text>
                  <Text style={styles.label}>
                    Latest run:{" "}
                    {automationSummary?.latest?.state ?? "Not reported"} ·{" "}
                    {automationSummary?.stoppedLastDay ?? 0} stopped in the last
                    24 h
                  </Text>
                </>
              ) : (
                <Text style={styles.body}>
                  No automations are configured for this project.
                </Text>
              )}
            </View>
          )}
          <View style={styles.card}>
            <Text style={styles.heading}>Health check</Text>
            <Text style={styles.label}>
              Derived from the latest device details; no health data is
              invented.
            </Text>
            {healthItems.length ? (
              <>
                <View style={styles.metricLabel}>
                  <Text style={styles.body}>Needs attention</Text>
                  <Text style={styles.body}>
                    {health.critical + health.warning}
                  </Text>
                </View>
                {healthItems.slice(0, 8).map((item) => (
                  <View key={item.device._id} style={styles.healthRow}>
                    <View style={styles.healthCopy}>
                      <Text style={styles.body}>{item.device.name}</Text>
                      <Text style={styles.label}>{item.reason}</Text>
                    </View>
                    {onSelectDevice ? (
                      <Text
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${item.device.name}`}
                        onPress={() => onSelectDevice?.(item.device._id)}
                        style={styles.link}
                      >
                        View
                      </Text>
                    ) : null}
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.body}>No device health data reported.</Text>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.heading}>Custom analytics</Text>
            <Text style={styles.label}>
              Choose numeric attributes from the real device data for a focused
              view.
            </Text>
            {attributes.length ? (
              <View style={styles.choiceWrap}>
                {Array.from(
                  new Set(attributes.map((attribute) => attribute.label)),
                ).map((label) => {
                  const selected = customLabels.includes(label);
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggleCustom(label)}
                      style={[styles.choice, selected && styles.choiceSelected]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          selected && styles.choiceTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {customAttributes.length ? (
              customAttributes.map((attribute) => (
                <View key={`${attribute.id}-custom`} style={styles.metricLabel}>
                  <Text style={styles.body}>
                    {attribute.deviceName} · {attribute.label}
                  </Text>
                  <Text style={styles.body}>
                    {attribute.value.toLocaleString()}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.body}>
                Select an attribute to add a custom metric.
              </Text>
            )}
          </View>
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
  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  healthCopy: { flex: 1, gap: 3 },
  link: {
    color: theme.accessibleGreen,
    fontFamily: theme.bold,
    fontSize: 14,
    padding: 8,
  },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.secondary,
  },
  choiceSelected: { backgroundColor: theme.green, borderColor: theme.green },
  choiceText: { fontFamily: theme.font, color: theme.text, fontSize: 13 },
  choiceTextSelected: { fontFamily: theme.bold, color: theme.text },
  track: {
    height: 8,
    backgroundColor: "#E8EEDF",
    borderRadius: 8,
    overflow: "hidden",
  },
  bar: { height: 8, backgroundColor: theme.green, borderRadius: 8 },
});
