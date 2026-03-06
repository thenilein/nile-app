import React from "react";
import { ShoppingBag } from "lucide-react";

export const EmptyCart = () => {
    return (
        <aside className="hidden xl:flex w-[350px] shrink-0 py-8 flex-col items-center">
            <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-24 h-24 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 tracking-tight text-center">Your Cart Is Empty</h3>
            </div>
        </aside>
    );
};
