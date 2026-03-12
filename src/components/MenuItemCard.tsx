import React, { useRef, useEffect } from "react";
import { Leaf, Star, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    variant?: "grid" | "top";
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

const MenuItemCard: React.FC<MenuItemCardProps> = React.memo(({ product, variant = "grid" }) => {
    const { items, addToCart, updateQuantity } = useCart();
    const cartItem = items.find((i) => i.product_id === product.id);
    const qty = cartItem?.quantity ?? 0;

    // Use a ref to never drop rapid taps before the next render cycle pushes the new qty prop
    const qtyRef = useRef(qty);
    useEffect(() => {
        qtyRef.current = qty;
    }, [qty]);

    const handleAdd = (e: React.PointerEvent) => {
        e.preventDefault();
        addToCart(product);
    };

    const handleIncrease = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        qtyRef.current += 1;
        updateQuantity(product.id, qtyRef.current);
    };

    const handleDecrease = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        qtyRef.current -= 1;
        updateQuantity(product.id, qtyRef.current);
    };

    const unavailable = !product.is_available || !product.is_active;

    return (
        <div
            style={{ willChange: 'transform' }}
            className={`relative rounded-[20px] md:rounded-xl bg-white overflow-hidden shadow-md md:shadow-sm border-0 md:border md:border-gray-100 hover:shadow-lg md:hover:shadow-md transition-all duration-200 flex flex-col ${unavailable ? "opacity-60" : ""} ${variant === "top" ? "h-full w-full" : "h-full"}`}
        >
            {/* ── Mobile Layout (<768px) ── */}
            <div className="md:hidden flex flex-col h-full bg-white relative">
                {/* Full Bleed Image Container */}
                <div className="relative w-full h-[160px] flex-shrink-0 bg-gradient-to-br from-green-50 to-emerald-100 overflow-hidden">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl select-none">
                            {getEmoji(product.name)}
                        </div>
                    )}

                    {/* Dark gradient overlay at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                    {/* Overlaid Tags */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        {product.is_popular && (
                            <span className="inline-flex items-center gap-1 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                <Flame className="w-3 h-3" /> Popular
                            </span>
                        )}
                        {unavailable && (
                            <span className="inline-flex items-center bg-gray-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                Unavailable
                            </span>
                        )}
                    </div>
                    <div className="absolute top-2 right-2 z-10">
                        <div className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center shadow-sm ${product.is_veg !== false ? "border-green-500 bg-white" : "border-red-500 bg-white"}`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${product.is_veg !== false ? "bg-green-500" : "bg-red-500"}`} />
                        </div>
                    </div>

                    {/* Overlaid Text (Name & Price) */}
                    <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end z-10">
                        <h3 className="font-bold text-white text-[14px] leading-tight line-clamp-2 pr-2 drop-shadow-sm">
                            {product.name}
                        </h3>
                        <span className="font-bold text-white text-[14px] drop-shadow-sm whitespace-nowrap">
                            ₹{product.price}
                        </span>
                    </div>
                </div>

                {/* Bottom Section (Description + Add Button) */}
                <div className="p-[10px] flex-1 min-h-[50px] relative">
                    {product.description ? (
                        <p className="text-gray-500 text-[12px] leading-snug line-clamp-1 pr-10">{product.description}</p>
                    ) : (
                        <div className="h-4" />
                    )}

                    {/* Floating Add Button */}
                    <div className="absolute bottom-2 right-2 z-20">
                        {unavailable ? (
                            <span className="text-[10px] text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded-lg">Out of stock</span>
                        ) : qty === 0 ? (
                            <button
                                onPointerDown={handleAdd}
                                className="w-[36px] h-[36px] bg-[#16a34a] text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0"
                            >
                                <span className="text-xl font-bold leading-none mb-0.5">+</span>
                            </button>
                        ) : (
                            <div className="flex flex-col items-center bg-green-700 rounded-xl overflow-hidden shadow-md w-[36px]">
                                <button onPointerDown={handleIncrease} className="w-full h-[28px] flex items-center justify-center text-white font-bold active:bg-green-800 transition-colors">+</button>
                                <div className="w-full h-[24px] flex items-center justify-center bg-white text-green-800 text-[13px] font-bold border-y border-green-700/20">{qty}</div>
                                <button onPointerDown={handleDecrease} className="w-full h-[28px] flex items-center justify-center text-white font-bold active:bg-green-800 transition-colors">−</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* ── Desktop Layout (>=768px, identical to original) ── */}
            <div className="hidden md:flex flex-col h-full bg-white relative">
                {/* Image */}
                <div className="relative h-44 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <span className="text-6xl select-none">{getEmoji(product.name)}</span>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
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
                    <div className="absolute top-2 right-2 z-10">
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
                                onPointerDown={handleAdd}
                                className="px-4 py-1.5 bg-white border-2 border-green-700 text-green-700 text-xs font-bold rounded-lg hover:bg-green-700 hover:text-white transition-all duration-100 ease-out active:scale-95"
                            >
                                ADD
                            </button>
                        ) : (
                            <div className="flex items-center gap-0 bg-green-700 rounded-lg overflow-hidden">
                                <button
                                    onPointerDown={handleDecrease}
                                    className="w-7 h-7 flex items-center justify-center text-white font-bold text-base hover:bg-green-800 transition-all duration-100 ease-out active:scale-95 touch-manipulation"
                                >
                                    −
                                </button>
                                <div className="w-7 h-7 flex items-center justify-center overflow-hidden perspective-500">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.span
                                            key={qty}
                                            initial={{ rotateX: -90, opacity: 0 }}
                                            animate={{ rotateX: 0, opacity: 1 }}
                                            exit={{ rotateX: 90, opacity: 0 }}
                                            transition={{ duration: 0.12 }}
                                            className="text-center text-white text-xs font-bold flex-shrink-0"
                                        >
                                            {qty}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                                <button
                                    onPointerDown={handleIncrease}
                                    className="w-7 h-7 flex items-center justify-center text-white font-bold text-base hover:bg-green-800 transition-all duration-100 ease-out active:scale-95 touch-manipulation"
                                >
                                    +
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default MenuItemCard;
