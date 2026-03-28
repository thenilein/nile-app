import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PRIMARY_BUTTON_HEIGHT, PRIMARY_BUTTON_RADIUS, iosPalette } from "./flowSheet/IosFlowSheetChrome";

export type CompleteProfileProps = {
  fullName: string;
  onFullNameChange: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
  submitLabel?: string;
};

/** Name collection after phone verification; use inside any sheet or modal. */
export function CompleteProfile({
  fullName,
  onFullNameChange,
  loading,
  onSubmit,
  onBack,
  submitLabel = "Create account",
}: CompleteProfileProps) {
  const canSubmit = fullName.trim().length > 0 && !loading;
  return (
    <View style={styles.wrap}>
      <Text style={styles.stepTitle}>Your name</Text>
      <Text style={styles.stepSubtitle}>Shown on your orders</Text>
      <TextInput
        style={styles.nameInput}
        placeholder="Full name"
        placeholderTextColor="#9ca3af"
        value={fullName}
        onChangeText={onFullNameChange}
        autoCorrect={false}
      />
      <Pressable
        style={[styles.primaryCta, !canSubmit && styles.primaryCtaDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryCtaText}>{submitLabel}</Text>}
      </Pressable>
      <Pressable onPress={onBack} style={styles.linkBtn}>
        <Text style={styles.linkText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 4, paddingBottom: 8 },
  stepTitle: {
    color: iosPalette.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  stepSubtitle: {
    color: iosPalette.textSecondary,
    fontSize: 14,
    fontWeight: "400",
    marginTop: 4,
    marginBottom: 14,
  },
  nameInput: {
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    color: iosPalette.textPrimary,
    fontSize: 17,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: PRIMARY_BUTTON_HEIGHT,
  },
  primaryCta: {
    marginTop: 20,
    alignSelf: "stretch",
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryCtaDisabled: { opacity: 0.45 },
  primaryCtaText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  linkBtn: { paddingVertical: 10, alignItems: "center" },
  linkText: { color: iosPalette.textPrimary, fontSize: 15, fontWeight: "600", opacity: 0.85 },
});
