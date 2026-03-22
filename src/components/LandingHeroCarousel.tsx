import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";
import { Check, Crown } from "lucide-react";

export type HeroBanner = {
    id: string;
    title: string;
    meta: string;
    badge: { label: string; variant: "hosting" | "going" };
    image: string;
};

const BANNERS: HeroBanner[] = [
    {
        id: "1",
        title: "Mango festival",
        meta: "Saturday · 4:00 PM · Indiranagar",
        badge: { label: "Hosting", variant: "hosting" },
        image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=900&q=85",
    },
    {
        id: "2",
        title: "Midnight scoops",
        meta: "Friday · 9:00 PM · Koramangala",
        badge: { label: "Going", variant: "going" },
        image: "https://images.unsplash.com/photo-1497534444932-c925b458314e?w=900&q=85",
    },
    {
        id: "3",
        title: "Family sundae night",
        meta: "Sunday · 6:00 PM · Jayanagar",
        badge: { label: "Going", variant: "going" },
        image: "https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=900&q=85",
    },
    {
        id: "4",
        title: "Gelato tasting",
        meta: "Wednesday · 5:00 PM · Whitefield",
        badge: { label: "Hosting", variant: "hosting" },
        image: "https://images.unsplash.com/photo-1580915411954-282cb1c0d780?w=900&q=85",
    },
    {
        id: "5",
        title: "Birthday party pack",
        meta: "Next weekend · All day · HSR",
        badge: { label: "Going", variant: "going" },
        image: "https://images.unsplash.com/photo-1557142046-c704a93d8f8f?w=900&q=85",
    },
];

const AVATAR_URLS = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&q=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&q=80&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&q=80&fit=crop&crop=face",
];

/**
 * Apple Invites–style tile: ~52–53% of iPhone 12 width (390 CSS px) and ~39% of height (~844),
 * portrait ~204×330 — peek of neighbors on left/right with centered hero card.
 */
const CARD_REF_W = 204;
const CARD_REF_H = 330;
/** Large corner radius like the reference (~28–30px at ~205px wide) */
const CARD_RADIUS_RATIO = 30 / CARD_REF_W;
const CARD_GAP = 18;
const SCROLL_PX_PER_SEC = 32;

/** Below this width: card width is only `vw * MOBILE_WIDTH_FRAC` (no min/max). */
const LARGE_LAYOUT_MIN_VW = 1024;
const MOBILE_WIDTH_FRAC = 0.525;
/** Only used when vw >= LARGE_LAYOUT_MIN_VW */
const DESKTOP_CARD_MIN_W = 268;
const DESKTOP_CARD_MAX_W = 340;
const DESKTOP_WIDTH_FRAC = 0.34;

function cardWidthForViewport(vw: number): number {
    if (vw < LARGE_LAYOUT_MIN_VW) {
        return Math.round(vw * MOBILE_WIDTH_FRAC);
    }
    const raw = Math.round(vw * DESKTOP_WIDTH_FRAC);
    return Math.min(DESKTOP_CARD_MAX_W, Math.max(DESKTOP_CARD_MIN_W, raw));
}

function useCardSize() {
    const initialVw = 390;
    const initialW = cardWidthForViewport(initialVw);
    const [size, setSize] = useState({
        w: initialW,
        h: Math.round(initialW * (CARD_REF_H / CARD_REF_W)),
        peekPad: Math.round((initialVw - initialW) / 2),
    });

    useEffect(() => {
        const q = () => {
            const vw = typeof window !== "undefined" ? window.innerWidth : 390;
            const w = cardWidthForViewport(vw);
            const h = Math.round(w * (CARD_REF_H / CARD_REF_W));
            const peekPad = Math.round((vw - w) / 2);
            setSize({ w, h, peekPad });
        };
        q();
        window.addEventListener("resize", q);
        return () => window.removeEventListener("resize", q);
    }, []);

    return size;
}

const appleCardRing: React.CSSProperties = {
    boxShadow: `
    0 0 0 0.5px rgba(255, 255, 255, 0.14) inset,
    0 0 0 0.5px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 24px 56px -12px rgba(0, 0, 0, 0.22)
  `.replace(/\s+/g, " "),
};

export const LandingHeroCarousel: React.FC = () => {
    const reduceMotion = useReducedMotion();
    const { w: CARD_W, h: CARD_H, peekPad } = useCardSize();
    const r = Math.max(26, Math.round(CARD_W * CARD_RADIUS_RATIO));
    const scrollDistance = (CARD_W + CARD_GAP) * BANNERS.length;
    const flowingBanners = [...BANNERS, ...BANNERS];
    const x = useMotionValue(0);
    const lastFrameRef = useRef<number | null>(null);
    const frameRef = useRef<number | null>(null);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        const wrapOffset = (value: number) => {
            if (scrollDistance <= 0) return 0;

            let next = value % scrollDistance;
            if (next > 0) next -= scrollDistance;
            return next;
        };

        x.set(wrapOffset(x.get()));

        if (reduceMotion) return;

        const step = (time: number) => {
            if (lastFrameRef.current == null) {
                lastFrameRef.current = time;
            }

            const elapsed = time - lastFrameRef.current;
            lastFrameRef.current = time;

            if (!isDraggingRef.current) {
                const delta = (SCROLL_PX_PER_SEC * elapsed) / 1000;
                x.set(wrapOffset(x.get() - delta));
            }

            frameRef.current = window.requestAnimationFrame(step);
        };

        frameRef.current = window.requestAnimationFrame(step);

        return () => {
            if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            lastFrameRef.current = null;
        };
    }, [reduceMotion, scrollDistance, x]);

    return (
        <div className="relative w-full min-w-0 overflow-x-clip pt-6 sm:pt-10">
            <motion.div
                className="flex w-max cursor-grab touch-pan-y select-none active:cursor-grabbing"
                style={{
                    x,
                    gap: CARD_GAP,
                    marginLeft: peekPad,
                    paddingRight: peekPad,
                    height: CARD_H + 28,
                }}
                drag="x"
                dragConstraints={false}
                dragMomentum={false}
                onDragStart={() => {
                    isDraggingRef.current = true;
                }}
                onDrag={() => {
                    let wrapped = x.get() % scrollDistance;
                    if (wrapped > 0) wrapped -= scrollDistance;
                    x.set(wrapped);
                }}
                onDragEnd={() => {
                    isDraggingRef.current = false;
                    lastFrameRef.current = null;
                }}
            >
                {flowingBanners.map((item, index) => (
                    <article
                        key={`${item.id}-${index}`}
                        className="relative shrink-0 overflow-hidden bg-black"
                        style={{
                            width: CARD_W,
                            height: CARD_H,
                            borderRadius: r,
                            ...appleCardRing,
                        }}
                    >
                        <img
                            src={item.image}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            draggable={false}
                        />

                        <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 via-black/22 to-transparent"
                            style={{
                                height: "52%",
                                borderRadius: `0 0 ${r}px ${r}px`,
                            }}
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-white/12 bg-[rgba(28,28,30,0.22)] backdrop-blur-[40px] backdrop-saturate-150"
                            style={{
                                height: "42%",
                                borderRadius: `0 0 ${r}px ${r}px`,
                                maskImage: "linear-gradient(to top, black 52%, transparent)",
                                WebkitMaskImage: "linear-gradient(to top, black 52%, transparent)",
                            }}
                            aria-hidden
                        />

                        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-white/14 bg-black/32 px-2.5 py-[5px] backdrop-blur-xl backdrop-saturate-150">
                            {item.badge.variant === "hosting" ? (
                                <Crown
                                    className="h-[12px] w-[12px] shrink-0 text-[#FFD60A]"
                                    strokeWidth={2}
                                    aria-hidden
                                />
                            ) : (
                                <Check
                                    className="h-[12px] w-[12px] shrink-0 text-[#30D158]"
                                    strokeWidth={2.5}
                                    aria-hidden
                                />
                            )}
                            <span className="text-[12px] font-semibold leading-none tracking-[-0.01em] text-white/95">
                                {item.badge.label}
                            </span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 px-4 pb-[18px] pt-12 text-center">
                            <div className="mb-2 flex justify-center -space-x-2">
                                {AVATAR_URLS.map((src, j) => (
                                    <img
                                        key={j}
                                        src={src}
                                        alt=""
                                        className="h-[26px] w-[26px] rounded-full object-cover ring-[2px] ring-black/45"
                                        draggable={false}
                                    />
                                ))}
                            </div>
                            <h2 className="text-[21px] font-semibold leading-[1.12] tracking-[-0.022em] text-white">
                                {item.title}
                            </h2>
                            <p className="mt-1 text-[14px] font-normal leading-snug tracking-[-0.01em] text-white/55">
                                {item.meta}
                            </p>
                        </div>
                    </article>
                ))}
            </motion.div>
        </div>
    );
};

export default LandingHeroCarousel;
