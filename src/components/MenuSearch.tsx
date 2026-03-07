import React from "react";
import { Search, X, Leaf, Flame, SlidersHorizontal } from "lucide-react";

interface MenuSearchProps {
    query: string;
    onQueryChange: (q: string) => void;
    vegOnly: boolean;
    onVegToggle: () => void;
    popularOnly: boolean;
    onPopularToggle: () => void;
}

const MenuSearch: React.FC<MenuSearchProps> = ({
    query,
    onQueryChange,
    vegOnly,
    onVegToggle,
    popularOnly,
    onPopularToggle,
}) => {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Search ice creams, shakes, sundaes..."
                    className="w-full border border-gray-200 bg-gray-50 focus:bg-white focus:border-green-700 focus:ring-1 focus:ring-green-700 rounded-xl py-2.5 pl-9 pr-9 outline-none text-sm text-gray-700 placeholder-gray-400 transition-all"
                />
                {query && (
                    <button
                        onClick={() => onQueryChange("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Veg only toggle */}
            <button
                onClick={onVegToggle}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${vegOnly
                        ? "bg-green-700 border-green-700 text-white shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700"
                    }`}
            >
                <Leaf className="w-3.5 h-3.5" />
                Veg Only
            </button>

            {/* Popular toggle */}
            <button
                onClick={onPopularToggle}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${popularOnly
                        ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-600"
                    }`}
            >
                <Flame className="w-3.5 h-3.5" />
                Popular
            </button>
        </div>
    );
};

export default MenuSearch;
