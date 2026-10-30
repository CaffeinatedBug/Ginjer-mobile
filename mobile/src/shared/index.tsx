import React, { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { theme } from "../lib/theme";

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, style]}
    >
      {children}
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  variant = "primary",
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        variant === "danger" && styles.dangerButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === "danger" && { color: "#FFFFFF" },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
}: {
  name: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.iconButton}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Field({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        {...props}
        accessibilityLabel={label || props.placeholder || "Value"}
        accessibilityHint={error || props.accessibilityHint}
        placeholderTextColor={props.placeholderTextColor || theme.muted}
        style={[styles.field, error && { borderColor: theme.error }, style]}
      />
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function Header({
  title,
  back,
  right,
}: {
  title: string;
  back?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {back && <IconButton name="back" label="Go back" onPress={back} />}
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <View style={styles.headerSide}>{right}</View>
    </View>
  );
}
export function EmptyState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Icon name="search" size={30} />
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        {title}
      </Text>
      {!!body && <Text style={styles.body}>{body}</Text>}
      {action && onAction && (
        <Button title={action} onPress={onAction} variant="secondary" />
      )}
    </View>
  );
}
export function Skeleton() {
  return (
    <View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={styles.skeleton}
    >
      <View style={styles.skeletonImage} />
      <View style={{ flex: 1, gap: 10 }}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: "60%" }]} />
        <View style={[styles.skeletonLine, { width: "40%" }]} />
      </View>
    </View>
  );
}
export function Snackbar({ message }: { message: string }) {
  return message ? (
    <View style={styles.snackbar}>
      <Icon name="check" color={theme.accessibleGreen} />
      <Text accessibilityLiveRegion="polite" style={styles.body}>
        {message}
      </Text>
    </View>
  ) : null;
}
export function Sheet({
  visible = true,
  onClose,
  title,
  children,
  scroll = true,
}: {
  visible?: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const s = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => s.remove();
  }, []);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 60) onClose();
        },
      }),
    [onClose],
  );
  return (
    <Modal
      transparent
      visible={visible}
      animationType={reduceMotion ? "none" : "slide"}
      onRequestClose={onClose}
      onShow={() => AccessibilityInfo.announceForAccessibility(title)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modal}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          importantForAccessibility="yes"
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View {...pan.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          <View style={styles.sheetHeading}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { flex: 1 }]}
            >
              {title}
            </Text>
            <IconButton
              name="close"
              label={`Close ${title}`}
              onPress={onClose}
            />
          </View>
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetContent}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.sheetContent}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Icon({
  name,
  size = 24,
  color = theme.text,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    back: <Path d="M15 18l-6-6 6-6" />,
    next: <Path d="m9 18 6-6-6-6" />,
    close: <Path d="m6 6 12 12M18 6 6 18" />,
    check: <Path d="m5 12 4 4 10-10" />,
    search: (
      <>
        <Circle cx="11" cy="11" r="7" />
        <Path d="m20 20-4-4" />
      </>
    ),
    bell: (
      <>
        <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    filter: <Path d="M4 6h16M7 12h10M10 18h4" />,
    devices: <Path d="M5 17h14v4H5zM8 13h8M10 9h4M12 3v6" />,
    map: <Path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" />,
    chart: <Path d="M4 20V10M9 20V5M14 20v-7M19 20V3M2 20h20" />,
    user: (
      <>
        <Circle cx="12" cy="8" r="4" />
        <Path d="M4 21c0-5 3-7 8-7s8 2 8 7" />
      </>
    ),
    building: <Path d="M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3" />,
    phone: (
      <>
        <Rect x="7" y="2" width="10" height="20" rx="2" />
        <Path d="M11 18h2" />
      </>
    ),
    mail: (
      <>
        <Rect x="3" y="5" width="18" height="14" rx="1" />
        <Path d="m3 6 9 7 9-7" />
      </>
    ),
    logout: <Path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />,
    eye: (
      <>
        <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <Circle cx="12" cy="12" r="2.5" />
      </>
    ),
  };
  return (
    <Svg
      accessible={false}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.devices}
    </Svg>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  button: {
    minHeight: 48,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.green,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: { color: theme.text, fontFamily: theme.bold, fontSize: 16 },
  secondaryButton: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.accessibleGreen,
  },
  dangerButton: { backgroundColor: theme.error },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  fieldWrap: { position: "relative", paddingTop: 8, gap: 5 },
  fieldLabel: {
    position: "absolute",
    zIndex: 1,
    top: 0,
    left: 12,
    paddingHorizontal: 4,
    backgroundColor: theme.surface,
    fontFamily: theme.font,
    fontSize: 12,
    color: theme.accessibleGreen,
  },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.secondary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: theme.font,
    color: theme.text,
    backgroundColor: theme.surface,
  },
  error: { fontSize: 12, color: theme.error, fontFamily: theme.font },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: theme.surface,
  },
  headerSide: { width: 48, alignItems: "center" },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.bold,
    fontSize: 20,
    color: theme.text,
  },
  emptyTitle: {
    fontFamily: theme.bold,
    fontSize: 16,
    color: theme.text,
    textAlign: "center",
  },
  empty: {
    padding: 24,
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
  },
  body: {
    fontFamily: theme.font,
    fontSize: 14,
    color: theme.secondary,
    textAlign: "center",
    flexShrink: 1,
  },
  skeleton: {
    height: 96,
    marginVertical: 6,
    marginHorizontal: 12,
    padding: 14,
    gap: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: theme.surface,
  },
  skeletonImage: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: "#E8E8E8",
  },
  skeletonLine: {
    height: 10,
    width: "80%",
    backgroundColor: "#E8E8E8",
    borderRadius: 4,
  },
  snackbar: {
    padding: 14,
    margin: 16,
    backgroundColor: "#F1F7E7",
    borderWidth: 1,
    borderColor: theme.green,
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  modal: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" },
  sheet: {
    maxHeight: "90%",
    flexShrink: 1,
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleArea: { height: 48, alignItems: "center", justifyContent: "center" },
  handle: { width: 45, height: 4, borderRadius: 4, backgroundColor: "#B9BAB6" },
  sheetHeading: { flexDirection: "row", alignItems: "center", paddingLeft: 16 },
  sheetContent: { padding: 16, gap: 12 },
});
