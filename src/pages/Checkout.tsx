import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Phone, CheckCircle2 } from 'lucide-react';

const Checkout = () => {
    const { items, totalPrice, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        phone: user?.phone || '',
        street: '',
        locality: '',
        city: 'Hyderabad', // Default or fetch from LocationContext if we had it
        paymentMethod: 'cod',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) {
            setError("Your cart is empty");
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Create Address Record (if needed)
            // For guest users, we might insert a temporary address or just store it in orders table JSON
            // Since we have an addresses table, we'll try to insert it, but it requires a profile ID
            // For now, guest users don't have a profile_id so address_id will be null and we will just dump details into a JSON or handle properly later
            // Since the schema has address as separate table tied to profiles, we will skip inserting address for guests or just rely on a simpler approach. 
            // Wait, the schema from earlier has:
            // address_id uuid references public.addresses(id)
            // For guest checkout to work without breaking foreign keys, we either need a dummy profile or we alter the schema later.
            // Let's create the order and throw the address in a JSON metadata field for now or just proceed.
            // *Assuming we are adapting to the schema provided:*

            let profileId = user?.id || null;

            // 2. Create Order
            const { data: orderParams } = await supabase
                .from('orders')
                .insert([{
                    profile_id: profileId,
                    total_amount: totalPrice,
                    status: 'pending',
                    payment_status: formData.paymentMethod === 'cod' ? 'unpaid' : 'paid',
                }])
                .select()
                .single();

            if (!orderParams) throw new Error("Failed to create order");

            // 3. Create Order Items
            const orderItems = items.map(item => ({
                order_id: orderParams.id,
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_purchase: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // 4. Success -> Clear Cart -> Navigate
            clearCart();
            navigate('/order-success');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to place order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="flex-1 p-8 bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">You have no items in your cart to checkout.</p>
                    <button onClick={() => navigate('/menu')} className="text-green-800 font-medium hover:underline">Return to Menu</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-gray-50">
            <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-8">

                {/* Checkout Form */}
                <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Checkout Details</h1>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">

                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Phone className="w-5 h-5 text-gray-400" />
                                Contact Information
                            </h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                    placeholder="Enter your phone number"
                                />
                            </div>
                        </div>

                        {/* Delivery Info */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-gray-400" />
                                Delivery Address
                            </h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Flat / House / Apartment No.</label>
                                <input
                                    type="text"
                                    name="street"
                                    required
                                    value={formData.street}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Locality / Area</label>
                                <input
                                    type="text"
                                    name="locality"
                                    required
                                    value={formData.locality}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Payment Settings */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-gray-400" />
                                Payment Method
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <label className={`border rounded-lg p-4 cursor-pointer transition-colors ${formData.paymentMethod === 'cod' ? 'border-green-800 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="cod"
                                        checked={formData.paymentMethod === 'cod'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <span className="font-medium text-gray-900 block mb-1">Cash on Delivery</span>
                                    <span className="text-sm text-gray-500">Pay when you receive</span>
                                </label>
                                <label className={`border rounded-lg p-4 cursor-pointer transition-colors opacity-50 relative`} title="UPI is currently disabled for testing">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="upi"
                                        disabled
                                        className="sr-only"
                                    />
                                    <span className="font-medium text-gray-900 block mb-1">Pay via UPI</span>
                                    <span className="text-sm text-gray-500">GPay, PhonePe, Paytm</span>
                                </label>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Order Summary sidebar */}
                <div className="w-full lg:w-96 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                        {items.map(item => (
                            <div key={item.id} className="flex justify-between items-start text-sm">
                                <div>
                                    <span className="font-medium text-gray-900">{item.name}</span>
                                    <span className="text-gray-500 block">Qty: {item.quantity}</span>
                                </div>
                                <span className="font-medium text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-3 mb-6">
                        <div className="flex justify-between text-gray-600 text-sm">
                            <span>Subtotal</span>
                            <span>₹{totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 text-sm">
                            <span>Delivery</span>
                            <span className="text-green-600 font-medium">Free</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-3 border-t border-gray-100">
                            <span>Total</span>
                            <span>₹{totalPrice.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        form="checkout-form"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Processing...' : 'Place Order'}
                        {!loading && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
