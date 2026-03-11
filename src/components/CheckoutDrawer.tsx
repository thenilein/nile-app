import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Truck, Store, Banknote, CreditCard, Wallet, Smartphone, ShieldCheck, Check, Search, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';

interface CheckoutDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

type DeliveryType = 'delivery' | 'pickup';
type PaymentMethod = 'cash' | 'upi' | 'card' | 'wallet';

const FREE_DELIVERY_THRESHOLD = 300;
const DELIVERY_FEE = 30;

const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({ isOpen, onClose }) => {
    const { totalItems, totalPrice, items, clearCart } = useCart();
    const { user, isGuest } = useAuth();
    const { locationData, nearestOutlet, setLocationData, getCurrentLocation } = useLocation();
    const navigate = useNavigate();

    // Steps: 1 = Delivery, 2 = Payment, 3 = Confirmation
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
    const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
    const [houseNo, setHouseNo] = useState('');
    const [instructions, setInstructions] = useState('');
    const [step1Error, setStep1Error] = useState('');

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [upiId, setUpiId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Success State
    const [orderId, setOrderId] = useState<string | null>(null);

    // Inline Location State
    const [isChangingLocation, setIsChangingLocation] = useState(false);
    const [locSearchQuery, setLocSearchQuery] = useState('');
    const [locResults, setLocResults] = useState<any[]>([]);
    const [isSearchingLoc, setIsSearchingLoc] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep(1);
                setPaymentMethod(null);
                setOrderId(null);
                setIsSubmitting(false);
                setIsChangingLocation(false);
                setLocSearchQuery('');
                setLocResults([]);
            }, 300);
        }
    }, [isOpen]);

    // Nominatim Autocomplete Effect
    useEffect(() => {
        if (!locSearchQuery || locSearchQuery.length < 3) {
            setLocResults([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            setIsSearchingLoc(true);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locSearchQuery)}&format=json&countrycodes=in&limit=4`);
                if (res.ok) {
                    const data = await res.json();
                    setLocResults(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearchingLoc(false);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [locSearchQuery]);

    const handleSelectLocation = (result: any) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setLocationData({
            latitude: lat,
            longitude: lon,
            city: '',
            state: '',
            displayName: result.display_name
        });
        setIsChangingLocation(false);
        setLocSearchQuery('');
        setLocResults([]);
    };

    // Fire confetti when reaching step 3
    useEffect(() => {
        if (step === 3) {
            const end = Date.now() + 1.5 * 1000;
            const colors = ['#16a34a', '#4ade80', '#ffffff'];

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }
    }, [step]);

    // Derived cart totals
    const gst = Math.round(totalPrice * 0.05);
    const delFee = deliveryType === 'delivery' ? (totalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE) : 0;
    const grandTotal = Math.round(totalPrice) + gst + delFee;

    // Supabase Insert Logic
    const handlePlaceOrder = async () => {
        if (!paymentMethod) return;
        if (paymentMethod === 'upi' && !upiId.trim()) {
            alert("Please enter UPI ID");
            return;
        }

        setIsSubmitting(true);
        try {
            // Determine user id (guest vs real user)
            const userId = user?.id || null;
            const guestId = isGuest && !user ? localStorage.getItem('guest_session_id') : null;

            // Format location string
            const deliveryLocation = deliveryType === 'delivery'
                ? (locationData?.displayName || 'Unknown')
                : (nearestOutlet?.name || 'Pickup In-Store');

            // 1. Insert Order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    profile_id: userId,
                    total_amount: grandTotal,
                    status: 'pending',
                    order_type: deliveryType,
                    notes: instructions || null,
                    payment_method: paymentMethod,
                    phone: phone || null,
                    delivery_address: deliveryType === 'delivery' ? {
                        house_no: houseNo,
                        area: locationData?.city || locationData?.displayName || '',
                        city: locationData?.state || '',
                        full_address: `${houseNo}, ${locationData?.displayName || ''}`
                    } : null
                }])
                .select()
                .single();

            if (orderError) throw orderError;
            const newOrderId = orderData.id;

            // 2. Insert Order Items
            const orderItemsInsert = items.map(item => ({
                order_id: newOrderId,
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_purchase: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsInsert);

            if (itemsError) throw itemsError;

            // 3. Success -> Clear Cart -> Step 3
            setOrderId(newOrderId);
            clearCart();
            setStep(3);
        } catch (error) {
            console.error("Order submission failed:", error);
            alert("Order failed, try again");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContinueToStep2 = () => {
        if (deliveryType === 'delivery') {
            if (!/^\d{10}$/.test(phone)) {
                setStep1Error("Please enter a valid 10-digit phone number");
                return;
            }
            if (!houseNo.trim()) {
                setStep1Error("Please enter your Flat / House / Apartment No.");
                return;
            }
        }
        setStep1Error('');
        setStep(2);
    };

    const slideVariants = {
        enter: { x: '100%', opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: '-100%', opacity: 0 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => step !== 3 && onClose()} // Prevent closing by clicking background if order placed
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[4px]"
                    />

                    {/* Bottom Sheet Drawer */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag={step !== 3 ? "y" : false} // Disable drag on success step
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.05}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100 && step !== 3) {
                                onClose();
                            }
                        }}
                        className="fixed bottom-0 left-0 right-0 z-[101] bg-white w-full mx-auto md:max-w-[480px] xl:max-w-[480px] origin-bottom rounded-t-[24px] shadow-2xl flex flex-col"
                        style={{ maxHeight: '90vh' }}
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                            <div className="w-10 h-1 rounded-full bg-gray-300" />
                        </div>

                        {/* Header (Hidden on step 3) */}
                        {step !== 3 && (
                            <div className="px-5 pb-3 flex-shrink-0">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xl font-bold text-gray-900">Complete Your Order</h2>
                                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                                        {totalItems} items · ₹{grandTotal}
                                    </span>
                                </div>
                                <div className="h-px bg-green-100 w-full" />
                            </div>
                        )}

                        {/* Step Indicator (Hidden on step 3) */}
                        {step !== 3 && (
                            <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 text-[11px] font-bold uppercase tracking-wider">
                                <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-green-700' : 'text-green-700'}`}>
                                    {step > 1 ? <Check className="w-4 h-4 text-green-600" /> : <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center text-white text-[9px]">1</div>}
                                    <span>Delivery</span>
                                </div>
                                <div className={`h-px flex-1 mx-2 ${step > 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
                                <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-green-700' : 'text-gray-400'}`}>
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                                    <span>Payment</span>
                                </div>
                                <div className="h-px flex-1 mx-2 bg-gray-200" />
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[9px] text-gray-500">3</div>
                                    <span>Confirm</span>
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto relative min-h-[300px] overflow-x-hidden">
                            <AnimatePresence mode="wait" custom={step}>

                                {/* ── STEP 1: DELIVERY ── */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="p-5 flex flex-col gap-6"
                                    >
                                        <div className="flex bg-gray-100 p-1 rounded-xl">
                                            <button
                                                onClick={() => setDeliveryType('delivery')}
                                                className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${deliveryType === 'delivery' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                            >
                                                <Truck className="w-4 h-4" /> Delivery
                                            </button>
                                            <button
                                                onClick={() => setDeliveryType('pickup')}
                                                className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${deliveryType === 'pickup' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                            >
                                                <Store className="w-4 h-4" /> Pickup
                                            </button>
                                        </div>

                                        {deliveryType === 'delivery' ? (
                                            <div className="space-y-4">
                                                {step1Error && (
                                                    <div className="text-red-500 text-sm font-semibold bg-red-50 p-3 rounded-lg border border-red-200">
                                                        {step1Error}
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Your Phone Number</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium border-r pr-2 border-gray-300 pointer-events-none">+91</span>
                                                        <input
                                                            type="tel"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                            placeholder="9876543210"
                                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-14 pr-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Flat / House / Apartment No.</label>
                                                    <input
                                                        type="text"
                                                        value={houseNo}
                                                        onChange={(e) => setHouseNo(e.target.value)}
                                                        placeholder="e.g. 12B, 2nd Floor"
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Delivery Area</label>
                                                    <AnimatePresence mode="wait">
                                                        {!isChangingLocation ? (
                                                            <motion.div
                                                                key="static"
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-3"
                                                            >
                                                                <MapPin className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{locationData?.displayName || 'Unknown Location'}</p>
                                                                    <button onClick={() => setIsChangingLocation(true)} className="text-xs text-green-600 font-bold mt-1 underline">Change</button>
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            <motion.div
                                                                key="edit"
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                                                            >
                                                                <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                                                                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                                                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                                                        <span className="text-sm text-gray-600 truncate">{locationData?.displayName || 'Unknown'}</span>
                                                                    </div>
                                                                    <button onClick={() => setIsChangingLocation(false)} className="shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>

                                                                <div className="p-3">
                                                                    <div className="relative mb-3">
                                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                                        <input
                                                                            type="text"
                                                                            value={locSearchQuery}
                                                                            onChange={(e) => setLocSearchQuery(e.target.value)}
                                                                            placeholder="Search area or pincode..."
                                                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500 transition-colors"
                                                                        />
                                                                        {isSearchingLoc && (
                                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                                <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {locResults.length > 0 && (
                                                                        <div className="mb-3 max-h-[120px] overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                                                                            {locResults.map((res: any) => (
                                                                                <button
                                                                                    key={res.place_id}
                                                                                    onClick={() => handleSelectLocation(res)}
                                                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors flex items-start gap-2"
                                                                                >
                                                                                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                                                                    <span className="text-gray-700 line-clamp-2">{res.display_name}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    <button
                                                                        onClick={() => {
                                                                            getCurrentLocation();
                                                                            setIsChangingLocation(false);
                                                                            setLocSearchQuery('');
                                                                            setLocResults([]);
                                                                        }}
                                                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-green-700 font-semibold text-sm bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
                                                                    >
                                                                        <Navigation className="w-4 h-4" />
                                                                        Use my current GPS location
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Instructions (Optional)</label>
                                                    <textarea
                                                        value={instructions}
                                                        onChange={(e) => setInstructions(e.target.value)}
                                                        placeholder="E.g. Ring the bell, leave at door..."
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow min-h-[80px] resize-none"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Pickup Location</label>
                                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                                        <div className="flex gap-3">
                                                            <Store className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="font-bold text-gray-900">{nearestOutlet?.name || 'Nile Cafe Main'}</p>
                                                                <p className="text-sm text-gray-600 mt-1 leading-snug">{nearestOutlet?.address || 'Store Address'}</p>
                                                                <p className="text-xs text-green-700 font-semibold mt-2 bg-green-100 inline-block px-2 py-0.5 rounded">You'll pick up from this branch</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-2 pb-6">
                                            <button
                                                onClick={handleContinueToStep2}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98]"
                                            >
                                                Continue →
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── STEP 2: PAYMENT ── */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="p-5 flex flex-col gap-6"
                                    >
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setPaymentMethod('cash')}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-[1.5px] transition-all bg-white ${paymentMethod === 'cash' ? 'border-green-600 bg-green-50 shadow-sm' : 'border-[#e5e5e5] hover:border-green-300'}`}
                                            >
                                                <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
                                                <span className={`text-sm font-bold ${paymentMethod === 'cash' ? 'text-green-800' : 'text-gray-600'}`}>Cash on Delivery</span>
                                            </button>

                                            <button
                                                onClick={() => setPaymentMethod('upi')}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-[1.5px] transition-all bg-white ${paymentMethod === 'upi' ? 'border-green-600 bg-green-50 shadow-sm' : 'border-[#e5e5e5] hover:border-green-300'}`}
                                            >
                                                <Smartphone className={`w-8 h-8 ${paymentMethod === 'upi' ? 'text-green-600' : 'text-gray-400'}`} />
                                                <span className={`text-sm font-bold ${paymentMethod === 'upi' ? 'text-green-800' : 'text-gray-600'}`}>UPI</span>
                                            </button>

                                            <button
                                                onClick={() => setPaymentMethod('card')}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-[1.5px] transition-all bg-white ${paymentMethod === 'card' ? 'border-green-600 bg-green-50 shadow-sm' : 'border-[#e5e5e5] hover:border-green-300'}`}
                                            >
                                                <CreditCard className={`w-8 h-8 ${paymentMethod === 'card' ? 'text-green-600' : 'text-gray-400'}`} />
                                                <span className={`text-sm font-bold ${paymentMethod === 'card' ? 'text-green-800' : 'text-gray-600'}`}>Card</span>
                                            </button>

                                            <button
                                                onClick={() => setPaymentMethod('wallet')}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-[1.5px] transition-all bg-white ${paymentMethod === 'wallet' ? 'border-green-600 bg-green-50 shadow-sm' : 'border-[#e5e5e5] hover:border-green-300'}`}
                                            >
                                                <Wallet className={`w-8 h-8 ${paymentMethod === 'wallet' ? 'text-green-600' : 'text-gray-400'}`} />
                                                <span className={`text-sm font-bold ${paymentMethod === 'wallet' ? 'text-green-800' : 'text-gray-600'}`}>Wallet</span>
                                            </button>
                                        </div>

                                        {/* Expanding Fields */}
                                        <AnimatePresence>
                                            {paymentMethod === 'upi' && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-2">
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Enter UPI ID</label>
                                                        <input
                                                            type="text"
                                                            value={upiId}
                                                            onChange={(e) => setUpiId(e.target.value)}
                                                            placeholder="example@upi"
                                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                            {paymentMethod === 'card' && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-2 space-y-3">
                                                        <input type="text" placeholder="Card Number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow" />
                                                        <div className="flex gap-3">
                                                            <input type="text" placeholder="MM/YY" className="w-1/2 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow" />
                                                            <input type="text" placeholder="CVV" className="w-1/2 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="pt-4 pb-6 mt-auto flex flex-col items-center">
                                            <button
                                                disabled={!paymentMethod || isSubmitting}
                                                onClick={handlePlaceOrder}
                                                className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2
                                                    ${!paymentMethod ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'}
                                                `}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Placing Order...
                                                    </>
                                                ) : (
                                                    <>Place Order →</>
                                                )}
                                            </button>
                                            <div className="flex items-center gap-1.5 mt-3 text-gray-400">
                                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                                <span className="text-xs font-semibold uppercase tracking-wider">Secure Checkout</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── STEP 3: SUCCESS ── */}
                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                        className="p-8 flex flex-col items-center justify-center h-full text-center pb-12"
                                    >
                                        <div className="mb-6 relative">
                                            <svg className="w-24 h-24 text-green-500" viewBox="0 0 100 100">
                                                <motion.circle
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                                                />
                                                <motion.path
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
                                                    d="M30 50 L45 65 L70 35" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
                                                />
                                            </svg>
                                        </div>

                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed! 🎉</h2>

                                        {orderId && (
                                            <div className="bg-green-50 border border-green-200 text-green-800 font-mono font-bold px-4 py-1.5 rounded-full text-sm mb-4">
                                                #{orderId.split('-')[0].toUpperCase()}
                                            </div>
                                        )}

                                        <p className="text-gray-500 font-medium mb-8">
                                            {deliveryType === 'delivery'
                                                ? "Estimated delivery: 30-45 mins 🛵"
                                                : "Ready for pickup in 15 mins 🏪"}
                                        </p>

                                        <div className="flex flex-col w-full gap-3">
                                            <button
                                                onClick={() => {
                                                    onClose();
                                                    navigate(`/orders/${orderId}`);
                                                }}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98]"
                                            >
                                                Track Order
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onClose();
                                                    navigate('/menu');
                                                }}
                                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98]"
                                            >
                                                Continue Shopping
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CheckoutDrawer;
