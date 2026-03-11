import React, { memo } from "react";
import { motion } from "framer-motion";

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface MenuSidebarProps {
    categories: Category[];
    activeCategoryId: string | null;
    onSelect: (id: string) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
    "ice cream": "🍨",
    "scoops": "🍨",
    "cups": "🍦",
    "cones": "🍦",
    "sundaes": "🍧",
    "milkshakes": "🥤",
    "shakes": "🥤",
    "falooda": "🍹",
    "cakes": "🎂",
    "family": "👨‍👩‍👧",
    "seasonal": "🌟",
    "specials": "✨",
    "waffle": "🧇",
    "crepe": "🥞",
};

function getCategoryEmoji(name: string): string {
    const lower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
        if (lower.includes(key)) return emoji;
    }
    return "🍦";
}

const MenuSidebar: React.FC<MenuSidebarProps> = memo(({ categories, activeCategoryId, onSelect }) => {
    return (
        <aside className="w-52 flex-shrink-0 hidden lg:flex flex-col">
            {/* sticky: stays visible while the center pane scrolls */}
            <div className="sticky top-[80px]">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">Menu</p>
                <nav className="flex flex-col gap-0.5">
                    {categories.map((cat) => {
                        const isActive = activeCategoryId === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onPointerDown={(e) => { e.preventDefault(); onSelect(cat.id); }}
                                className={`
                                    relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left
                                    text-sm font-medium w-full cursor-pointer overflow-hidden
                                    transition-colors duration-200 active:scale-[0.98]
                                    ${isActive
                                        ? "text-white"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }
                                `}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeCategorySidebar"
                                        className="absolute inset-0 bg-green-800 rounded-xl"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                    />
                                )}
                                <span className="relative z-10 text-base flex-shrink-0">{getCategoryEmoji(cat.name)}</span>
                                <span className="relative z-10 line-clamp-1">{cat.name}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
});

export default MenuSidebar;
