import React, { type ReactNode, type RefObject } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PRIMARY_BUTTON_HEIGHT, PRIMARY_BUTTON_RADIUS, iosPalette } from "./flowSheet/IosFlowSheetChrome";

export type LoginVerifyProps = {
  authOtpPart1: string;
  authOtpPart2: string;
  onAuthOtpPart1Change: (text: string) => void;
  onAuthOtpPart2Change: (text: string) => void;
  otpPart1Ref: RefObject<TextInput | null>;
  otpPart2Ref: RefObject<TextInput | null>;
  onVerify: () => void;
  verifyDisabled?: boolean;
  footer?: ReactNode;
};

/** OTP verification step for use inside a sheet (pair with `LoginNumber`; parent handles stage title and slide). */
export function LoginVerify({
  authOtpPart1,
  authOtpPart2,
  onAuthOtpPart1Change,
  onAuthOtpPart2Change,
  otpPart1Ref,
  otpPart2Ref,
  onVerify,
  verifyDisabled,
  footer,
}: LoginVerifyProps) {
  return (
    <>
      <Text style={styles.stepSubtitle}>Enter the code sent to your phone.</Text>
      <View style={styles.otpRow}>
        <TextInput
          ref={otpPart1Ref}
          style={styles.otpInput}
          value={authOtpPart1}
          onChangeText={(t) => {
            const value = t.replace(/\D/g, "").slice(0, 3);
            onAuthOtpPart1Change(value);
            if (value.length === 3) otpPart2Ref.current?.focus();
          }}
          keyboardType="number-pad"
          placeholder="123"
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
          maxLength={3}
        />
        <TextInput
          ref={otpPart2Ref}
          style={styles.otpInput}
          value={authOtpPart2}
          onChangeText={(t) => onAuthOtpPart2Change(t.replace(/\D/g, "").slice(0, 3))}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace" && authOtpPart2.length === 0) {
              otpPart1Ref.current?.focus();
            }
          }}
          keyboardType="number-pad"
          placeholder="456"
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
          maxLength={3}
        />
      </View>
      <Pressable
        style={[styles.primaryCta, verifyDisabled && styles.primaryCtaDisabled]}
        onPress={onVerify}
        disabled={verifyDisabled}
      >
        <Text style={styles.primaryCtaText}>Verify</Text>
      </Pressable>
      {footer}
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
  otpRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  otpInput: {
    flex: 1,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    color: iosPalette.textPrimary,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 2,
    paddingVertical: 12,
    fontWeight: "600",
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
