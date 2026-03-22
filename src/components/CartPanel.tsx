import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, animate } from "framer-motion";
import { ShoppingBag, X, ArrowRight, Tag, ImageOff } from "lucide-react";
import { useCart } from "../context/CartContext.tsx";
import { CheckoutSheetContent } from "./CheckoutDrawer.tsx";
import { CouponSection } from "./CouponSection.tsx";

// ─── Constants ────────────────────────────────────────────────────────────────
const DELIVERY_FEE = 30;
const FREE_DELIVERY_THRESHOLD = 300;

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
export const CartItemRow: React.FC<CartItemRowProps> = React.memo(({ item, onInc, onDec, onRemove }) => {
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
                        <ImageOff className="w-4 h-4 text-gray-400" />
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
export const DeliveryProgress: React.FC<{ subtotal: number; orderType: string }> = ({ subtotal, orderType }) => {
    if (orderType !== "delivery") return null;
    const pct = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);
    const reached = subtotal >= FREE_DELIVERY_THRESHOLD;

    return (
        <div className="px-4 pb-3">
            <div className="flex justify-between items-center mb-1.5">
                <p className="text-[11px] text-gray-500 font-medium">
                    {reached
                        ? <span className="text-green-600">Free delivery unlocked</span>
                        : `Add ₹${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(0)} more for free delivery`}
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

// ─── MAIN CART PANEL ─────────────────────────────────────────────────────────
interface CartPanelProps {
    orderType: "delivery" | "pickup";
    onOrderTypeChange?: (t: "delivery" | "pickup") => void;
    /** Increment (e.g. after login sheet) to open cart drawer and start checkout. */
    checkoutLaunchKey?: number;
    /** When true, the floating cart pill is not rendered (e.g. combined bar in Menu). */
    hideMobileFloatingBar?: boolean;
    /** Controlled mobile cart drawer; use with `onMobileCartDrawerOpenChange`. */
    mobileCartDrawerOpen?: boolean;
    onMobileCartDrawerOpenChange?: (open: boolean) => void;
    checkoutActive: boolean;
    setCheckoutActive: React.Dispatch<React.SetStateAction<boolean>>;
}

const CartPanelInner: React.FC<CartPanelProps & { mobile?: boolean; onClose?: () => void }> = ({
    orderType,
    onOrderTypeChange,
    mobile = false,
    onClose,
    checkoutActive,
    setCheckoutActive,
}) => {
    const { items, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();

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

    if (checkoutActive) {
        return (
            <div
                className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white"
                style={{
                    ...panelStyle,
                    maxHeight: mobile ? "none" : "calc(100vh - 5.5rem)",
                }}
            >
                <CheckoutSheetContent
                    visible={checkoutActive}
                    orderType={orderType}
                    onOrderTypeChange={onOrderTypeChange}
                    onBackToCart={() => setCheckoutActive(false)}
                    onDismiss={() => {
                        setCheckoutActive(false);
                        if (mobile && onClose) onClose();
                    }}
                />
            </div>
        );
    }

    return (
        <div
            className="flex flex-col overflow-hidden h-full"
            style={{
                ...panelStyle,
                maxHeight: mobile ? "none" : "calc(100vh - 5.5rem)",
            }}
        >
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

            {/* ── ITEMS ── */}
            <div className="flex-1 overflow-y-auto pt-1" style={{ scrollbarWidth: "none" }}>
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                        <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                            className="mb-5 flex h-36 w-full max-w-[220px] items-center justify-center rounded-3xl bg-[#FAFAFA]"
                        >
                            <ShoppingBag className="h-16 w-16 text-[#D1D5DB]" />
                        </motion.div>
                        <p className="mb-1 text-lg font-semibold text-[#D1D5DB]">Your Cart Is Empty</p>
                        <p className="text-sm text-[#D1D5DB]">
                            Add items from the menu to get started.
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
                    <div
                        className="px-4 pb-4"
                        style={
                            mobile
                                ? { paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }
                                : undefined
                        }
                    >
                        <button
                            type="button"
                            onPointerDown={(e) => {
                                e.preventDefault();
                                setCheckoutActive(true);
                            }}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#16a34a] text-[15px] font-bold text-white transition-all duration-100 ease-out hover:bg-[#15803d] active:scale-[0.97] group"
                        >
                            <span>Checkout · ₹{grandTotal.toFixed(0)}</span>
                            <motion.span
                                className="inline-block"
                                transition={{ duration: 0.2 }}
                                whileHover={{ x: 4 }}
                            >
                                <ArrowRight className="h-4 w-4" />
                            </motion.span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── MOBILE DRAWER ────────────────────────────────────────────────────────────
// ─── MOBILE DRAWER ────────────────────────────────────────────────────────────
const MobileCartDrawer: React.FC<CartPanelProps> = ({
    orderType,
    onOrderTypeChange,
    hideMobileFloatingBar,
    mobileCartDrawerOpen,
    onMobileCartDrawerOpenChange,
    checkoutActive,
    setCheckoutActive,
}) => {
    const { totalItems, totalPrice } = useCart();
    const [internalOpen, setInternalOpen] = useState(false);
    const controlled = typeof onMobileCartDrawerOpenChange === "function";
    const open = controlled ? Boolean(mobileCartDrawerOpen) : internalOpen;
    const setOpen = useCallback(
        (next: boolean) => {
            if (controlled) onMobileCartDrawerOpenChange!(next);
            else setInternalOpen(next);
        },
        [controlled, onMobileCartDrawerOpenChange]
    );

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

    const showPill = totalItems > 0 && !hideMobileFloatingBar;

    const closeDrawer = useCallback(() => {
        setCheckoutActive(false);
        setOpen(false);
    }, [setCheckoutActive, setOpen]);

    return (
        <>
            {!hideMobileFloatingBar && (
                <AnimatePresence>
                    {showPill && (
                        <motion.div
                            initial={{ y: 150, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 150, opacity: 0 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="xl:hidden fixed z-[60] max-w-[min(100vw-2rem,20rem)]"
                            style={{
                                bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                                right: "max(1rem, env(safe-area-inset-right))",
                            }}
                        >
                            <div
                                onClick={() => {
                                    if (!open) setOpen(true);
                                }}
                                className="flex h-14 min-w-0 w-full items-center justify-between gap-3 rounded-full bg-[#0B6B43] px-4 shadow-[0_16px_40px_rgba(11,107,67,0.3)] cursor-pointer"
                            >
                                <div className="flex items-center">
                                    <ShoppingBag className="h-5 w-5 text-white" />
                                    <motion.div animate={badgeControls} className="origin-left">
                                        <span className="text-white text-[15px] font-bold ml-2 inline-block">
                                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                                        </span>
                                    </motion.div>
                                </div>

                                <div className="h-7 w-px bg-white/20" />

                                <div
                                    className="flex items-center justify-end flex-1"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setCheckoutActive(true);
                                        if (!open) setOpen(true);
                                    }}
                                >
                                    <span className="text-white text-[15px] font-bold whitespace-nowrap">
                                        ₹{grandTotal.toFixed(0)} Checkout
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Drawer backdrop + panel */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeDrawer}
                            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm xl:hidden"
                        />
                        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(10px,calc(env(safe-area-inset-bottom)+10px))] xl:hidden">
                            <motion.div
                                key="drawer"
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", stiffness: 320, damping: 35 }}
                                drag="y"
                                dragConstraints={{ top: 0 }}
                                dragElastic={0.1}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100) closeDrawer();
                                }}
                                className="pointer-events-auto flex h-[75vh] max-h-[min(90dvh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-[40px] border border-black/[0.08] bg-white shadow-[0_12px_48px_rgba(15,23,42,0.14)] box-border"
                                style={{ touchAction: "none" }}
                            >
                                <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2">
                                    <CartPanelInner
                                        orderType={orderType}
                                        onOrderTypeChange={onOrderTypeChange}
                                        checkoutActive={checkoutActive}
                                        setCheckoutActive={setCheckoutActive}
                                        mobile
                                        onClose={closeDrawer}
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

// ─── EXPORT ───────────────────────────────────────────────────────────────────
export interface CartPanelOuterProps {
    orderType: "delivery" | "pickup";
    onOrderTypeChange?: (t: "delivery" | "pickup") => void;
    checkoutLaunchKey?: number;
    hideMobileFloatingBar?: boolean;
    mobileCartDrawerOpen?: boolean;
    onMobileCartDrawerOpenChange?: (open: boolean) => void;
}

const CartPanel: React.FC<CartPanelOuterProps> = (props) => {
    const { checkoutLaunchKey, onMobileCartDrawerOpenChange } = props;
    const [checkoutActive, setCheckoutActive] = useState(false);

    useEffect(() => {
        if ((checkoutLaunchKey ?? 0) > 0) {
            setCheckoutActive(true);
            onMobileCartDrawerOpenChange?.(true);
        }
    }, [checkoutLaunchKey, onMobileCartDrawerOpenChange]);

    const innerProps: CartPanelProps = {
        ...props,
        checkoutActive,
        setCheckoutActive,
    };

    return (
        <>
            <aside className="hidden w-[320px] flex-shrink-0 xl:flex xl:flex-col">
                <div className="sticky top-8">
                    <CartPanelInner {...innerProps} />
                </div>
            </aside>

            <MobileCartDrawer {...innerProps} />
        </>
    );
};

export default CartPanel;
export { CouponSection } from "./CouponSection.tsx";
