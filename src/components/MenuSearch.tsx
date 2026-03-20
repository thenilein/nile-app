import React from "react";
import { Search, X } from "lucide-react";

interface MenuSearchProps {
    query: string;
    onQueryChange: (q: string) => void;
    vegOnly: boolean;
    onVegToggle: () => void;
    className?: string;
}

const MenuSearch: React.FC<MenuSearchProps> = ({
    query,
    onQueryChange,
    vegOnly,
    onVegToggle,
    className = "",
}) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="relative flex-1 min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Search for items..."
                    className="w-full h-11 rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-9 text-[14px] text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-[#15803d] focus:ring-2 focus:ring-[#DCFCE7]"
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

            <button
                type="button"
                onClick={onVegToggle}
                aria-pressed={vegOnly}
                className={`flex h-11 flex-shrink-0 items-center gap-3 rounded-xl border px-4 text-[14px] font-medium transition-colors ${
                    vegOnly
                        ? "border-[#166534] bg-[#F0FDF4] text-[#166534]"
                        : "border-[#E5E7EB] bg-white text-gray-700"
                }`}
            >
                <span className="whitespace-nowrap">Veg only</span>
                <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                        vegOnly ? "bg-[#166534]" : "bg-gray-300"
                    }`}
                >
                    <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            vegOnly ? "translate-x-[18px]" : "translate-x-0.5"
                        }`}
                    />
                </span>
            </button>
        </div>
    );
};

export default MenuSearch;
