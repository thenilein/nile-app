import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GPSLocationCard from "../components/GPSLocationCard.tsx";
import { useLocation } from "../context/LocationContext.tsx";
import { useAuth } from "../context/AuthContext.tsx";

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
    const { locationData, isServiceable } = useLocation();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Auto-redirect when a serviceable location is set (login no longer required to browse)
    useEffect(() => {
        if (locationData && isServiceable) {
            navigate("/menu");
        }
    }, [locationData, isServiceable, navigate]);

    return (
        <section className="flex flex-col items-center pt-16 pb-16 px-4">
            <div className="flex gap-8 mb-12 relative">
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

            <div className="text-center max-w-2xl mx-auto w-full mb-10">
                <p className="text-gray-400 font-medium text-lg mb-3">Let's get ordering</p>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 tracking-tight">
                    Set your delivery location to get started.
                </h1>
            </div>

            {/* ── GPS LOCATION CARD ── */}
            <GPSLocationCard />
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
