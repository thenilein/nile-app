import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useLocation } from "../context/LocationContext.tsx";
import { isMapboxGeocodingConfigured, mapboxForwardGeocode } from "../lib/mapboxGeocoding.ts";

interface Suggestion {
    displayName: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
}

function highlightMatch(text: string, query: string) {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, idx)}
            <mark className="bg-green-100 text-green-900 rounded font-semibold">
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </span>
    );
}

async function fetchSuggestions(query: string): Promise<Suggestion[]> {
    if (query.trim().length < 2) return [];
    if (!isMapboxGeocodingConfigured()) return [];
    const rows = await mapboxForwardGeocode(query, 8);
    return rows.map((r) => ({
        displayName: r.displayName,
        city: r.city,
        state: r.state,
        latitude: r.latitude,
        longitude: r.longitude,
    }));
}

export const LocationSearch: React.FC = () => {
    const { setLocationData, clearLocation } = useLocation();

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [selectedDisplay, setSelectedDisplay] = useState("");

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const doSearch = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }
        setIsSearching(true);
        const results = await fetchSuggestions(q);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setIsSearching(false);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setSelectedDisplay("");
        setActiveIndex(-1);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 350);
    };

    const handleSelect = (s: Suggestion) => {
        setQuery(s.displayName);
        setSelectedDisplay(s.displayName);
        setSuggestions([]);
        setIsOpen(false);
        setActiveIndex(-1);
        setLocationData({
            latitude: s.latitude,
            longitude: s.longitude,
            city: s.city,
            state: s.state,
            displayName: s.displayName,
        });
    };

    const handleClear = () => {
        setQuery("");
        setSelectedDisplay("");
        setSuggestions([]);
        setIsOpen(false);
        clearLocation();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[activeIndex]);
        } else if (e.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const mapboxReady = isMapboxGeocodingConfigured();

    return (
        <div ref={wrapperRef} className="relative w-full md:flex-1">
            {!mapboxReady && (
                <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                    Add <code className="rounded bg-amber-100 px-1">VITE_MAPBOX_ACCESS_TOKEN</code> to enable
                    Mapbox Search Box.
                </p>
            )}
            {/* Input */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {isSearching ? (
                        <Loader2 className="w-5 h-5 text-green-700 animate-spin" />
                    ) : (
                        <Search className="w-5 h-5 text-green-800" />
                    )}
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                    disabled={!mapboxReady}
                    className="w-full rounded-md border border-gray-300 py-3 pl-12 pr-10 font-medium text-gray-700 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-green-800 focus:ring-1 focus:ring-green-800 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder="Search city, locality in Tamil Nadu..."
                    autoComplete="off"
                    aria-label="Search location"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Clear location"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <ul
                    role="listbox"
                    className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden text-sm"
                >
                    {suggestions.map((s, i) => (
                        <li
                            key={s.displayName}
                            role="option"
                            aria-selected={i === activeIndex}
                            onMouseDown={() => handleSelect(s)}
                            onMouseEnter={() => setActiveIndex(i)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${i === activeIndex
                                    ? "bg-green-50 text-green-900"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            <span className="text-green-700 flex-shrink-0">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </span>
                            <span className="truncate">
                                {highlightMatch(s.displayName, query)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationSearch;
