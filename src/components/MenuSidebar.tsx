import React from "react";

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

const MenuSidebar: React.FC<MenuSidebarProps> = ({ categories, activeCategoryId, onSelect }) => {
    return (
        <aside className="w-52 flex-shrink-0 hidden lg:flex flex-col">
            <div className="sticky top-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">Menu</p>
                <nav className="flex flex-col gap-0.5">
                    {categories.map((cat) => {
                        const isActive = activeCategoryId === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => onSelect(cat.id)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-sm font-medium group ${isActive
                                        ? "bg-green-800 text-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                            >
                                <span className="text-base flex-shrink-0">{getCategoryEmoji(cat.name)}</span>
                                <span className="line-clamp-1">{cat.name}</span>
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
};

export default MenuSidebar;
