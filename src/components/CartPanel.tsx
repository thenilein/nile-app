import React from "react";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, X } from "lucide-react";
import { useCart } from "../context/CartContext.tsx";
import { useNavigate } from "react-router-dom";

const DELIVERY_FEE = 30;
const FREE_DELIVERY_ABOVE = 300;

interface CartPanelProps {
    orderType: "delivery" | "pickup";
}

const CartPanel: React.FC<CartPanelProps> = ({ orderType }) => {
    const { items, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();
    const navigate = useNavigate();

    const deliveryFee =
        orderType === "delivery" ? (totalPrice >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE) : 0;
    const grandTotal = totalPrice + deliveryFee;
    const taxes = +(grandTotal * 0.05).toFixed(2); // 5% GST

    return (
        <aside className="w-72 flex-shrink-0 hidden xl:flex flex-col">
            <div className="sticky top-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col max-h-[calc(100vh-6rem)] overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-green-800" />
                        <span className="font-bold text-gray-900 text-sm">Your Cart</span>
                    </div>
                    {totalItems > 0 && (
                        <span className="text-xs font-bold bg-green-800 text-white px-2 py-0.5 rounded-full">
                            {totalItems}
                        </span>
                    )}
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <span className="text-5xl mb-3">🛒</span>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Your cart is empty</p>
                            <p className="text-xs text-gray-400">Add items from the menu to begin.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-start gap-2">
                                    {/* Qty stepper */}
                                    <div className="flex flex-col items-center bg-green-700 rounded-lg overflow-hidden flex-shrink-0">
                                        <button
                                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                            className="w-6 h-6 flex items-center justify-center text-white text-base font-bold hover:bg-green-800 transition-colors"
                                        >
                                            +
                                        </button>
                                        <span className="text-white text-xs font-bold w-6 text-center py-0.5 border-t border-b border-green-600">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                            className="w-6 h-6 flex items-center justify-center text-white text-base font-bold hover:bg-green-800 transition-colors"
                                        >
                                            −
                                        </button>
                                    </div>

                                    {/* Name + price */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            ₹{item.price} × {item.quantity}
                                        </p>
                                    </div>

                                    {/* Line total + remove */}
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className="text-xs font-bold text-gray-900">
                                            ₹{(item.price * item.quantity).toFixed(0)}
                                        </span>
                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                            title="Remove"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Summary + CTA */}
                {items.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-4 space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Subtotal</span>
                            <span>₹{totalPrice.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>GST (5%)</span>
                            <span>₹{taxes.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Delivery</span>
                            {orderType === "pickup" ? (
                                <span className="text-blue-600 font-medium">Pickup</span>
                            ) : deliveryFee === 0 ? (
                                <span className="text-green-600 font-medium">Free 🎉</span>
                            ) : (
                                <span>₹{deliveryFee}</span>
                            )}
                        </div>
                        {orderType === "delivery" && totalPrice < FREE_DELIVERY_ABOVE && (
                            <p className="text-[10px] text-gray-400 leading-tight">
                                Add ₹{(FREE_DELIVERY_ABOVE - totalPrice).toFixed(0)} more for free delivery
                            </p>
                        )}
                        <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
                            <span>Total</span>
                            <span>₹{(grandTotal + taxes).toFixed(0)}</span>
                        </div>
                        <button
                            onClick={() => navigate("/checkout")}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-800 hover:bg-green-900 text-white text-sm font-bold rounded-xl transition-colors shadow-sm mt-1"
                        >
                            Proceed to Checkout
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default CartPanel;
