import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LandingHeroCarousel from "../components/LandingHeroCarousel.tsx";

const HeroSection = () => {
    const navigate = useNavigate();

    const handleOrderNow = useCallback(() => {
        navigate("/menu");
    }, [navigate]);

    return (
        <section className="relative flex min-h-dvh flex-col bg-[#fbfbfd]">
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(0, 0, 0, 0.04) 0%, transparent 55%), radial-gradient(ellipse 90% 50% at 50% 100%, rgba(0, 0, 0, 0.03) 0%, transparent 60%)",
                }}
                aria-hidden
            />

            <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
                <div className="w-full min-h-0 flex-1 pt-[max(1.25rem,env(safe-area-inset-top)+12px)]">
                    <LandingHeroCarousel />
                </div>

                <div className="shrink-0 px-6 text-center">
                    <p className="text-[15px] font-normal tracking-wide text-neutral-500">Welcome to</p>
                    <h1 className="mt-1.5 text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-neutral-950 sm:text-[40px]">
                        Nile Ice Creams
                    </h1>
                    <p className="mx-auto mt-4 max-w-[20.5rem] text-[15px] font-normal leading-[1.45] text-neutral-600 sm:max-w-sm sm:text-[17px] sm:leading-relaxed">
                        Create beautiful moments for every craving. Order scoops and sundaes delivered fresh to you.
                    </p>
                </div>

                <div className="shrink-0 px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-10">
                    <button
                        type="button"
                        onClick={handleOrderNow}
                        className="mx-auto block w-full max-w-[22rem] rounded-full bg-neutral-950 py-3.5 text-[17px] font-semibold text-white transition-transform active:scale-[0.98] sm:py-4"
                    >
                        Order Now
                    </button>
                </div>
            </div>
        </section>
    );
};

export const Landing = () => {
    return (
        <main className="min-h-dvh bg-[#fbfbfd] text-neutral-950 antialiased">
            <HeroSection />
        </main>
    );
};

export default Landing;
