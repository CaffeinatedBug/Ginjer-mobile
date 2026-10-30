import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { repository } from "../../lib/repository";
import { selectWorkspace, useWorkspace } from "../../lib/workspace";
import { Button, EmptyState, Field, Icon, Sheet, Skeleton } from "../../shared";
import { theme } from "../../lib/theme";
import { reportedDeviceCount } from "./model";
export function ProjectSheet({
  visible = true,
  onClose,
}: {
  visible?: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { orgId, projectId, orgName } = useWorkspace();
  const query = useQuery({
    queryKey: ["projects", orgId],
    queryFn: ({ signal }) => repository.listProjects(orgId, signal),
    enabled: visible && !!orgId,
  });
  const items = useMemo(
    () =>
      (query.data ?? []).filter(
        (p) =>
          p.active &&
          p.name
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase()),
      ),
    [query.data, search],
  );
  const choose = async (id: string, name: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await selectWorkspace(orgId, id, orgName, name);
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
      title="Projects"
      scroll={false}
    >
      <Field label="Search Project" value={search} onChangeText={setSearch} />
      {!orgId ? (
        <EmptyState title="Select an organization first" />
      ) : query.isPending ? (
        <>
          <Skeleton />
          <Skeleton />
        </>
      ) : query.isError && !query.data ? (
        <EmptyState
          title="Couldn’t load projects"
          body={query.error.message}
          action="Retry"
          onAction={() => void query.refetch()}
        />
      ) : (
        <FlatList
          style={{ maxHeight: 320 }}
          data={items}
          keyExtractor={(p) => p._id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              title="No projects found"
              body={
                search
                  ? "Try a different project name"
                  : "No active projects are available."
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={`${item.name}${reportedDeviceCount(item) === null ? "" : `, ${reportedDeviceCount(item)} devices`}`}
              accessibilityState={{
                checked: item._id === projectId,
                disabled: saving,
              }}
              disabled={saving}
              onPress={() => void choose(item._id, item.name)}
              style={[s.row, item._id === projectId && s.selected]}
            >
              <View style={s.avatar}>
                <Icon name="devices" color="#FFFFFF" size={20} />
              </View>
              <Text style={s.name}>
                {item.name}
                {reportedDeviceCount(item) === null
                  ? ""
                  : ` (${reportedDeviceCount(item)} devices)`}
              </Text>
              {item._id === projectId && (
                <Icon name="check" color={theme.accessibleGreen} />
              )}
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
          Refresh failed. Showing previously received projects.
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
  error: { color: theme.error },
});
