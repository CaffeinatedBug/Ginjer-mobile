import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  EmptyState,
  Header,
  Icon,
  Screen,
  Skeleton,
} from "../../shared";
import { theme } from "../../lib/theme";
import { repository } from "../../lib/repository";
import { useWorkspace } from "../../lib/workspace";
import { formatTimestamp } from "../../lib/formatters";
import type { AutomationRun, Project, ProjectUser } from "../../lib/contracts";
import { reportedDeviceCount } from "./model";

type WorkspaceTab =
  | "Dashboard"
  | "Locations"
  | "Devices"
  | "Users"
  | "Automate"
  | "Notifications"
  | "Reports";

const tabs: WorkspaceTab[] = [
  "Dashboard",
  "Locations",
  "Devices",
  "Users",
  "Automate",
  "Notifications",
  "Reports",
];

const tabIcons: Record<WorkspaceTab, string> = {
  Dashboard: "chart",
  Locations: "map",
  Devices: "devices",
  Users: "user",
  Automate: "automation",
  Notifications: "bell",
  Reports: "report",
};

export function ProjectWorkspaceScreen({
  onBack,
  onLocations,
  onDevices,
  onNotifications,
}: {
  onBack: () => void;
  onLocations: () => void;
  onDevices: () => void;
  onNotifications: () => void;
}) {
  const { orgId, projectId, projectName } = useWorkspace();
  const [tab, setTab] = useState<WorkspaceTab>("Dashboard");
  const projects = useQuery({
    queryKey: ["projects", orgId],
    queryFn: ({ signal }) => repository.listProjects(orgId, signal),
    enabled: !!orgId,
  });
  const project = projects.data?.find((item) => item._id === projectId);
  const select = (next: WorkspaceTab) => {
    setTab(next);
    if (next === "Locations") onLocations();
    if (next === "Devices") onDevices();
    if (next === "Notifications") onNotifications();
  };
  return (
    <Screen style={styles.screen}>
      <Header title={projectName || "Project workspace"} back={onBack} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {tabs.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            onPress={() => select(item)}
            style={[styles.tab, tab === item && styles.tabSelected]}
          >
            <Icon
              name={tabIcons[item]}
              size={14}
              color={tab === item ? theme.accessibleGreen : theme.secondary}
            />
            <Text
              style={[styles.tabText, tab === item && styles.tabTextSelected]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === "Dashboard" && (
          <Dashboard project={project} loading={projects.isPending} />
        )}
        {tab === "Automate" && (
          <AutomationPanel orgId={orgId} projectId={projectId} />
        )}
        {tab === "Users" && <UsersPanel orgId={orgId} />}
        {tab === "Reports" && (
          <EmptyState
            title="Reports are not available yet"
            body="The verified mobile API does not provide a project reports operation."
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function UsersPanel({ orgId }: { orgId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["organisation-users", orgId],
    queryFn: ({ signal }) => repository.listUsers(orgId, signal),
    enabled: !!orgId,
  });
  if (query.isPending) return <Skeleton />;
  if (query.isError && !query.data)
    return (
      <EmptyState
        title="Couldn’t load users"
        body={query.error.message}
        action="Retry"
        onAction={() => void query.refetch()}
      />
    );
  const users = query.data ?? [];
  const selected = users.find((user) => user._id === selectedId);
  return (
    <View style={styles.users}>
      <View style={styles.automationHeader}>
        <View>
          <Text style={styles.heading}>Users</Text>
          <Text style={styles.muted}>
            Select a person to view their access.
          </Text>
        </View>
        <Button
          title="Refresh"
          variant="secondary"
          onPress={() => void query.refetch()}
        />
      </View>
      {query.isError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Refresh failed. Showing previously received users.
        </Text>
      ) : null}
      {selected ? (
        <View style={styles.selectedUser}>
          <Text style={styles.cardTitle}>Selected: {userName(selected)}</Text>
          <Text style={styles.muted}>
            {selected.emailId || "No email reported"}
            {userAccess(selected) ? ` · ${userAccess(selected)}` : ""}
          </Text>
        </View>
      ) : null}
      {users.length ? (
        users.map((user) => (
          <Pressable
            key={user._id}
            accessibilityRole="radio"
            accessibilityState={{ checked: user._id === selectedId }}
            accessibilityLabel={`Select ${userName(user)}`}
            onPress={() => setSelectedId(user._id)}
            style={[
              styles.userCard,
              user._id === selectedId && styles.userSelected,
            ]}
          >
            <View style={styles.initial}>
              <Text style={styles.initialText}>
                {userName(user).slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{userName(user)}</Text>
              <Text style={styles.muted}>
                {user.emailId || "No email reported"}
              </Text>
            </View>
            {user._id === selectedId ? (
              <Icon name="check" color={theme.accessibleGreen} />
            ) : null}
          </Pressable>
        ))
      ) : (
        <EmptyState
          title="No users found"
          body="This organization has not returned any users."
        />
      )}
    </View>
  );
}

function userName(user: ProjectUser) {
  return (
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.emailId ||
    "Unnamed user"
  );
}

function userAccess(user: ProjectUser) {
  if (user.isSuperUser) return "Super user";
  if (user.role?.isAdmin) return "Admin";
  return "Member";
}

function Dashboard({
  project,
  loading,
}: {
  project: Project | undefined;
  loading: boolean;
}) {
  if (loading) return <Skeleton />;
  if (!project)
    return (
      <EmptyState
        title="Project not found"
        body="Select a project to open its workspace."
      />
    );
  const items = [
    ["Devices", reportedDeviceCount(project)],
    ["Clusters", sumProjectCount(project.clusterCount, "clusterCount")],
    ["Users", sumProjectCount(project.userCount, "userCount")],
  ] as const;
  return (
    <>
      <View style={styles.hero}>
        <Icon name="building" size={30} color={theme.accessibleGreen} />
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>{project.name}</Text>
          <Text style={styles.muted}>
            {project.description || "No project description reported."}
          </Text>
        </View>
      </View>
      <View style={styles.stats}>
        {items.map(([label, value]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.muted}>{label}</Text>
            <Text style={styles.number}>{value ?? "Not reported"}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function sumProjectCount(
  entries: Project["clusterCount"] | Project["userCount"],
  field: "clusterCount" | "userCount",
) {
  const values = (entries ?? [])
    .map((entry) => (entry as Record<string, unknown>)[field])
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );
  return values.length
    ? values.reduce((total, value) => total + value, 0)
    : null;
}

function AutomationPanel({
  orgId,
  projectId,
}: {
  orgId: string;
  projectId: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["automation", orgId, projectId],
    queryFn: ({ signal }) =>
      repository.listAutomation(orgId, projectId, signal),
    enabled: !!orgId && !!projectId,
  });
  const [actionError, setActionError] = useState("");
  const toggle = useMutation({
    mutationFn: (alertId: string) =>
      repository.toggleAutomation(orgId, projectId, alertId),
    onSuccess: () => void query.refetch(),
    onError: (error) =>
      setActionError(
        error instanceof Error ? error.message : "Could not update automation.",
      ),
  });
  const manual = useMutation({
    mutationFn: (alertId: string) => repository.runAutomation(alertId),
    onSuccess: (started) => {
      if (!started) setActionError("The automation was not accepted to run.");
      else void query.refetch();
    },
    onError: (error) =>
      setActionError(
        error instanceof Error ? error.message : "Could not run automation.",
      ),
  });
  const selectedRuns = useMemo(
    () => query.data?.runs.filter((run) => run.alertId === selected) ?? [],
    [query.data, selected],
  );
  if (query.isPending) return <Skeleton />;
  if (query.isError && !query.data)
    return (
      <EmptyState
        title="Couldn’t load automations"
        body={query.error.message}
        action="Retry"
        onAction={() => void query.refetch()}
      />
    );
  const alerts = query.data?.alerts ?? [];
  return (
    <View style={styles.automation}>
      <View style={styles.automationHeader}>
        <View>
          <Text style={styles.heading}>
            {selected ? "Automation Runs" : "Automate"}
          </Text>
          <Text style={styles.muted}>
            {selected
              ? "Tap a run to view its verified details."
              : "Project automations and their real runs."}
          </Text>
        </View>
        <Button
          title="Refresh"
          onPress={() => void query.refetch()}
          variant="secondary"
        />
      </View>
      {query.isError && query.data ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Refresh failed. Showing last received automations.
        </Text>
      ) : null}
      {actionError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {actionError}
        </Text>
      ) : null}
      {selected ? (
        <>
          <Button
            title="Back to automations"
            variant="secondary"
            onPress={() => setSelected(null)}
          />
          {selectedRuns.length ? (
            selectedRuns.map((run) => (
              <AutomationRunCard key={run._id} run={run} />
            ))
          ) : (
            <EmptyState
              title="No runs reported"
              body="This automation has no run records in the API response."
            />
          )}
        </>
      ) : alerts.length ? (
        alerts.map((alert) => {
          const runs =
            query.data?.runs.filter((run) => run.alertId === alert._id) ?? [];
          const latest = [...runs].sort(
            (a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt),
          )[0];
          return (
            <View key={alert._id} style={styles.automationCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${alert.name || "automation"} runs`}
                onPress={() => setSelected(alert._id)}
                style={styles.automationCardTop}
              >
                <View style={styles.initial}>
                  <Text style={styles.initialText}>
                    {(alert.name || "A").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {alert.name || "Unnamed automation"}
                  </Text>
                  <Text style={styles.muted}>
                    {alert.active ? "Active" : "Inactive"} · {runs.length} runs
                  </Text>
                </View>
                <Icon name="next" color={theme.secondary} />
              </Pressable>
              <Text style={styles.muted}>
                Latest:{" "}
                {latest
                  ? `${latest.state} · ${formatTimestamp(latest.triggeredAt)}`
                  : "Not reported"}
              </Text>
              <View style={styles.automationActions}>
                <View style={styles.toggleRow}>
                  <Text style={styles.muted}>
                    {alert.active ? "Enabled" : "Disabled"}
                  </Text>
                  <Switch
                    accessibilityLabel={`Toggle ${alert.name || "automation"}`}
                    value={!!alert.active}
                    disabled={toggle.isPending || manual.isPending}
                    trackColor={{ false: "#D3D3D3", true: "#BBD989" }}
                    thumbColor={alert.active ? theme.green : "#F4F4F4"}
                    onValueChange={() => {
                      setActionError("");
                      toggle.mutate(alert._id);
                    }}
                  />
                </View>
                <Button
                  title={manual.isPending ? "Starting…" : "Run now"}
                  variant="secondary"
                  disabled={
                    !alert.active || toggle.isPending || manual.isPending
                  }
                  onPress={() => {
                    setActionError("");
                    manual.mutate(alert._id);
                  }}
                />
              </View>
            </View>
          );
        })
      ) : (
        <EmptyState
          title="No automations configured"
          body="Automation cards appear when this project returns alert records."
        />
      )}
    </View>
  );
}

function AutomationRunCard({ run }: { run: AutomationRun }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${formatTimestamp(run.triggeredAt)}, ${run.trigger}, ${run.state}`}
      onPress={() => setExpanded((value) => !value)}
      style={styles.run}
    >
      <View style={styles.runTop}>
        <Text style={styles.runTime}>{formatTimestamp(run.triggeredAt)}</Text>
        <Text style={styles.trigger}>
          {run.trigger === "SCHEDULE_TICK" ? "Schedule" : "Uplink"}
        </Text>
        <StatePill state={run.state} />
      </View>
      {expanded && (
        <View style={styles.runDetails}>
          <Text style={styles.muted}>Current step: {run.currentStep}</Text>
          <Text style={styles.muted}>
            Updated: {formatTimestamp(run.updatedAt)}
          </Text>
          <Text style={styles.muted}>
            Finished: {formatTimestamp(run.finishedAt)}
          </Text>
          <Text style={styles.muted}>
            Step/attempt feedback is not supplied by the verified API response.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function StatePill({ state }: { state: string }) {
  const failed = state === "ABORTED" || state === "CANCELLED";
  const running = state === "RUNNING";
  return (
    <Text
      style={[
        styles.pill,
        failed && styles.pillFailed,
        running && styles.pillRunning,
      ]}
    >
      {state}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.background },
  tabs: {
    minHeight: 50,
    paddingHorizontal: 4,
    gap: 2,
    backgroundColor: theme.surface,
  },
  tab: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabSelected: {
    borderBottomColor: theme.green,
  },
  tabText: { fontFamily: theme.font, color: theme.secondary, fontSize: 11 },
  tabTextSelected: { fontFamily: theme.bold, color: theme.accessibleGreen },
  content: { padding: 16, gap: 16 },
  hero: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 8,
    padding: 10,
    backgroundColor: theme.surface,
    alignItems: "center",
  },
  heading: { fontFamily: theme.bold, color: theme.text, fontSize: 20 },
  muted: {
    fontFamily: theme.font,
    color: theme.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: {
    minWidth: "30%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: theme.surface,
    gap: 4,
  },
  number: { fontFamily: theme.bold, color: theme.text, fontSize: 17 },
  automation: { gap: 12 },
  users: { gap: 12 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  userSelected: { borderColor: theme.green, backgroundColor: "#F7FAF1" },
  selectedUser: {
    padding: 12,
    gap: 4,
    borderRadius: 8,
    backgroundColor: "#EEF6DF",
  },
  automationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  automationCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  automationCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  automationActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  initial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF6DF",
  },
  initialText: {
    fontFamily: theme.bold,
    color: theme.accessibleGreen,
    fontSize: 18,
  },
  cardTitle: { fontFamily: theme.bold, color: theme.text, fontSize: 16 },
  error: { fontFamily: theme.font, color: theme.error, fontSize: 13 },
  run: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  runTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  runTime: { fontFamily: theme.bold, color: theme.text, fontSize: 14 },
  trigger: { fontFamily: theme.font, color: theme.text, fontSize: 13 },
  pill: {
    borderColor: theme.green,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    color: theme.accessibleGreen,
    fontFamily: theme.bold,
    fontSize: 11,
  },
  pillRunning: { borderColor: "#EAA02B", color: "#A66700" },
  pillFailed: { borderColor: theme.error, color: theme.error },
  runDetails: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
});
