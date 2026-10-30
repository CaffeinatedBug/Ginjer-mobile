import React, { useRef, useState } from "react";
import { Pressable, Text } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { Button, Field } from "../../shared";
import { FormLayout, formStyles as s } from "./FormLayout";
import { signUpSchema, type SignUpValues } from "./validation";
import { signUp } from "./api";
export function SignUpScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "SignUp">) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      emailId: "",
      password: "",
      confirmPassword: "",
    },
  });
  const submit = () =>
    handleSubmit(async (values) => {
      if (lock.current || uncertain) return;
      lock.current = true;
      setMessage("");
      try {
        await signUp(values);
        setCreated(true);
      } catch (e) {
        const isUncertain =
          e instanceof Error && "kind" in e && e.kind === "uncertain";
        setUncertain(isUncertain);
        setMessage(
          isUncertain
            ? "Account creation outcome is uncertain. Check your email or try signing in before creating another account."
            : e instanceof Error
              ? e.message
              : "Unable to create account.",
        );
      } finally {
        lock.current = false;
      }
    })();
  if (created)
    return (
      <FormLayout>
        <Text style={s.title}>Account created</Text>
        <Text style={s.hint}>
          Check your email for any verification steps before signing in.
        </Text>
        <Button title="Back to sign in" onPress={() => navigation.goBack()} />
      </FormLayout>
    );
  return (
    <FormLayout>
      <Text accessibilityRole="header" style={s.title}>
        Create an account
      </Text>
      {(
        [
          "firstName",
          "lastName",
          "emailId",
          "password",
          "confirmPassword",
        ] as const
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
                  password: "Password",
                  confirmPassword: "Confirm password",
                }[name]
              }
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message}
              keyboardType={name === "emailId" ? "email-address" : "default"}
              autoCapitalize={
                name === "firstName" || name === "lastName" ? "words" : "none"
              }
              autoCorrect={false}
              autoComplete={
                name === "emailId"
                  ? "email"
                  : name === "password" || name === "confirmPassword"
                    ? "new-password"
                    : name === "firstName"
                      ? "given-name"
                      : "family-name"
              }
              secureTextEntry={
                (name === "password" || name === "confirmPassword") && !visible
              }
              editable={!isSubmitting && !uncertain}
            />
          )}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        style={s.link}
        onPress={() => setVisible((v) => !v)}
      >
        <Text style={s.linkText}>
          {visible ? "Hide passwords" : "Show passwords"}
        </Text>
      </Pressable>
      {message ? (
        <Text accessibilityRole="alert" style={s.error}>
          {message}
        </Text>
      ) : null}
      <Button
        title={isSubmitting ? "Creating account…" : "Create account"}
        disabled={isSubmitting || uncertain}
        onPress={() => void submit()}
      />
    </FormLayout>
  );
}
