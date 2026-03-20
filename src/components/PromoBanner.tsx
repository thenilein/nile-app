import React, { useRef, useEffect, useState } from "react";

interface Promo {
    id: string;
    headline: string;
    sub: string;
    flavorA: string;
    flavorB: string;
}

const PROMOS: Promo[] = [
    {
        id: "bogo",
        headline: "Blissfully balanced blends",
        sub: "Rich mocha favourites crafted for cozy evenings.",
        flavorA: "Mocha Praline",
        flavorB: "Nutty Mocha Praline",
    },
    {
        id: "mango",
        headline: "Seasonal specials are here",
        sub: "Small-batch flavours inspired by summer cravings.",
        flavorA: "Mango Velvet",
        flavorB: "Berry Bloom",
    },
    {
        id: "choco",
        headline: "Perfect pairings for every mood",
        sub: "Signature drinks and desserts, made to share.",
        flavorA: "Hazelnut Cocoa",
        flavorB: "Salted Caramel",
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
        <div className="relative overflow-hidden rounded-[24px] border border-[#E8DCCB] bg-[linear-gradient(180deg,#F5E9D8_0%,#F2E5D5_58%,#EEDFCD_100%)] px-5 py-6 text-[#6B4F3B] shadow-[0_18px_40px_rgba(146,113,74,0.12)] transition-all duration-500 md:h-[248px] md:px-10 md:py-8">
            <div className="mx-auto max-w-[340px] text-center md:max-w-none">
                <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-[#9A7B61] md:text-[13px]">
                    {p.headline}
                </p>
                <p className="mt-2 text-[12px] text-[#8B6B52] md:text-[14px]">
                    {p.sub}
                </p>
            </div>

            <div className="mt-4 flex items-end justify-center gap-4 md:mt-7 md:gap-10">
                {[
                    { name: p.flavorA, tone: "from-[#D9B18D] to-[#B37B56]", size: "h-[110px] w-[76px] md:h-[146px] md:w-[106px]" },
                    { name: p.flavorB, tone: "from-[#9C5636] to-[#6F341E]", size: "h-[128px] w-[82px] md:h-[168px] md:w-[112px]" },
                ].map((drink) => (
                    <div key={drink.name} className="flex flex-col items-center">
                        <div className={`relative ${drink.size} rounded-[999px_999px_22px_22px] bg-gradient-to-b ${drink.tone} shadow-[0_18px_24px_rgba(90,58,33,0.18)]`}>
                            <div className="absolute inset-x-[18%] top-[-12px] h-6 rounded-full bg-white shadow-sm md:top-[-14px] md:h-7" />
                            <div className="absolute inset-x-[28%] top-[-4px] h-5 rounded-full bg-[#FFF7ED] md:h-6" />
                        </div>
                        <p className="mt-2 text-center text-[10px] font-medium text-[#7C5B43] md:text-[12px]">
                            {drink.name}
                        </p>
                    </div>
                ))}
            </div>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-4">
                {PROMOS.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActive(i)}
                        aria-label={`Show promo ${i + 1}`}
                        className={`rounded-full transition-all ${i === active ? "h-1.5 w-5 bg-[#8B6B52]" : "h-1.5 w-2 bg-[#C7AE97]"}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default PromoBanner;
