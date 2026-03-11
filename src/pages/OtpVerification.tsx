import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

interface OtpVerificationProps {
  phone: string;
  maskedPhone: string;
  onBack: () => void;
  onVerified: () => void;
  showToast: (type: "error" | "success", msg: string) => void;
}

const OtpVerification: React.FC<OtpVerificationProps> = ({
  phone,
  maskedPhone,
  onBack,
  onVerified,
  showToast,
}) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SEC);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isOtpComplete =
    otp.every((d) => d !== "") && otp.join("").length === OTP_LENGTH;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(
      () => setResendCooldown((c) => (c <= 1 ? 0 : c - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto advance
    if (value && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Auto submit effect when all filled
  useEffect(() => {
    if (isOtpComplete && !loading && !success && !shake) {
      handleVerify();
    }
  }, [isOtpComplete]);

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    const newOtp = [...otp];
    pasted.split("").forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const triggerShakeAndReset = () => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setOtp(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    }, 500);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOtpComplete) return;
    setLoading(true);

    try {
      const rawPhone = phone.replace("+91", "");
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone: rawPhone, otp: otp.join("") },
      });

      if (error) throw error;

      if (data?.success) {
        setSuccess(true);
        showToast("success", "Verified successfully!");
        setTimeout(() => {
          onVerified();
        }, 800);
      } else {
        showToast("error", "Wrong OTP. Try again.");
        triggerShakeAndReset();
      }
    } catch (err: any) {
      showToast("error", "Verification failed. Try again.");
      triggerShakeAndReset();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setOtp(["", "", "", "", "", ""]);
    otpInputRefs.current[0]?.focus();

    try {
      const rawPhone = phone.replace("+91", "");
      const { data } = await supabase.functions.invoke("resend-otp", {
        body: { phone: rawPhone },
      });

      if (data?.type === "success") {
        setResendCooldown(RESEND_COOLDOWN_SEC);
        showToast("success", `OTP resent to ${maskedPhone}`);
      } else {
        showToast("error", "Resend failed. Try again.");
      }
    } catch (err: any) {
      showToast("error", "Network error.");
    }
  };

  const shakeAnimation = {
    x: [0, -8, 8, -8, 8, 0],
    transition: { duration: 0.4 },
  };

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onBack}
        className="self-start -ml-2 p-2 mb-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="mb-8">
        <h2 className="text-[26px] font-bold text-gray-900 tracking-tight mb-2">
          Enter OTP
        </h2>
        <p className="text-gray-500 text-[15px] leading-snug">
          We've sent a 6-digit code to <br />
          <span className="font-semibold text-gray-800">{maskedPhone}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="flex-1 flex flex-col">
        <div className="mb-10">
          <motion.div
            animate={shake ? shakeAnimation : {}}
            className={`flex justify-between gap-1 sm:gap-2 transition-opacity ${loading ? "opacity-60 pointer-events-none" : ""}`}
            onPaste={handleOtpPaste}
          >
            {otp.map((digit, index) => {
              const isFocused = focusedIndex === index;
              const isFilled = digit !== "";
              const statusColor = success
                ? "border-green-500 bg-green-50 text-green-700"
                : shake
                  ? "border-red-500 bg-red-50"
                  : isFocused
                    ? "border-green-500 bg-green-50/30 shadow-[0_0_0_1.5px_rgba(21,128,61,0.2)]"
                    : isFilled
                      ? "border-green-500 text-gray-900"
                      : "border-gray-200";

              return (
                <motion.input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(-1)}
                  animate={
                    isFilled && !shake && !success
                      ? { scale: [1, 1.1, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.15 }}
                  className={`relative z-10 w-[48px] h-[56px] text-center text-[24px] font-semibold rounded-xl outline-none transition-all duration-200 border-[1.5px] ${statusColor} caret-green-600`}
                />
              );
            })}
          </motion.div>
        </div>

        <div className="mt-auto pt-4 flex flex-col items-center gap-4">
          <div className="h-6 flex items-center justify-center">
            {loading ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Verifying...
              </div>
            ) : success ? (
              <div className="flex items-center gap-1.5 text-sm font-bold text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Verified Successfully
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className={`text-[14px] font-semibold transition-colors ${
                  resendCooldown > 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-green-700 hover:text-green-800"
                }`}
              >
                {resendCooldown > 0
                  ? `Resend OTP in 0:${resendCooldown.toString().padStart(2, "0")}`
                  : "Resend OTP"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default OtpVerification;
