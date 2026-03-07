import React, { useState } from "react";
import { Loader2, MapPin, ArrowRight, Edit2 } from "lucide-react";
import { useLocation } from "../context/LocationContext.tsx";
import LocationSearch from "../components/LocationSearch.tsx";
import AuthModal from "../components/AuthModal.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

const MapPinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

const ShoppingBagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
        <path d="M3 6h18"></path>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
);

const TruckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4">
        <rect width="15" height="10" x="1" y="8" rx="3"></rect>
        <path d="M16 8h4a2 2 0 0 1 2 2v4h-6"></path>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
);

const HeaderSection = () => {
    const [activeTab, setActiveTab] = useState("Delivery");
    const [authModalOpen, setAuthModalOpen] = useState(false);

    const { locationData, locationError, isLoadingLocation, getCurrentLocation, clearLocation } = useLocation();
    const { user, isGuest } = useAuth();
    const navigate = useNavigate();

    const locationSelected = !!locationData && !isLoadingLocation;

    const handleStartOrdering = () => {
        // Already authenticated or guest — go straight to menu
        if (user || isGuest) {
            navigate("/menu");
        } else {
            setAuthModalOpen(true);
        }
    };

    return (
        <section className="flex flex-col items-center pt-16 pb-12 px-4">
            <div className="flex gap-8 mb-16 relative">
                {["Delivery", "Pickup"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-base font-semibold pb-2 border-b-2 transition-colors duration-200 ${activeTab === tab
                            ? "border-green-800 text-green-800"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="text-center max-w-2xl mx-auto w-full">
                <p className="text-gray-400 font-medium text-lg mb-4">Let's get ordering</p>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-12 tracking-tight">
                    Set your delivery location to get started.
                </h1>

                {/* ── STATE A: No location selected ── */}
                {!locationSelected && (
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-3xl mx-auto">
                        {/* GPS Button */}
                        <button
                            type="button"
                            id="use-current-location-btn"
                            onClick={getCurrentLocation}
                            disabled={isLoadingLocation}
                            className="flex items-center justify-center bg-green-800 hover:bg-green-900 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-md w-full md:w-auto transition-colors whitespace-nowrap shadow-sm"
                        >
                            {isLoadingLocation ? (
                                <>
                                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                                    Getting location...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                        <circle cx="12" cy="12" r="10" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    Use my current location
                                </>
                            )}
                        </button>

                        <span className="text-gray-400 font-medium whitespace-nowrap text-sm">OR</span>

                        {/* Search Component */}
                        <LocationSearch />
                    </div>
                )}

                {/* ── STATE B: Location selected ── */}
                {locationSelected && (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Location display */}
                        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-5 py-3">
                            <MapPin className="w-4 h-4 text-green-700 flex-shrink-0" />
                            <span className="text-green-900 font-semibold text-sm">
                                {locationData!.displayName}
                            </span>
                            <button
                                type="button"
                                onClick={clearLocation}
                                title="Change location"
                                className="ml-2 text-gray-400 hover:text-green-700 transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Start Ordering button */}
                        <button
                            id="start-ordering-btn"
                            onClick={handleStartOrdering}
                            className="flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white font-semibold py-3 px-8 rounded-full shadow-md transition-all hover:shadow-lg hover:-translate-y-px"
                        >
                            Start ordering
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Error message (shown only when no location and no loading) */}
                {locationError && !isLoadingLocation && !locationSelected && (
                    <p className="mt-4 text-sm text-red-600 font-medium">{locationError}</p>
                )}
            </div>

            {/* Auth Modal */}
            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </section>
    );
};

const FeaturesSection = () => {
    return (
        <section className="border-t border-gray-100 py-20 px-4 flex justify-center w-full">
            <div className="w-full max-w-[1000px] flex justify-between text-center">
                <div className="flex flex-col items-center flex-1 px-4">
                    <MapPinIcon />
                    <h3 className="text-[17px] font-semibold text-gray-800 mb-2">Set your location</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-[200px]">
                        Tell us where you want to get your items delivered
                    </p>
                </div>

                <div className="flex flex-col items-center flex-1 px-4">
                    <ShoppingBagIcon />
                    <h3 className="text-[17px] font-semibold text-gray-800 mb-2">Choose your items</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-[200px]">
                        Add the items you want in your cart
                    </p>
                </div>

                <div className="flex flex-col items-center flex-1 px-4">
                    <TruckIcon />
                    <h3 className="text-[17px] font-semibold text-gray-800 mb-2">Have it delivered instantly</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-[200px]">
                        Our delivery partners will deliver your order at your doorstep
                    </p>
                </div>
            </div>
        </section>
    );
};

export const Landing = () => {
    return (
        <main className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col justify-center">
                <HeaderSection />
            </div>
            <FeaturesSection />
        </main>
    );
};

export default Landing;
