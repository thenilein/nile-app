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
            className={`relative rounded-2xl bg-white overflow-hidden shadow-sm border border-gray-100/80 hover:shadow-md transition-all duration-200 flex flex-col ${unavailable ? "opacity-60" : ""} ${variant === "top" ? "h-full w-[150px] md:w-full" : "h-full"}`}
        >
            {/* ── Image Section (16:9 Aspect Ratio) ── */}
            <div className="relative w-full aspect-[16/9] flex-shrink-0 bg-gradient-to-br from-green-50 to-emerald-100 overflow-hidden">
                {product.image_url ? (
                    <img
                        src={product.image_url as string}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl md:text-6xl select-none">
                        {getEmoji(product.name)}
                    </div>
                )}

                {/* Overlaid Badges */}
                <div className="absolute top-2 left-2 flex gap-1 z-10 flex-wrap pointer-events-none">
                    {product.is_popular && (
                        <span className="inline-flex items-center gap-1 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                            <Flame className="w-3 h-3" /> Popular
                        </span>
                    )}
                    {unavailable && (
                        <span className="inline-flex items-center bg-gray-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            Unavailable
                        </span>
                    )}
                </div>

                {/* Veg / Non-Veg Indicator */}
                <div className="absolute top-2 right-2 z-10 pointer-events-none">
                    <div className={`w-4 h-4 md:w-5 md:h-5 border-[1.5px] md:border-2 rounded-sm flex items-center justify-center shadow-sm bg-white/90 backdrop-blur-sm ${product.is_veg !== false ? "border-green-600" : "border-red-500"}`}>
                        <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${product.is_veg !== false ? "bg-green-600" : "bg-red-500"}`} />
                    </div>
                </div>
            </div>

            {/* ── Content Section ── */}
            <div className="p-3 md:p-4 flex flex-col flex-1 relative">
                <div className="flex-[1_0_auto]">
                    <h3 className="font-semibold text-gray-900 text-[15px] md:text-[16px] leading-tight mb-1 line-clamp-1 pr-1">
                        {product.name}
                    </h3>
                    
                    {product.description ? (
                        <p className="text-gray-500 text-[12px] md:text-[13px] leading-snug line-clamp-2 md:line-clamp-2 mb-3">
                            {product.description}
                        </p>
                    ) : (
                        <div className="h-2 mb-3" />
                    )}
                </div>

                {/* ── Price and Add Button Row ── */}
                <div className="flex items-end justify-between mt-auto">
                    <span className="font-semibold text-gray-900 text-[14px] md:text-[15px] leading-none mb-1.5">
                        ₹{product.price}
                    </span>

                    <div className="relative min-h-[36px] flex items-end">
                        {unavailable ? (
                            <span className="text-[11px] text-gray-500 font-medium px-2 py-1.5 bg-gray-100 rounded-lg">
                                Out of stock
                            </span>
                        ) : qty === 0 ? (
                            <button
                                onPointerDown={handleAdd}
                                className="h-[36px] px-6 bg-green-50 text-green-700 border border-green-200 rounded-[12px] font-bold text-[14px] flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0"
                            >
                                ADD
                            </button>
                        ) : (
                            <div className="h-[36px] min-w-[84px] max-w-[96px] bg-green-700 rounded-[20px] shadow-md flex items-center justify-between px-[4px] py-[4px] gap-2 overflow-hidden shrink-0">
                                <button 
                                    onPointerDown={handleDecrease} 
                                    className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white bg-green-800/40 hover:bg-green-800 font-bold active:scale-90 transition-transform shrink-0"
                                >
                                    −
                                </button>
                                
                                <div className="flex-1 flex items-center justify-center overflow-hidden perspective-500">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.span
                                            key={qty}
                                            initial={{ y: -15, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: 15, opacity: 0 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="text-center text-white text-[14px] font-bold flex-shrink-0 origin-center leading-none"
                                        >
                                            {qty}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                                
                                <button 
                                    onPointerDown={handleIncrease} 
                                    className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white bg-green-800/40 hover:bg-green-800 font-bold active:scale-90 transition-transform shrink-0"
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
