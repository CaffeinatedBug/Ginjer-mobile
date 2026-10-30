import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { SvgXml } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { svgAssets } from "../../assets/svg";
import { theme } from "../../lib/theme";
export function FormLayout({
  children,
  brand = false,
  header,
}: {
  children: React.ReactNode;
  brand?: boolean;
  header?: React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.flex}>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {brand && (
            <>
              <View style={styles.brand}>
                <Image
                  source={require("../../assets/2ed80.png")}
                  contentFit="contain"
                  style={styles.logoImage}
                  accessibilityLabel="Ginjer, powered by SenRa"
                />
                <Text style={styles.tagline}>
                  A new way to Sense, Control and Automate
                </Text>
              </View>
              <View
                accessible={false}
                style={[
                  styles.illustration,
                  height < 700 && styles.compactIllustration,
                ]}
              >
                <SvgXml xml={svgAssets["57c7f"]} width={156} height={145} />
              </View>
            </>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const formStyles = StyleSheet.create({
  gap: { gap: 22 },
  error: { color: theme.error, fontSize: 14 },
  hint: { color: theme.secondary, fontSize: 12 },
  section: { gap: 12 },
  link: { minHeight: 48, justifyContent: "center", alignItems: "center" },
  linkText: { color: theme.accessibleGreen, fontFamily: theme.bold },
  success: { padding: 20, gap: 16 },
  title: { fontFamily: theme.bold, fontSize: 22, color: theme.text },
});
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.surface },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 24,
  },
  brand: { alignItems: "center", paddingTop: 64, gap: 18 },
  logoImage: { width: 161, height: 62 },
  illustration: { alignItems: "center", marginTop: 70, marginBottom: 24 },
  compactIllustration: { marginTop: 20, marginBottom: 12 },
  tagline: { fontSize: 12, color: theme.secondary, textAlign: "center" },
});
