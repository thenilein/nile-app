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
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
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
                    className="w-full border-0 bg-gray-100 hover:bg-gray-200 focus:bg-white focus:ring-1 focus:ring-green-700 rounded-full py-2.5 md:py-[10px] pl-10 pr-9 outline-none text-[15px] text-gray-700 placeholder-gray-400 transition-all md:border md:border-gray-200 md:bg-gray-50 md:rounded-xl"
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
                className={`flex flex-1 md:flex-none justify-center items-center gap-1.5 px-3 py-2.5 rounded-full md:rounded-xl border border-transparent md:border-gray-200 text-[13px] md:text-sm font-bold md:font-medium transition-all ${vegOnly
                        ? "bg-green-700 text-white shadow-[0_2px_8px_rgba(21,128,61,0.35)] md:shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 md:bg-white md:hover:border-green-400 md:hover:text-green-700"
                    }`}
            >
                <Leaf className="w-4 h-4 md:w-3.5 md:h-3.5" />
                Veg Only
            </button>

            {/* Popular toggle */}
            <button
                onClick={onPopularToggle}
                className={`flex flex-1 md:flex-none justify-center items-center gap-1.5 px-3 py-2.5 rounded-full md:rounded-xl border border-transparent md:border-gray-200 text-[13px] md:text-sm font-bold md:font-medium transition-all ${popularOnly
                        ? "bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.35)] md:shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 md:bg-white md:hover:border-amber-400 md:hover:text-amber-600"
                    }`}
            >
                <Flame className="w-4 h-4 md:w-3.5 md:h-3.5" />
                Popular
            </button>
        </div>
    );
};

export default MenuSearch;
