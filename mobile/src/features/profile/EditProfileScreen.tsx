import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NavigationAction } from "@react-navigation/native";
import type { RootStackParamList } from "../../navigation/types";
import { Button, Field, Header, Icon, Sheet } from "../../shared";
import { theme } from "../../lib/theme";
import { useSession, updateSession } from "../../lib/session";
import { useWorkspace } from "../../lib/workspace";
import { FormLayout, formStyles as s } from "../auth/FormLayout";
import { Avatar } from "./Avatar";
import {
  profileDefaults,
  profileSchema,
  type ProfileValues,
} from "./validation";
import { saveProfile } from "./api";
export function EditProfileScreen({
  onOrganisations,
}: {
  onOrganisations?: () => void;
}) {
  const user = useSession((v) => v.session);
  if (!user) return null;
  return <EditProfileForm key={user._id} onOrganisations={onOrganisations} />;
}
function EditProfileForm({
  onOrganisations,
}: {
  onOrganisations?: () => void;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useSession((v) => v.session)!;
  const orgName = useWorkspace((v) => v.orgName);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [discard, setDiscard] = useState<NavigationAction | null>(null);
  const [allowDiscard, setAllowDiscard] = useState(false);
  const lock = useRef(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: profileDefaults(user),
  });
  usePreventRemove((isDirty || isSubmitting) && !allowDiscard, ({ data }) => {
    if (!isSubmitting) setDiscard(data.action);
  });
  useEffect(() => {
    if (!allowDiscard || !discard) return;
    navigation.dispatch(discard);
  }, [allowDiscard, discard, navigation]);
  const submit = () =>
    handleSubmit(async (values) => {
      if (lock.current || uncertain) return;
      lock.current = true;
      setError("");
      setSaved(false);
      const token = user.token;
      try {
        const updated = await saveProfile(values, user);
        await updateSession(updated, token);
        reset(profileDefaults(updated));
        setSaved(true);
      } catch (e) {
        const isUncertain =
          e instanceof Error && "kind" in e && e.kind === "uncertain";
        setUncertain(isUncertain);
        setError(
          isUncertain
            ? "Profile save outcome is uncertain. Sign in again to check your profile before saving again."
            : e instanceof Error
              ? e.message
              : "Unable to update your profile.",
        );
      } finally {
        lock.current = false;
      }
    })();
  return (
    <>
      <FormLayout
        header={
          <Header title="Edit Profile" back={() => navigation.goBack()} />
        }
      >
        <View style={{ alignItems: "center" }}>
          <Avatar user={user} size={80} />
        </View>
        {(
          ["firstName", "lastName", "emailId", "primary", "secondary"] as const
        ).map((name) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Field
                label={
                  {
                    firstName: "First name",
                    lastName: "Last name",
                    emailId: "Email",
                    primary: "Primary Phone Number",
                    secondary: "Secondary Phone Number",
                  }[name]
                }
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
                keyboardType={
                  name === "emailId"
                    ? "email-address"
                    : name === "primary" || name === "secondary"
                      ? "phone-pad"
                      : "default"
                }
                autoCapitalize={
                  name === "firstName" || name === "lastName" ? "words" : "none"
                }
                autoComplete={
                  name === "emailId"
                    ? "email"
                    : name === "firstName"
                      ? "given-name"
                      : name === "lastName"
                        ? "family-name"
                        : "tel-national"
                }
                editable={!isSubmitting && !uncertain}
              />
            )}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select organization"
          accessibilityHint="Opens the organization selection list"
          accessibilityState={{
            disabled: !onOrganisations || isSubmitting || uncertain,
          }}
          disabled={!onOrganisations || isSubmitting || uncertain}
          onPress={onOrganisations}
          style={({ pressed }) => [
            styles.organizationField,
            pressed && styles.pressed,
            (!onOrganisations || isSubmitting || uncertain) && styles.disabled,
          ]}
        >
          <Text style={styles.organizationLabel}>Organization</Text>
          <View style={styles.organizationValueRow}>
            <Icon name="building" size={21} color={theme.text} />
            <Text numberOfLines={1} style={styles.organizationValue}>
              {orgName || "Select organization"}
            </Text>
            <Icon name="next" size={20} color={theme.text} />
          </View>
        </Pressable>
        <Text style={s.hint}>Select the organization for this profile</Text>
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
        {saved ? (
          <Text accessibilityLiveRegion="polite">Profile updated</Text>
        ) : null}
        <Button
          title={isSubmitting ? "Saving…" : "Save"}
          disabled={!isDirty || isSubmitting || uncertain}
          onPress={() => void submit()}
        />
      </FormLayout>
      <Sheet
        visible={!!discard}
        title="Discard changes?"
        onClose={() => setDiscard(null)}
      >
        <Text style={s.hint}>Your unsaved profile changes will be lost.</Text>
        <Button title="Cancel" onPress={() => setDiscard(null)} />
        <Button
          title="Discard"
          onPress={() => {
            setAllowDiscard(true);
          }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  organizationField: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: "#777777",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 8,
    position: "relative",
  },
  organizationLabel: {
    position: "absolute",
    top: -10,
    left: 10,
    paddingHorizontal: 5,
    backgroundColor: theme.background,
    color: theme.accessibleGreen,
    fontFamily: theme.font,
    fontSize: 13,
  },
  organizationValueRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  organizationValue: {
    flex: 1,
    color: theme.text,
    fontFamily: theme.font,
    fontSize: 16,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
});
