import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, animate } from "framer-motion";
import { ShoppingBag, X, ArrowRight, Tag, ChevronDown } from "lucide-react";
import { useCart } from "../context/CartContext.tsx";
import { useNavigate } from "react-router-dom";
import MobileSheet from "./MobileSheet.tsx";

// ─── Constants ────────────────────────────────────────────────────────────────
const DELIVERY_FEE = 30;
const FREE_DELIVERY_THRESHOLD = 300;

const VALID_COUPONS: Record<string, number> = {
    NILE10: 10,
    NILE20: 20,
    ICECREAM50: 50,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCategoryEmoji(name: string): string {
    const n = name.toLowerCase();
    if (n.includes("shake") || n.includes("milk")) return "🥤";
    if (n.includes("waffle") || n.includes("crepe")) return "🧇";
    if (n.includes("sundae")) return "🍧";
    if (n.includes("cone")) return "🍦";
    if (n.includes("brownie") || n.includes("cake")) return "🎂";
    if (n.includes("nutella") || n.includes("choco")) return "🍫";
    return "🍨";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Qty flip number
const FlipNumber: React.FC<{ value: number }> = ({ value }) => {
    return (
        <div className="w-6 h-6 flex items-center justify-center overflow-hidden perspective-500">
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={value}
                    initial={{ rotateX: -90, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    exit={{ rotateX: 90, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="text-gray-900 font-bold text-[14px] text-center block"
                >
                    {value}
                </motion.span>
            </AnimatePresence>
        </div>
    );
};

// Total count up (fast spring version)
const CountUpTotal: React.FC<{ value: number }> = ({ value }) => {
    const count = useMotionValue(value);
    const rounded = useTransform(count, Math.round);

    useEffect(() => {
        const controls = animate(count, value, { duration: 0.15, ease: "easeOut" });
        return controls.stop;
    }, [value, count]);

    return <motion.span>₹<motion.span>{rounded}</motion.span></motion.span>;
};

// Cart item row
interface CartItemRowProps {
    item: { id: string; product_id: string; name: string; price: number; quantity: number; image_url?: string };
    onInc: () => void;
    onDec: () => void;
    onRemove: () => void;
}
const CartItemRow: React.FC<CartItemRowProps> = React.memo(({ item, onInc, onDec, onRemove }) => {
    const [hovered, setHovered] = useState(false);

    const handleRemove = (e: React.PointerEvent) => {
        e.preventDefault();
        onRemove();
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, x: 40, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative overflow-hidden group hover:bg-[#fafff7] transition-colors rounded-lg mx-2 mb-1"
        >
            <div
                className="flex items-center gap-3 py-3 px-2 border-b border-dashed border-[#f3f3f3]"
            >
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xl overflow-hidden bg-green-50">
                    {item.image_url ? (
                        <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg"
                        />
                    ) : (
                        <span>{getCategoryEmoji(item.name)}</span>
                    )}
                </div>

                {/* Name + per-unit price */}
                <div className="flex-1 min-w-0 pr-6 relative">
                    <p className="text-gray-900 text-[14px] font-medium line-clamp-1 leading-tight">
                        {item.name}
                    </p>
                    <p className="text-gray-500 text-[12px] mt-0.5">
                        ₹{item.price} each
                    </p>

                    {/* Hover remove button */}
                    <AnimatePresence>
                        {hovered && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                                onPointerDown={handleRemove}
                                className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Qty controller */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Minus */}
                    <button
                        onClick={onDec}
                        className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[12px] font-bold bg-white border border-gray-200 text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                        −
                    </button>

                    {/* Count */}
                    <div className="w-6 flex items-center justify-center flex-shrink-0">
                        <FlipNumber value={item.quantity} />
                    </div>

                    {/* Plus */}
                    <button
                        onClick={onInc}
                        className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[12px] font-bold bg-green-600 text-white hover:bg-green-700 transition-colors flex-shrink-0"
                    >
                        +
                    </button>
                </div>

                {/* Line total */}
                <div className="w-12 text-right flex-shrink-0 ml-1">
                    <span className="text-[14px] font-bold text-green-700">
                        ₹{Math.round(item.price * item.quantity)}
                    </span>
                </div>
            </div>
        </motion.div>
    );
});

// Free delivery progress bar
const DeliveryProgress: React.FC<{ subtotal: number; orderType: string }> = ({ subtotal, orderType }) => {
    if (orderType !== "delivery") return null;
    const pct = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);
    const reached = subtotal >= FREE_DELIVERY_THRESHOLD;

    return (
        <div className="px-4 pb-3">
            <div className="flex justify-between items-center mb-1.5">
                <p className="text-[11px] text-gray-500 font-medium">
                    {reached
                        ? <span className="text-green-600">🎉 Free delivery unlocked!</span>
                        : `Add ₹${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(0)} more for free delivery 🛵`}
                </p>
            </div>
            {/* Bar */}
            <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                <motion.div
                    className="h-full rounded-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
        </div>
    );
};

// Coupon section
const CouponSection: React.FC<{
    onApply: (code: string, discount: number) => void;
    applied: string | null;
}> = ({ onApply, applied }) => {
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState("");
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleApply = () => {
        const upper = code.trim().toUpperCase();
        const discount = VALID_COUPONS[upper];
        if (discount) {
            onApply(upper, discount);
            setSuccess(true);
            setError(false);
        } else {
            setError(true);
            setSuccess(false);
            setTimeout(() => setError(false), 700);
        }
    };

    if (applied) {
        return (
            <div className="mx-4 mb-3 px-3 py-2 rounded-lg flex items-center justify-between bg-green-50 border border-green-100">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-xs text-green-700 font-semibold">{applied} applied</span>
                </div>
                <button onClick={() => onApply("", 0)} className="text-gray-400 hover:text-red-500 text-xs font-medium transition-colors">
                    Remove
                </button>
            </div>
        );
    }

    return (
        <div className="px-4 mb-3">
            <button
                onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 150); }}
                className="flex items-center gap-1 text-[13px] font-medium text-green-600 hover:text-green-700 transition-colors"
            >
                Have a coupon?
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3 h-3" />
                </motion.span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <motion.div
                            className="flex flex-col sm:flex-row gap-2 mt-2"
                            animate={error ? { x: [0, -5, 5, -5, 5, 0] } : { x: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <input
                                ref={inputRef}
                                value={code}
                                onChange={(e) => { setCode(e.target.value); setError(false); }}
                                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                                placeholder="Enter code"
                                className={`flex-1 min-w-0 text-sm px-3 py-1.5 rounded-lg outline-none font-medium text-gray-900 border ${error ? "border-red-400" : "border-dashed border-gray-300 focus:border-green-500 focus:border-solid bg-gray-50 bg-white"}`}
                            />
                            <button
                                onPointerDown={(e) => { e.preventDefault(); handleApply(); }}
                                className="w-full sm:w-[70px] flex-shrink-0 text-xs font-bold px-0 py-2 sm:py-1.5 rounded-lg transition-transform duration-100 border border-green-600 text-green-700 hover:bg-green-50 flex items-center justify-center active:scale-95"
                            >
                                Apply
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── MAIN CART PANEL ─────────────────────────────────────────────────────────
interface CartPanelProps {
    orderType: "delivery" | "pickup";
    onCheckoutClick?: () => void;
    isCheckoutOpen?: boolean;
}

const CartPanelInner: React.FC<CartPanelProps & { mobile?: boolean; onClose?: () => void }> = ({
    orderType,
    mobile = false,
    onClose,
    onCheckoutClick,
}) => {
    const { items, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();
    const navigate = useNavigate();

    const [couponCode, setCouponCode] = useState<string | null>(null);
    const [couponDiscount, setCouponDiscount] = useState(0);

    const prevTotalItems = useRef(totalItems);
    const bagControls = useAnimation();

    // Bag bounce when item count changes
    useEffect(() => {
        if (totalItems !== prevTotalItems.current) {
            bagControls.start({
                y: [0, -6, 0, -3, 0],
                transition: { duration: 0.4, ease: "easeOut" },
            });
            prevTotalItems.current = totalItems;
        }
    }, [totalItems, bagControls]);

    const subtotal = Math.round(totalPrice);
    const gst = Math.round(subtotal * 0.05);
    const deliveryFee =
        orderType === "delivery" ? (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE) : 0;
    const discountAmt = Math.round(couponCode ? couponDiscount : 0);
    const grandTotal = subtotal + gst + deliveryFee - discountAmt;

    const handleApplyCoupon = (code: string, discount: number) => {
        if (!code) {
            setCouponCode(null);
            setCouponDiscount(0);
        } else {
            setCouponCode(code);
            setCouponDiscount(discount);
        }
    };

    const panelStyle: React.CSSProperties = {
        background: "#ffffff",
        boxShadow: mobile ? "none" : "0 4px 24px rgba(0,0,0,0.08)",
        border: mobile ? "none" : "1px solid #f0f0f0",
        borderRadius: mobile ? "0" : "16px",
    };

    return (
        <div
            className="flex flex-col overflow-hidden h-full"
            style={{
                ...panelStyle,
                maxHeight: mobile ? "none" : "calc(100vh - 5.5rem)",
            }}
        >
            {/* Drag handle pip — only visible in mobile sheet mode */}
            {mobile && (
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-12 h-1.5 rounded-full bg-gray-200" />
                </div>
            )}
            {/* ── HEADER ── */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <motion.div animate={bagControls}>
                        <ShoppingBag className="w-5 h-5 text-green-600" />
                    </motion.div>
                    <span className="font-bold text-gray-900 text-[16px]">Your Order</span>
                </div>

                <div className="flex items-center gap-2">
                    <AnimatePresence mode="wait">
                        {totalItems > 0 && (
                            <motion.span
                                key={totalItems}
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.3, 1] }}
                                exit={{ scale: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                className="text-xs font-bold text-white px-2.5 py-0.5 rounded-full bg-green-600"
                            >
                                {totalItems}
                            </motion.span>
                        )}
                    </AnimatePresence>
                    {mobile && onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── FREE DELIVERY PROGRESS ── */}
            {items.length > 0 && (
                <DeliveryProgress subtotal={subtotal} orderType={orderType} />
            )}

            {/* ── ITEMS ── */}
            <div className="flex-1 overflow-y-auto pt-1" style={{ scrollbarWidth: "none" }}>
                {items.length === 0 ? (
                    /* ── EMPTY STATE ── */
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="text-[64px] mb-4 select-none drop-shadow-sm"
                        >
                            🛒
                        </motion.div>
                        <p className="font-bold text-gray-900 text-sm mb-1">Your cart is empty</p>
                        <p className="text-xs text-gray-500 mb-2">
                            Start adding delicious items!
                        </p>
                    </div>
                ) : (
                    <motion.div layout className="pb-2">
                        <AnimatePresence initial={false}>
                            {items.map((item) => (
                                <CartItemRow
                                    key={item.id}
                                    item={item}
                                    onInc={() => updateQuantity(item.product_id, item.quantity + 1)}
                                    onDec={() => updateQuantity(item.product_id, item.quantity - 1)}
                                    onRemove={() => removeFromCart(item.product_id)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* ── FOOTER (summary + CTA) ── */}
            {items.length > 0 && (
                <div className="flex-shrink-0 bg-white">
                    {/* Divider */}
                    <div className="h-[1px] w-full bg-[#f0f0f0]" />

                    {/* Price breakdown */}
                    <div className="px-5 pt-4 pb-3 space-y-2">
                        {/* Subtotal */}
                        <div className="flex justify-between text-[13px]">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-900 font-medium">₹{subtotal.toFixed(0)}</span>
                        </div>
                        {/* GST */}
                        <div className="flex justify-between text-[13px]">
                            <span className="text-gray-500">GST (5%)</span>
                            <span className="text-gray-900 font-medium">₹{gst.toFixed(0)}</span>
                        </div>
                        {/* Delivery */}
                        <div className="flex justify-between text-[13px]">
                            <span className="text-gray-500">Delivery</span>
                            {orderType === "pickup" ? (
                                <span className="text-blue-600 font-semibold">Pickup</span>
                            ) : deliveryFee === 0 ? (
                                <span className="text-green-600 font-bold">Free 🎉</span>
                            ) : (
                                <span className="text-gray-900 font-medium">₹{deliveryFee}</span>
                            )}
                        </div>

                        {/* Coupon */}
                        <div className="pt-2">
                            <CouponSection onApply={handleApplyCoupon} applied={couponCode} />
                        </div>

                        {/* Discount */}
                        <AnimatePresence>
                            {couponCode && discountAmt > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex justify-between text-[13px] text-green-600 font-medium pb-1"
                                >
                                    <span>Discount ({couponCode})</span>
                                    <span>−₹{discountAmt}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Total */}
                        <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-gray-100">
                            <span className="text-gray-900 font-bold text-sm">Total</span>
                            <motion.span
                                key={grandTotal}
                                initial={{ opacity: 0.5, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="text-[18px] font-extrabold text-green-700"
                            >
                                <CountUpTotal value={grandTotal} />
                            </motion.span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    {!mobile ? (
                        <div className="px-4 pb-4">
                            <button
                                onPointerDown={(e) => { e.preventDefault(); onCheckoutClick ? onCheckoutClick() : navigate("/checkout"); }}
                                className="w-full h-12 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 group transition-all duration-100 ease-out bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.97]"
                            >
                                <span>Checkout · ₹{grandTotal.toFixed(0)}</span>
                                <motion.span
                                    className="inline-block"
                                    transition={{ duration: 0.2 }}
                                    whileHover={{ x: 4 }}
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </motion.span>
                            </button>
                        </div>
                    ) : (
                        <div className="h-[90px] flex-shrink-0" /> // Spacer for the floating pill
                    )}
                </div>
            )}
        </div>
    );
};

// ─── MOBILE DRAWER ────────────────────────────────────────────────────────────
// ─── MOBILE DRAWER ────────────────────────────────────────────────────────────
const MobileCartDrawer: React.FC<CartPanelProps> = ({ orderType, onCheckoutClick, isCheckoutOpen }) => {
    const { totalItems, totalPrice } = useCart();
    const [open, setOpen] = useState(false);

    const prevTotalItems = useRef(totalItems);
    const badgeControls = useAnimation();

    useEffect(() => {
        if (totalItems !== prevTotalItems.current) {
            badgeControls.start({
                scale: [1, 1.15, 1],
                transition: { type: "spring", stiffness: 400, damping: 10 }
            });
            prevTotalItems.current = totalItems;
        }
    }, [totalItems, badgeControls]);

    const subtotal = Math.round(totalPrice);
    const gst = Math.round(subtotal * 0.05);
    const deliveryFee = orderType === "delivery" ? (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE) : 0;
    const grandTotal = subtotal + gst + deliveryFee;

    const showPill = totalItems > 0 && !isCheckoutOpen && !open;

    return (
        <>
            {/* Styled fixed bottom pill bar per updated requirements */}
            <AnimatePresence>
                {showPill && (
                    <motion.div
                        initial={{ y: 150, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 150, opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="xl:hidden fixed z-[60] bottom-0 left-0 right-0 w-full bg-[#15803d]/95 backdrop-blur-md"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        <div
                            onClick={() => { if (!open) setOpen(true); }}
                            className="h-[60px] flex items-center justify-between px-4 cursor-pointer"
                        >
                            <div className="flex items-center">
                                <span className="text-xl leading-none -mt-0.5">🛒</span>
                                <motion.div animate={badgeControls} className="origin-left">
                                    <span className="text-white text-[15px] font-bold ml-2 inline-block">
                                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                                    </span>
                                </motion.div>
                            </div>

                            <div className="w-[1px] h-[30px] bg-white/20 mx-4" />

                            <div 
                                className="flex items-center justify-end flex-1"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (open) setOpen(false); // Close cart sheet before checkout
                                    if (onCheckoutClick) onCheckoutClick();
                                }}
                            >
                                <span className="text-white text-[16px] font-bold">
                                    ₹{grandTotal.toFixed(0)} Checkout →
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart sheet via MobileSheet primitive */}
            <MobileSheet isOpen={open} onClose={() => setOpen(false)}>
                <div className="flex-1 overflow-hidden">
                    <CartPanelInner
                        orderType={orderType}
                        onCheckoutClick={() => { setOpen(false); if (onCheckoutClick) onCheckoutClick(); }}
                        mobile
                        onClose={() => setOpen(false)}
                    />
                </div>
            </MobileSheet>
        </>
    );
};

// ─── EXPORT ───────────────────────────────────────────────────────────────────
const CartPanel: React.FC<CartPanelProps> = ({ orderType, onCheckoutClick, isCheckoutOpen }) => {
    return (
        <>
            {/* Desktop sidebar */}
            <aside className="w-[320px] flex-shrink-0 hidden xl:flex flex-col">
                <div className="sticky top-[80px]">
                    <CartPanelInner orderType={orderType} onCheckoutClick={onCheckoutClick} />
                </div>
            </aside>

            {/* Mobile drawer */}
            <MobileCartDrawer orderType={orderType} onCheckoutClick={onCheckoutClick} isCheckoutOpen={isCheckoutOpen} />
        </>
    );
};

export default CartPanel;
