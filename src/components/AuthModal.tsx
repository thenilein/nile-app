import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X, CheckCircle2 } from "lucide-react";
import { PhoneOtpAuthFlow } from "./PhoneOtpAuthFlow.tsx";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Full-screen centered modal (default) or mobile-style bottom sheet */
  variant?: "centered" | "bottomSheet";
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, variant = "centered" }) => {
  const isSheet = variant === "bottomSheet";
  const [toastMsg, setToastMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const showToast = (type: "error" | "success", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleClose = () => {
    setToastMsg(null);
    onClose();
  };

  if (!isOpen) return null;

  const modalVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring" as const, damping: 25, stiffness: 300 },
    },
    exit: { scale: 0.95, opacity: 0, transition: { duration: 0.2 } },
  };

  const sheetVariants = {
    hidden: { y: "100%" },
    visible: {
      y: 0,
      transition: { type: "spring" as const, damping: 28, stiffness: 320 },
    },
    exit: { y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 flex ${isSheet ? "z-[130] items-end justify-stretch" : "z-50 items-center justify-center p-4"}`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <AnimatePresence>
            {toastMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`fixed left-1/2 top-6 z-[100] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 shadow-lg ${
                  toastMsg.type === "error"
                    ? "bg-red-500 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                {toastMsg.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span className="text-sm font-semibold">{toastMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            variants={isSheet ? sheetVariants : modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-10 w-full overflow-hidden bg-white shadow-xl ${
              isSheet
                ? "max-h-[min(92dvh,820px)] rounded-t-[28px] border-t border-[#E5E7EB]"
                : "max-w-md rounded-2xl"
            }`}
            style={isSheet ? { paddingBottom: "env(safe-area-inset-bottom)" } : undefined}
          >
            {isSheet && (
              <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
                <div className="h-1.5 w-12 rounded-full bg-gray-200" />
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              className={`absolute z-10 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 ${
                isSheet ? "right-3 top-3" : "right-4 top-4"
              }`}
            >
              <X className="h-5 w-5" />
            </button>

            <div
              className={`relative flex min-h-0 flex-col overflow-hidden ${
                isSheet
                  ? "max-h-[min(calc(92dvh-48px),780px)] min-h-0 overflow-y-auto px-6 pb-8 pt-2"
                  : "min-h-[460px] p-8 pb-10"
              }`}
            >
              <PhoneOtpAuthFlow
                active={isOpen}
                showToast={showToast}
                variant="sheet"
                syncPendingCheckoutEvent
                onAuthenticated={handleClose}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
