import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLocation } from "../context/LocationContext.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import AuthModal from "./AuthModal.tsx";

// ─────────────────────────────────────────────────────────
// HAVERSINE DISTANCE (km)
// ─────────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
type Step = "default" | "loading" | "success" | "error";

// ─────────────────────────────────────────────────────────
// PULSING PIN ICON
// ─────────────────────────────────────────────────────────
const PulsingPin: React.FC = () => (
    <div className="relative flex items-center justify-center w-20 h-20 mb-4">
        {/* outer pulse rings */}
        <span className="absolute inline-flex rounded-full bg-green-200 opacity-50 animate-ping w-16 h-16" />
        <span className="absolute inline-flex rounded-full bg-green-300 opacity-30 animate-ping w-20 h-20" style={{ animationDelay: "0.4s" }} />
        {/* pin */}
        <span className="relative z-10 text-5xl select-none">📍</span>
    </div>
);

// ─────────────────────────────────────────────────────────
// SUCCESS TICK
// ─────────────────────────────────────────────────────────
const SuccessTick: React.FC = () => (
    <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="text-5xl mb-3 select-none"
    >
        ✅
    </motion.div>
);

// ─────────────────────────────────────────────────────────
// BRANCH CARD
// ─────────────────────────────────────────────────────────
interface BranchCardProps {
    name: string;
    address: string;
    distanceKm: number;
    isServiceable: boolean;
}
const BranchCard: React.FC<BranchCardProps> = ({ name, address, distanceKm, isServiceable }) => (
    <div className="w-full rounded-2xl border border-green-200 bg-green-50 p-4 text-left space-y-1 mt-3">
        <div className="flex items-center justify-between">
            <p className="text-green-900 font-bold text-[15px]">Delivery Available</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isServiceable ? "bg-green-200 text-green-800" : "bg-orange-100 text-orange-700"}`}>
                {isServiceable ? "Open" : "Far"}
            </span>
        </div>
        <p className="text-green-700 text-sm">To your location</p>
    </div>
);

// ─────────────────────────────────────────────────────────
// SHIMMER BUTTON STYLES (inline for portability)
// ─────────────────────────────────────────────────────────
const shimmerStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #15803d 0%, #166534 60%)",
    position: "relative",
    overflow: "hidden",
};

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
const GPSLocationCard: React.FC = () => {
    const {
        locationData,
        locationError,
        isLoadingLocation,
        outlets,
        nearestOutlet,
        isServiceable,
        getCurrentLocation,
        clearLocation,
    } = useLocation();

    const { user, isGuest } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState<Step>("default");
    const [pincode, setPincode] = useState("");
    const [pincodeError, setPincodeError] = useState<string | null>(null);
    const [pincodeOutlet, setPincodeOutlet] = useState<(typeof outlets)[0] | null>(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [shimmerHover, setShimmerHover] = useState(false);

    // If location was already set (e.g. from localStorage) skip to success
    useEffect(() => {
        if (locationData && !isLoadingLocation) {
            setStep("success");
        }
    }, []);

    // Watch isLoadingLocation transitions initiated by getCurrentLocation
    useEffect(() => {
        if (step === "loading" && !isLoadingLocation) {
            if (locationData) {
                setStep("success");
            } else {
                setStep("error");
            }
        }
    }, [isLoadingLocation]);

    // Watch locationError
    useEffect(() => {
        if (locationError && step === "loading") {
            setStep("error");
        }
    }, [locationError]);

    const handleDetect = useCallback(() => {
        setStep("loading");
        setPincodeError(null);
        getCurrentLocation();
    }, [getCurrentLocation]);

    const handleReset = useCallback(() => {
        clearLocation();
        setPincode("");
        setPincodeError(null);
        setPincodeOutlet(null);
        setStep("default");
    }, [clearLocation]);

    const handleStartOrdering = useCallback(() => {
        if (user || isGuest) {
            navigate("/menu");
        } else {
            setAuthModalOpen(true);
        }
    }, [user, isGuest, navigate]);

    const handlePincodeGo = useCallback(async () => {
        if (!/^\d{6}$/.test(pincode.trim())) {
            setPincodeError("Please enter a valid 6-digit pincode.");
            return;
        }
        setPincodeError(null);

        // Find outlet matching pincode
        const match = outlets.find(
            (o) => o.is_active && String((o as any).pincode) === pincode.trim()
        );

        if (match) {
            setPincodeOutlet(match);
            setPincodeError(null);
            // Also set location data for persistence
            // We'll use the outlet's city/state from context
        } else {
            // Show "not found" message
            setPincodeOutlet(null);
            setPincodeError("not_found");
        }
    }, [pincode, outlets]);

    // Slide transition variants — ease values typed as const to satisfy Framer Motion's Easing type
    const slideVariants: Variants = {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.25, ease: "easeIn" as const } },
    };

    // ── closest outlet for pincode not-found case (pick first active by distance estimate)
    const fallbackOutlet = outlets.find((o) => o.is_active) ?? null;

    return (
        <>
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 px-8 py-10 flex flex-col items-center text-center">
                    <AnimatePresence mode="wait">

                        {/* ─── STEP 1: DEFAULT ─── */}
                        {step === "default" && (
                            <motion.div
                                key="default"
                                variants={slideVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="flex flex-col items-center w-full"
                            >
                                <PulsingPin />
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    Where should we deliver?
                                </h2>
                                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                    We'll find the nearest Nile Ice Creams branch for you
                                </p>

                                {/* Detect Button */}
                                <button
                                    id="detect-location-btn"
                                    onClick={handleDetect}
                                    className="w-full py-4 px-6 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-green-200 hover:shadow-green-300 hover:scale-[1.02] active:scale-[0.98]"
                                    style={shimmerStyle}
                                >
                                    <span>📍</span> Detect My Location
                                </button>

                                {/* Divider */}
                                <div className="flex items-center gap-3 my-5 w-full">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-gray-400 text-xs font-medium">or</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>

                                {/* Pincode Input */}
                                <div className="flex w-full gap-2">
                                    <input
                                        id="pincode-input"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={pincode}
                                        onChange={(e) => {
                                            setPincode(e.target.value.replace(/\D/g, ""));
                                            setPincodeError(null);
                                            setPincodeOutlet(null);
                                        }}
                                        placeholder="Enter pincode manually"
                                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                                    />
                                    <button
                                        onClick={handlePincodeGo}
                                        className="bg-green-800 hover:bg-green-900 text-white text-sm font-bold px-5 rounded-xl transition-colors"
                                    >
                                        Go →
                                    </button>
                                </div>

                                {/* Pincode Results */}
                                {pincodeOutlet && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="w-full mt-3"
                                    >
                                        <BranchCard
                                            name={pincodeOutlet.name}
                                            address={pincodeOutlet.address}
                                            distanceKm={0}
                                            isServiceable={pincodeOutlet.is_active}
                                        />
                                        <button
                                            onClick={handleStartOrdering}
                                            className="w-full mt-4 py-3.5 rounded-2xl bg-green-800 hover:bg-green-900 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            Start Ordering →
                                        </button>
                                    </motion.div>
                                )}

                                {pincodeError === "not_found" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="w-full mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left"
                                    >
                                        <p className="text-amber-800 font-semibold text-sm mb-1">
                                            We don't deliver here yet 😔
                                        </p>
                                        <p className="text-amber-700 text-xs mb-3">
                                            But we're expanding soon! You can still browse the menu.
                                        </p>
                                        {fallbackOutlet && (
                                            <>
                                                <p className="text-gray-500 text-xs mb-2 font-medium">Nearest branch:</p>
                                                <BranchCard
                                                    name={fallbackOutlet.name}
                                                    address={fallbackOutlet.address}
                                                    distanceKm={fallbackOutlet.distance_km ?? 0}
                                                    isServiceable={false}
                                                />
                                            </>
                                        )}
                                        <button
                                            onClick={handleStartOrdering}
                                            className="w-full mt-4 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            Browse Menu →
                                        </button>
                                    </motion.div>
                                )}

                                {pincodeError && pincodeError !== "not_found" && (
                                    <p className="text-red-500 text-xs mt-2 font-medium">{pincodeError}</p>
                                )}
                            </motion.div>
                        )}

                        {/* ─── STEP 2: LOADING ─── */}
                        {step === "loading" && (
                            <motion.div
                                key="loading"
                                variants={slideVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="flex flex-col items-center w-full py-6"
                            >
                                <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                                    <span className="absolute inline-flex rounded-full bg-green-200 opacity-40 animate-ping w-16 h-16" />
                                    <svg
                                        className="w-10 h-10 text-green-700 animate-spin relative z-10"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                    </svg>
                                </div>

                                <h2 className="text-xl font-bold text-gray-900 mb-2">
                                    Detecting your location...
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    Please allow location access when prompted
                                </p>

                                <button
                                    disabled
                                    className="mt-8 w-full py-4 px-6 rounded-2xl bg-gray-200 text-gray-400 font-bold text-base cursor-not-allowed"
                                >
                                    Detecting...
                                </button>
                            </motion.div>
                        )}

                        {/* ─── STEP 3: SUCCESS ─── */}
                        {step === "success" && locationData && (
                            <motion.div
                                key="success"
                                variants={slideVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="flex flex-col items-center w-full"
                            >
                                <SuccessTick />

                                <h2 className="text-xl font-bold text-gray-900 mb-1">
                                    Location Found!
                                </h2>
                                <p className="text-green-700 font-semibold text-base mb-1">
                                    📍 {locationData.displayName}
                                </p>

                                {nearestOutlet && (
                                    <>
                                        <p className="text-gray-500 text-xs mb-1 mt-3 font-medium uppercase tracking-wide">
                                            Nearest Branch
                                        </p>
                                        <BranchCard
                                            name={nearestOutlet.name}
                                            address={nearestOutlet.address}
                                            distanceKm={nearestOutlet.distance_km}
                                            isServiceable={nearestOutlet.is_serviceable}
                                        />
                                    </>
                                )}

                                {isLoadingLocation && (
                                    <p className="text-gray-400 text-xs mt-3 animate-pulse">
                                        Finding nearest branch…
                                    </p>
                                )}

                                {isServiceable ? (
                                    <button
                                        id="start-ordering-btn"
                                        onClick={handleStartOrdering}
                                        onMouseEnter={() => setShimmerHover(true)}
                                        onMouseLeave={() => setShimmerHover(false)}
                                        className="mt-5 w-full py-4 px-6 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-green-200 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
                                        style={shimmerStyle}
                                    >
                                        {shimmerHover && (
                                            <span className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] animate-[shimmer_0.8s_ease-in-out_forwards]" />
                                        )}
                                        Start Ordering →
                                    </button>
                                ) : nearestOutlet ? (
                                    <div className="mt-5 w-full bg-orange-50 border border-orange-200 rounded-2xl p-4 text-left">
                                        <p className="text-orange-800 font-semibold text-sm">
                                            No outlets near your location yet 😕
                                        </p>
                                        <p className="text-orange-600 text-xs mt-1 mb-3">
                                            We currently only deliver within 7km. You can still browse the menu or pick up your order!
                                        </p>
                                        <button
                                            onClick={handleStartOrdering}
                                            className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            Browse Menu →
                                        </button>
                                    </div>
                                ) : null}

                                <button
                                    onClick={handleReset}
                                    className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                                >
                                    Change location
                                </button>
                            </motion.div>
                        )}

                        {/* ─── STEP 4: ERROR ─── */}
                        {step === "error" && (
                            <motion.div
                                key="error"
                                variants={slideVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="flex flex-col items-center w-full"
                            >
                                <div className="text-5xl mb-4 select-none">😕</div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">
                                    Couldn't detect location
                                </h2>
                                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                    That's okay — you can enter your pincode instead
                                </p>

                                {/* Pincode fallback in error state */}
                                <div className="flex w-full gap-2 mb-3">
                                    <input
                                        id="pincode-error-input"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={pincode}
                                        onChange={(e) => {
                                            setPincode(e.target.value.replace(/\D/g, ""));
                                            setPincodeError(null);
                                            setPincodeOutlet(null);
                                        }}
                                        placeholder="Enter pincode"
                                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                                    />
                                    <button
                                        onClick={handlePincodeGo}
                                        className="bg-green-800 hover:bg-green-900 text-white text-sm font-bold px-5 rounded-xl transition-colors"
                                    >
                                        Go →
                                    </button>
                                </div>

                                {pincodeOutlet && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="w-full"
                                    >
                                        <BranchCard
                                            name={pincodeOutlet.name}
                                            address={pincodeOutlet.address}
                                            distanceKm={0}
                                            isServiceable={pincodeOutlet.is_active}
                                        />
                                        <button
                                            onClick={handleStartOrdering}
                                            className="w-full mt-4 py-3.5 rounded-2xl bg-green-800 hover:bg-green-900 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            Start Ordering →
                                        </button>
                                    </motion.div>
                                )}

                                {pincodeError === "not_found" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left"
                                    >
                                        <p className="text-amber-800 font-semibold text-sm mb-1">
                                            We don't deliver here yet 😔
                                        </p>
                                        <p className="text-amber-700 text-xs mb-3">But we're expanding soon! You can still browse the menu.</p>
                                        <button
                                            onClick={handleStartOrdering}
                                            className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            Browse Menu →
                                        </button>
                                    </motion.div>
                                )}

                                {pincodeError && pincodeError !== "not_found" && (
                                    <p className="text-red-500 text-xs mt-1 font-medium">{pincodeError}</p>
                                )}

                                <button
                                    onClick={handleDetect}
                                    className="mt-5 w-full py-3 rounded-2xl border-2 border-green-700 text-green-700 hover:bg-green-50 font-bold text-sm transition-colors"
                                >
                                    Try again
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>

            {/* Auth Modal */}
            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    );
};

export default GPSLocationCard;
