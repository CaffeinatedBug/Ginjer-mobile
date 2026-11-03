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
  onOpenWorkspace,
}: {
  visible?: boolean;
  onClose: () => void;
  onOpenWorkspace?: (projectId: string, projectName: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
      onOpenWorkspace?.(id, name);
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
              accessibilityRole="button"
              accessibilityLabel={`${item.name}${reportedDeviceCount(item) === null ? "" : `, ${reportedDeviceCount(item)} devices`}`}
              accessibilityState={{
                checked: item._id === projectId,
                disabled: saving,
              }}
              disabled={saving}
              onPress={() => void choose(item._id, item.name)}
              style={[s.card, item._id === projectId && s.selected]}
            >
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Icon name="devices" color="#FFFFFF" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.name}</Text>
                  <Text style={s.detail}>
                    {reportedDeviceCount(item) === null
                      ? "Device count not reported"
                      : `${reportedDeviceCount(item)} devices`}
                  </Text>
                </View>
                {item._id === projectId && (
                  <Icon name="check" color={theme.accessibleGreen} />
                )}
              </View>
              <View style={s.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    setNotice(
                      "Project editing is not available in the verified mobile API.",
                    );
                  }}
                  style={s.action}
                >
                  <Text style={s.actionText}>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Configure ${item.name}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    void choose(item._id, item.name);
                  }}
                  style={s.action}
                >
                  <Text style={s.actionText}>Configure</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    setNotice(
                      "Project deletion is not available in the verified mobile API.",
                    );
                  }}
                  style={[s.action, s.deleteAction]}
                >
                  <Text style={[s.actionText, s.deleteText]}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.notice}>
          {notice}
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
  card: {
    minHeight: 112,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    marginTop: 6,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  detail: {
    fontFamily: theme.font,
    color: theme.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  action: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#D5D5D5",
    borderRadius: 6,
  },
  actionText: {
    color: theme.accessibleGreen,
    fontFamily: theme.bold,
    fontSize: 12,
  },
  deleteAction: { borderColor: "#FD684E" },
  deleteText: { color: theme.error },
  error: { color: theme.error },
  notice: { color: theme.secondary, fontFamily: theme.font, fontSize: 13 },
});
