import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImageOff } from "lucide-react";
import { useCart } from "../context/CartContext.tsx";
import { CheckoutSheetContent } from "./CheckoutDrawer.tsx";
import { FREE_DELIVERY_THRESHOLD } from "../lib/pricing.ts";
import { sheetCapsuleCtaBtn, sheetCapsuleQtyShell } from "../lib/sheetCapsuleStyles.ts";

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

// Cart item row
interface CartItemRowProps {
    item: { id: string; product_id: string; name: string; price: number; quantity: number; image_url?: string };
    onInc: () => void;
    onDec: () => void;
}
export const CartItemRow: React.FC<CartItemRowProps> = React.memo(({ item, onInc, onDec }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, x: 40, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="relative overflow-hidden group hover:bg-gray-50 transition-colors rounded-lg mx-2 mb-1"
        >
            <div
                className="flex items-center gap-3 py-3 px-2 border-b border-dashed border-[#f3f3f3]"
            >
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xl overflow-hidden bg-[#F3F4F6]">
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

                {/* Name + unit price */}
                <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-[14px] font-medium line-clamp-1 leading-tight">
                        {item.name}
                    </p>
                    <p className="text-gray-500 text-[12px] mt-0.5 tabular-nums">₹{item.price}</p>
                </div>

                {/* Qty capsule */}
                <div className={`${sheetCapsuleQtyShell} flex-shrink-0`}>
                    <button
                        type="button"
                        onClick={onDec}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-bold leading-none text-gray-700 transition-colors hover:bg-white/70 active:scale-95"
                        aria-label="Decrease quantity"
                    >
                        −
                    </button>
                    <div className="flex min-w-[1.5rem] items-center justify-center px-0.5">
                        <FlipNumber value={item.quantity} />
                    </div>
                    <button
                        type="button"
                        onClick={onInc}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-bold leading-none text-gray-900 transition-colors hover:bg-white/70 active:scale-95"
                        aria-label="Increase quantity"
                    >
                        +
                    </button>
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
                        ? <span className="text-[#111827]">Free delivery unlocked</span>
                        : `Add ₹${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(0)} more for free delivery`}
                </p>
            </div>
            {/* Bar */}
            <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                <motion.div
                    className="h-full rounded-full bg-[#111827]"
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
    const { items, updateQuantity } = useCart();

    const panelStyle: React.CSSProperties = {
        background: "#ffffff",
        boxShadow: mobile ? "none" : "0 4px 24px rgba(0,0,0,0.08)",
        border: mobile ? "none" : "1px solid #E5E7EB",
        borderRadius: mobile ? "0" : "16px",
    };

    if (checkoutActive) {
        return (
            <div
                className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-white ${mobile ? "max-h-full" : "h-full"}`}
                style={{
                    ...panelStyle,
                    maxHeight: mobile ? undefined : "calc(100vh - 5.5rem)",
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
            className={`flex flex-col overflow-hidden ${mobile ? "min-h-0 max-h-full flex-1" : "h-full"}`}
            style={{
                ...panelStyle,
                maxHeight: mobile ? undefined : "calc(100vh - 5.5rem)",
            }}
        >
            {/* ── HEADER ── */}
            <div className="relative flex-shrink-0 px-4 pt-4 pb-3">
                {mobile && onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-3 top-3 z-10 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Close cart"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
                <div className={`${mobile ? "pr-11" : ""}`}>
                    <span className="font-semibold text-[#111827] text-[16px]">Your cart</span>
                </div>
            </div>

            {/* ── ITEMS ── */}
            <div className="flex-1 overflow-y-auto pt-1" style={{ scrollbarWidth: "none" }}>
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                        <div className="mb-5 h-12 w-12 rounded-full bg-[#F3F4F6]" aria-hidden />
                        <p className="mb-1 text-[15px] font-semibold text-[#6B7280]">Your cart is empty</p>
                        <p className="text-sm text-[#9CA3AF]">Add items from the menu to get started.</p>
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
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* ── FOOTER: seamless checkout row (no summary block) ── */}
            {items.length > 0 && (
                <div
                    className="flex-shrink-0 border-t border-[#E5E7EB] bg-white px-4 pt-3"
                    style={
                        mobile
                            ? { paddingBottom: "max(0.75rem, calc(0.5rem + env(safe-area-inset-bottom)))" }
                            : { paddingBottom: "0.75rem" }
                    }
                >
                    <button
                        type="button"
                        onClick={() => setCheckoutActive(true)}
                        className={sheetCapsuleCtaBtn}
                    >
                        Continue
                    </button>
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
    const { totalItems } = useCart();
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
                            <button
                                type="button"
                                onClick={() => setOpen(true)}
                                className="flex h-12 min-w-0 w-full cursor-pointer items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-5 text-[13px] font-semibold text-[#111827] shadow-[0_12px_32px_rgba(15,23,42,0.12)] active:bg-gray-50"
                            >
                                Cart
                            </button>
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
                        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end justify-center px-3 pb-[max(10px,calc(env(safe-area-inset-bottom)+10px))] xl:hidden">
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
                                className="pointer-events-auto box-border flex max-h-[min(90dvh,880px)] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-[40px] border border-black/[0.08] bg-white shadow-[0_12px_48px_rgba(15,23,42,0.14)]"
                                style={{ touchAction: "none" }}
                            >
                                <div className="flex min-h-0 max-h-full flex-1 flex-col overflow-hidden pt-2">
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
