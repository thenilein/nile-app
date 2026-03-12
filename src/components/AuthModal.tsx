import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { AlertCircle, X, CheckCircle2 } from "lucide-react";
import OtpVerification from "../pages/OtpVerification";
import { useNavigate } from "react-router-dom";
import { MSG91_CAPTCHA_CONTAINER_ID, sendOtp as sendOtpCore, verifyOtp as verifyOtpCore, resendOtp as resendOtpCore } from "../lib/msg91Otp";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  // Form State
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");

  // Status State
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [shakeInput, setShakeInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  if (!isOpen) return null;

  const showToast = (type: "error" | "success", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const resetForm = () => {
    setError("");
    setToastMsg(null);
    setPhone("");
    setStep("phone");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Strict numerical limits + spacing formatter visual
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ""); // strip non-digits
    if (rawValue.length <= 10) {
      setPhone(rawValue);
      setError("");
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 10);
    setPhone(pastedData);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Block any non-numeric character (except essential controls)
    if (
      !/[\d]/.test(e.key) &&
      ![
        "Backspace",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
        "Delete",
        "Enter",
      ].includes(e.key)
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
      const ok = await sendOtpCore({
        phone,
        showToast,
      });

      // Only transition to OTP step when MSG91 init/send was triggered.
      if (ok) {
        showToast("success", `OTP sent to +91 ${phone.substring(0, 2)}XXX ${phone.substring(7, 10)}`);
        setStep("otp");
      }
    } catch {
      setError("Failed to send OTP. Try again.");
      showToast("error", "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string): Promise<boolean> => {
    return await verifyOtpCore(phone, otp, showToast, () => {
      // After MSG91 + Supabase success (handled in msg91Otp), close modal and optionally open checkout.
      setTimeout(() => {
        if (localStorage.getItem('pendingCheckout') === 'true') {
          localStorage.removeItem('pendingCheckout');
          window.dispatchEvent(new CustomEvent('open-checkout'));
        }
        handleClose();
        showToast('success', 'Welcome to Nile Ice Creams! 🎉');
      }, 800);
    });
  };

  const handleResendOtp = async (): Promise<boolean> => {
    return await resendOtpCore({ phone, showToast });
  };

  const handleVerified = () => {
    handleClose();
    navigate("/menu");
  };



  const maskPhoneNumber = (num: string) => {
    if (num.length > 4) {
      return (
        num.substring(0, num.length - 4).replace(/[0-9]/g, "X") +
        num.substring(num.length - 4)
      );
    }
    return num;
  };

  // Animated space formatter for visual presentation
  const formattedVisualPhone =
    phone.length > 5 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;

  const modalVariants: Variants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", damping: 25, stiffness: 300 },
    },
    exit: { scale: 0.95, opacity: 0, transition: { duration: 0.2 } },
  };

  const stepVariants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", damping: 25, stiffness: 300 },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      transition: { duration: 0.2 },
    }),
  };

  const shakeAnimation = {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Toast */}
          <AnimatePresence>
            {toastMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 max-w-[90vw] ${
                  toastMsg.type === "error"
                    ? "bg-red-500 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                {toastMsg.type === "error" ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span className="text-sm font-semibold">{toastMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 pb-10 min-h-[460px] relative overflow-hidden flex flex-col">
              <AnimatePresence mode="wait" custom={step === "phone" ? -1 : 1}>
                {step === "phone" ? (
                  <motion.div
                    key="phone-step"
                    custom={-1}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex flex-col h-full w-full"
                  >
                    <div className="text-center mb-8">
                      <div className="w-12 h-12 bg-green-800 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 pulse-animation">
                        N
                      </div>
                      <h2 className="text-[26px] font-bold text-gray-900 tracking-tight mb-2">
                        Welcome
                      </h2>
                      <p className="text-gray-500 text-sm">
                        Enter your phone number to continue
                      </p>
                    </div>

                    <div className="space-y-6 flex-1 flex flex-col">
                      <div>
                        <motion.div
                          animate={shakeInput ? shakeAnimation : {}}
                          className={`relative flex items-center h-14 bg-white border-[1.5px] rounded-xl overflow-hidden transition-all duration-200 focus-within:ring-4 focus-within:ring-green-500/20 ${
                            error
                              ? "border-red-500"
                              : "border-gray-200 focus-within:border-green-600"
                          }`}
                        >
                          {/* Static Prefix */}
                          <div className="flex items-center justify-center px-4 h-full bg-gray-50/50 border-r border-gray-100 select-none">
                            <span className="text-lg mr-1.5 leading-none">
                              🇮🇳
                            </span>
                            <span className="text-[17px] font-semibold text-gray-500">
                              +91
                            </span>
                          </div>

                          {/* Input Area */}
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={11}
                            autoComplete="tel"
                            value={formattedVisualPhone}
                            onChange={handlePhoneChange}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyPress}
                            className="block w-full h-full pl-4 pr-3 text-[18px] font-semibold tracking-wide text-gray-900 placeholder-transparent bg-transparent outline-none caret-green-600 focus:placeholder-gray-300"
                            placeholder="98765 43210"
                          />
                        </motion.div>

                        <div className="mt-2 min-h-[20px]">
                          {error && (
                            <p className="text-[13px] font-medium text-red-500 flex items-center gap-1.5 transition-opacity">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {error}
                            </p>
                          )}
                        </div>
                        <div id={MSG91_CAPTCHA_CONTAINER_ID} className="mt-3 min-h-[78px]" />
                      </div>

                      <div className="mt-auto pt-4">
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={loading || phone.length !== 10}
                          className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-[15px] font-bold transition-all duration-300 shadow-sm
                                                    disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                                                    not-disabled:bg-green-600 not-disabled:hover:bg-green-700 not-disabled:text-white not-disabled:hover:shadow-md not-disabled:active:scale-[0.98]"
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending...
                            </div>
                          ) : (
                            "Send OTP"
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="otp-step"
                    custom={1}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="h-full w-full"
                  >
                    <OtpVerification
                      maskedPhone={
                        "+91 " +
                        phone.substring(0, 2) +
                        "XXX X" +
                        phone.substring(6, 10)
                      }
                      onVerifyOtp={handleVerifyOtp}
                      onResendOtp={handleResendOtp}
                      onBack={() => setStep("phone")}
                      showToast={showToast}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
