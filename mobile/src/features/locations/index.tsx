import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  Button,
  EmptyState,
  Field,
  IconButton,
  Screen,
  Sheet,
  Skeleton,
} from "../../shared";
import { theme } from "../../lib/theme";
import type { Device } from "../../lib/contracts";
import type { RootStackParamList, TabParamList } from "../../navigation/types";
import { formatTimestamp, deviceStatus } from "../../lib/formatters";
import {
  useDevices,
  useDebouncedValue,
  useNow,
  updateAge,
} from "../uplink/hooks";
import { NotificationPanel, useCurrentEvents } from "../notifications";
import { clusterPoints, devicePoint } from "./clusters";
export function LocationsScreen() {
  const query = useDevices(true);
  const now = useNow();
  const { width } = useWindowDimensions();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<TabParamList, "Locations">>();
  const feed = useCurrentEvents();
  const net = useNetInfo();
  const map = useRef<MapView>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Device | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [delta, setDelta] = useState(0.05);
  const debounced = useDebouncedValue(search, 200);
  const devices = useMemo(
    () =>
      (query.data ?? []).filter((d) =>
        `${d.name} ${d.devEui} ${d.position?.placeName ?? ""}`
          .toLowerCase()
          .includes(debounced.trim().toLowerCase()),
      ),
    [query.data, debounced],
  );
  const points = useMemo(
    () =>
      devices.flatMap((d) => {
        const point = devicePoint(d);
        return point ? [point] : [];
      }),
    [devices],
  );
  const missing = useMemo(
    () => devices.filter((d) => !devicePoint(d)),
    [devices],
  );
  const clusters = useMemo(
    () => clusterPoints(points, delta, width),
    [points, delta, width],
  );
  const initial = points[0];
  const focusId = route.params?.deviceId;
  useEffect(() => {
    if (ready || net.isConnected === false) return;
    const timer = setTimeout(() => setFailed(true), 20000);
    return () => clearTimeout(timer);
  }, [net.isConnected, ready]);
  useEffect(() => {
    if (!ready) return;
    const focus = points.find((p) => p.device._id === focusId);
    if (focus) {
      map.current?.animateToRegion(
        {
          latitude: focus.latitude,
          longitude: focus.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        350,
      );
    } else if (points.length) {
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: 100, right: 40, bottom: 80, left: 40 },
        animated: false,
      });
    }
  }, [ready, focusId, points]);
  const unavailable = net.isConnected === false || failed;
  const age = updateAge(query.dataUpdatedAt, now);
  return (
    <Screen>
      <View style={styles.search}>
        <View style={{ flex: 1 }}>
          <Field
            label="Search Devices"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <IconButton
          name="bell"
          label={`${feed.events.filter((e) => !e.read).length} unread notifications`}
          onPress={() => setNotifications(true)}
        />
      </View>
      {age && (
        <Text accessibilityLiveRegion="polite" style={styles.freshness}>
          Updated {age.seconds}s ago{age.stale ? " · Data may be stale" : ""}
        </Text>
      )}
      {query.isError && !!query.data && (
        <Text accessibilityRole="alert" style={styles.freshness}>
          Refresh failed. Showing last received locations.
        </Text>
      )}
      {query.isLoading ? (
        <Skeleton />
      ) : query.isError && !query.data ? (
        <EmptyState
          title="Couldn't load locations"
          body={query.error.message}
          action="Retry"
          onAction={() => void query.refetch()}
        />
      ) : (
        <View style={styles.content}>
          {!unavailable ? (
            <View style={styles.mapFrame}>
              <MapView
                ref={map}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={
                  initial
                    ? {
                        latitude: initial.latitude,
                        longitude: initial.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      }
                    : undefined
                }
                onMapReady={() => {
                  setReady(true);
                  setFailed(false);
                }}
                onRegionChangeComplete={(region: Region) =>
                  setDelta(region.longitudeDelta)
                }
                accessibilityLabel="Device locations"
                showsUserLocation={false}
                showsMyLocationButton={false}
              >
                {clusters.map((group) => (
                  <Marker
                    key={group.key}
                    coordinate={{
                      latitude: group.latitude,
                      longitude: group.longitude,
                    }}
                    title={
                      group.points.length > 1
                        ? `${group.points.length} devices`
                        : group.points[0].device.name
                    }
                    pinColor={theme.green}
                    onPress={() => {
                      if (group.points.length === 1)
                        setSelected(group.points[0].device);
                      else
                        map.current?.animateToRegion(
                          {
                            latitude: group.latitude,
                            longitude: group.longitude,
                            latitudeDelta: Math.max(delta / 2, 0.0001),
                            longitudeDelta: Math.max(delta / 2, 0.0001),
                          },
                          300,
                        );
                    }}
                  >
                    {group.points.length > 1 ? (
                      <View
                        accessible
                        accessibilityLabel={`${group.points.length} devices. Zoom in`}
                        style={styles.cluster}
                      >
                        <Text style={styles.clusterText}>C</Text>
                      </View>
                    ) : undefined}
                  </Marker>
                ))}
              </MapView>
              {!initial && (
                <View pointerEvents="none" style={styles.emptyMapNotice}>
                  <Text style={styles.emptyMapTitle}>
                    No device locations yet
                  </Text>
                  <Text style={styles.emptyMapBody}>
                    Map tiles are available. Device markers appear when devices
                    report GPS coordinates.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <EmptyState
              title={unavailable ? "Map unavailable" : "No device locations"}
              body={
                unavailable
                  ? "Check your connection and map configuration."
                  : "Only devices with reported coordinates appear on the map."
              }
              action={unavailable ? "Retry" : undefined}
              onAction={() => {
                setFailed(false);
                setReady(false);
                void query.refetch();
              }}
            />
          )}
          {!!missing.length && (
            <View style={styles.noLocation}>
              <Text style={styles.heading}>No location ({missing.length})</Text>
              <FlatList
                data={missing}
                keyExtractor={(d) => d._id}
                renderItem={({ item }) => (
                  <Button
                    title={item.name}
                    variant="secondary"
                    onPress={() => setSelected(item)}
                  />
                )}
              />
            </View>
          )}
        </View>
      )}
      {selected && (
        <Sheet title="Device info" onClose={() => setSelected(null)}>
          <Text style={styles.heading}>{selected.name}</Text>
          <Text style={styles.body}>{selected.devEui}</Text>
          <Text style={styles.body}>
            {selected.position?.placeName || "No location"}
          </Text>
          <Text style={styles.body}>
            {deviceStatus(selected.timestamp, now)} ·{" "}
            {formatTimestamp(selected.timestamp)}
          </Text>
          <Button
            title="View Device"
            onPress={() => {
              const deviceId = selected._id;
              setSelected(null);
              navigation.navigate("DeviceDetails", { deviceId });
            }}
          />
        </Sheet>
      )}
      {notifications && (
        <NotificationPanel onClose={() => setNotifications(false)} />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  search: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.surface,
  },
  freshness: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontFamily: theme.font,
    fontSize: 12,
    color: theme.secondary,
  },
  content: { flex: 1 },
  mapFrame: { flex: 1, minHeight: 220 },
  map: { flex: 1 },
  emptyMapNotice: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
    gap: 3,
  },
  emptyMapTitle: { fontFamily: theme.bold, fontSize: 15, color: theme.text },
  emptyMapBody: {
    fontFamily: theme.font,
    fontSize: 12,
    color: theme.secondary,
    lineHeight: 17,
  },
  cluster: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: theme.surface,
    backgroundColor: theme.green,
    alignItems: "center",
    justifyContent: "center",
  },
  clusterText: { fontFamily: theme.bold, fontSize: 16, color: theme.text },
  noLocation: {
    maxHeight: 180,
    padding: 12,
    gap: 8,
    backgroundColor: theme.surface,
  },
  heading: { fontFamily: theme.bold, fontSize: 16, color: theme.text },
  body: { fontFamily: theme.font, fontSize: 14, color: theme.secondary },
});
