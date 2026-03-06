import React from "react";
import { ChevronDown, MapPin } from "lucide-react";

export const MenuMain = () => {
    return (
        <main className="flex-1 min-w-0 py-8 px-4 lg:px-10">
            {/* Top Bar - Pickup/Location */}
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-100 p-2 mb-8 max-w-xl mx-auto">
                <div className="flex items-center bg-gray-50 rounded-md p-1 w-full">
                    <button className="flex-1 py-1.5 px-4 rounded bg-white shadow-sm text-sm font-semibold text-gray-900">
                        Pickup
                    </button>
                    <button className="flex-1 py-1.5 px-4 text-sm font-medium text-gray-500 hover:text-gray-900">
                        Delivery
                    </button>
                </div>

                <div className="flex items-center gap-2 pl-6 pr-4 border-l border-gray-100 ml-4 cursor-pointer hover:bg-gray-50 rounded p-1.5 transition-colors">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Delhi, India</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
            </div>

            {/* Promo Banner */}
            <div className="w-full h-[250px] md:h-[300px] bg-gradient-to-r from-[#e6dccb] to-[#c9bfae] rounded-2xl mb-12 flex items-center justify-center relative overflow-hidden shadow-sm">
                <div className="absolute inset-0 bg-black/5" />
                <h2 className="text-3xl md:text-5xl font-extrabold text-[#5c4a3d] z-10 text-center tracking-tight leading-tight">
                    BLISSFULLY<br />
                    BALANCED BLENDS
                </h2>
                {/* Placeholder for actual ice cream images to be absolute positioned later */}
            </div>

            {/* Items Feed */}
            <section>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-8 tracking-tight">Top Items</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Item Card Placeholder 1 */}
                    <div className="flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] transition-all group cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-4 h-4 border border-green-600 rounded-sm flex items-center justify-center p-[2px]">
                                <div className="w-full h-full bg-green-600 rounded-full" />
                            </div>
                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                {/* Image Placeholder */}
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-green-800 transition-colors">Salted Caramel Frappuccino</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">A beautiful balance of sweet and salty caramel woven perfectly into blended ice and milk.</p>
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                            <span className="text-lg font-bold text-gray-900">₹350</span>
                            <button className="px-4 py-1.5 text-sm font-semibold text-green-800 bg-green-50 hover:bg-green-100 rounded-full transition-colors border border-green-200">
                                Add +
                            </button>
                        </div>
                    </div>

                    {/* Item Card Placeholder 2 */}
                    <div className="flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] transition-all group cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-4 h-4 border border-red-600 rounded-sm flex items-center justify-center p-[2px]">
                                <div className="w-full h-full bg-red-600 rounded-full" />
                            </div>
                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                {/* Image Placeholder */}
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-green-800 transition-colors">Mocha Praline Blended</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">Rich mocha sauce, roasted praline syrup blended with ice, topped with whipped cream.</p>
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                            <span className="text-lg font-bold text-gray-900">₹400</span>
                            <button className="px-4 py-1.5 text-sm font-semibold text-green-800 bg-green-50 hover:bg-green-100 rounded-full transition-colors border border-green-200">
                                Add +
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};
