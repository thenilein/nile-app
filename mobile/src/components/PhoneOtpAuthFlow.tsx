import React, { useCallback, useEffect, useState } from "react";
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

export type PhoneOtpAuthFlowProps = {
  active: boolean;
  showToast: ToastFn;
  onAuthenticated: () => void;
  onGuestSkip?: () => void;
};

export function PhoneOtpAuthFlow({
  active,
  showToast,
  onAuthenticated,
  onGuestSkip,
}: PhoneOtpAuthFlowProps) {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [authStep, setAuthStep] = useState<"phone" | "otp" | "profile">("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (!active) {
      setPhone("");
      setFullName("");
      setAuthStep("phone");
      setError("");
      setLoading(false);
      setProfileLoading(false);
      setOtp("");
    }
  }, [active]);

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

  const handleVerifyOtp = async () => {
    const ok = await verifyOtpCore(phone, otp, showToast, {
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
