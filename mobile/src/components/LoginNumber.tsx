import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PRIMARY_BUTTON_HEIGHT, PRIMARY_BUTTON_RADIUS, iosPalette } from "./flowSheet/IosFlowSheetChrome";

export type LoginNumberProps = {
  authPhone: string;
  onAuthPhoneChange: (text: string) => void;
  onContinue: () => void;
  /** Highlights phone row (e.g. validation error). */
  phoneError?: boolean;
  errorText?: string;
  continueLoading?: boolean;
  continueDisabled?: boolean;
  continueLabel?: string;
};

/** Phone number step for use inside a sheet (pair with `LoginVerify`; parent handles stage title and slide). */
export function LoginNumber({
  authPhone,
  onAuthPhoneChange,
  onContinue,
  phoneError,
  errorText,
  continueLoading,
  continueDisabled,
  continueLabel = "Continue",
}: LoginNumberProps) {
  const ctaDisabled = continueDisabled || continueLoading || authPhone.length !== 10;
  return (
    <>
      <Text style={styles.stepSubtitle}>Sign in quickly to continue your order.</Text>
      <View style={[styles.phoneRow, phoneError ? styles.phoneRowErr : null]}>
        <Text style={styles.phonePrefix}>+91</Text>
        <TextInput
          style={styles.phoneInput}
          value={authPhone}
          onChangeText={(t) => onAuthPhoneChange(t.replace(/\D/g, "").slice(0, 10))}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="9876543210"
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
        />
      </View>
      {errorText ? <Text style={styles.errText}>{errorText}</Text> : null}
      <Pressable
        style={[styles.primaryCta, ctaDisabled && styles.primaryCtaDisabled]}
        onPress={onContinue}
        disabled={ctaDisabled}
      >
        {continueLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryCtaText}>{continueLabel}</Text>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  stepSubtitle: {
    color: iosPalette.textSecondary,
    fontSize: 14,
    fontWeight: "400",
    marginTop: 4,
    marginBottom: 14,
  },
  phoneRowErr: { borderColor: "#ef4444" },
  errText: { color: "#ef4444", fontSize: 13, marginTop: -4 },
  phoneRow: {
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    minHeight: PRIMARY_BUTTON_HEIGHT,
  },
  phonePrefix: {
    width: 96,
    textAlign: "center",
    color: iosPalette.textSecondary,
    fontSize: 18,
    fontWeight: "500",
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: iosPalette.border,
  },
  phoneInput: {
    flex: 1,
    color: iosPalette.textPrimary,
    fontSize: 17,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontWeight: "500",
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
});
