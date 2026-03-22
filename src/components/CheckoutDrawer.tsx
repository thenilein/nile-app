import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Truck, Store, Banknote, CreditCard, Wallet, Smartphone, ShieldCheck, Check, Search, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import ProfileCompletionForm from './ProfileCompletionForm';
import {
    completeProfile as completeProfileCore,
    sendOtp as sendOtpCore,
    verifyOtp as verifyOtpCore,
    resendOtp as resendOtpCore
} from '../lib/msg91Otp';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';

<<<<<<< Updated upstream
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

interface CheckoutDrawerProps {
    isOpen: boolean;
    onClose: () => void;
=======
const CheckoutDeliveryMap = lazy(() =>
    import('./CheckoutDeliveryMap.tsx').then((m) => ({ default: m.CheckoutDeliveryMap })),
);
import { mapboxReverseGeocode, mergeFormattedAddress } from '../lib/mapboxGeocoding.ts';
import { findMatchingSavedAddress } from '../lib/addressCoordMatch.ts';
import { resolveGpsCoordsToLocationData } from '../lib/resolveGpsToLocationData.ts';
import {
    fetchUserSavedAddresses,
    isSavedAddressType,
    savedAddressToLocation,
    savedAddressTypeLabel,
    type SavedAddressRow,
} from '../lib/savedAddresses.ts';
import { computeOrderPricing } from '../lib/pricing.ts';
import { SheetLoginStep } from './SheetLoginStep.tsx';
import { SheetToast, useSheetToast } from './SheetToast.tsx';
import { sheetCapsuleIconBtn } from '../lib/sheetCapsuleStyles.ts';
import { sheetHorizontalSlideVariants, sheetTitleSlideVariants } from '../lib/sheetMotion.ts';

type AddressType = 'home' | 'work' | 'other';

function normalizeIndiaPhone(raw: string): string {
    return raw.replace(/\D/g, '').slice(-10);
}

function isValidIndiaMobile(digits: string): boolean {
    return /^[6-9]\d{9}$/.test(digits);
}

interface CheckoutFlowContentProps {
    visible: boolean;
>>>>>>> Stashed changes
    orderType?: DeliveryType;
    onOrderTypeChange?: (t: DeliveryType) => void;
}

type DeliveryType = 'delivery' | 'pickup';
type PaymentMethod = 'cash' | 'upi' | 'card' | 'wallet';
type OtpStep = 'idle' | 'sent' | 'profile' | 'verified';

<<<<<<< Updated upstream
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

const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({ isOpen, onClose, orderType, onOrderTypeChange }) => {
=======
function CheckoutFlowContent({ visible, orderType, onOrderTypeChange, onBackToCart, onDismiss }: CheckoutFlowContentProps) {
>>>>>>> Stashed changes
    const { totalItems, totalPrice, items, clearCart } = useCart();
    const { user } = useAuth();
    const { locationData, nearestOutlet, setLocationData, getCurrentLocation } = useLocation();
    const navigate = useNavigate();

    // Steps: 1 = Delivery, 2 = Payment, 3 = Confirmation
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [deliveryType, setDeliveryType] = useState<DeliveryType>(orderType ?? 'delivery');

    useEffect(() => {
        if (!isOpen) return;
        if (!orderType) return;
        setDeliveryType(orderType);
    }, [isOpen, orderType]);

    // ── Phone + OTP state ──────────────────────────────────────────────
    const [phone, setPhone] = useState('');
    const [fullName, setFullName] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [otpStep, setOtpStep] = useState<OtpStep>('idle');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpShake, setOtpShake] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // ── Rest of form state ─────────────────────────────────────────────
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

    // Toast
    const [toastMsg, setToastMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    const showToast = useCallback((type: 'error' | 'success', text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3000);
    }, []);

    // ── Determine if phone is pre-verified (user already logged in) ────
    const userPhone = user?.user_metadata?.phone || '';

    // On open: pre-fill + mark verified if user is logged in
    useEffect(() => {
        if (isOpen) {
            if (userPhone) {
                setPhone(userPhone);
                setOtpStep('verified');
            } else {
                setPhone('');
                setOtpStep('idle');
                setOtpDigits(['', '', '', '', '', '']);
            }
        }
    }, [isOpen, userPhone]);

    // Reset on close
    useEffect(() => {
<<<<<<< Updated upstream
        if (!isOpen) {
=======
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
            const data = await fetchUserSavedAddresses(user.id);
            if (!cancelled) setSavedAddresses(data);
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
>>>>>>> Stashed changes
            setTimeout(() => {
                setStep(1);
                setPaymentMethod(null);
                setOrderId(null);
                setDeliveryType(orderType ?? 'delivery');
                setIsSubmitting(false);
                setIsChangingLocation(false);
                setLocSearchQuery('');
                setLocResults([]);
                setHouseNo('');
                setInstructions('');
                setStep1Error('');
                setOtpDigits(['', '', '', '', '', '']);
                setResendCooldown(0);
                setPhoneError('');
                setFullName('');
            }, 300);
        }
    }, [isOpen]);

<<<<<<< Updated upstream
    // Resend countdown
=======
    const applySavedAddress = useCallback((row: SavedAddressRow) => {
        const location = savedAddressToLocation(row);
        if (!location) return;
        const { latitude: lat, longitude: lng } = location;
        setLocationData(location);
        if (row.recipient_name) setRecipientName(row.recipient_name);
        if (row.phone) setDeliveryPhone(normalizeIndiaPhone(row.phone));
        if (isSavedAddressType(row.address_type)) {
            setAddressType(row.address_type);
        }
        if (row.street) setStreetName(row.street);
        setHouseNo(row.locality || '');
        setFlyToTarget({ lat, lng });
    }, [setLocationData]);

    // Keep order fields in sync when using compact saved-address checkout
>>>>>>> Stashed changes
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setInterval(() => setResendCooldown(c => (c <= 1 ? 0 : c - 1)), 1000);
        return () => clearInterval(t);
    }, [resendCooldown]);

    // Nominatim autocomplete
    useEffect(() => {
        if (!locSearchQuery || locSearchQuery.length < 3) { setLocResults([]); return; }
        const delay = setTimeout(async () => {
            setIsSearchingLoc(true);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locSearchQuery)}&format=json&countrycodes=in&limit=4`);
                if (res.ok) setLocResults(await res.json());
            } catch (e) { console.error(e); }
            finally { setIsSearchingLoc(false); }
        }, 500);
        return () => clearTimeout(delay);
    }, [locSearchQuery]);

    const handleSelectLocation = (result: any) => {
        setLocationData({ latitude: parseFloat(result.lat), longitude: parseFloat(result.lon), city: '', state: '', displayName: result.display_name });
        setIsChangingLocation(false); setLocSearchQuery(''); setLocResults([]);
    };

<<<<<<< Updated upstream
    // Confetti on step 3
=======
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
            setSavedAddresses(await fetchUserSavedAddresses(user.id));
        } catch {
            showToast("error", "Could not save address");
        } finally {
            setSavingAddress(false);
        }
    };

    // Confetti on confirmation
>>>>>>> Stashed changes
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

    // ── Phone validation ───────────────────────────────────────────────
    const isPhoneValid = /^[6-9]\d{9}$/.test(phone);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 10);
        setPhone(v);
        setPhoneError('');
    };

    // ── OTP flow (shared service) ─────────────────────────────────────
    const handleSendOtp = async () => {
        if (!isPhoneValid) {
            setPhoneError('Enter a valid 10-digit mobile number starting with 6-9');
            return;
        }
        setSendingOtp(true);
        try {
            const ok = await sendOtpCore({ phone, showToast });
            if (!ok) return;
            setOtpStep('sent');
            setResendCooldown(RESEND_COOLDOWN);
            setOtpDigits(['', '', '', '', '', '']);
            showToast('success', `OTP sent to +91 ${phone.slice(0, 2)}XXXXX${phone.slice(7)}`);
            setTimeout(() => otpRefs.current[0]?.focus(), 200);
        } finally {
            setSendingOtp(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        const ok = await resendOtpCore({ phone, showToast });
        if (!ok) return;
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(RESEND_COOLDOWN);
        otpRefs.current[0]?.focus();
    };

    // ── OTP box interactions ───────────────────────────────────────────
    const triggerShake = () => {
        setOtpShake(true);
        setTimeout(() => {
            setOtpShake(false);
            setOtpDigits(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        }, 500);
    };

    const submitOtp = async (digits: string[]) => {
        const otp = digits.join('');
        if (otp.length !== OTP_LENGTH) return;
        setOtpLoading(true);
        try {
            const ok = await verifyOtpCore(phone, otp, showToast, {
                onVerified: () => {
                    setOtpStep('verified');
                    showToast('success', 'Phone verified! ✅');
                },
                onNeedsProfile: () => {
                    setOtpStep('profile');
                    showToast('success', 'Phone verified. Add your name to continue.');
                }
            });
            if (!ok) {
                triggerShake();
            }
        } finally {
            setOtpLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newDigits = [...otpDigits];
        newDigits[index] = value.slice(-1);
        setOtpDigits(newDigits);
        if (value && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
        if (newDigits.every(d => d !== '') && newDigits.join('').length === OTP_LENGTH) {
            void submitOtp(newDigits);
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
            const n = [...otpDigits]; n[index - 1] = ''; setOtpDigits(n);
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        const newDigits = [...otpDigits];
        pasted.split('').forEach((c, i) => { newDigits[i] = c; });
        setOtpDigits(newDigits);
        const nextIdx = Math.min(pasted.length, OTP_LENGTH - 1);
        otpRefs.current[nextIdx]?.focus();
        if (pasted.length === OTP_LENGTH) void submitOtp(newDigits);
    };

    const handleCompleteProfile = async () => {
        setProfileLoading(true);
        try {
            const ok = await completeProfileCore({
                phone,
                fullName,
                showToast,
            });

            if (!ok) return;

            setOtpStep('verified');
            showToast('success', 'Profile completed successfully!');
        } finally {
            setProfileLoading(false);
        }
    };

    // ── Continue to Step 2 ─────────────────────────────────────────────
    const handleContinueToStep2 = () => {
        if (otpStep !== 'verified') {
            setStep1Error('Please verify your phone number first.');
            return;
        }
        if (deliveryType === 'delivery' && !houseNo.trim()) {
            setStep1Error('Please enter your Flat / House / Apartment No.');
            return;
        }
        setStep1Error('');
        setStep(2);
    };

    // ── Order placement ────────────────────────────────────────────────
    const handlePlaceOrder = async () => {
        if (!paymentMethod) return;
        if (paymentMethod === 'upi' && !upiId.trim()) { alert('Please enter UPI ID'); return; }
        setIsSubmitting(true);
        try {
            const userId = user?.id || null;
            const deliveryLocation = deliveryType === 'delivery' ? (locationData?.displayName || 'Unknown') : (nearestOutlet?.name || 'Pickup In-Store');
            const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
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
            }]).select().single();
            if (orderError) throw orderError;
            const newOrderId = orderData.id;
            const orderItemsInsert = items.map(item => ({ order_id: newOrderId, product_id: item.product_id, quantity: item.quantity, price_at_purchase: item.price }));
            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsInsert);
            if (itemsError) throw itemsError;
            setOrderId(newOrderId);
            clearCart();
            setStep(3);
        } catch (error) {
            console.error('Order submission failed:', error);
            alert('Order failed, try again');
        } finally {
            setIsSubmitting(false);
        }
    };

<<<<<<< Updated upstream
    const gst = Math.round(totalPrice * 0.05);
    const delFee = deliveryType === 'delivery' ? (totalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE) : 0;
    const grandTotal = Math.round(totalPrice) + gst + delFee;

    const slideVariants = { enter: { x: '100%', opacity: 0 }, center: { x: 0, opacity: 1 }, exit: { x: '-100%', opacity: 0 } };
    const shakeAnim = { x: [0, -8, 8, -8, 8, 0], transition: { duration: 0.4 } };
=======
    const pricing = computeOrderPricing(totalPrice, deliveryType, couponDiscount, Boolean(couponCode));
    const { subtotal, gst, deliveryFee: delFee, discountAmt, grandTotal } = pricing;

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
>>>>>>> Stashed changes

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <Toast msg={toastMsg} />

<<<<<<< Updated upstream
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => step !== 3 && onClose()}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[4px]"
                    />
=======
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
                {step !== 3 && (
                    <div className="flex-shrink-0 border-b border-gray-100 px-4 pb-3 pt-3">
                        <div className="flex items-center justify-between gap-2">
                            <motion.button
                                type="button"
                                onClick={handleHeaderBack}
                                whileTap={{ scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                                className={`${sheetCapsuleIconBtn} min-h-[44px] min-w-[44px] md:min-h-9 md:w-9 md:min-w-9`}
                                aria-label={step === 2 ? 'Back to address' : 'Back to cart'}
                            >
                                <ChevronLeft className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} />
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
                                variants={sheetTitleSlideVariants}
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
>>>>>>> Stashed changes

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag={step !== 3 ? 'y' : false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.05}
                        onDragEnd={(_, info) => { if (info.offset.y > 100 && step !== 3) onClose(); }}
                        className="fixed bottom-0 left-0 right-0 z-[101] bg-white w-full mx-auto md:max-w-[480px] xl:max-w-[480px] origin-bottom rounded-none md:rounded-t-[24px] shadow-2xl flex flex-col h-[100vh] h-[100dvh] md:h-auto md:max-h-[90vh]"
                    >
                        {/* Drag Handle */}
                        {step !== 3 ? (
                            <div className="flex justify-center pt-3 pb-2 flex-shrink-0 bg-[#16a34a] md:bg-white rounded-none md:rounded-t-[24px]">
                                <div className="w-12 h-1.5 md:w-10 md:h-1 rounded-full bg-white/30 md:bg-gray-300" />
                            </div>
                        ) : (
                            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                                <div className="w-10 h-1 rounded-full bg-gray-300" />
                            </div>
                        )}

<<<<<<< Updated upstream
                        {/* Header */}
                        {step !== 3 && (
                            <div className="px-5 pb-3 pt-2 md:pt-0 flex-shrink-0 bg-[#16a34a] md:bg-white text-white md:text-gray-900">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xl md:text-xl font-bold">Complete Your Order</h2>
                                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 md:hover:bg-gray-100 transition-colors">
                                        <X className="w-5 h-5 text-white/80 md:text-gray-500" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="bg-white/20 md:bg-green-100 text-white md:text-green-800 text-xs font-bold px-3 py-1.5 md:py-1 rounded-full md:border md:border-green-200">
                                        {totalItems} items · ₹{grandTotal}
                                    </span>
                                </div>
                                <div className="hidden md:block h-px bg-green-100 w-full" />
                            </div>
                        )}
=======
                                {/* ── STEP 0: Sign in (before address) ── */}
                                {step === 0 && (
                                    <motion.div
                                        key="step0signin"
                                        custom={slideDir}
                                        variants={sheetHorizontalSlideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="flex flex-col gap-5 px-5 pb-6 pt-2"
                                    >
                                        <SheetLoginStep
                                            active={visible && step === 0}
                                            authLoading={authLoading}
                                            showToast={showToast}
                                            syncPendingCheckoutEvent={false}
                                            onAuthenticated={() => transitionTo(1, 1)}
                                        />
                                    </motion.div>
                                )}
>>>>>>> Stashed changes

                        {/* Step Indicator */}
                        {step !== 3 && (
                            <div className="px-5 py-3 md:py-2 flex items-center justify-between flex-shrink-0 text-[11px] font-bold uppercase tracking-wider bg-[#16a34a] md:bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] md:shadow-none z-10">
                                <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-white md:text-green-700' : 'text-white md:text-green-700'}`}>
                                    {step > 1 ? <Check className="w-4 h-4 text-white md:text-green-600" /> : <div className="w-4 h-4 rounded-full bg-white md:bg-green-600 flex items-center justify-center text-[#16a34a] md:text-white text-[9px]">1</div>}
                                    <span>Delivery</span>
                                </div>
                                <div className={`h-px flex-1 mx-2 ${step > 1 ? 'bg-white/50 md:bg-green-500' : 'bg-[#15803d] md:bg-gray-200'}`} />
                                <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-white md:text-green-700' : 'text-[#14532d] md:text-gray-400'}`}>
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 2 ? 'bg-white text-[#16a34a] md:bg-green-600 md:text-white' : 'bg-[#15803d] text-white/50 md:bg-gray-200 md:text-gray-500'}`}>2</div>
                                    <span>Payment</span>
                                </div>
                                <div className="h-px flex-1 mx-2 bg-[#15803d] md:bg-gray-200" />
                                <div className="flex items-center gap-1.5 text-[#14532d] md:text-gray-400">
                                    <div className="w-4 h-4 rounded-full bg-[#15803d] md:bg-gray-200 flex items-center justify-center text-[9px] text-white/50 md:text-gray-500">3</div>
                                    <span>Confirm</span>
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto relative min-h-[300px] overflow-x-hidden">
                            <AnimatePresence mode="wait" custom={step}>

                                {/* ── STEP 1 ── */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
<<<<<<< Updated upstream
                                        variants={slideVariants}
                                        initial="enter" animate="center" exit="exit"
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="p-5 flex flex-col gap-5"
=======
                                        custom={slideDir}
                                        variants={sheetHorizontalSlideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="flex flex-col gap-5 px-5 pb-6 pt-2"
>>>>>>> Stashed changes
                                    >
                                        {step1Error && (
                                            <div className="text-red-500 text-sm font-semibold bg-red-50 p-3 rounded-lg border border-red-200">
                                                {step1Error}
                                            </div>
                                        )}

                                        {/* ── Phone input (always shown) ── */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                                Your Phone Number
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <div className={`flex-1 flex items-center rounded-xl border overflow-hidden transition-all ${phoneError ? 'border-red-400' : otpStep === 'verified' ? 'border-green-500' : 'border-gray-200 focus-within:border-green-500'}`}>
                                                    <span className="px-3 md:px-3 h-[52px] md:h-auto flex items-center text-gray-500 text-[16px] md:text-sm font-medium border-r border-gray-200 bg-gray-50 select-none flex-shrink-0">+91</span>
                                                    <input
                                                        type="tel"
                                                        inputMode="numeric"
                                                        value={phone}
                                                        onChange={handlePhoneChange}
                                                        disabled={otpStep === 'verified' || otpStep === 'sent' || otpStep === 'profile'}
                                                        placeholder="9876543210"
                                                        className="flex-1 bg-transparent h-[52px] md:h-auto py-3 pl-3 pr-3 text-[16px] md:text-sm focus:outline-none disabled:text-gray-500"
                                                    />
                                                    {otpStep === 'verified' && (
                                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                                                    )}
                                                </div>
                                                {otpStep === 'idle' && (
                                                    <button
                                                        onClick={handleSendOtp}
                                                        disabled={!isPhoneValid || sendingOtp}
                                                        className="flex-shrink-0 px-4 h-[52px] md:h-auto md:py-3 rounded-xl text-[16px] md:text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                                                    >
                                                        {sendingOtp ? '...' : 'Send OTP'}
                                                    </button>
                                                )}
                                            </div>
                                            {phoneError && <p className="mt-1 text-xs text-red-500 font-medium">{phoneError}</p>}
                                        </div>

<<<<<<< Updated upstream
                                        {/* ── Inline OTP boxes (expand after Send OTP) ── */}
                                        <AnimatePresence>
                                            {otpStep === 'sent' && (
=======
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
                                                                            isSavedAddressType(matchingSavedForPin.address_type) && (
                                                                                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800">
                                                                                    {savedAddressTypeLabel(matchingSavedForPin.address_type)}
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
                                                                        {savedAddressTypeLabel(t)}
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
                                                                                                {savedAddressTypeLabel(row.address_type, {
                                                                                                    unknownLabel: row.address_type,
                                                                                                })}
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
                                                                    isSavedAddressType(matchingSavedForPin.address_type)
                                                                        ? ` (${savedAddressTypeLabel(matchingSavedForPin.address_type)})`
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
>>>>>>> Stashed changes
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pb-2">
                                                        <p className="text-xs text-gray-500 mb-3">
                                                            Enter the 6-digit OTP sent to <span className="font-semibold text-gray-700">+91 {phone}</span>
                                                        </p>
                                                        <motion.div
                                                            animate={otpShake ? shakeAnim : {}}
                                                            className={`flex justify-between gap-1.5 ${otpLoading ? 'opacity-60 pointer-events-none' : ''}`}
                                                            onPaste={handleOtpPaste}
                                                        >
                                                            {otpDigits.map((digit, index) => {
                                                                const isFilled = digit !== '';
                                                                const statusColor = otpShake
                                                                    ? 'border-red-500 bg-red-50'
                                                                    : isFilled ? 'border-green-500 text-gray-900' : 'border-gray-200';
                                                                return (
                                                                    <motion.input
                                                                        key={index}
                                                                        ref={el => { otpRefs.current[index] = el; }}
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        autoComplete="one-time-code"
                                                                        maxLength={1}
                                                                        value={digit}
                                                                        onChange={e => handleOtpChange(index, e.target.value)}
                                                                        onKeyDown={e => handleOtpKeyDown(index, e)}
                                                                        animate={isFilled && !otpShake ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                                                                        transition={{ duration: 0.12 }}
                                                                        className={`w-[52px] h-[60px] md:w-[44px] md:h-[52px] text-center text-[24px] md:text-[22px] font-semibold rounded-xl outline-none transition-all duration-150 border-[1.5px] ${statusColor} caret-green-600 focus:border-green-500 focus:shadow-[0_0_0_1.5px_rgba(21,128,61,0.2)]`}
                                                                    />
                                                                );
                                                            })}
                                                        </motion.div>
                                                        <div className="mt-3 flex items-center justify-center h-6">
                                                            {otpLoading ? (
                                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                                                    Verifying...
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={handleResendOtp}
                                                                    disabled={resendCooldown > 0}
                                                                    className={`text-[13px] font-semibold transition-colors ${resendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-green-700 hover:text-green-800'}`}
                                                                >
                                                                    {resendCooldown > 0
                                                                        ? `Resend OTP in 0:${resendCooldown.toString().padStart(2, '0')}`
                                                                        : 'Resend OTP'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <AnimatePresence>
                                            {otpStep === 'profile' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <ProfileCompletionForm
                                                        phone={phone}
                                                        fullName={fullName}
                                                        loading={profileLoading}
                                                        onNameChange={setFullName}
                                                        onSubmit={handleCompleteProfile}
                                                        submitLabel="Save and continue"
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* ── After phone verified: show toggle + address fields ── */}
                                        <AnimatePresence>
                                            {otpStep === 'verified' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                                                    className="overflow-hidden space-y-5"
                                                >
                                                    {/* Delivery / Pickup toggle */}
                                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => {
                                            setDeliveryType('delivery');
                                            onOrderTypeChange?.('delivery');
                                        }}
                                        className={`flex-1 flex justify-center items-center gap-2 h-[48px] md:h-auto md:py-2.5 rounded-lg text-[15px] md:text-sm font-bold transition-all ${deliveryType === 'delivery' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                                            <Truck className="w-4 h-4 md:w-4 md:h-4" /> Delivery
                                                        </button>
                                    <button
                                        onClick={() => {
                                            setDeliveryType('pickup');
                                            onOrderTypeChange?.('pickup');
                                        }}
                                        className={`flex-1 flex justify-center items-center gap-2 h-[48px] md:h-auto md:py-2.5 rounded-lg text-[15px] md:text-sm font-bold transition-all ${deliveryType === 'pickup' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                                            <Store className="w-4 h-4 md:w-4 md:h-4" /> Pickup
                                                        </button>
                                                    </div>

                                                    {/* ── Delivery address fields ── */}
                                                    <AnimatePresence mode="wait">
                                                        {deliveryType === 'delivery' ? (
                                                            <motion.div
                                                                key="delivery-fields"
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                transition={{ duration: 0.25 }}
                                                                className="overflow-hidden space-y-4"
                                                            >
                                                                {/* Flat / House */}
                                                                <div>
                                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Flat / House / Apartment No.</label>
                                                                    <input
                                                                        type="text"
                                                                        value={houseNo}
                                                                        onChange={e => setHouseNo(e.target.value)}
                                                                        placeholder="e.g. 12B, 2nd Floor"
                                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 h-[52px] md:h-[48px] text-[16px] md:text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow"
                                                                    />
                                                                </div>

                                                                {/* Delivery Area */}
                                                                <div>
                                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Delivery Area</label>
                                                                    <AnimatePresence mode="wait">
                                                                        {!isChangingLocation ? (
                                                                            <motion.div key="static" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-3">
                                                                                <MapPin className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{locationData?.displayName || 'Unknown Location'}</p>
                                                                                    <button onClick={() => setIsChangingLocation(true)} className="text-xs text-green-600 font-bold mt-1 underline">Change</button>
                                                                                </div>
                                                                            </motion.div>
                                                                        ) : (
                                                                            <motion.div key="edit" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
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
                                                                                            onChange={e => setLocSearchQuery(e.target.value)}
                                                                                            placeholder="Search area or pincode..."
                                                                                            className="w-full pl-9 pr-3 h-[52px] md:h-[42px] bg-gray-50 border border-gray-200 rounded-lg text-[16px] md:text-sm focus:outline-none focus:border-green-500 transition-colors"
                                                                                        />
                                                                                        {isSearchingLoc && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}
                                                                                    </div>
                                                                                    {locResults.length > 0 && (
                                                                                        <div className="mb-3 max-h-[120px] overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                                                                                            {locResults.map((res: any) => (
                                                                                                <button key={res.place_id} onClick={() => handleSelectLocation(res)} className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors flex items-start gap-2">
                                                                                                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                                                                                    <span className="text-gray-700 line-clamp-2">{res.display_name}</span>
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                    <button
                                                                                        onClick={() => { getCurrentLocation(); setIsChangingLocation(false); setLocSearchQuery(''); setLocResults([]); }}
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

                                                                {/* Instructions */}
                                                                <div>
                                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Instructions (Optional)</label>
                                                                    <textarea
                                                                        value={instructions}
                                                                        onChange={e => setInstructions(e.target.value)}
                                                                        placeholder="E.g. Ring the bell, leave at door..."
                                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[16px] md:text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-shadow min-h-[80px] md:min-h-[72px] resize-none"
                                                                    />
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            /* ── Pickup location card ── */
                                                            <motion.div
                                                                key="pickup-fields"
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                transition={{ duration: 0.25 }}
                                                                className="overflow-hidden"
                                                            >
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
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="pt-1 pb-6">
                                            <button
                                                onClick={handleContinueToStep2}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-[56px] md:h-[50px] rounded-xl text-[16px] md:text-[15px] shadow-lg shadow-green-600/20 transition-all active:scale-[0.98]"
                                            >
                                                Continue →
                                            </button>
                                        </div>
                                    </motion.div>
                                )}


                                {/* ── STEP 2: PAYMENT ── */}
                                {step === 2 && (
                                    <motion.div
<<<<<<< Updated upstream
                                        key="step2"
                                        variants={slideVariants}
                                        initial="enter" animate="center" exit="exit"
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="p-5 flex flex-col gap-6"
                                    >
=======
                                        key="step2pay"
                                        custom={slideDir}
                                        variants={sheetHorizontalSlideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="flex flex-col gap-6 px-5 pb-6 pt-2"
                                    >
                                        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Order summary</p>
                                            <div className="flex justify-between text-[13px]">
                                                <span className="text-gray-500">Subtotal</span>
                                                <span className="font-medium text-gray-900">₹{subtotal}</span>
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

>>>>>>> Stashed changes
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

                                        <div className="pt-4 pb-6 mt-auto flex flex-col items-center">
                                            <button
                                                disabled={!paymentMethod || isSubmitting}
                                                onClick={handlePlaceOrder}
                                                className={`w-full font-bold h-[56px] md:h-[50px] text-[16px] md:text-[15px] rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${!paymentMethod ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'}`}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Placing Order...
                                                    </>
                                                ) : <>Place Order →</>}
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
<<<<<<< Updated upstream
                                        key="step3"
                                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                        className="p-8 flex flex-col items-center justify-center h-full text-center pb-12"
=======
                                        key="step3ok"
                                        custom={slideDir}
                                        variants={sheetHorizontalSlideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="flex h-full flex-col items-center justify-center px-8 pb-12 pt-6 text-center"
>>>>>>> Stashed changes
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
                                            <button onClick={() => { onClose(); navigate(`/orders/${orderId}`); }} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-[56px] md:h-[50px] text-[16px] md:text-[15px] rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98]">
                                                Track Order
                                            </button>
                                            <button onClick={() => { onClose(); navigate('/menu'); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold h-[56px] md:h-[50px] text-[16px] md:text-[15px] rounded-xl transition-all active:scale-[0.98]">
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
