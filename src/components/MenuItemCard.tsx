import React from "react";
import { Leaf, Star, Flame } from "lucide-react";
import { useCart } from "../context/CartContext.tsx";

export interface Product {
    id: string;
    category_id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    is_active: boolean;
    is_available: boolean;
    is_popular: boolean;
    is_veg?: boolean;
}

interface MenuItemCardProps {
    product: Product;
}

// Emoji fallback palette for categories — gives cards visual variety without images
const EMOJI_MAP: Record<string, string> = {
    "ice cream": "🍨",
    "sundae": "🍧",
    "milkshake": "🥛",
    "shake": "🥤",
    "waffle": "🧇",
    "crepe": "🥞",
    "falooda": "🍹",
    "cake": "🎂",
    "pack": "📦",
    "seasonal": "🌟",
    "special": "✨",
};

function getEmoji(name: string): string {
    const lower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
        if (lower.includes(key)) return emoji;
    }
    return "🍦";
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ product }) => {
    const { items, addToCart, updateQuantity } = useCart();
    const cartItem = items.find((i) => i.product_id === product.id);
    const qty = cartItem?.quantity ?? 0;

    const handleAdd = () => addToCart(product);
    const handleIncrease = () => updateQuantity(product.id, qty + 1);
    const handleDecrease = () => updateQuantity(product.id, qty - 1);

    const unavailable = !product.is_available || !product.is_active;

    return (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden ${unavailable ? "opacity-60" : ""}`}>
            {/* Image */}
            <div className="relative h-44 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <span className="text-6xl select-none">{getEmoji(product.name)}</span>
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.is_popular && (
                        <span className="inline-flex items-center gap-1 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            <Flame className="w-3 h-3" /> Popular
                        </span>
                    )}
                    {unavailable && (
                        <span className="inline-flex items-center bg-gray-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            Unavailable
                        </span>
                    )}
                </div>
                {/* Veg indicator */}
                <div className="absolute top-2 right-2">
                    <div className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center ${product.is_veg !== false ? "border-green-600 bg-white" : "border-red-500 bg-white"}`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${product.is_veg !== false ? "bg-green-600" : "bg-red-500"}`} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1 line-clamp-1">{product.name}</h3>
                    {product.description && (
                        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-2">{product.description}</p>
                    )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="font-bold text-gray-900 text-sm">₹{product.price}</span>

                    {unavailable ? (
                        <span className="text-xs text-gray-400 font-medium">Out of stock</span>
                    ) : qty === 0 ? (
                        <button
                            onClick={handleAdd}
                            className="px-4 py-1.5 bg-white border-2 border-green-700 text-green-700 text-xs font-bold rounded-lg hover:bg-green-700 hover:text-white transition-colors"
                        >
                            ADD
                        </button>
                    ) : (
                        <div className="flex items-center gap-0 bg-green-700 rounded-lg overflow-hidden">
                            <button
                                onClick={handleDecrease}
                                className="w-7 h-7 flex items-center justify-center text-white font-bold text-base hover:bg-green-800 transition-colors"
                            >
                                −
                            </button>
                            <span className="w-7 text-center text-white text-xs font-bold">{qty}</span>
                            <button
                                onClick={handleIncrease}
                                className="w-7 h-7 flex items-center justify-center text-white font-bold text-base hover:bg-green-800 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MenuItemCard;
