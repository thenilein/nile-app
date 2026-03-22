import type { Variants } from "framer-motion";

export const sheetEaseSmooth = [0.22, 1, 0.36, 1] as const;

/** Height / width changes when sheet content switches (auth ↔ location, cart ↔ checkout). */
export const sheetLayoutTransition = {
    layout: { duration: 0.38, ease: sheetEaseSmooth },
};

export const sheetHorizontalSlideVariants: Variants = {
    enter: (dir: number) => ({
        x: dir > 0 ? "100%" : "-100%",
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.38, ease: sheetEaseSmooth },
    },
    exit: (dir: number) => ({
        x: dir > 0 ? "-100%" : "100%",
        opacity: 0,
        transition: { duration: 0.3, ease: sheetEaseSmooth },
    }),
};

export const sheetTitleSlideVariants: Variants = {
    initial: (dir: number) => ({
        opacity: 0,
        y: dir > 0 ? 10 : -8,
    }),
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.32, ease: sheetEaseSmooth },
    },
    exit: (dir: number) => ({
        opacity: 0,
        y: dir > 0 ? -8 : 8,
        transition: { duration: 0.22, ease: sheetEaseSmooth },
    }),
};
