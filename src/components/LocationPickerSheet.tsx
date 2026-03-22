import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LocationPickerContent } from "./LocationPickerContent.tsx";
import { SheetToast, useSheetToast } from "./SheetToast.tsx";
import { SheetLoginStep } from "./SheetLoginStep.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { useLocation as useDeliveryLocation, type LocationData } from "../context/LocationContext.tsx";
import { sheetCapsuleIconBtn, sheetCapsuleTextBtn } from "../lib/sheetCapsuleStyles.ts";

export interface LocationPickerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    primaryAction?: { label: string; onClick: () => void };
    /** When true (e.g. landing flow), choosing a location navigates to /menu; context already holds the coords. */
    navigateToMenuOnSelect?: boolean;
    /**
     * When true, anonymous users see embedded sign-in first (same pattern as checkout step 0), then location.
     */
    authGate?: boolean;
    /**
     * Sign-in only: same chrome + embedded `SheetLoginStep` as landing auth, but no location step — success or Skip closes the sheet.
     * Implies an auth gate (treats as `authGate` internally).
     */
    authOnly?: boolean;
    authTitle?: string;
    authSubtitle?: string;
}

function locationKey(data: LocationData | null): string | null {
    if (!data) return null;
    return `${data.latitude},${data.longitude},${data.displayName}`;
}

const easeSmooth = [0.22, 1, 0.36, 1] as const;

const slideVariants = {
    enter: (dir: number) => ({
        x: dir > 0 ? "100%" : "-100%",
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.38, ease: easeSmooth },
    },
    exit: (dir: number) => ({
        x: dir > 0 ? "-100%" : "100%",
        opacity: 0,
        transition: { duration: 0.3, ease: easeSmooth },
    }),
};

/** Overlay + desktop modal / mobile bottom sheet for choosing delivery location. */
export const LocationPickerSheet: React.FC<LocationPickerSheetProps> = ({
    isOpen,
    onClose,
    title = "Change address",
    subtitle = "Search for city/locality or use GPS",
    primaryAction,
    navigateToMenuOnSelect = false,
    authGate = false,
    authOnly = false,
    authTitle = "Continue with phone number",
    authSubtitle = "",
}) => {
    const effectiveAuthGate = Boolean(authGate || authOnly);
    const navigate = useNavigate();
    const { locationData } = useDeliveryLocation();
    const { user, continueAsGuest, isLoading: authLoading } = useAuth();
    const locationAtOpenRef = useRef<string | null>(null);

    const [phase, setPhase] = useState<"auth" | "location">("location");
    const [slideDir, setSlideDir] = useState(1);
    const bootstrappedForOpen = useRef(false);
    /** When true, stay on auth phase even if guest/session exists (user stepped back from location). */
    const stayOnAuthPhaseRef = useRef(false);

    const { toastMsg, showToast, dismissToast } = useSheetToast();

    useEffect(() => {
        if (!isOpen) dismissToast();
    }, [isOpen, dismissToast]);

    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isOpen) {
            bootstrappedForOpen.current = false;
            stayOnAuthPhaseRef.current = false;
            return;
        }
        if (!effectiveAuthGate) {
            setPhase("location");
            return;
        }
        if (authLoading) return;
        if (!bootstrappedForOpen.current) {
            bootstrappedForOpen.current = true;
            /** Only a real session skips login; guest still sees phone step on landing (authGate). */
            setPhase(authOnly ? "auth" : user ? "location" : "auth");
        }
    }, [isOpen, effectiveAuthGate, authLoading, user, authOnly]);

    /** After sign-in while on auth, advance to location (or close when `authOnly`). */
    useEffect(() => {
        if (!isOpen || !effectiveAuthGate) return;
        if (phase !== "auth") return;
        if (stayOnAuthPhaseRef.current) return;
        if (user) {
            if (authOnly) {
                onClose();
                return;
            }
            setSlideDir(1);
            setPhase("location");
        }
    }, [isOpen, effectiveAuthGate, phase, user, authOnly, onClose]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        locationAtOpenRef.current = locationKey(locationData);
        // Intentionally only when sheet opens — do not depend on locationData or we reset after each pick.
    }, [isOpen]);

    useEffect(() => {
        if (authOnly || !navigateToMenuOnSelect || !isOpen) return;
        const now = locationKey(locationData);
        if (now == null) return;
        if (now === locationAtOpenRef.current) return;
        navigate("/menu");
        onClose();
    }, [locationData, isOpen, navigateToMenuOnSelect, navigate, onClose, authOnly]);

    const goToLocation = useCallback(() => {
        stayOnAuthPhaseRef.current = false;
        setSlideDir(1);
        setPhase("location");
    }, []);

    const handleGuestSkip = useCallback(() => {
        continueAsGuest();
        if (authOnly) {
            onClose();
            return;
        }
        goToLocation();
    }, [continueAsGuest, goToLocation, authOnly, onClose]);

    const completeAuthGateSuccess = useCallback(() => {
        if (authOnly) {
            onClose();
            return;
        }
        goToLocation();
    }, [authOnly, onClose, goToLocation]);

    const handleLeadingBack = useCallback(() => {
        if (effectiveAuthGate && authLoading) {
            onClose();
            return;
        }
        if (effectiveAuthGate && phase === "location") {
            if (user?.id) {
                onClose();
                return;
            }
            stayOnAuthPhaseRef.current = true;
            setSlideDir(-1);
            setPhase("auth");
            return;
        }
        onClose();
    }, [effectiveAuthGate, authLoading, phase, user?.id, onClose]);

    if (!isOpen) return null;

    const handlePrimary = () => {
        primaryAction?.onClick();
        onClose();
    };

    const gateLoading = Boolean(effectiveAuthGate && authLoading);
    const showAuthPanel = effectiveAuthGate && !authLoading && phase === "auth";
    const showLocationPanel =
        !effectiveAuthGate || (!authOnly && !authLoading && phase === "location");

    const headerTitle = gateLoading ? authTitle : phase === "auth" ? authTitle : title;
    const headerSubtitle = gateLoading
        ? "Checking your session…"
        : phase === "auth"
          ? authSubtitle
          : subtitle;

    /** Auth steps size to content; location step keeps a comfortable min height for lists. */
    const useCompactAuthSheet = Boolean(
        authOnly || (effectiveAuthGate && (gateLoading || phase === "auth")),
    );

    const renderAuthGateBody = () => (
        <div
            className={
                useCompactAuthSheet
                    ? "relative max-h-[min(88vh,820px)] overflow-x-hidden overflow-y-auto"
                    : "relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
            }
        >
            {gateLoading ? (
                <div className="px-5 pb-5 pt-1 md:px-6 md:pb-6">
                    <SheetLoginStep
                        active={false}
                        authLoading
                        showToast={showToast}
                        onAuthenticated={completeAuthGateSuccess}
                    />
                </div>
            ) : (
                <AnimatePresence mode="wait" custom={slideDir} initial={false}>
                    {showAuthPanel && (
                        <motion.div
                            key="location-sheet-auth"
                            custom={slideDir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="flex flex-col gap-5 px-5 pb-5 pt-1 md:px-6 md:pb-6"
                        >
                            <SheetLoginStep
                                active={isOpen && showAuthPanel}
                                authLoading={false}
                                showToast={showToast}
                                onAuthenticated={completeAuthGateSuccess}
                                syncPendingCheckoutEvent={false}
                            />
                        </motion.div>
                    )}

                    {showLocationPanel && (
                        <motion.div
                            key="location-sheet-pick"
                            custom={slideDir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="px-5 pb-2 pt-2 md:px-6 md:pb-4"
                        >
                            <LocationPickerContent active={isOpen} />
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );

    const desktopFooter =
        showLocationPanel && primaryAction ? (
            <div className="shrink-0 border-t border-[#E5E7EB] px-6 py-4">
                <button
                    type="button"
                    onClick={handlePrimary}
                    className="h-[50px] w-full rounded-xl bg-neutral-950 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
                >
                    {primaryAction.label}
                </button>
            </div>
        ) : null;

    const mobileFooter =
        showLocationPanel && primaryAction ? (
            <div className="flex-shrink-0 border-t border-[#E5E7EB] px-5 pt-3">
                <button
                    type="button"
                    onClick={handlePrimary}
                    className="h-[50px] w-full rounded-xl bg-neutral-950 text-[16px] font-semibold text-white transition-transform active:scale-[0.98]"
                >
                    {primaryAction.label}
                </button>
            </div>
        ) : null;

    return (
        <>
            <SheetToast msg={toastMsg} />

            <button
                type="button"
                aria-label="Close location picker"
                onClick={onClose}
                className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm"
            />

            <div className="pointer-events-none fixed inset-0 z-[130] hidden md:block">
                <div className="pointer-events-auto absolute inset-0 flex items-center justify-center px-6 py-8">
                    <div
                        className={`flex w-full max-w-[640px] flex-col overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.25)] max-h-[min(92vh,880px)] ${
                            useCompactAuthSheet ? "min-h-0" : "min-h-[min(58vh,560px)]"
                        }`}
                    >
                        {effectiveAuthGate ? (
                            <div className="flex shrink-0 flex-col border-b border-[#E5E7EB] px-6 pb-5 pt-3">
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={handleLeadingBack}
                                        className={sheetCapsuleIconBtn}
                                        aria-label={
                                            gateLoading || phase === "auth"
                                                ? "Close"
                                                : user?.id
                                                  ? "Close"
                                                  : "Back"
                                        }
                                    >
                                        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
                                    </button>
                                    {showAuthPanel && (
                                        <button type="button" onClick={handleGuestSkip} className={sheetCapsuleTextBtn}>
                                            Skip
                                        </button>
                                    )}
                                </div>
                                <div className="mt-3">
                                    <p className="text-balance text-[15px] font-bold leading-snug text-[#111827]">
                                        {headerTitle}
                                    </p>
                                    {headerSubtitle ? (
                                        <p className="mt-1 text-[12px] text-[#6B7280]">{headerSubtitle}</p>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <div className="flex shrink-0 items-start gap-3 border-b border-[#E5E7EB] px-6 py-5">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={sheetCapsuleIconBtn}
                                    aria-label="Close"
                                >
                                    <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
                                </button>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <p className="text-[14px] font-bold text-[#111827]">{headerTitle}</p>
                                    <p className="mt-1 text-[12px] text-[#6B7280]">{headerSubtitle}</p>
                                </div>
                            </div>
                        )}
                        {effectiveAuthGate ? (
                            renderAuthGateBody()
                        ) : (
                            <div className="min-h-0 flex-1 overflow-y-auto p-6">
                                <LocationPickerContent active={isOpen} />
                            </div>
                        )}
                        {desktopFooter}
                    </div>
                </div>
            </div>

            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[130] flex justify-center px-3 pb-[max(10px,calc(env(safe-area-inset-bottom)+10px))] md:hidden">
                <div
                    className={`pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-[40px] border border-black/[0.08] bg-white shadow-[0_12px_48px_rgba(15,23,42,0.14)] box-border max-h-[min(90dvh,880px)] ${
                        useCompactAuthSheet ? "min-h-0" : "min-h-[58vh]"
                    }`}
                    style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
                >
                    <div className="flex-shrink-0 px-5 pb-3 pt-3">
                        {effectiveAuthGate ? (
                            <>
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={handleLeadingBack}
                                        className={sheetCapsuleIconBtn}
                                        aria-label={
                                            gateLoading || phase === "auth"
                                                ? "Close"
                                                : user?.id
                                                  ? "Close"
                                                  : "Back"
                                        }
                                    >
                                        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
                                    </button>
                                    {showAuthPanel && (
                                        <button type="button" onClick={handleGuestSkip} className={sheetCapsuleTextBtn}>
                                            Skip
                                        </button>
                                    )}
                                </div>
                                <h2 className="mt-2 text-balance text-[17px] font-semibold leading-snug text-[#111827] sm:text-[18px]">
                                    {headerTitle}
                                </h2>
                                {headerSubtitle ? (
                                    <p className="mt-1 text-[12px] text-[#6B7280]">{headerSubtitle}</p>
                                ) : null}
                            </>
                        ) : (
                            <>
                                <div className="flex items-start gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className={sheetCapsuleIconBtn}
                                        aria-label="Close"
                                    >
                                        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
                                    </button>
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <h2 className="text-[18px] font-semibold text-[#111827]">{headerTitle}</h2>
                                        <p className="mt-1 text-[12px] text-[#6B7280]">{headerSubtitle}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    {effectiveAuthGate ? (
                        renderAuthGateBody()
                    ) : (
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
                            <LocationPickerContent active={isOpen} />
                        </div>
                    )}
                    {mobileFooter}
                </div>
            </div>
        </>
    );
};

export default LocationPickerSheet;
