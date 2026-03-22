import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export type SheetToastMessage = { type: "error" | "success"; text: string } | null;

export function useSheetToast() {
    const [toastMsg, setToastMsg] = useState<SheetToastMessage>(null);
    const showToast = useCallback((type: "error" | "success", text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3000);
    }, []);
    const dismissToast = useCallback(() => setToastMsg(null), []);
    return { toastMsg, showToast, dismissToast };
}

type SheetToastProps = {
    msg: SheetToastMessage;
    /** e.g. z-[140] or z-[200] to stack above local overlays */
    zClassName?: string;
};

export const SheetToast: React.FC<SheetToastProps> = ({ msg, zClassName = "z-[140]" }) => (
    <AnimatePresence>
        {msg && (
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`fixed left-1/2 top-6 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 shadow-lg ${zClassName} ${
                    msg.type === "error" ? "bg-red-500 text-white" : "bg-green-600 text-white"
                }`}
            >
                {msg.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <span className="text-sm font-semibold">{msg.text}</span>
            </motion.div>
        )}
    </AnimatePresence>
);
