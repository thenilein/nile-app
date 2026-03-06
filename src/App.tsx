import React, { useState } from "react";

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

const TargetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-800">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
    </svg>
);

const Navbar = () => {
    return (
        <nav className="flex items-center px-10 py-5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    N
                </div>
                <div className="text-xl font-bold text-gray-900 tracking-tight">
                    nile ice creams
                </div>
            </div>
        </nav>
    );
};

const HeaderSection = () => {
    const [activeTab, setActiveTab] = useState("Delivery");

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

                <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-3xl mx-auto">
                    <button className="flex items-center justify-center bg-green-800 hover:bg-green-900 text-white font-medium py-3 px-6 rounded-md w-full md:w-auto transition-colors whitespace-nowrap shadow-sm">
                        <TargetIcon />
                        Use my current location
                    </button>

                    <span className="text-gray-400 font-medium whitespace-nowrap text-sm">OR</span>

                    <div className="relative w-full md:flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            className="w-full border border-gray-300 focus:border-green-800 focus:ring-1 focus:ring-green-800 rounded-md py-3 pl-12 pr-4 outline-none text-gray-700 transition-all font-medium placeholder-gray-400 shadow-sm"
                            placeholder="Search street, locality..."
                        />
                    </div>
                </div>
            </div>
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
                    <p className="text-gray-400 text-sm leading-relaxed max-w-[200px]">Tell us where you want to get your items delivered</p>
                </div>

                <div className="flex flex-col items-center flex-1 px-4">
                    <ShoppingBagIcon />
                    <h3 className="text-[17px] font-semibold text-gray-800 mb-2">Choose your items</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-[200px]">Add the items you want in your cart</p>
                </div>

                <div className="flex flex-col items-center flex-1 px-4">
                    <TruckIcon />
                    <h3 className="text-[17px] font-semibold text-gray-800 mb-2">Have it delivered instantly</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-[200px]">Our delivery partners will deliver your order at your doorstep</p>
                </div>
            </div>
        </section>
    );
};

const App = () => {
    return (
        <div className="min-h-screen bg-white font-sans flex flex-col items-stretch">
            <Navbar />
            <main className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col justify-center">
                    <HeaderSection />
                </div>
                <FeaturesSection />
            </main>
        </div>
    );
};

export default App;