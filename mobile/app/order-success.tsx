import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../src/lib/theme";

export default function OrderSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>✓</Text>
        </View>
        <Text style={styles.title}>Order confirmed!</Text>
        <Text style={styles.sub}>
          Thank you for your order. We’re preparing your order now — same flow as on the web.
        </Text>
        <Pressable style={styles.primary} onPress={() => router.replace("/menu")}>
          <Text style={styles.primaryText}>Order more</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.replace("/menu")}>
          <Text style={styles.secondaryText}>Back to menu</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb", paddingHorizontal: 24, justifyContent: "center" },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dcfce7",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  icon: { fontSize: 40, color: "#16a34a", fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  sub: { marginTop: 12, fontSize: 15, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
  primary: {
    marginTop: 28,
    backgroundColor: "#14532d",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondary: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
});
