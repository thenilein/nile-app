import React, { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Promo {
    id: string;
    label: string;
    headline: string;
    sub: string;
    bg: string;
    accent: string;
    emoji: string;
}

const PROMOS: Promo[] = [
    {
        id: "bogo",
        label: "Limited Offer",
        headline: "Buy 1 Get 1 Free",
        sub: "On all Sundaes this weekend. Use code NILEFUN.",
        bg: "from-violet-600 to-purple-800",
        accent: "bg-violet-500",
        emoji: "🍧",
    },
    {
        id: "mango",
        label: "Summer Special",
        headline: "Mango Alphonso Season",
        sub: "Fresh Alphonso mango ice cream — now available. Limited batch.",
        bg: "from-amber-500 to-orange-600",
        accent: "bg-amber-400",
        emoji: "🥭",
    },
    {
        id: "choco",
        label: "Festival",
        headline: "Chocolate Festival 🍫",
        sub: "30% off on all chocolate flavours. Valid this week only.",
        bg: "from-amber-800 to-yellow-900",
        accent: "bg-amber-700",
        emoji: "🍫",
    },
    {
        id: "family",
        label: "Family Pack",
        headline: "Family Packs Starting ₹499",
        sub: "Serve everyone! 8–12 scoop family packs now available.",
        bg: "from-green-700 to-emerald-800",
        accent: "bg-green-600",
        emoji: "👨‍👩‍👧‍👦",
    },
];

const PromoBanner: React.FC = () => {
    const [active, setActive] = useState(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const go = (idx: number) => setActive((idx + PROMOS.length) % PROMOS.length);

    useEffect(() => {
        timerRef.current = setTimeout(() => go(active + 1), 4000);
        return () => clearTimeout(timerRef.current);
    }, [active]);

    const p = PROMOS[active];

    return (
        <div className={`relative rounded-[16px] md:rounded-2xl bg-gradient-to-r ${p.bg} text-white overflow-hidden h-[120px] md:h-36 flex items-center px-4 md:px-6 transition-all duration-500`}>
            {/* Background emoji */}
            <span className="absolute right-6 bottom-0 text-8xl opacity-20 select-none pointer-events-none leading-none">
                {p.emoji}
            </span>

            {/* Content */}
            <div className="flex-1 z-10">
                <span className={`inline-block ${p.accent} text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 md:mb-1.5`}>
                    {p.label}
                </span>
                <h2 className="text-base md:text-xl font-extrabold leading-tight mb-0.5">{p.headline}</h2>
                <p className="text-[12px] md:text-sm text-white/80 max-w-[160px] sm:max-w-[240px] md:max-w-xs leading-snug">{p.sub}</p>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-2 z-10 ml-4">
                <button
                    onClick={() => go(active - 1)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => go(active + 1)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {PROMOS.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`rounded-full transition-all ${i === active ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default PromoBanner;
