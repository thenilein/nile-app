import React, { memo } from "react";

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface MenuGroup {
    id: string;
    name?: string;
    categories: Category[];
}

interface MenuSidebarProps {
    menuGroups: MenuGroup[];
    activeMenuId: string | null;
    activeCategoryId: string | null;
    onMenuSelect: (id: string) => void;
    onSelect: (id: string) => void;
}

const MenuSidebar: React.FC<MenuSidebarProps> = memo(({
    menuGroups,
    activeMenuId,
    activeCategoryId,
    onMenuSelect,
    onSelect,
}) => {
    return (
        <aside className="hidden w-56 flex-shrink-0 lg:flex xl:w-60">
            <div className="sticky top-8 w-full px-2 py-2">
                <p className="mb-5 px-3 text-[28px] font-semibold leading-none text-[#111827]">Menu</p>
                <nav className="space-y-5">
                    {menuGroups.map((group) => (
                        <div key={group.id}>
                            {group.name && (
                                <button
                                    type="button"
                                    onClick={() => onMenuSelect(group.id)}
                                    className={`mb-2 block px-3 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                                        activeMenuId === group.id
                                            ? "text-[#111827]"
                                            : "text-[#9CA3AF] hover:text-[#4B5563]"
                                    }`}
                                >
                                    {group.name}
                                </button>
                            )}
                            <div className="space-y-1">
                                {group.categories.map((cat) => {
                                    const isActive = activeCategoryId === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onPointerDown={(e) => { e.preventDefault(); onSelect(cat.id); }}
                                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] leading-snug transition-colors active:scale-[0.99] ${
                                                isActive
                                                    ? "bg-[#F5F7FA] font-semibold text-[#111827]"
                                                    : "text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827]"
                                            }`}
                                        >
                                            <span className="line-clamp-2">{cat.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>
        </aside>
    );
});

export default MenuSidebar;
