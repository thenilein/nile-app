import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { sheetLayoutTransition } from "../lib/sheetMotion.ts";

export const sheetBottomSlideVariants = {
    hidden: { y: "100%" },
    visible: {
        y: 0,
        transition: { type: "spring" as const, damping: 28, stiffness: 320 },
    },
    exit: { y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const } },
};

export type SheetBottomShellProps = {
    isOpen: boolean;
    onClose: () => void;
    /**
     * `close-floating` — drag handle + corner X (login / OTP).
     * `title-row` — drag handle + title + X (e.g. signed-in account).
     */
    header: "close-floating" | "title-row";
    title?: string;
    /** Rendered after backdrop (same stacking context), e.g. `SheetToast` */
    topOverlay?: React.ReactNode;
    children: React.ReactNode;
    /** Extra classes on the white panel */
    panelClassName?: string;
    /** Wrapper around `children` (scroll / padding) */
    bodyClassName?: string;
};

/**
 * Shared bottom sheet chrome: backdrop, spring panel, handle, header.
 * Used by `AccountSheet` (signed-in) and any other customer bottom sheet.
 */
export const SheetBottomShell: React.FC<SheetBottomShellProps> = ({
    isOpen,
    onClose,
    header,
    title,
    topOverlay,
    children,
    panelClassName = "",
    bodyClassName = "",
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[130] flex items-end justify-stretch">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        aria-hidden
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    {topOverlay}

                    <motion.div
                        variants={sheetBottomSlideVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        transition={{ layout: sheetLayoutTransition.layout }}
                        className={`relative z-10 flex max-h-[min(92dvh,820px)] min-h-0 w-full flex-col overflow-hidden rounded-t-[28px] border-t border-[#E5E7EB] bg-white shadow-xl ${panelClassName}`}
                        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                    >
                        <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
                            <div className="h-1.5 w-12 rounded-full bg-gray-200" />
                        </div>

                        {header === "close-floating" ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute right-3 top-3 z-10 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        ) : (
                            <div className="flex flex-shrink-0 items-center justify-between px-5 pb-2">
                                <h2 className="text-[18px] font-semibold text-[#111827]">{title}</h2>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                                    aria-label="Close"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        )}

                        <div
                            className={
                                bodyClassName ||
                                (header === "close-floating"
                                    ? "relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-6 pb-8 pt-2"
                                    : "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-2")
                            }
                        >
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
