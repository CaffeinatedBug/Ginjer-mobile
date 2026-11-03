import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { repository } from "../../lib/repository";
import { selectWorkspace, useWorkspace } from "../../lib/workspace";
import { Button, EmptyState, Field, Icon, Sheet, Skeleton } from "../../shared";
import { theme } from "../../lib/theme";
export function OrganisationSheet({
  visible = true,
  onClose,
}: {
  visible?: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const orgId = useWorkspace((s) => s.orgId);
  const query = useQuery({
    queryKey: ["organisations"],
    queryFn: ({ signal }) => repository.listOrganisations(signal),
    enabled: visible,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const items = useMemo(
    () =>
      (query.data ?? []).filter(
        (o) =>
          o.isActive &&
          o.name
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase()),
      ),
    [query.data, search],
  );
  const choose = async (id: string, name: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await selectWorkspace(id, "", name, "");
      onClose();
    } catch {
      setError("Selection could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet
      visible={visible}
      onClose={saving ? () => {} : onClose}
      title="Organizations"
      scroll={false}
    >
      <Field
        label="Search Organization"
        value={search}
        onChangeText={setSearch}
      />
      <Button
        title={
          query.isFetching
            ? "Refreshing organizations…"
            : "Refresh organizations"
        }
        variant="secondary"
        disabled={query.isFetching || saving}
        onPress={() => void query.refetch()}
      />
      {query.isPending ? (
        <>
          <Skeleton />
          <Skeleton />
        </>
      ) : query.isError && !query.data ? (
        <EmptyState
          title="Couldn’t load organizations"
          body={query.error.message}
          action="Retry"
          onAction={() => void query.refetch()}
        />
      ) : (
        <FlatList
          style={{ maxHeight: 320 }}
          data={items}
          keyExtractor={(o) => o.organisationId}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              title="No organizations found"
              body={
                search
                  ? "Try a different organization name"
                  : "No active organizations are available."
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={`${item.name}${!item.isAccepted ? ", Pending" : ""}`}
              accessibilityState={{
                checked: item.organisationId === orgId,
                disabled: !item.isAccepted || saving,
              }}
              disabled={!item.isAccepted || saving}
              onPress={() => void choose(item.organisationId, item.name)}
              style={[s.row, item.organisationId === orgId && s.selected]}
            >
              <View style={s.avatar}>
                <Icon name="building" color="#FFFFFF" size={20} />
              </View>
              <Text style={s.name}>{item.name}</Text>
              {!item.isAccepted ? (
                <Text style={s.pending}>Pending</Text>
              ) : item.organisationId === orgId ? (
                <Icon name="check" color={theme.accessibleGreen} />
              ) : null}
            </Pressable>
          )}
        />
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {query.isError && query.data ? (
        <Text accessibilityRole="alert" style={s.error}>
          Refresh failed. Showing previously received organizations.
        </Text>
      ) : null}
      <Button
        title="Cancel"
        variant="secondary"
        disabled={saving}
        onPress={onClose}
      />
    </Sheet>
  );
}
const s = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    marginTop: 6,
  },
  selected: { borderColor: theme.green, backgroundColor: "#F4F9EB" },
  avatar: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.text,
    borderRadius: 20,
  },
  name: { flex: 1, fontFamily: theme.font, color: theme.text, fontSize: 16 },
  pending: { fontFamily: theme.font, color: theme.secondary, fontSize: 12 },
  error: { color: theme.error },
});
