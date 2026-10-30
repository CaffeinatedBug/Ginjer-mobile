import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Button,
  EmptyState,
  Field,
  Header,
  Screen,
  Sheet,
  Skeleton,
} from "../../shared";
import { theme } from "../../lib/theme";
import { useWorkspace } from "../../lib/workspace";
import { queryClient } from "../../lib/query";
import { repository } from "../../lib/repository";
import type { EnrollmentChoice } from "../../lib/contracts";
import { listClusters, listHardware, listNetworks, saveDevice } from "./api";

type Picker = "hardware" | "network" | "cluster" | "output" | null;
type Draft = {
  name: string;
  devEui: string;
  description: string;
  hardwareId: string;
  networkId: string;
  clusterId: string;
  mainOutputId: string;
  attributesJson: string;
  placeName: string;
  latitude: string;
  longitude: string;
};
const initialDraft: Draft = {
  name: "",
  devEui: "",
  description: "",
  hardwareId: "",
  networkId: "",
  clusterId: "",
  mainOutputId: "",
  attributesJson: "[]",
  placeName: "",
  latitude: "",
  longitude: "",
};
const attributeExample = '[{"attributeId":"…","attributeName":"…","value":{}}]';

export function AddDeviceScreen({ onBack }: { onBack?: () => void }) {
  const { orgId, projectId, projectName } = useWorkspace();
  const [draft, setDraft] = useState(initialDraft);
  const [picker, setPicker] = useState<Picker>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  const hardware = useQuery({
    queryKey: ["hardware", orgId],
    queryFn: ({ signal }) => listHardware(orgId, signal),
    enabled: !!orgId,
  });
  const networks = useQuery({
    queryKey: ["networks", orgId],
    queryFn: ({ signal }) => listNetworks(orgId, signal),
    enabled: !!orgId,
  });
  const clusters = useQuery({
    queryKey: ["clusters", orgId, projectId],
    queryFn: ({ signal }) => listClusters(orgId, projectId, signal),
    enabled: !!orgId && !!projectId,
  });
  const modules = useQuery({
    queryKey: ["modules", orgId],
    queryFn: ({ signal }) => repository.listModules(orgId, signal),
    enabled: !!orgId,
  });
  const outputModules = useMemo(
    () =>
      (modules.data ?? [])
        .filter((item) => item.moduleType === "OUTPUT")
        .map((item) => ({ _id: item._id, name: item.label })),
    [modules.data],
  );
  const create = useMutation({
    mutationFn: saveDevice,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["devices", orgId, projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["details", orgId, projectId],
        }),
        queryClient.invalidateQueries({ queryKey: ["projects", orgId] }),
      ]);
      setConfirm(false);
      setError("");
      setDraft(initialDraft);
    },
  });

  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const choiceFor = (type: Exclude<Picker, null>) => {
    if (type === "hardware") return hardware.data ?? [];
    if (type === "network") return networks.data ?? [];
    if (type === "cluster") return clusters.data ?? [];
    return outputModules;
  };
  const labelFor = (type: Exclude<Picker, null>, id: string) =>
    choiceFor(type).find((choice) => choice._id === id)?.name || id;
  const choose = (type: Exclude<Picker, null>, value: EnrollmentChoice) => {
    const key =
      type === "hardware"
        ? "hardwareId"
        : type === "network"
          ? "networkId"
          : type === "cluster"
            ? "clusterId"
            : "mainOutputId";
    set(key, value._id);
    setPicker(null);
  };
  const submit = () => {
    setError("");
    let attributes: unknown;
    try {
      attributes = JSON.parse(draft.attributesJson);
    } catch {
      setError("Attributes must be valid JSON.");
      return;
    }
    const parsed = z
      .array(
        z.object({
          attributeId: z.string().min(1),
          attributeName: z.string().min(1),
          value: z.record(z.string(), z.unknown()),
        }),
      )
      .safeParse(attributes);
    if (!parsed.success) {
      setError(
        "Attributes must be an array of { attributeId, attributeName, value } objects.",
      );
      return;
    }
    const latitude = draft.latitude.trim();
    const longitude = draft.longitude.trim();
    if ((latitude && !longitude) || (!latitude && longitude)) {
      setError("Enter both latitude and longitude, or leave both empty.");
      return;
    }
    const lat = latitude ? Number(latitude) : undefined;
    const lng = longitude ? Number(longitude) : undefined;
    if (
      (lat !== undefined && !Number.isFinite(lat)) ||
      (lng !== undefined && !Number.isFinite(lng))
    ) {
      setError("Latitude and longitude must be numbers.");
      return;
    }
    if (!orgId || !projectId) {
      setError("Choose an organisation and project before adding a device.");
      return;
    }
    const validated = z
      .object({
        name: z.string().trim().min(1),
        devEui: z.string().trim().min(1),
        hardwareId: z.string().trim().min(1),
        networkId: z.string().trim().min(1),
        clusterId: z.string().trim().min(1),
        mainOutputId: z.string().trim().min(1),
      })
      .safeParse(draft);
    if (!validated.success) {
      setError("Complete every required device and configuration field.");
      return;
    }
    setConfirm(true);
  };
  const createDevice = () => {
    const lat = draft.latitude.trim() ? Number(draft.latitude) : undefined;
    const lng = draft.longitude.trim() ? Number(draft.longitude) : undefined;
    void create
      .mutateAsync({
        organisationId: orgId,
        projectId,
        name: draft.name.trim(),
        devEui: draft.devEui.trim(),
        description: draft.description.trim(),
        hardwareId: draft.hardwareId.trim(),
        networkId: draft.networkId.trim(),
        clusterId: draft.clusterId.trim(),
        mainOutputId: draft.mainOutputId.trim(),
        attributes: JSON.parse(draft.attributesJson),
        position:
          draft.placeName.trim() || lat !== undefined || lng !== undefined
            ? { placeName: draft.placeName.trim(), lat, lng }
            : undefined,
      })
      .catch((reason: unknown) => {
        setConfirm(false);
        setError(
          reason instanceof Error
            ? reason.message
            : "The device could not be registered.",
        );
      });
  };
  const loading = hardware.isPending || networks.isPending || modules.isPending;
  return (
    <Screen>
      <Header title="Add Device" back={onBack} />
      {!orgId || !projectId ? (
        <EmptyState
          title="Choose a project"
          body="Device registration needs an active organisation and project."
          action="Back to devices"
          onAction={onBack}
        />
      ) : loading ? (
        <View style={styles.loading}>
          <Skeleton />
          <Skeleton />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            Register a real device in {projectName || "this project"}. Device,
            network, cluster, and output IDs must match the deployed controller
            configuration.
          </Text>
          {(hardware.isError || networks.isError || modules.isError) && (
            <Text accessibilityRole="alert" style={styles.error}>
              Some configuration lists could not be loaded. You can enter
              verified IDs manually.
            </Text>
          )}
          {clusters.isError && (
            <Text accessibilityRole="alert" style={styles.error}>
              Cluster lookup is unavailable from this backend. Enter a verified
              cluster ID.
            </Text>
          )}
          <Field
            label="Device name"
            value={draft.name}
            onChangeText={(value) => set("name", value)}
            autoCapitalize="words"
          />
          <Field
            label="DevEUI"
            value={draft.devEui}
            onChangeText={(value) => set("devEui", value)}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Field
            label="Description (optional)"
            value={draft.description}
            onChangeText={(value) => set("description", value)}
          />
          <ChoiceField
            label="Hardware"
            value={labelFor("hardware", draft.hardwareId)}
            rawValue={draft.hardwareId}
            onPick={() => {
              setPickerSearch("");
              setPicker("hardware");
            }}
            onChangeText={(value) => set("hardwareId", value)}
          />
          <ChoiceField
            label="Network"
            value={labelFor("network", draft.networkId)}
            rawValue={draft.networkId}
            onPick={() => {
              setPickerSearch("");
              setPicker("network");
            }}
            onChangeText={(value) => set("networkId", value)}
          />
          <ChoiceField
            label="Cluster"
            value={labelFor("cluster", draft.clusterId)}
            rawValue={draft.clusterId}
            onPick={() => {
              setPickerSearch("");
              setPicker("cluster");
            }}
            onChangeText={(value) => set("clusterId", value)}
          />
          <ChoiceField
            label="Main output"
            value={labelFor("output", draft.mainOutputId)}
            rawValue={draft.mainOutputId}
            onPick={() => {
              setPickerSearch("");
              setPicker("output");
            }}
            onChangeText={(value) => set("mainOutputId", value)}
          />
          <Field
            label="Attributes JSON"
            value={draft.attributesJson}
            onChangeText={(value) => set("attributesJson", value)}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityHint="Use an empty array only if the selected hardware requires no attributes."
          />
          <Text style={styles.help}>Example: [] or {attributeExample}</Text>
          <Text style={styles.subheading}>Optional location</Text>
          <Field
            label="Place name"
            value={draft.placeName}
            onChangeText={(value) => set("placeName", value)}
          />
          <Field
            label="Latitude"
            value={draft.latitude}
            onChangeText={(value) => set("latitude", value)}
            keyboardType="decimal-pad"
          />
          <Field
            label="Longitude"
            value={draft.longitude}
            onChangeText={(value) => set("longitude", value)}
            keyboardType="decimal-pad"
          />
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <Button
            title="Review device registration"
            disabled={create.isPending}
            onPress={submit}
          />
          <Text style={styles.help}>
            Registration sends one backend mutation and is never retried
            automatically. If the connection fails after dispatch, confirm the
            device record before submitting again.
          </Text>
        </ScrollView>
      )}
      {picker && (
        <ChoiceSheet
          title={`Select ${picker}`}
          choices={choiceFor(picker)}
          search={pickerSearch}
          onSearch={setPickerSearch}
          onChoose={(choice) => choose(picker, choice)}
          onClose={() => setPicker(null)}
        />
      )}
      <Sheet
        visible={confirm}
        title="Register device?"
        onClose={() => !create.isPending && setConfirm(false)}
      >
        <Text style={styles.confirmText}>
          This creates a real device record for {draft.name || "this device"} in
          the selected project. Verify the IDs with the device operator first.
        </Text>
        <Button
          title={create.isPending ? "Registering…" : "Register device"}
          disabled={create.isPending}
          onPress={createDevice}
        />
        <Button
          title="Cancel"
          variant="secondary"
          disabled={create.isPending}
          onPress={() => setConfirm(false)}
        />
      </Sheet>
    </Screen>
  );
}

function ChoiceField({
  label,
  value,
  rawValue,
  onPick,
  onChangeText,
}: {
  label: string;
  value: string;
  rawValue: string;
  onPick: () => void;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <Button
        title={value ? `${label}: ${value}` : `Select ${label}`}
        variant="secondary"
        onPress={onPick}
      />
      <Field
        label={`${label} ID`}
        value={rawValue}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function ChoiceSheet({
  title,
  choices,
  search,
  onSearch,
  onChoose,
  onClose,
}: {
  title: string;
  choices: EnrollmentChoice[];
  search: string;
  onSearch: (value: string) => void;
  onChoose: (choice: EnrollmentChoice) => void;
  onClose: () => void;
}) {
  const visible = choices.filter((choice) =>
    choice.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <Sheet title={title} onClose={onClose}>
      <Field label="Search" value={search} onChangeText={onSearch} />
      {visible.length ? (
        <ScrollView style={{ maxHeight: 300 }}>
          {visible.map((choice) => (
            <Pressable
              key={choice._id}
              accessibilityRole="button"
              accessibilityLabel={choice.name}
              onPress={() => onChoose(choice)}
              style={styles.choice}
            >
              <Text style={styles.choiceName}>{choice.name}</Text>
              <Text style={styles.choiceId}>{choice._id}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          title="No options found"
          body="Enter a verified ID manually if this configuration is not listed."
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  loading: { paddingTop: 12 },
  intro: {
    fontFamily: theme.font,
    color: theme.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  subheading: {
    fontFamily: theme.bold,
    color: theme.text,
    fontSize: 17,
    marginTop: 8,
  },
  help: {
    fontFamily: theme.font,
    color: theme.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  error: { fontFamily: theme.font, color: theme.error, fontSize: 13 },
  choiceGroup: { gap: 8 },
  choice: {
    minHeight: 56,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#D8D8D8",
    gap: 3,
  },
  choiceName: { fontFamily: theme.bold, color: theme.text, fontSize: 15 },
  choiceId: { fontFamily: theme.font, color: theme.secondary, fontSize: 12 },
  confirmText: {
    fontFamily: theme.font,
    color: theme.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
