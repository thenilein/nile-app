import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  completeProfile as completeProfileCore,
  resendOtp as resendOtpCore,
  sendOtp as sendOtpCore,
  verifyOtp as verifyOtpCore,
  type ToastFn,
} from "../lib/msg91Otp";
import { colors } from "../lib/theme";
import {
  PRIMARY_BUTTON_HEIGHT,
  PRIMARY_BUTTON_RADIUS,
  iosPalette,
} from "./flowSheet/IosFlowSheetChrome";

export type PhoneOtpAuthFlowProps = {
  active: boolean;
  showToast: ToastFn;
  onAuthenticated: () => void;
  onGuestSkip?: () => void;
  /** Matches LocationPickerModal iOS sheet styling */
  variant?: "default" | "sheet";
};

export function PhoneOtpAuthFlow({
  active,
  showToast,
  onAuthenticated,
  onGuestSkip,
  variant = "default",
}: PhoneOtpAuthFlowProps) {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [authStep, setAuthStep] = useState<"phone" | "otp" | "profile">("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpPart1, setOtpPart1] = useState("");
  const [otpPart2, setOtpPart2] = useState("");
  const otpPart1Ref = useRef<TextInput>(null);
  const otpPart2Ref = useRef<TextInput>(null);

  useEffect(() => {
    if (!active) {
      setPhone("");
      setFullName("");
      setAuthStep("phone");
      setError("");
      setLoading(false);
      setProfileLoading(false);
      setOtp("");
      setOtpPart1("");
      setOtpPart2("");
    }
  }, [active]);

  useEffect(() => {
    if (!active || variant !== "sheet" || authStep !== "otp") return;
    const t = setTimeout(() => otpPart1Ref.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [active, authStep, variant]);

  const handleSendOtp = async () => {
    setError("");
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
      setError("Enter a valid 10-digit mobile number");
      showToast("error", "Invalid phone number");
      return;
    }
    setLoading(true);
    try {
      const ok = await sendOtpCore({ phone, showToast });
      if (ok) {
        showToast("success", `OTP sent to +91 ${phone.substring(0, 2)}XXX ${phone.substring(7, 10)}`);
        setAuthStep("otp");
      }
    } finally {
      setLoading(false);
    }
  };

  const sheetOtpDigits =
    variant === "sheet" ? `${otpPart1}${otpPart2}`.replace(/\D/g, "").slice(0, 6) : otp;

  const handleVerifyOtp = async () => {
    const code = variant === "sheet" ? sheetOtpDigits : otp;
    const ok = await verifyOtpCore(phone, code, showToast, {
      onVerified: () => {
        showToast("success", "Welcome back to Nile Cafe!");
        onAuthenticated();
      },
      onNeedsProfile: () => {
        showToast("success", "Phone verified. Add your name to continue.");
        setAuthStep("profile");
      },
    });
    return ok;
  };

  const handleResend = async () => {
    await resendOtpCore({ phone, showToast });
  };

  const handleCompleteProfile = async () => {
    setProfileLoading(true);
    try {
      const ok = await completeProfileCore({ phone, fullName, showToast });
      if (ok) {
        showToast("success", "Welcome to Nile Cafe!");
        onAuthenticated();
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const maskedPhone = "+91 " + phone.substring(0, 2) + "XXX X" + phone.substring(6, 10);

  const onPhoneChange = useCallback((t: string) => {
    const raw = t.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
    setError("");
  }, []);

  if (variant === "sheet" && authStep === "phone") {
    return (
      <View style={sheetStyles.wrap}>
        <Text style={sheetStyles.stepTitle}>Continue with phone</Text>
        <Text style={sheetStyles.stepSubtitle}>Sign in quickly to continue your order.</Text>
        <View style={[sheetStyles.phoneRow, error ? sheetStyles.phoneRowErr : null]}>
          <Text style={sheetStyles.phonePrefix}>+91</Text>
          <TextInput
            style={sheetStyles.phoneInput}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="9876543210"
            placeholderTextColor="#9ca3af"
            value={phone}
            onChangeText={onPhoneChange}
          />
        </View>
        {error ? <Text style={sheetStyles.errText}>{error}</Text> : null}
        <Pressable
          style={[sheetStyles.primaryCta, (phone.length !== 10 || loading) && sheetStyles.primaryCtaDisabled]}
          onPress={handleSendOtp}
          disabled={loading || phone.length !== 10}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={sheetStyles.primaryCtaText}>Continue</Text>}
        </Pressable>
      </View>
    );
  }

  if (variant === "sheet" && authStep === "otp") {
    const otpReady = sheetOtpDigits.length === 6;
    return (
      <View style={sheetStyles.wrap}>
        <Text style={sheetStyles.stepTitle}>Verify number</Text>
        <Text style={sheetStyles.stepSubtitle}>Enter the code sent to your phone.</Text>
        <View style={sheetStyles.otpRow}>
          <TextInput
            ref={otpPart1Ref}
            style={sheetStyles.otpInput}
            value={otpPart1}
            onChangeText={(t) => {
              const value = t.replace(/\D/g, "").slice(0, 3);
              setOtpPart1(value);
              if (value.length === 3) otpPart2Ref.current?.focus();
            }}
            keyboardType="number-pad"
            placeholder="123"
            placeholderTextColor="#9ca3af"
            maxLength={3}
          />
          <TextInput
            ref={otpPart2Ref}
            style={sheetStyles.otpInput}
            value={otpPart2}
            onChangeText={(t) => setOtpPart2(t.replace(/\D/g, "").slice(0, 3))}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace" && otpPart2.length === 0) {
                otpPart1Ref.current?.focus();
              }
            }}
            keyboardType="number-pad"
            placeholder="456"
            placeholderTextColor="#9ca3af"
            maxLength={3}
          />
        </View>
        <Pressable
          style={[sheetStyles.primaryCta, !otpReady && sheetStyles.primaryCtaDisabled]}
          onPress={() => void handleVerifyOtp()}
          disabled={!otpReady}
        >
          <Text style={sheetStyles.primaryCtaText}>Verify</Text>
        </Pressable>
        <Pressable onPress={handleResend} style={sheetStyles.linkBtn}>
          <Text style={sheetStyles.linkText}>Resend OTP</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setAuthStep("phone");
            setOtpPart1("");
            setOtpPart2("");
          }}
          style={sheetStyles.linkBtn}
        >
          <Text style={sheetStyles.linkText}>Change number</Text>
        </Pressable>
      </View>
    );
  }

  if (variant === "sheet" && authStep === "profile") {
    return (
      <View style={sheetStyles.wrap}>
        <Text style={sheetStyles.stepTitle}>Your name</Text>
        <Text style={sheetStyles.stepSubtitle}>Shown on your orders</Text>
        <TextInput
          style={sheetStyles.nameInput}
          placeholder="Full name"
          placeholderTextColor="#9ca3af"
          value={fullName}
          onChangeText={setFullName}
        />
        <Pressable
          style={[sheetStyles.primaryCta, (!fullName.trim() || profileLoading) && sheetStyles.primaryCtaDisabled]}
          onPress={handleCompleteProfile}
          disabled={profileLoading || !fullName.trim()}
        >
          {profileLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={sheetStyles.primaryCtaText}>Create account</Text>
          )}
        </Pressable>
        <Pressable onPress={() => setAuthStep("otp")} style={sheetStyles.linkBtn}>
          <Text style={sheetStyles.linkText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (authStep === "phone") {
    return (
      <View style={styles.block}>
        <View style={styles.brandRow}>
          <View style={styles.brandCircle}>
            <Text style={styles.brandLetter}>N</Text>
          </View>
          <Text style={styles.title}>Continue with phone</Text>
          <Text style={styles.sub}>Enter your mobile number to sign in or create an account</Text>
        </View>
        <View style={[styles.phoneRow, error ? styles.phoneRowErr : null]}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.phoneInput}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="9876543210"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={onPhoneChange}
          />
        </View>
        {error ? <Text style={styles.errText}>{error}</Text> : null}
        <Pressable
          style={[styles.primaryBtn, phone.length !== 10 && styles.primaryBtnDisabled]}
          onPress={handleSendOtp}
          disabled={loading || phone.length !== 10}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send OTP</Text>}
        </Pressable>
        {onGuestSkip ? (
          <Pressable onPress={onGuestSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (authStep === "otp") {
    return (
      <View style={styles.block}>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.sub}>Sent to {maskedPhone}</Text>
        <TextInput
          style={styles.otpInput}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="6-digit code"
          placeholderTextColor={colors.textMuted}
          value={otp}
          onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
        />
        <Pressable
          style={[styles.primaryBtn, otp.length !== 6 && styles.primaryBtnDisabled]}
          onPress={handleVerifyOtp}
          disabled={otp.length !== 6}
        >
          <Text style={styles.primaryBtnText}>Verify</Text>
        </Pressable>
        <Pressable onPress={handleResend} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Resend OTP</Text>
        </Pressable>
        <Pressable onPress={() => setAuthStep("phone")} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Change number</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={styles.title}>Your name</Text>
      <Text style={styles.sub}>Shown on your orders</Text>
      <TextInput
        style={styles.nameInput}
        placeholder="Full name"
        placeholderTextColor={colors.textMuted}
        value={fullName}
        onChangeText={setFullName}
      />
      <Pressable
        style={[styles.primaryBtn, !fullName.trim() && styles.primaryBtnDisabled]}
        onPress={handleCompleteProfile}
        disabled={profileLoading || !fullName.trim()}
      >
        {profileLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Create account</Text>
        )}
      </Pressable>
      <Pressable onPress={() => setAuthStep("otp")} style={styles.secondaryBtn}>
        <Text style={styles.secondaryText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingVertical: 8, gap: 12 },
  brandRow: { alignItems: "center", marginBottom: 8 },
  brandCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#14532d",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandLetter: { color: "#fff", fontSize: 22, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  sub: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 4 },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  phoneRowErr: { borderColor: "#ef4444" },
  prefix: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: "600",
    color: colors.textSecondary,
    backgroundColor: "#f9fafb",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  errText: { color: "#ef4444", fontSize: 13 },
  otpInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
  },
  primaryBtn: {
    backgroundColor: colors.black,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  skipBtn: { paddingVertical: 12, alignItems: "center" },
  skipText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  secondaryBtn: { paddingVertical: 8, alignItems: "center" },
  secondaryText: { color: colors.green, fontSize: 15, fontWeight: "600" },
});

const sheetStyles = StyleSheet.create({
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
  phoneRowErr: { borderColor: "#ef4444" },
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
  errText: { color: "#ef4444", fontSize: 13, marginTop: -4 },
  otpRow: { flexDirection: "row", gap: 10 },
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
