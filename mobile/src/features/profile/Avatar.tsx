import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { User } from "../../lib/contracts";
import { theme } from "../../lib/theme";
export function Avatar({ user, size = 72 }: { user: User; size?: number }) {
  const [failed, setFailed] = useState(false);
  const location = user.image?.location;
  const initials = (
    user.firstName.slice(0, 1) + user.lastName.slice(0, 1)
  ).toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {location?.startsWith("https://") && !failed ? (
        <Image
          source={{ uri: location }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityLabel="Profile photo"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={styles.initials} accessibilityLabel="Profile initials">
          {initials}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF5E0",
    overflow: "hidden",
  },
  initials: {
    fontSize: 26,
    color: theme.accessibleGreen,
    fontFamily: theme.bold,
  },
});
