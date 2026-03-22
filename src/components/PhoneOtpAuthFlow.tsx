import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { AlertCircle } from "lucide-react";
import OtpVerification from "./OtpVerification.tsx";
import ProfileCompletionForm from "./ProfileCompletionForm.tsx";
import {
    completeProfile as completeProfileCore,
    sendOtp as sendOtpCore,
    verifyOtp as verifyOtpCore,
    resendOtp as resendOtpCore,
} from "../lib/msg91Otp.ts";
import type { ToastFn } from "../lib/msg91Otp.ts";

export type PhoneOtpAuthFlowProps = {
    /** When false, internal form state is reset */
    active: boolean;
    showToast: ToastFn;
    /** Called after the user has a session (OTP only, or after profile completion). */
    onAuthenticated: () => void;
    variant?: "embedded" | "sheet";
    /**
     * When true, after success clears `pendingCheckout` and dispatches `open-checkout`
     * (same behavior as the legacy account modal).
     */
    syncPendingCheckoutEvent?: boolean;
    /** When set, phone step shows a skip control (e.g. continue as guest). */
    onGuestSkip?: () => void;
};

const subStepVariants: Variants = {
    enter: (dir: number) => ({
        x: dir > 0 ? "20%" : "-20%",
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
    },
    exit: (dir: number) => ({
        x: dir > 0 ? "-16%" : "16%",
        opacity: 0,
        transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
    }),
};

function resolvePendingCheckoutOpen() {
    if (localStorage.getItem("pendingCheckout") === "true") {
        localStorage.removeItem("pendingCheckout");
        window.dispatchEvent(new CustomEvent("open-checkout"));
    }
}

export const PhoneOtpAuthFlow: React.FC<PhoneOtpAuthFlowProps> = ({
    active,
    showToast,
    onAuthenticated,
    variant = "embedded",
    syncPendingCheckoutEvent = false,
    onGuestSkip,
}) => {
    const isSheet = variant === "sheet";
    const [phone, setPhone] = useState("");
    const [fullName, setFullName] = useState("");
    const [authStep, setAuthStep] = useState<"phone" | "otp" | "profile">("phone");
    const [subDir, setSubDir] = useState(1);
    const [error, setError] = useState("");
    const [shakeInput, setShakeInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);

    const goAuthStep = useCallback((next: "phone" | "otp" | "profile", dir: number) => {
        setSubDir(dir);
        setAuthStep(next);
    }, []);

    useEffect(() => {
        if (!active) {
            setPhone("");
            setFullName("");
            setAuthStep("phone");
            setError("");
            setShakeInput(false);
            setLoading(false);
            setProfileLoading(false);
        }
    }, [active]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        if (rawValue.length <= 10) {
            setPhone(rawValue);
            setError("");
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 10);
        setPhone(pastedData);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (
            !/[\d]/.test(e.key) &&
            !["Backspace", "ArrowLeft", "ArrowRight", "Tab", "Delete", "Enter"].includes(e.key)
        ) {
            e.preventDefault();
        }
    };

    const handleSendOtp = async (e?: React.FormEvent | React.MouseEvent) => {
        if (e) e.preventDefault();
        setError("");

        if (phone.length !== 10) {
            setShakeInput(true);
            setError("Phone number must be exactly 10 digits");
            showToast("error", "Invalid phone number");
            setTimeout(() => setShakeInput(false), 500);
            return;
        }

        if (!/^[6-9]/.test(phone)) {
            setShakeInput(true);
            setError("Enter a valid 10-digit mobile number");
            showToast("error", "Invalid phone number");
            setTimeout(() => setShakeInput(false), 500);
            return;
        }

        setLoading(true);
        try {
            const ok = await sendOtpCore({ phone, showToast });
            if (ok) {
                showToast(
                    "success",
                    `OTP sent to +91 ${phone.substring(0, 2)}XXX ${phone.substring(7, 10)}`,
                );
                goAuthStep("otp", 1);
            }
        } catch {
            setError("Failed to send OTP. Try again.");
            showToast("error", "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (otp: string): Promise<boolean> => {
        return await verifyOtpCore(phone, otp, showToast, {
            onVerified: () => {
                setTimeout(() => {
                    if (syncPendingCheckoutEvent) {
                        resolvePendingCheckoutOpen();
                    }
                    showToast("success", "Welcome back to Nile Ice Creams!");
                    onAuthenticated();
                }, 650);
            },
            onNeedsProfile: () => {
                showToast("success", "Phone verified. Add your name to continue.");
                goAuthStep("profile", 1);
            },
        });
    };

    const handleResendOtp = async (): Promise<boolean> => {
        return await resendOtpCore({ phone, showToast });
    };

    const handleCompleteProfile = async () => {
        setProfileLoading(true);
        try {
            const ok = await completeProfileCore({
                phone,
                fullName,
                showToast,
            });
            if (!ok) return;
            if (syncPendingCheckoutEvent) {
                resolvePendingCheckoutOpen();
            }
            showToast("success", "Welcome to Nile Ice Creams! 🎉");
            onAuthenticated();
        } finally {
            setProfileLoading(false);
        }
    };

    const formattedVisualPhone = phone.length > 5 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;

    const maskedPhone =
        "+91 " + phone.substring(0, 2) + "XXX X" + phone.substring(6, 10);

    const shakeAnimation = {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.4 },
    };

    const phonePrimaryLabel = isSheet ? "Send OTP" : "Continue";

    return (
        <div className={isSheet ? "min-h-0 flex-1 overflow-y-auto" : ""}>
            <AnimatePresence mode="wait" custom={subDir}>
                {authStep === "phone" ? (
                    <motion.div
                        key="auth-phone"
                        custom={subDir}
                        variants={subStepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className={`flex w-full flex-col ${isSheet ? "h-full" : ""}`}
                    >
                        {isSheet ? (
                            <div className="mb-8 text-center">
                                <div className="pulse-animation mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-800 text-2xl font-bold text-white">
                                    N
                                </div>
                                <h2 className="mb-2 text-[26px] font-bold tracking-tight text-gray-900">Continue with phone</h2>
                                <p className="text-sm text-gray-500">Enter your phone number to continue</p>
                            </div>
                        ) : null}

                        <div
                            className={`flex flex-col ${isSheet ? "flex-1 space-y-6" : "space-y-4"}`}
                        >
                            <div>
                                <motion.div
                                    animate={shakeInput ? shakeAnimation : {}}
                                    className={
                                        isSheet
                                            ? `relative flex h-14 min-h-[52px] items-center overflow-hidden rounded-xl border-[1.5px] bg-white transition-all duration-200 focus-within:ring-2 focus-within:ring-gray-300/80 ${
                                                  error ? "border-red-500" : "border-gray-300 focus-within:border-gray-500"
                                              }`
                                            : `relative flex min-h-[52px] w-full items-center overflow-hidden rounded-full border border-gray-300/95 bg-neutral-50 transition-all duration-200 focus-within:border-gray-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.05)] ${
                                                  error ? "border-red-500" : ""
                                              }`
                                    }
                                >
                                    {isSheet ? (
                                        <div className="flex h-full select-none items-center justify-center border-r border-gray-100 bg-gray-50/50 px-4">
                                            <span className="mr-1.5 text-lg leading-none">🇮🇳</span>
                                            <span className="text-[17px] font-semibold text-gray-500">+91</span>
                                        </div>
                                    ) : (
                                        <span className="flex h-full shrink-0 select-none items-center border-r border-gray-300/80 bg-gray-100/80 px-3.5 text-[17px] font-semibold tabular-nums text-gray-500">
                                            +91
                                        </span>
                                    )}
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={11}
                                        autoComplete="tel"
                                        value={formattedVisualPhone}
                                        onChange={handlePhoneChange}
                                        onPaste={handlePaste}
                                        onKeyDown={handleKeyPress}
                                        className={`min-h-0 min-w-0 flex-1 bg-transparent py-3 text-[18px] font-semibold tracking-wide text-gray-900 caret-gray-800 outline-none ${
                                            isSheet
                                                ? "pl-4 pr-3 placeholder-transparent focus:placeholder-gray-300"
                                                : "pl-3 pr-4 placeholder:text-[17px] placeholder:font-medium placeholder:text-gray-400"
                                        }`}
                                        placeholder="98765 43210"
                                    />
                                </motion.div>
                                <div className="mt-2 min-h-[20px]">
                                    {error && (
                                        <p className="flex items-center gap-1.5 text-[13px] font-medium text-red-500">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {error}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className={isSheet ? "mt-auto pt-4" : "pt-1"}>
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={loading || phone.length !== 10}
                                    className={`flex w-full items-center justify-center px-4 py-3.5 text-[15px] font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 not-disabled:bg-black not-disabled:text-white not-disabled:hover:bg-[#1a1a1a] not-disabled:active:scale-[0.98] ${
                                        isSheet ? "rounded-xl" : "rounded-full"
                                    }`}
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Sending…
                                        </span>
                                    ) : (
                                        phonePrimaryLabel
                                    )}
                                </button>
                                {onGuestSkip && (
                                    <button
                                        type="button"
                                        onClick={onGuestSkip}
                                        className="mt-4 w-full py-2 text-[15px] font-semibold text-gray-500 transition-colors hover:text-gray-800"
                                    >
                                        Skip for now
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : authStep === "otp" ? (
                    <motion.div
                        key="auth-otp"
                        custom={subDir}
                        variants={subStepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="w-full"
                    >
                        <OtpVerification
                            maskedPhone={maskedPhone}
                            onVerifyOtp={handleVerifyOtp}
                            onResendOtp={handleResendOtp}
                            onBack={() => goAuthStep("phone", -1)}
                            showToast={showToast}
                            verifyMode="manual"
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="auth-profile"
                        custom={subDir}
                        variants={subStepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="flex w-full items-center"
                    >
                        <ProfileCompletionForm
                            phone={phone}
                            fullName={fullName}
                            loading={profileLoading}
                            onNameChange={setFullName}
                            onSubmit={handleCompleteProfile}
                            onBack={() => goAuthStep("otp", -1)}
                            submitLabel="Create account"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
