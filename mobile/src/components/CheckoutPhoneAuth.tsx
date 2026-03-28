import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  completeProfile as completeProfileCore,
  resendOtp as resendOtpCore,
  sendOtp as sendOtpCore,
  verifyOtp as verifyOtpCore,
  type ToastFn,
} from "../lib/msg91Otp";
import { CompleteProfile } from "./CompleteProfile";
import { LoginNumber } from "./LoginNumber";
import { LoginVerify } from "./LoginVerify";
import {
  AUTH_STAGE_SLIDE_DELAY_MS,
  AUTH_STAGE_SLIDE_EASING,
  AUTH_STAGE_SLIDE_MS,
  SHEET_CONTENT_GUTTER,
  iosPalette,
} from "./flowSheet/IosFlowSheetChrome";

export type CheckoutPhoneAuthProps = {
  active: boolean;
  /** Width of the checkout step column (same as `CartSheet` `contentWidth`). */
  contentWidth: number;
  showToast: ToastFn;
  onAuthenticated: () => void;
};

export function CheckoutPhoneAuth({ active, contentWidth, showToast, onAuthenticated }: CheckoutPhoneAuthProps) {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [authStep, setAuthStep] = useState<"phone" | "otp" | "profile">("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [otpPart1, setOtpPart1] = useState("");
  const [otpPart2, setOtpPart2] = useState("");
  const otpPart1Ref = useRef<TextInput>(null);
  const otpPart2Ref = useRef<TextInput>(null);
  const authStageAnim = useRef(new Animated.Value(0)).current;
  const prevAuthStepRef = useRef<"phone" | "otp" | "profile">("phone");

  const innerContentWidth = Math.max(240, contentWidth - 2 * SHEET_CONTENT_GUTTER);

  const sheetOtpDigits = useMemo(() => `${otpPart1}${otpPart2}`.replace(/\D/g, "").slice(0, 6), [otpPart1, otpPart2]);

  useEffect(() => {
    if (!active) {
      setPhone("");
      setFullName("");
      setAuthStep("phone");
      setError("");
      setLoading(false);
      setProfileLoading(false);
      setOtpPart1("");
      setOtpPart2("");
      authStageAnim.setValue(0);
      prevAuthStepRef.current = "phone";
    }
  }, [active, authStageAnim]);

  useEffect(() => {
    if (!active || authStep !== "otp") return;
    const t = setTimeout(() => otpPart1Ref.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [active, authStep]);

  useEffect(() => {
    const prev = prevAuthStepRef.current;

    if (authStep === "profile") {
      prevAuthStepRef.current = "profile";
      return;
    }

    if (prev === "profile" && authStep === "otp") {
      authStageAnim.setValue(1);
      prevAuthStepRef.current = "otp";
      return;
    }

    prevAuthStepRef.current = authStep;
    if (prev === authStep) return;

    const toValue = authStep === "otp" ? 1 : 0;
    const anim = Animated.sequence([
      Animated.delay(AUTH_STAGE_SLIDE_DELAY_MS),
      Animated.timing(authStageAnim, {
        toValue: toValue,
        duration: AUTH_STAGE_SLIDE_MS,
        easing: AUTH_STAGE_SLIDE_EASING,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [authStep, authStageAnim]);

  const authStageTranslateX = useMemo(
    () =>
      authStageAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -innerContentWidth],
      }),
    [authStageAnim, innerContentWidth]
  );

  const onPhoneChange = useCallback((t: string) => {
    setPhone(t);
    setError("");
  }, []);

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
    await verifyOtpCore(phone, sheetOtpDigits, showToast, {
      onVerified: () => {
        showToast("success", "Welcome back to Nile Cafe!");
        onAuthenticated();
      },
      onNeedsProfile: () => {
        showToast("success", "Phone verified. Add your name to continue.");
        setAuthStep("profile");
      },
    });
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

  const goBackToPhone = () => {
    setAuthStep("phone");
    setOtpPart1("");
    setOtpPart2("");
  };

  if (authStep === "profile") {
    return (
      <CompleteProfile
        fullName={fullName}
        onFullNameChange={setFullName}
        loading={profileLoading}
        onSubmit={() => void handleCompleteProfile()}
        onBack={() => setAuthStep("otp")}
      />
    );
  }

  return (
    <View style={styles.authWrap}>
      <View style={styles.authTopRow}>
        <Text style={styles.authStepTitle}>{authStep === "otp" ? "Verify number" : "Continue with phone"}</Text>
      </View>
      <View style={styles.authStageViewport}>
        <Animated.View
          style={[
            styles.authStageTrack,
            {
              width: innerContentWidth * 2,
              transform: [{ translateX: authStageTranslateX }],
            },
          ]}
        >
          <View style={{ width: innerContentWidth }}>
            <LoginNumber
              authPhone={phone}
              onAuthPhoneChange={onPhoneChange}
              onContinue={() => void handleSendOtp()}
              phoneError={Boolean(error)}
              errorText={error}
              continueLoading={loading}
              continueLabel="Continue"
            />
          </View>
          <View style={{ width: innerContentWidth }}>
            <LoginVerify
              authOtpPart1={otpPart1}
              authOtpPart2={otpPart2}
              onAuthOtpPart1Change={setOtpPart1}
              onAuthOtpPart2Change={setOtpPart2}
              otpPart1Ref={otpPart1Ref}
              otpPart2Ref={otpPart2Ref}
              onVerify={() => void handleVerifyOtp()}
              verifyDisabled={sheetOtpDigits.length !== 6}
              footer={
                <>
                  <Pressable onPress={() => void handleResend()} style={styles.linkBtn}>
                    <Text style={styles.linkText}>Resend OTP</Text>
                  </Pressable>
                  <Pressable onPress={goBackToPhone} style={styles.linkBtn}>
                    <Text style={styles.linkText}>Change number</Text>
                  </Pressable>
                </>
              }
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  authWrap: { paddingTop: 4 },
  authTopRow: { flexDirection: "row", alignItems: "center" },
  authStageViewport: { overflow: "hidden" },
  authStageTrack: { flexDirection: "row", alignItems: "flex-start", alignSelf: "flex-start" },
  authStepTitle: {
    color: iosPalette.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    flex: 1,
  },
  linkBtn: { paddingVertical: 10, alignItems: "center" },
  linkText: { color: iosPalette.textPrimary, fontSize: 15, fontWeight: "600", opacity: 0.85 },
});
