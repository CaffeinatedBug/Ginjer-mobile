import React, { useRef, useState } from "react";
import { Pressable, Text } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { Button, Field } from "../../shared";
import { signIn } from "../../lib/repository";
import {
  establishSession,
  useSession,
  sessionVersion,
} from "../../lib/session";
import { FormLayout, formStyles as s } from "./FormLayout";
import { loginSchema, type LoginValues } from "./validation";
export function LoginScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Login">) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const sessionMessage = useSession((v) => v.message);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { emailId: "", password: "" },
  });
  const submit = () =>
    handleSubmit(async (values) => {
      if (lock.current) return;
      lock.current = true;
      setError("");
      const version = sessionVersion();
      try {
        await establishSession(
          await signIn(values.emailId, values.password),
          version,
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Unable to sign in. Please try again.",
        );
      } finally {
        lock.current = false;
      }
    })();
  return (
    <FormLayout brand>
      <Controller
        control={control}
        name="emailId"
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field
            label="Email ID*"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            editable={!isSubmitting}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field
            label="Password*"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={fieldState.error?.message}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            editable={!isSubmitting}
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      <Pressable
        style={s.link}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible((v) => !v)}
      >
        <Text style={s.linkText}>
          {visible ? "Hide password" : "Show password"}
        </Text>
      </Pressable>
      {error || sessionMessage ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error || sessionMessage}
        </Text>
      ) : null}
      <Button
        title={isSubmitting ? "Signing in…" : "Sign In"}
        disabled={isSubmitting}
        onPress={() => void submit()}
      />
      <Pressable
        style={s.link}
        accessibilityRole="button"
        onPress={() => navigation.navigate("SignUp")}
      >
        <Text style={s.linkText}>Create an account</Text>
      </Pressable>
    </FormLayout>
  );
}
