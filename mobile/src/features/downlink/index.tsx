import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Field, Sheet } from "../../shared";
import { repository } from "../../lib/repository";
import { useWorkspace } from "../../lib/workspace";
import { useSession } from "../../lib/session";
import { reconcileDownlink, sendDownlink } from "./api";
import { theme } from "../../lib/theme";
import { hardwareControllerIds, listHardware } from "../devices/api";
import { ApiError } from "../../lib/errors";

const busylightColours: Record<string, string> = {
  red: "Red",
  green: "Green",
  blue: "Blue",
  off: "Off",
  orange: "Orange",
  lime: "Lime",
  brown: "Brown",
  lightblue: "LightBlue",
  purple: "Purple",
  pink: "Pink",
};

/**
 * The live Busylight controller uses title-cased tokens (for example, "Red")
 * in its payload switch. Keep the entry field friendly while sending its
 * exact, case-sensitive controller contract.
 */
export function controllerValue(interfaceLabel: string, value: string) {
  const trimmed = value.trim();
  if (
    /set\s+color/i.test(interfaceLabel) &&
    busylightColours[trimmed.toLocaleLowerCase()]
  )
    return busylightColours[trimmed.toLocaleLowerCase()];
  return trimmed;
}

export function DownlinkSheet({
  visible,
  deviceId,
  hardwareId,
  onClose,
}: {
  visible: boolean;
  deviceId: string;
  hardwareId?: string | null;
  onClose: () => void;
}) {
  const orgId = useWorkspace((s) => s.orgId);
  if (!visible) return null;
  return (
    <DownlinkContent
      key={orgId + ":" + deviceId}
      orgId={orgId}
      deviceId={deviceId}
      hardwareId={hardwareId}
      onClose={onClose}
    />
  );
}

function DownlinkContent({
  orgId,
  deviceId,
  hardwareId,
  onClose,
}: {
  orgId: string;
  deviceId: string;
  hardwareId?: string | null;
  onClose: () => void;
}) {
  const session = useSession((s) => s.session);
  const projectId = useWorkspace((s) => s.projectId);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("");
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [deliveryState, setDeliveryState] = useState<
    "idle" | "sending" | "sent" | "failed" | "uncertain"
  >("idle");
  const sendingRef = useRef(false);
  const modules = useQuery({
    queryKey: ["modules", orgId],
    queryFn: ({ signal }) => repository.listModules(orgId, signal),
    enabled: !!orgId && !!session,
  });
  const hardware = useQuery({
    queryKey: ["hardware", orgId],
    queryFn: ({ signal }) => listHardware(orgId, signal),
    enabled: !!orgId && !!session && !!hardwareId,
  });
  useEffect(() => {
    // Reconciliation is deliberately invisible: the sheet should always be
    // ready for the next intentional command when it opens.
    void reconcileDownlink(orgId, deviceId).catch(() => {});
  }, [orgId, deviceId]);
  const selectedHardware = (hardware.data ?? []).find(
    (item) => item._id === hardwareId,
  );
  const hardwareInterfaceIds = new Set(
    selectedHardware ? hardwareControllerIds(selectedHardware) : [],
  );
  const options = (modules.data ?? []).filter(
    (module) =>
      module.moduleType === "DOWNLINK_INTERFACE" &&
      hardwareInterfaceIds.has(module._id),
  );
  const selectedModule = options.find((module) => module._id === selected);
  const isBusylightColourControl = /set\s+color/i.test(
    selectedModule?.label ?? "",
  );
  const send = async () => {
    if (
      sendingRef.current ||
      pending ||
      !session ||
      !options.length ||
      !selected ||
      !value.trim()
    )
      return;
    sendingRef.current = true;
    setPending(true);
    setMessage("");
    setDeliveryState("sending");
    try {
      const trimmed = controllerValue(selectedModule?.label ?? "", value);
      const numeric = /^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)
        ? Number(trimmed)
        : trimmed;
      const result = await sendDownlink({
        organisationId: orgId,
        deviceId,
        downlinkInterfaceId: selected,
        value: { value: numeric },
      });
      await queryClient.invalidateQueries({
        queryKey: ["details", orgId, projectId],
      });
      setMessage(result.message ?? "");
      setDeliveryState("sent");
      setValue("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to send command.");
      setDeliveryState(
        e instanceof ApiError && e.kind !== "uncertain"
          ? "failed"
          : "uncertain",
      );
      // Keep command-history recovery out of the operator's flow. The next
      // deliberate send remains available without a manual acknowledgement.
      void reconcileDownlink(orgId, deviceId).catch(() => {});
    } finally {
      sendingRef.current = false;
      setPending(false);
    }
  };
  return (
    <Sheet onClose={pending ? () => {} : onClose} title="Send Downlink">
      <Text>
        Choose an interface and enter the controller value for this device.
      </Text>
      {(modules.isPending || hardware.isPending) && (
        <Text>Loading hardware controllers…</Text>
      )}
      {!hardwareId && (
        <Text>Hardware mapping is unavailable for this device.</Text>
      )}
      {hardware.isError && (
        <Text accessibilityRole="alert">
          Hardware controller mapping could not be loaded.
        </Text>
      )}
      {!hardware.isPending &&
        !hardware.isError &&
        !!hardwareId &&
        !selectedHardware && (
          <Text>Hardware definition was not found for this device.</Text>
        )}
      {!modules.isPending &&
        !hardware.isPending &&
        !hardware.isError &&
        selectedHardware &&
        !options.length && (
          <Text>
            No compatible controllers are available for this hardware.
          </Text>
        )}
      {!!options.length && (
        <>
          <Text style={styles.interfaceLabel}>Select interface</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.interfaceSlider}
          >
            {options.map((module) => {
              const selectedOption = selected === module._id;
              return (
                <Pressable
                  key={module._id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedOption }}
                  accessibilityLabel={`Select ${module.label}`}
                  onPress={() => setSelected(module._id)}
                  style={[
                    styles.interfaceOption,
                    selectedOption && styles.interfaceOptionSelected,
                  ]}
                >
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.interfaceOptionText,
                      selectedOption && styles.interfaceOptionTextSelected,
                    ]}
                  >
                    {module.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
      <Field
        label="Value"
        value={value}
        onChangeText={setValue}
        editable={!pending}
      />
      {isBusylightColourControl && (
        <Text style={styles.controllerHint}>
          Set Color uses port 15. Try Red, Green, Blue, or Off.
        </Text>
      )}
      {deliveryState !== "idle" && (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.delivery,
            deliveryState === "uncertain" && styles.deliveryUncertain,
            deliveryState === "failed" && styles.deliveryFailed,
            deliveryState === "sent" && styles.deliverySent,
          ]}
        >
          {deliveryState === "sending" && (
            <ActivityIndicator color={theme.accessibleGreen} />
          )}
          <Text style={styles.deliveryText}>
            {deliveryState === "sending"
              ? "Sending command…"
              : deliveryState === "sent"
                ? "Command accepted · waiting for device update"
                : deliveryState === "failed"
                  ? "Command was not sent"
                  : "Command outcome uncertain"}
          </Text>
        </View>
      )}
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
      <Button
        title={pending ? "Sending…" : "Send Downlink"}
        disabled={
          pending ||
          !options.length ||
          !selected ||
          !value.trim() ||
          !deviceId ||
          !orgId
        }
        onPress={() => void send()}
      />
      <Button title="Cancel" disabled={pending} onPress={onClose} />
    </Sheet>
  );
}
const styles = StyleSheet.create({
  delivery: {
    minHeight: 48,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#EEF6DF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deliverySent: { backgroundColor: "#EEF6DF" },
  deliveryUncertain: { backgroundColor: "#FFF0EC" },
  deliveryFailed: { backgroundColor: "#FFF0EC" },
  deliveryText: { fontFamily: theme.bold, color: theme.text, flex: 1 },
  controllerHint: {
    fontFamily: theme.font,
    color: theme.secondary,
    fontSize: 12,
  },
  interfaceLabel: { fontFamily: theme.bold, color: theme.text, fontSize: 14 },
  interfaceSlider: { gap: 8, paddingRight: 8 },
  interfaceOption: {
    width: 156,
    minHeight: 64,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    borderRadius: 8,
    backgroundColor: theme.surface,
  },
  interfaceOptionSelected: {
    backgroundColor: "#EEF6DF",
    borderColor: theme.green,
  },
  interfaceOptionText: {
    fontFamily: theme.font,
    color: theme.text,
    fontSize: 13,
  },
  interfaceOptionTextSelected: {
    fontFamily: theme.bold,
    color: theme.accessibleGreen,
  },
});
