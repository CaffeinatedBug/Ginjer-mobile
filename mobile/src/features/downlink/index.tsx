import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Button, Field, Sheet } from "../../shared";
import { repository } from "../../lib/repository";
import { useWorkspace } from "../../lib/workspace";
import { useSession } from "../../lib/session";
import { hasUnresolvedDownlink, reconcileDownlink, sendDownlink } from "./api";

export function DownlinkSheet({
  visible,
  deviceId,
  onClose,
}: {
  visible: boolean;
  deviceId: string;
  onClose: () => void;
}) {
  const orgId = useWorkspace((s) => s.orgId);
  if (!visible) return null;
  return (
    <DownlinkContent
      key={orgId + ":" + deviceId}
      orgId={orgId}
      deviceId={deviceId}
      onClose={onClose}
    />
  );
}

function DownlinkContent({
  orgId,
  deviceId,
  onClose,
}: {
  orgId: string;
  deviceId: string;
  onClose: () => void;
}) {
  const session = useSession((s) => s.session);
  const [selected, setSelected] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [locked, setLocked] = useState(true);
  const [checking, setChecking] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const sendingRef = useRef(false);
  const reconciliationRef = useRef(false);
  const modules = useQuery({
    queryKey: ["modules", orgId],
    queryFn: ({ signal }) => repository.listModules(orgId, signal),
    enabled: !!orgId && !!session,
  });
  useEffect(() => {
    let active = true;
    void hasUnresolvedDownlink(orgId, deviceId)
      .then((v) => {
        if (active) setLocked(v);
      })
      .catch(() => {
        if (active) {
          setCheckFailed(true);
          setMessage(
            "Command history could not be checked. Reopen this sheet before sending.",
          );
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [orgId, deviceId]);
  const options = (modules.data ?? []).filter(
    (m) => m.moduleType === "DOWNLINK_INTERFACE",
  );
  const visibleOptions = options.filter((m) =>
    m.label
      .toLocaleLowerCase()
      .includes(moduleSearch.trim().toLocaleLowerCase()),
  );
  const send = async () => {
    if (
      sendingRef.current ||
      pending ||
      locked ||
      checking ||
      !session ||
      !selected ||
      !value.trim()
    )
      return;
    sendingRef.current = true;
    setPending(true);
    setMessage("");
    try {
      const trimmed = value.trim();
      const numeric = /^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)
        ? Number(trimmed)
        : trimmed;
      const result = await sendDownlink({
        organisationId: orgId,
        deviceId,
        downlinkInterfaceId: selected,
        value: { value: numeric },
      });
      setMessage(result.message ?? "");
      setValue("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to send command.");
      try {
        setLocked(await hasUnresolvedDownlink(orgId, deviceId));
      } catch {
        setLocked(true);
        setCheckFailed(true);
      }
    } finally {
      sendingRef.current = false;
      setPending(false);
    }
  };
  const reconcile = async () => {
    if (!reconciling) {
      setReconciling(true);
      return;
    }
    if (reconciliationRef.current) return;
    reconciliationRef.current = true;
    try {
      await reconcileDownlink(orgId, deviceId);
      setLocked(false);
      setReconciling(false);
      setMessage("The prior command was marked verified.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not clear the command lock.",
      );
    } finally {
      reconciliationRef.current = false;
    }
  };
  return (
    <Sheet onClose={pending ? () => {} : onClose} title="Send Downlink">
      <Text>
        Choose an interface and enter the controller value for this device.
      </Text>
      {modules.isPending && <Text>Loading interfaces…</Text>}
      {modules.isError && (
        <Button
          title="Retry interfaces"
          onPress={() => void modules.refetch()}
        />
      )}
      {!modules.isPending && !options.length && (
        <Text>No downlink interfaces available.</Text>
      )}
      {!!options.length && (
        <Field
          label="Search interface"
          value={moduleSearch}
          onChangeText={setModuleSearch}
        />
      )}
      {!!options.length && !visibleOptions.length && (
        <Text>No matching interfaces.</Text>
      )}
      <ScrollView
        style={{ maxHeight: 220 }}
        nestedScrollEnabled
        contentContainerStyle={{ gap: 8 }}
      >
        {visibleOptions.map((m) => (
          <Button
            key={m._id}
            title={(selected === m._id ? "Selected: " : "") + m.label}
            onPress={() => setSelected(m._id)}
            disabled={pending || locked}
          />
        ))}
      </ScrollView>
      <Field
        label="Value"
        value={value}
        onChangeText={setValue}
        editable={!pending && !locked}
      />
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
      {checking && <Text>Checking previous commands…</Text>}
      {locked && !checking && !checkFailed && (
        <View style={{ gap: 8 }}>
          <Text>
            A previous command has an uncertain outcome. Check the physical
            device and controller before sending again.
          </Text>
          {reconciling && (
            <Text accessibilityRole="alert">
              Confirm only after you have verified the device state outside this
              app.
            </Text>
          )}
          <Button
            title={
              reconciling
                ? "Confirm device state was verified"
                : "I verified the device state"
            }
            onPress={() => void reconcile()}
          />
          {reconciling && (
            <Button
              title="Keep command locked"
              variant="secondary"
              onPress={() => setReconciling(false)}
            />
          )}
        </View>
      )}
      <Button
        title={pending ? "Sending…" : "Send Downlink"}
        disabled={
          pending ||
          locked ||
          checking ||
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
