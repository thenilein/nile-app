import React, { useRef, useEffect } from "react";
import { Flame, ImageOff } from "lucide-react";
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
            style={{ willChange: "transform" }}
            className={`group relative flex gap-4 border-b border-[#F1F5F9] py-5 transition-opacity ${unavailable ? "opacity-60" : ""}`}
        >
            <div className="min-w-0 flex-1 pr-3">
                <div className="mb-2 flex items-start gap-2">
                    <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] border ${product.is_veg !== false ? "border-green-600" : "border-red-500"}`}>
                        <div className={`h-2 w-2 rounded-full ${product.is_veg !== false ? "bg-green-600" : "bg-red-500"}`} />
                    </div>
                    <div className="min-w-0">
                        {product.is_popular && (
                            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-semibold text-[#C2410C]">
                                <Flame className="h-3 w-3" />
                                Bestseller
                            </span>
                        )}
                        <h3 className={`text-[17px] font-semibold leading-tight text-[#111827] ${variant === "top" ? "md:text-[20px]" : ""}`}>
                            {product.name}
                        </h3>
                    </div>
                </div>

                <p className="mb-2 text-[18px] font-medium text-[#111827]">₹{product.price}</p>

                {product.description && (
                    <p className={`max-w-[540px] text-[14px] leading-6 text-[#6B7280] ${variant === "top" ? "line-clamp-3" : "line-clamp-2 md:line-clamp-3"}`}>
                        {product.description}
                    </p>
                )}
            </div>

            <div className="relative w-[118px] flex-shrink-0 md:w-[148px]">
                <div className="h-[110px] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#FEF3C7] to-[#FED7AA] shadow-[0_10px_24px_rgba(15,23,42,0.08)] md:h-[132px]">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#F8FAFC] text-[#9CA3AF]">
                            <ImageOff className="h-6 w-6 md:h-7 md:w-7" />
                            <span className="px-2 text-center text-[11px] font-medium uppercase tracking-[0.2em]">
                                No image
                            </span>
                        </div>
                    )}
                </div>

                <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center justify-center">
                    {unavailable ? (
                        <span className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-400 shadow-sm">
                            Unavailable
                        </span>
                    ) : qty === 0 ? (
                        <button
                            onPointerDown={handleAdd}
                            className="min-w-[78px] rounded-xl border border-[#D1D5DB] bg-white px-5 py-2.5 text-[14px] font-bold tracking-wide text-[#15803d] shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-all active:scale-95"
                        >
                            ADD
                        </button>
                    ) : (
                        <div className="flex items-center overflow-hidden rounded-xl bg-[#15803d] text-white shadow-[0_8px_18px_rgba(21,128,61,0.24)]">
                            <button
                                onPointerDown={handleDecrease}
                                className="flex h-10 w-9 items-center justify-center text-lg font-bold transition-colors hover:bg-[#166534]"
                            >
                                −
                            </button>
                            <div className="flex h-10 w-9 items-center justify-center">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    <motion.span
                                        key={qty}
                                        initial={{ rotateX: -90, opacity: 0 }}
                                        animate={{ rotateX: 0, opacity: 1 }}
                                        exit={{ rotateX: 90, opacity: 0 }}
                                        transition={{ duration: 0.12 }}
                                        className="text-sm font-bold"
                                    >
                                        {qty}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                            <button
                                onPointerDown={handleIncrease}
                                className="flex h-10 w-9 items-center justify-center text-lg font-bold transition-colors hover:bg-[#166534]"
                            >
                                +
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default MenuItemCard;
