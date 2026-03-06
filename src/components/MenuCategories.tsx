import React from "react";

const categories = [
    "Recommended",
    "Seasons' Specials",
    "Beverages",
    "Ice Cream",
    "Chef Sanjeev Kapoor's Menu",
    "Food",
    "Ready to Eat and Drink",
    "Freshly Brewed Beverages 1 Lt",
    "At Home Coffee",
    "Bottled Frappuccino"
];

const MenuCategories = () => {
    return (
        <aside className="hidden lg:block w-64 shrink-0 py-8">
            <h2 className="text-xl font-extrabold text-gray-900 mb-6">Menu</h2>
            <nav className="flex flex-col gap-1 pr-6 border-r border-gray-100 min-h-[500px]">
                {categories.map((cat, idx) => (
                    <button
                        key={idx}
                        className={`text-left px-4 py-3 text-sm rounded-lg transition-colors ${idx === 0 ? 'font-semibold text-green-800 bg-green-50' : 'font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                    >
                        {cat}
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default MenuCategories;
