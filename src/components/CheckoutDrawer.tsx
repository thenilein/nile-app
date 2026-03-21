import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Store, Banknote, CreditCard, Wallet, Smartphone, ShieldCheck, Navigation, AlertCircle, CheckCircle2, ChevronLeft, Loader2, MapPin } from 'lucide-react';
import { CouponSection } from './CouponSection';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import { DEFAULT_CHECKOUT_MAP_CENTER } from '../lib/checkoutMapConstants.ts';

const CheckoutDeliveryMap = lazy(() =>
    import('./CheckoutDeliveryMap.tsx').then((m) => ({ default: m.CheckoutDeliveryMap })),
);
import { mapboxReverseGeocode, mergeFormattedAddress } from '../lib/mapboxGeocoding.ts';
import { findMatchingSavedAddress } from '../lib/addressCoordMatch.ts';
import { resolveGpsCoordsToLocationData } from '../lib/resolveGpsToLocationData.ts';
import { PhoneOtpAuthFlow } from './PhoneOtpAuthFlow.tsx';

type AddressType = 'home' | 'work' | 'other';

type SavedAddressRow = {
    id: string;
    formatted_address: string | null;
    latitude: number | null;
    longitude: number | null;
    street: string | null;
    locality: string | null;
    city: string | null;
    state: string | null;
    recipient_name: string | null;
    phone: string | null;
    address_type: string | null;
};

const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
    home: 'Home',
    work: 'Work',
    other: 'Other',
};

function normalizeIndiaPhone(raw: string): string {
    return raw.replace(/\D/g, '').slice(-10);
}

function isValidIndiaMobile(digits: string): boolean {
    return /^[6-9]\d{9}$/.test(digits);
}

export interface CheckoutFlowContentProps {
    visible: boolean;
    orderType?: DeliveryType;
    onOrderTypeChange?: (t: DeliveryType) => void;
    /** Return to cart list inside the same sheet */
    onBackToCart: () => void;
    /** Close cart drawer / panel */
    onDismiss: () => void;
}

type DeliveryType = 'delivery' | 'pickup';
type PaymentMethod = 'cash' | 'upi' | 'card' | 'wallet';

/** 0 sign-in → 1 address → 2 payment → 3 confirmation */
type CheckoutStep = 0 | 1 | 2 | 3;

const FREE_DELIVERY_THRESHOLD = 300;
const DELIVERY_FEE = 30;

// ── Toast ──────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: { type: 'error' | 'success'; text: string } | null }> = ({ msg }) => (
    <AnimatePresence>
        {msg && (
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 max-w-[90vw] ${msg.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}
            >
                {msg.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span className="text-sm font-semibold">{msg.text}</span>
            </motion.div>
        )}
    </AnimatePresence>
);

export function CheckoutFlowContent({ visible, orderType, onOrderTypeChange, onBackToCart, onDismiss }: CheckoutFlowContentProps) {
    const { totalItems, totalPrice, items, clearCart } = useCart();
    const { user, isLoading: authLoading } = useAuth();
    const { locationData, nearestOutlet, setLocationData } = useLocation();
    const navigate = useNavigate();

    const [step, setStep] = useState<CheckoutStep>(1);
    /** 1 = forward (next), -1 = back — drives slide direction for step panels + title */
    const [slideDir, setSlideDir] = useState(1);
    const checkoutBootstrapped = useRef(false);

    const transitionTo = useCallback((next: CheckoutStep, dir: number) => {
        setSlideDir(dir);
        setStep(next);
    }, []);
    const [deliveryType, setDeliveryType] = useState<DeliveryType>(orderType ?? 'delivery');

    useEffect(() => {
        if (!visible) return;
        if (!orderType) return;
        setDeliveryType(orderType);
    }, [visible, orderType]);

    const [recipientName, setRecipientName] = useState('');
    const [deliveryPhone, setDeliveryPhone] = useState('');
    const [addressType, setAddressType] = useState<AddressType>('home');
    const [streetName, setStreetName] = useState('');
    const [houseNo, setHouseNo] = useState('');
    const [instructions, setInstructions] = useState('');
    const [step1Error, setStep1Error] = useState('');

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [upiId, setUpiId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState<string | null>(null);
    const [couponDiscount, setCouponDiscount] = useState(0);

    const [mapBootstrap, setMapBootstrap] = useState<{ lat: number; lng: number } | null>(null);
    const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<SavedAddressRow[]>([]);
    const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);
    const [checkoutGpsLoading, setCheckoutGpsLoading] = useState(false);
    /** When pin matches a saved address, start collapsed (no map/inputs) until user taps Change address. */
    const [deliveryFormExpanded, setDeliveryFormExpanded] = useState(false);

    const [toastMsg, setToastMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const showToast = useCallback((type: 'error' | 'success', text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3000);
    }, []);

    useLayoutEffect(() => {
        if (!visible) {
            checkoutBootstrapped.current = false;
            return;
        }
        if (authLoading) return;
        if (!checkoutBootstrapped.current) {
            checkoutBootstrapped.current = true;
            transitionTo(user?.id ? 1 : 0, 1);
        }
    }, [visible, authLoading, user?.id, transitionTo]);

    useEffect(() => {
        if (!visible || !user?.id || step !== 0) return;
        transitionTo(1, 1);
    }, [visible, user?.id, step, transitionTo]);

    /** Pin matches an existing saved row (within ~45m) — no need to save again. */
    const matchingSavedForPin = useMemo(() => {
        if (!locationData || savedAddresses.length === 0) return undefined;
        return findMatchingSavedAddress(savedAddresses, locationData.latitude, locationData.longitude);
    }, [locationData, savedAddresses]);

    const deliveryCompactSaved = Boolean(
        user?.id &&
            !loadingSavedAddresses &&
            matchingSavedForPin &&
            !deliveryFormExpanded
    );

    // Initialise map anchor when opening address step (delivery)
    useEffect(() => {
        if (!visible || step !== 1 || deliveryType !== 'delivery') return;
        if (mapBootstrap !== null) return;
        if (locationData) {
            setMapBootstrap({ lat: locationData.latitude, lng: locationData.longitude });
        } else {
            setMapBootstrap({ ...DEFAULT_CHECKOUT_MAP_CENTER });
        }
    }, [visible, step, deliveryType, locationData, mapBootstrap]);

    // Load saved addresses for signed-in user
    useEffect(() => {
        if (!visible || step !== 1 || !user?.id) {
            setSavedAddresses([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoadingSavedAddresses(true);
            const { data, error } = await supabase
                .from("addresses")
                .select(
                    "id, formatted_address, latitude, longitude, street, locality, city, state, recipient_name, phone, address_type"
                )
                .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
                .order("created_at", { ascending: false })
                .limit(12);
            if (!cancelled && !error && data) setSavedAddresses(data as SavedAddressRow[]);
            if (!cancelled) setLoadingSavedAddresses(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [visible, step, user?.id]);

    // Prefill delivery phone from profile once per open
    useEffect(() => {
        if (!visible || step !== 1 || deliveryType !== 'delivery') return;
        const fromUser =
            (user?.user_metadata?.phone as string | undefined) || (user?.phone as string | undefined) || '';
        if (!fromUser) return;
        setDeliveryPhone((prev) => (prev.trim() ? prev : normalizeIndiaPhone(fromUser)));
    }, [visible, step, deliveryType, user?.id]);

    // Reset when checkout sheet hides
    useEffect(() => {
        if (!visible) {
            setTimeout(() => {
                setSlideDir(1);
                setStep(0);
                setPaymentMethod(null);
                setOrderId(null);
                setDeliveryType(orderType ?? 'delivery');
                setIsSubmitting(false);
                setRecipientName('');
                setDeliveryPhone('');
                setAddressType('home');
                setStreetName('');
                setHouseNo('');
                setInstructions('');
                setStep1Error('');
                setCouponCode(null);
                setCouponDiscount(0);
                setMapBootstrap(null);
                setFlyToTarget(null);
                setSavedAddresses([]);
                setCheckoutGpsLoading(false);
                setDeliveryFormExpanded(false);
            }, 300);
        }
    }, [visible, orderType]);

    const applySavedAddress = useCallback((row: SavedAddressRow) => {
        if (row.latitude == null || row.longitude == null) return;
        const lat = row.latitude;
        const lng = row.longitude;
        setLocationData({
            latitude: lat,
            longitude: lng,
            city: row.city || "",
            state: row.state || "",
            displayName: row.formatted_address || `${row.street || ""}, ${row.city || ""}`.replace(/^,\s*|,\s*$/g, "").trim() || "Saved address",
        });
        if (row.recipient_name) setRecipientName(row.recipient_name);
        if (row.phone) setDeliveryPhone(normalizeIndiaPhone(row.phone));
        if (row.address_type === 'home' || row.address_type === 'work' || row.address_type === 'other') {
            setAddressType(row.address_type);
        }
        if (row.street) setStreetName(row.street);
        setHouseNo(row.locality || '');
        setFlyToTarget({ lat, lng });
    }, [setLocationData]);

    // Keep order fields in sync when using compact saved-address checkout
    useEffect(() => {
        if (!visible || step !== 1 || deliveryType !== 'delivery') return;
        if (!deliveryCompactSaved || !matchingSavedForPin) return;
        applySavedAddress(matchingSavedForPin);
    }, [visible, step, deliveryType, deliveryCompactSaved, matchingSavedForPin, applySavedAddress]);

    const handleMapPositionChange = useCallback(
        (lat: number, lng: number) => {
            setLocationData({
                latitude: lat,
                longitude: lng,
                city: "",
                state: "",
                displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            });
        },
        [setLocationData]
    );

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            showToast("error", "Geolocation is not supported in this browser");
            return;
        }
        setCheckoutGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const lat = coords.latitude;
                const lng = coords.longitude;
                const data = await resolveGpsCoordsToLocationData(lat, lng, user?.id);
                setLocationData(data);
                setFlyToTarget({ lat, lng });
                setCheckoutGpsLoading(false);
            },
            () => {
                setCheckoutGpsLoading(false);
                showToast("error", "Could not get your location. Allow access or set the pin on the map.");
            },
            { timeout: 12000, enableHighAccuracy: true }
        );
    };

    const saveAddressToAccount = async () => {
        if (!user?.id) {
            showToast("error", "Sign in to save addresses");
            return;
        }
        if (!locationData) {
            showToast("error", "Set a location on the map first");
            return;
        }
        const phoneDigits = normalizeIndiaPhone(deliveryPhone);
        if (!recipientName.trim()) {
            showToast("error", "Enter the recipient name");
            return;
        }
        if (!isValidIndiaMobile(phoneDigits)) {
            showToast("error", "Enter a valid 10-digit mobile number");
            return;
        }
        if (!streetName.trim()) {
            showToast("error", "Enter street / road name");
            return;
        }
        const duplicate = findMatchingSavedAddress(
            savedAddresses,
            locationData.latitude,
            locationData.longitude
        );
        if (duplicate) {
            showToast("success", "This location is already in your saved addresses");
            return;
        }
        setSavingAddress(true);
        try {
            const coordFallback = `${locationData.latitude.toFixed(5)}, ${locationData.longitude.toFixed(5)}`;
            const geo = await mapboxReverseGeocode(locationData.latitude, locationData.longitude);
            const { formattedAddress, city: geoCity, state: geoState } = mergeFormattedAddress({
                houseNo: houseNo,
                street: streetName,
                geocode: geo,
                coordFallback,
            });
            const cityOut = geoCity || locationData.city || null;
            const stateOut = geoState || locationData.state || null;

            const { error } = await supabase.from("addresses").insert({
                user_id: user.id,
                profile_id: user.id,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                formatted_address: formattedAddress,
                recipient_name: recipientName.trim(),
                phone: phoneDigits,
                address_type: addressType,
                street: streetName.trim(),
                locality: houseNo.trim() || null,
                city: cityOut,
                state: stateOut,
                district: geoCity || locationData.city || null,
            });
            if (error) throw error;
            setLocationData({
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                city: geoCity || locationData.city || "",
                state: geoState || locationData.state || "",
                displayName: formattedAddress,
            });
            showToast("success", "Address saved");
            const { data } = await supabase
                .from("addresses")
                .select(
                    "id, formatted_address, latitude, longitude, street, locality, city, state, recipient_name, phone, address_type"
                )
                .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
                .order("created_at", { ascending: false })
                .limit(12);
            if (data) setSavedAddresses(data as SavedAddressRow[]);
        } catch {
            showToast("error", "Could not save address");
        } finally {
            setSavingAddress(false);
        }
    };

    // Confetti on confirmation
    useEffect(() => {
        if (step === 3) {
            const end = Date.now() + 1500;
            const colors = ['#16a34a', '#4ade80', '#ffffff'];
            (function frame() {
                confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
                confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }
    }, [step]);

    const handleApplyCoupon = (code: string, discount: number) => {
        if (!code) {
            setCouponCode(null);
            setCouponDiscount(0);
        } else {
            setCouponCode(code);
            setCouponDiscount(discount);
        }
    };

    // ── Continue to payment step ────────────────────────────────────────
    const handleContinueToPayment = () => {
        if (!user?.id) {
            showToast('error', 'Sign in to continue');
            transitionTo(0, -1);
            return;
        }
        if (deliveryType === "delivery") {
            if (!locationData?.latitude || !locationData?.longitude) {
                setStep1Error("Set your delivery location on the map.");
                return;
            }
            if (!recipientName.trim()) {
                setStep1Error("Enter the recipient name.");
                return;
            }
            const phoneDigits = normalizeIndiaPhone(deliveryPhone);
            if (!isValidIndiaMobile(phoneDigits)) {
                setStep1Error("Enter a valid 10-digit mobile number.");
                return;
            }
            if (!streetName.trim()) {
                setStep1Error("Enter street / road name.");
                return;
            }
        }
        setStep1Error("");
        transitionTo(2, 1);
    };

    // ── Order placement ────────────────────────────────────────────────
    const handlePlaceOrder = async () => {
        if (!user?.id) {
            showToast('error', 'Sign in to place your order');
            transitionTo(0, -1);
            return;
        }
        if (!paymentMethod) return;
        if (paymentMethod === 'upi' && !upiId.trim()) { alert('Please enter UPI ID'); return; }
        setIsSubmitting(true);
        try {
            const userId = user.id;
            const profilePhone =
                (user?.user_metadata?.phone as string | undefined) ||
                (user?.phone as string | undefined) ||
                null;
            const orderPhone =
                deliveryType === "delivery"
                    ? normalizeIndiaPhone(deliveryPhone) || profilePhone
                    : profilePhone;
            const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
                profile_id: userId,
                total_amount: grandTotal,
                status: 'pending',
                order_type: deliveryType,
                notes: instructions || null,
                payment_method: paymentMethod,
                phone: orderPhone,
                delivery_address: deliveryType === 'delivery' ? {
                    recipient_name: recipientName.trim(),
                    phone: normalizeIndiaPhone(deliveryPhone),
                    address_type: addressType,
                    street: streetName.trim(),
                    house_no: houseNo.trim() || null,
                    map_reference: locationData?.displayName || '',
                    area: locationData?.city || '',
                    city: locationData?.state || '',
                    full_address: [houseNo.trim(), streetName.trim(), locationData?.displayName || ''].filter(Boolean).join(', '),
                } : null
            }]).select().single();
            if (orderError) throw orderError;
            const newOrderId = orderData.id;
            const orderItemsInsert = items.map(item => ({ order_id: newOrderId, product_id: item.product_id, quantity: item.quantity, price_at_purchase: item.price }));
            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsInsert);
            if (itemsError) throw itemsError;
            setOrderId(newOrderId);
            clearCart();
            transitionTo(3, 1);
        } catch (error) {
            console.error('Order submission failed:', error);
            alert('Order failed, try again');
        } finally {
            setIsSubmitting(false);
        }
    };

    const gst = Math.round(totalPrice * 0.05);
    const delFee = deliveryType === 'delivery' ? (totalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE) : 0;
    const discountAmt = Math.round(couponCode ? couponDiscount : 0);
    const grandTotal = Math.round(totalPrice) + gst + delFee - discountAmt;

    const easeSmooth = [0.22, 1, 0.36, 1] as const;

    const slideVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? '100%' : '-100%',
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.38, ease: easeSmooth },
        },
        exit: (dir: number) => ({
            x: dir > 0 ? '-100%' : '100%',
            opacity: 0,
            transition: { duration: 0.3, ease: easeSmooth },
        }),
    };

    const titleVariants = {
        initial: (dir: number) => ({
            opacity: 0,
            y: dir > 0 ? 10 : -8,
        }),
        animate: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.32, ease: easeSmooth },
        },
        exit: (dir: number) => ({
            opacity: 0,
            y: dir > 0 ? -8 : 8,
            transition: { duration: 0.22, ease: easeSmooth },
        }),
    };

    const handleHeaderBack = useCallback(() => {
        if (step === 2) {
            transitionTo(1, -1);
            return;
        }
        setStep1Error('');
        localStorage.removeItem('pendingCheckout');
        onBackToCart();
    }, [step, transitionTo, onBackToCart]);

    if (!visible) return null;

    return (
        <>
            <Toast msg={toastMsg} />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
                {step !== 3 && (
                    <div className="flex-shrink-0 border-b border-gray-100 px-4 pb-3 pt-3">
                        <div className="flex items-center justify-between gap-2">
                            <motion.button
                                type="button"
                                onClick={handleHeaderBack}
                                whileTap={{ scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                                className="-ml-1 flex min-h-[44px] min-w-[44px] items-center gap-0.5 rounded-xl py-2 pl-1 pr-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 hover:text-green-800 md:min-h-0 md:min-w-0"
                                aria-label={step === 2 ? 'Back to address' : 'Back to cart'}
                            >
                                <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2.25} />
                                <span>{step === 2 ? 'Address' : 'Cart'}</span>
                            </motion.button>
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <AnimatePresence mode="wait" custom={slideDir}>
                            <motion.h2
                                key={step}
                                custom={slideDir}
                                variants={titleVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="mt-1 text-lg font-bold tracking-tight text-gray-900"
                            >
                                {step === 0 ? 'Sign in' : step === 1 ? 'Confirm address' : 'Payment'}
                            </motion.h2>
                        </AnimatePresence>
                        <motion.span
                            layout
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            className="mt-2 inline-block rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-800"
                        >
                            {totalItems} items · ₹{grandTotal}
                        </motion.span>
                    </div>
                )}

                <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                            <AnimatePresence mode="wait" custom={slideDir} initial={false}>

                                {/* ── STEP 0: Sign in (before address) ── */}
                                {step === 0 && (
                                    <motion.div
                                        key="step0signin"
                                        custom={slideDir}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="flex flex-col gap-5 px-5 pb-6 pt-2"
                                    >
                                        {authLoading ? (
                                            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                                                <Loader2 className="h-10 w-10 animate-spin text-green-600" />
                                                <p className="text-sm font-medium text-gray-600">Checking your session…</p>
                                            </div>
                                        ) : (
                                            <PhoneOtpAuthFlow
                                                active={visible && step === 0 && !authLoading}
                                                showToast={showToast}
                                                variant="embedded"
                                                syncPendingCheckoutEvent={false}
                                                onAuthenticated={() => transitionTo(1, 1)}
                                            />
                                        )}
                                    </motion.div>
                                )}

                                {/* ── STEP 1: Confirm address & delivery ── */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        custom={slideDir}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="flex flex-col gap-5 px-5 pb-6 pt-2"
                                    >
                                        {step1Error && (
                                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-500">
                                                {step1Error}
                                            </div>
                                        )}

                                        <div className="flex rounded-xl bg-gray-100 p-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDeliveryType('delivery');
                                                    setDeliveryFormExpanded(false);
                                                    onOrderTypeChange?.('delivery');
                                                }}
                                                className={`flex h-[48px] flex-1 items-center justify-center gap-2 rounded-lg text-[15px] font-bold transition-all md:h-auto md:py-2.5 md:text-sm ${deliveryType === 'delivery' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                            >
                                                <Truck className="h-4 w-4" /> Delivery
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDeliveryType('pickup');
                                                    onOrderTypeChange?.('pickup');
                                                }}
                                                className={`flex h-[48px] flex-1 items-center justify-center gap-2 rounded-lg text-[15px] font-bold transition-all md:h-auto md:py-2.5 md:text-sm ${deliveryType === 'pickup' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                            >
                                                <Store className="h-4 w-4" /> Pickup
                                            </button>
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {deliveryType === 'delivery' ? (
                                                deliveryCompactSaved && matchingSavedForPin ? (
                                                    <motion.div
                                                        key="delivery-compact-saved"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                        className="space-y-4 overflow-hidden"
                                                    >
                                                        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                                                            <div className="flex gap-3">
                                                                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden />
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-green-800">
                                                                        Delivering to saved address
                                                                    </p>
                                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                        <span className="font-semibold text-gray-900">
                                                                            {matchingSavedForPin.recipient_name || 'Saved address'}
                                                                        </span>
                                                                        {matchingSavedForPin.address_type &&
                                                                            (matchingSavedForPin.address_type === 'home' ||
                                                                                matchingSavedForPin.address_type === 'work' ||
                                                                                matchingSavedForPin.address_type === 'other') && (
                                                                                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800">
                                                                                    {ADDRESS_TYPE_LABELS[matchingSavedForPin.address_type]}
                                                                                </span>
                                                                            )}
                                                                    </div>
                                                                    <p className="mt-2 text-sm leading-snug text-gray-700">
                                                                        {matchingSavedForPin.formatted_address ||
                                                                            [matchingSavedForPin.locality, matchingSavedForPin.street, matchingSavedForPin.city]
                                                                                .filter(Boolean)
                                                                                .join(', ') ||
                                                                            '—'}
                                                                    </p>
                                                                    {matchingSavedForPin.phone && (
                                                                        <p className="mt-2 text-xs font-medium text-gray-600">
                                                                            +91 {normalizeIndiaPhone(matchingSavedForPin.phone)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeliveryFormExpanded(true)}
                                                            className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-green-700 transition-colors hover:bg-gray-50"
                                                        >
                                                            Change address
                                                        </button>
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                                                                Instructions (optional)
                                                            </label>
                                                            <textarea
                                                                value={instructions}
                                                                onChange={(e) => setInstructions(e.target.value)}
                                                                placeholder="E.g. Ring the bell, leave at door…"
                                                                className="min-h-[80px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[16px] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 md:min-h-[72px] md:text-sm"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="delivery-fields"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                        className="space-y-4 overflow-hidden"
                                                    >
                                                        {mapBootstrap && (
                                                            <Suspense
                                                                fallback={
                                                                    <div className="flex h-[260px] items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">
                                                                        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                                                                    </div>
                                                                }
                                                            >
                                                                <CheckoutDeliveryMap
                                                                    centerLat={mapBootstrap.lat}
                                                                    centerLng={mapBootstrap.lng}
                                                                    onCenterChange={handleMapPositionChange}
                                                                    flyTo={flyToTarget}
                                                                    onFlyToComplete={() => setFlyToTarget(null)}
                                                                    className="h-[260px]"
                                                                />
                                                            </Suspense>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={handleUseMyLocation}
                                                            disabled={checkoutGpsLoading}
                                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-50 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-60"
                                                        >
                                                            {checkoutGpsLoading ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Navigation className="h-4 w-4" />
                                                            )}
                                                            {checkoutGpsLoading ? 'Getting location…' : 'Use my current location'}
                                                        </button>

                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Recipient name</label>
                                                            <input
                                                                type="text"
                                                                value={recipientName}
                                                                onChange={(e) => setRecipientName(e.target.value)}
                                                                placeholder="Full name"
                                                                autoComplete="name"
                                                                className="h-[52px] w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-[16px] transition-shadow focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 md:h-[48px] md:text-sm"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Phone number</label>
                                                            <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
                                                                <span className="flex shrink-0 items-center border-r border-gray-200 bg-gray-100 px-3 text-sm font-medium text-gray-600">
                                                                    +91
                                                                </span>
                                                                <input
                                                                    type="tel"
                                                                    inputMode="numeric"
                                                                    value={deliveryPhone}
                                                                    onChange={(e) => setDeliveryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                                    placeholder="9876543210"
                                                                    autoComplete="tel"
                                                                    className="min-w-0 flex-1 bg-transparent py-3 pl-3 pr-3 text-[16px] focus:outline-none md:text-sm"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Save as</label>
                                                            <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
                                                                {(['home', 'work', 'other'] as const).map((t) => (
                                                                    <button
                                                                        key={t}
                                                                        type="button"
                                                                        onClick={() => setAddressType(t)}
                                                                        className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                                                                            addressType === t
                                                                                ? 'bg-green-600 text-white shadow-sm'
                                                                                : 'text-gray-600 hover:text-gray-900'
                                                                        }`}
                                                                    >
                                                                        {ADDRESS_TYPE_LABELS[t]}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Street / road name</label>
                                                            <input
                                                                type="text"
                                                                value={streetName}
                                                                onChange={(e) => setStreetName(e.target.value)}
                                                                placeholder="e.g. Gandhi Road, Main Street"
                                                                className="h-[52px] w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-[16px] transition-shadow focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 md:h-[48px] md:text-sm"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                                                                Flat / house / apartment (optional)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={houseNo}
                                                                onChange={(e) => setHouseNo(e.target.value)}
                                                                placeholder="e.g. 12B, 2nd floor"
                                                                className="h-[52px] w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-[16px] transition-shadow focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 md:h-[48px] md:text-sm"
                                                            />
                                                        </div>

                                                        {user?.id && (
                                                            <div>
                                                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Saved addresses</label>
                                                                {loadingSavedAddresses ? (
                                                                    <div className="flex justify-center py-4">
                                                                        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                                                                    </div>
                                                                ) : savedAddresses.length === 0 ? (
                                                                    <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-3 text-xs text-gray-500">
                                                                        No saved addresses yet. Set the pin (search, recent, or GPS), fill the form, then tap Save
                                                                        address.
                                                                    </p>
                                                                ) : (
                                                                    <ul className="space-y-2">
                                                                        {savedAddresses.map((row) => (
                                                                            <li key={row.id}>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => applySavedAddress(row)}
                                                                                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-green-300 hover:bg-green-50/50"
                                                                                >
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        <span className="text-sm font-semibold text-gray-900">
                                                                                            {row.recipient_name || 'Saved address'}
                                                                                        </span>
                                                                                        {row.address_type && (
                                                                                            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800">
                                                                                                {ADDRESS_TYPE_LABELS[row.address_type as AddressType] ||
                                                                                                    row.address_type}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <span className="mt-1 line-clamp-2 block text-sm text-gray-600">
                                                                                        {row.formatted_address ||
                                                                                            [row.locality, row.street, row.city].filter(Boolean).join(', ') ||
                                                                                            '—'}
                                                                                    </span>
                                                                                    {row.phone && (
                                                                                        <span className="mt-0.5 block text-xs text-gray-500">+91 {row.phone}</span>
                                                                                    )}
                                                                                </button>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Instructions (optional)</label>
                                                            <textarea
                                                                value={instructions}
                                                                onChange={(e) => setInstructions(e.target.value)}
                                                                placeholder="E.g. Ring the bell, leave at door…"
                                                                className="min-h-[80px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[16px] focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 md:min-h-[72px] md:text-sm"
                                                            />
                                                        </div>

                                                        {user?.id && matchingSavedForPin && !loadingSavedAddresses ? (
                                                            <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                                                                <p>
                                                                    <span className="font-semibold">Already saved.</span>{' '}
                                                                    This pin matches your saved address
                                                                    {matchingSavedForPin.address_type &&
                                                                    (matchingSavedForPin.address_type === 'home' ||
                                                                        matchingSavedForPin.address_type === 'work' ||
                                                                        matchingSavedForPin.address_type === 'other')
                                                                        ? ` (${ADDRESS_TYPE_LABELS[matchingSavedForPin.address_type]})`
                                                                        : ''}
                                                                    . You can still place the order without saving again.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={saveAddressToAccount}
                                                                disabled={savingAddress}
                                                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-green-600 py-3 text-sm font-bold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-60"
                                                            >
                                                                {savingAddress ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                                {savingAddress ? 'Saving…' : 'Save address'}
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                )
                                            ) : (
                                                <motion.div
                                                    key="pickup-fields"
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="overflow-hidden"
                                                >
                                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Pickup location</label>
                                                    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                                                        <div className="flex gap-3">
                                                            <Store className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                                                            <div>
                                                                <p className="font-bold text-gray-900">{nearestOutlet?.name || 'Nile Cafe Main'}</p>
                                                                <p className="mt-1 text-sm leading-snug text-gray-600">{nearestOutlet?.address || 'Store address'}</p>
                                                                <p className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">You&apos;ll pick up from this branch</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="pb-2 pt-1">
                                            <motion.button
                                                type="button"
                                                onClick={handleContinueToPayment}
                                                whileTap={{ scale: 0.98 }}
                                                whileHover={{ scale: 1.01 }}
                                                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                                                className="h-[56px] w-full rounded-xl bg-green-600 text-[16px] font-bold text-white shadow-lg shadow-green-600/20 transition-colors hover:bg-green-700 md:h-[50px] md:text-[15px]"
                                            >
                                                Continue to payment →
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}


                                {/* ── STEP 2: Payment & coupons ── */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2pay"
                                        custom={slideDir}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="flex flex-col gap-6 px-5 pb-6 pt-2"
                                    >
                                        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Order summary</p>
                                            <div className="flex justify-between text-[13px]">
                                                <span className="text-gray-500">Subtotal</span>
                                                <span className="font-medium text-gray-900">₹{Math.round(totalPrice)}</span>
                                            </div>
                                            <div className="flex justify-between text-[13px]">
                                                <span className="text-gray-500">GST (5%)</span>
                                                <span className="font-medium text-gray-900">₹{gst}</span>
                                            </div>
                                            <div className="flex justify-between text-[13px]">
                                                <span className="text-gray-500">Delivery</span>
                                                {deliveryType === 'pickup' ? (
                                                    <span className="font-semibold text-blue-600">Pickup</span>
                                                ) : delFee === 0 ? (
                                                    <span className="font-bold text-green-600">Free</span>
                                                ) : (
                                                    <span className="font-medium text-gray-900">₹{delFee}</span>
                                                )}
                                            </div>
                                            {couponCode && discountAmt > 0 && (
                                                <div className="flex justify-between text-[13px] font-medium text-green-600">
                                                    <span>Discount ({couponCode})</span>
                                                    <span>−₹{discountAmt}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold">
                                                <span className="text-gray-900">Total</span>
                                                <span className="text-green-700">₹{grandTotal}</span>
                                            </div>
                                        </div>

                                        <CouponSection onApply={handleApplyCoupon} applied={couponCode} />

                                        <div className="grid grid-cols-2 gap-3">
                                            {([
                                                { key: 'cash', label: 'Cash on Delivery', Icon: Banknote },
                                                { key: 'upi', label: 'UPI', Icon: Smartphone },
                                                { key: 'card', label: 'Card', Icon: CreditCard },
                                                { key: 'wallet', label: 'Wallet', Icon: Wallet },
                                            ] as const).map(({ key, label, Icon }) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setPaymentMethod(key)}
                                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-[1.5px] transition-all bg-white ${paymentMethod === key ? 'border-green-600 bg-green-50 shadow-sm' : 'border-[#e5e5e5] hover:border-green-300'}`}
                                                >
                                                    <Icon className={`w-8 h-8 ${paymentMethod === key ? 'text-green-600' : 'text-gray-400'}`} />
                                                    <span className={`text-sm font-bold ${paymentMethod === key ? 'text-green-800' : 'text-gray-600'}`}>{label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <AnimatePresence>
                                            {paymentMethod === 'upi' && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-2">
                                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Enter UPI ID</label>
                                                        <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="example@upi" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 h-[52px] md:h-[48px] text-[16px] md:text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow" />
                                                    </div>
                                                </motion.div>
                                            )}
                                            {paymentMethod === 'card' && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-2 space-y-3">
                                                        <input type="text" placeholder="Card Number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 h-[52px] md:h-[48px] text-[16px] md:text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow" />
                                                        <div className="flex gap-3">
                                                            <input type="text" placeholder="MM/YY" className="w-1/2 bg-gray-50 border border-gray-200 rounded-xl px-4 h-[52px] md:h-[48px] text-[16px] md:text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow" />
                                                            <input type="text" placeholder="CVV" className="w-1/2 bg-gray-50 border border-gray-200 rounded-xl px-4 h-[52px] md:h-[48px] text-[16px] md:text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="mt-auto flex flex-col items-center pb-2 pt-4">
                                            <motion.button
                                                type="button"
                                                disabled={!paymentMethod || isSubmitting}
                                                onClick={handlePlaceOrder}
                                                whileTap={!paymentMethod || isSubmitting ? undefined : { scale: 0.98 }}
                                                whileHover={!paymentMethod || isSubmitting ? undefined : { scale: 1.01 }}
                                                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                                                className={`flex h-[56px] w-full items-center justify-center gap-2 rounded-xl text-[16px] font-bold shadow-lg md:h-[50px] md:text-[15px] ${!paymentMethod ? 'cursor-not-allowed bg-gray-200 text-gray-400 shadow-none' : 'bg-green-600 text-white shadow-green-600/20 transition-colors hover:bg-green-700'}`}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Placing Order...
                                                    </>
                                                ) : (
                                                    <>Place Order →</>
                                                )}
                                            </motion.button>
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
                                        key="step3ok"
                                        custom={slideDir}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="flex h-full flex-col items-center justify-center px-8 pb-12 pt-6 text-center"
                                    >
                                        <div className="mb-6 relative">
                                            <svg className="w-24 h-24 text-green-500" viewBox="0 0 100 100">
                                                <motion.circle initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                                                <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }} d="M30 50 L45 65 L70 35" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed! 🎉</h2>
                                        {orderId && (
                                            <div className="bg-green-50 border border-green-200 text-green-800 font-mono font-bold px-4 py-1.5 rounded-full text-sm mb-4">
                                                #{orderId.split('-')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <p className="text-gray-500 font-medium mb-8">
                                            {deliveryType === 'delivery' ? 'Estimated delivery: 30-45 mins 🛵' : 'Ready for pickup in 15 mins 🏪'}
                                        </p>
                                        <div className="flex flex-col w-full gap-3">
                                            <button onClick={() => { onDismiss(); navigate(`/orders/${orderId}`); }} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-[56px] md:h-[50px] text-[16px] md:text-[15px] rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98]">
                                                Track Order
                                            </button>
                                            <button onClick={() => { onDismiss(); navigate('/menu'); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold h-[56px] md:h-[50px] text-[16px] md:text-[15px] rounded-xl transition-all active:scale-[0.98]">
                                                Continue Shopping
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                </div>
            </div>
        </>
    );
}
