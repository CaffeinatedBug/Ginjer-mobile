import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { Button, Header, Icon, Screen, Sheet } from "../../shared";
import { logout, useSession } from "../../lib/session";
import { useWorkspace } from "../../lib/workspace";
import { repository } from "../../lib/repository";
import { theme } from "../../lib/theme";
import { Avatar } from "./Avatar";
export interface ProfileScreenProps {
  onOrganisations?: () => void;
  onProjects?: () => void;
}
export function ProfileScreen({
  onOrganisations,
  onProjects,
}: ProfileScreenProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useSession((s) => s.session);
  const orgName = useWorkspace((s) => s.orgName);
  const orgId = useWorkspace((s) => s.orgId);
  const organisations = useQuery({
    queryKey: ["organisations"],
    queryFn: ({ signal }) => repository.listOrganisations(signal),
    enabled: !!user,
  });
  const displayedOrgName =
    orgName ||
    organisations.data?.find((o) => o.organisationId === orgId)?.name;
  const projectName = useWorkspace((s) => s.projectName);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (!user) return null;
  const doLogout = async () => {
    if (pending) return;
    setPending(true);
    try {
      await logout();
    } catch {
      setError("Session cleanup could not finish. Please restart the app.");
    } finally {
      setPending(false);
    }
  };
  return (
    <Screen style={styles.screen}>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.person}>
          <Avatar user={user} />
          <View style={styles.identity}>
            <Text style={styles.name}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.secondary}>{user.emailId}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Row
            title="My Profile"
            icon="user"
            onPress={() => navigation.navigate("EditProfile")}
          />
          <Row
            title={`Project - ${projectName || "Select project"}`}
            icon="building"
            onPress={onProjects}
          />
          <Row
            title={`Organizations - ${displayedOrgName || "Select organization"}`}
            icon="building"
            onPress={onOrganisations}
          />
        </View>
        {user.phoneNo?.number ? (
          <Text style={styles.secondary}>
            Primary phone:{" "}
            {[user.phoneNo.countryCode, user.phoneNo.number]
              .filter(Boolean)
              .join(" ")}
          </Text>
        ) : null}
        {user.alternateNo?.number ? (
          <Text style={styles.secondary}>
            Secondary phone:{" "}
            {[user.alternateNo.countryCode, user.alternateNo.number]
              .filter(Boolean)
              .join(" ")}
          </Text>
        ) : null}
        <View style={styles.logout}>
          <Row title="Logout" onPress={() => setConfirm(true)} destructive />
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <Sheet
        visible={confirm}
        onClose={() => !pending && setConfirm(false)}
        title="Log out?"
      >
        <Text style={styles.secondary}>
          You will need to sign in again to access your devices.
        </Text>
        <Button
          title="Cancel"
          disabled={pending}
          onPress={() => setConfirm(false)}
        />
        <Button
          title={pending ? "Logging out…" : "Logout"}
          disabled={pending}
          onPress={() => void doLogout()}
        />
      </Sheet>
    </Screen>
  );
}
function Row({
  title,
  onPress,
  destructive = false,
  icon,
}: {
  title: string;
  onPress?: () => void;
  destructive?: boolean;
  icon?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={styles.row}
    >
      {icon && <Icon name={icon} color={theme.text} size={22} />}
      <Text style={[styles.rowText, destructive && styles.error]}>{title}</Text>
      <Icon
        name={destructive ? "logout" : "next"}
        color={destructive ? theme.error : theme.secondary}
        size={22}
      />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.surface },
  content: { paddingHorizontal: 30, paddingVertical: 26, gap: 16 },
  person: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  identity: { flex: 1, gap: 6 },
  name: { fontSize: 20, fontFamily: theme.bold, color: theme.text },
  secondary: { fontSize: 13, fontFamily: theme.font, color: theme.secondary },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    overflow: "hidden",
  },
  row: {
    minHeight: 54,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E6E6",
  },
  rowText: { flex: 1, fontSize: 16, fontFamily: theme.font, color: theme.text },
  logout: {
    marginTop: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  error: { color: theme.error },
});
