import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const VALID_COUPONS: Record<string, number> = {
    NILE10: 10,
    NILE20: 20,
    ICECREAM50: 50,
};

export const CouponSection: React.FC<{
    onApply: (code: string, discount: number) => void;
    applied: string | null;
}> = ({ onApply, applied }) => {
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState("");
    const [error, setError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleApply = () => {
        const upper = code.trim().toUpperCase();
        const discount = VALID_COUPONS[upper];
        if (discount) {
            onApply(upper, discount);
            setError(false);
        } else {
            setError(true);
            setTimeout(() => setError(false), 700);
        }
    };

    if (applied) {
        return (
            <div className="mx-4 mb-3 px-3 py-2 rounded-lg flex items-center justify-between bg-green-50 border border-green-100">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-xs text-green-700 font-semibold">{applied} applied</span>
                </div>
                <button type="button" onClick={() => onApply("", 0)} className="text-gray-400 hover:text-red-500 text-xs font-medium transition-colors">
                    Remove
                </button>
            </div>
        );
    }

    return (
        <div className="px-4 mb-3">
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 150); }}
                className="flex items-center gap-1 text-[13px] font-medium text-green-600 hover:text-green-700 transition-colors"
            >
                Have a coupon?
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3 h-3" />
                </motion.span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <motion.div
                            className="flex flex-col sm:flex-row gap-2 mt-2"
                            animate={error ? { x: [0, -5, 5, -5, 5, 0] } : { x: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <input
                                ref={inputRef}
                                value={code}
                                onChange={(e) => { setCode(e.target.value); setError(false); }}
                                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                                placeholder="Enter code"
                                className={`flex-1 min-w-0 text-sm px-3 py-1.5 rounded-lg outline-none font-medium text-gray-900 border ${error ? "border-red-400" : "border-dashed border-gray-300 focus:border-green-500 focus:border-solid bg-gray-50 bg-white"}`}
                            />
                            <button
                                type="button"
                                onPointerDown={(e) => { e.preventDefault(); handleApply(); }}
                                className="w-full sm:w-[70px] flex-shrink-0 text-xs font-bold px-0 py-2 sm:py-1.5 rounded-lg transition-transform duration-100 border border-green-600 text-green-700 hover:bg-green-50 flex items-center justify-center active:scale-95"
                            >
                                Apply
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
