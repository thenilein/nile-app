import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useLocation } from "../context/LocationContext";
import { computeOrderPricing } from "../lib/pricing";
import { DEFAULT_CHECKOUT_MAP_CENTER } from "../lib/checkoutMapConstants";
import {
  fetchUserSavedAddresses,
  isSavedAddressType,
  savedAddressToLocation,
  type SavedAddressRow,
} from "../lib/savedAddresses";
import { findMatchingSavedAddress } from "../lib/addressCoordMatch";
import { mapboxReverseGeocode, mergeFormattedAddress, mapboxStaticImageUrl } from "../lib/mapboxGeocoding";

export type AddressType = "home" | "work" | "other";
export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  home: "Home",
  work: "Work",
  other: "Other",
};

export function normalizeIndiaPhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

export function isValidIndiaMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export type DeliveryType = "delivery" | "pickup";
export type PaymentMethod = "cash" | "upi" | "card" | "wallet";
export type CheckoutStep = 1 | 2 | 3;

export type ToastFn = (type: "error" | "success", text: string) => void;

export type UseCheckoutFlowOptions = {
  /** Cart modal is open */
  sheetOpen: boolean;
  /** User passed cart — address / payment / success */
  checkoutActive: boolean;
  orderType: DeliveryType;
  onOrderTypeChange?: (t: DeliveryType) => void;
  onOrderComplete?: () => void;
};

export function useCheckoutFlow({
  sheetOpen,
  checkoutActive,
  orderType,
  onOrderTypeChange,
  onOrderComplete,
}: UseCheckoutFlowOptions) {
  const { totalPrice, items, clearCart } = useCart();
  const { user } = useAuth();
  const { locationData, nearestOutlet, setLocationData, getCurrentLocation, isLoadingLocation } = useLocation();

  const [step, setStep] = useState<CheckoutStep>(1);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(orderType);
  const checkoutBootstrapped = useRef(false);

  const [recipientName, setRecipientName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [addressType, setAddressType] = useState<AddressType>("home");
  const [streetName, setStreetName] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [instructions, setInstructions] = useState("");
  const [step1Error, setStep1Error] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [upiId, setUpiId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddressRow[]>([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deliveryFormExpanded, setDeliveryFormExpanded] = useState(false);
  const [adjustPinOpen, setAdjustPinOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const showToast: ToastFn = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    if (!checkoutActive) return;
    setDeliveryType(orderType);
  }, [checkoutActive, orderType]);

  useLayoutEffect(() => {
    if (!checkoutActive) {
      checkoutBootstrapped.current = false;
      return;
    }
    if (!checkoutBootstrapped.current) {
      checkoutBootstrapped.current = true;
      setStep(1);
    }
  }, [checkoutActive]);

  const matchingSavedForPin = useMemo(() => {
    if (!locationData || savedAddresses.length === 0) return undefined;
    return findMatchingSavedAddress(savedAddresses, locationData.latitude, locationData.longitude);
  }, [locationData, savedAddresses]);

  const deliveryCompactSaved = Boolean(
    user?.id && !loadingSavedAddresses && matchingSavedForPin && !deliveryFormExpanded
  );

  useEffect(() => {
    if (!checkoutActive || step !== 1 || !user?.id) {
      setSavedAddresses([]);
      setLoadingSavedAddresses(false);
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
  }, [checkoutActive, step, user?.id]);

  useEffect(() => {
    if (!checkoutActive || step !== 1 || deliveryType !== "delivery") return;
    const fromUser =
      (user?.user_metadata?.phone as string | undefined) || (user?.phone as string | undefined) || "";
    if (!fromUser) return;
    setDeliveryPhone((prev) => (prev.trim() ? prev : normalizeIndiaPhone(fromUser)));
  }, [checkoutActive, step, deliveryType, user?.id, user?.user_metadata, user?.phone]);

  const resetCheckout = useCallback(() => {
    setStep(1);
    setPaymentMethod(null);
    setOrderId(null);
    setIsSubmitting(false);
    setRecipientName("");
    setDeliveryPhone("");
    setAddressType("home");
    setStreetName("");
    setHouseNo("");
    setInstructions("");
    setStep1Error("");
    setCouponCode(null);
    setCouponDiscount(0);
    setSavedAddresses([]);
    setDeliveryFormExpanded(false);
    setAdjustPinOpen(false);
  }, []);

  useEffect(() => {
    if (!sheetOpen) {
      const t = setTimeout(() => {
        resetCheckout();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [sheetOpen, resetCheckout]);

  const applySavedAddress = useCallback(
    (row: SavedAddressRow) => {
      const loc = savedAddressToLocation(row);
      if (!loc) return;
      void setLocationData(loc);
      if (row.recipient_name) setRecipientName(row.recipient_name);
      if (row.phone) setDeliveryPhone(normalizeIndiaPhone(row.phone));
      if (isSavedAddressType(row.address_type)) setAddressType(row.address_type);
      if (row.street) setStreetName(row.street);
      setHouseNo(row.locality || "");
    },
    [setLocationData]
  );

  useEffect(() => {
    if (!checkoutActive || step !== 1 || deliveryType !== "delivery") return;
    if (!deliveryCompactSaved || !matchingSavedForPin) return;
    applySavedAddress(matchingSavedForPin);
  }, [checkoutActive, step, deliveryType, deliveryCompactSaved, matchingSavedForPin, applySavedAddress]);

  const mapLat = locationData?.latitude ?? DEFAULT_CHECKOUT_MAP_CENTER.lat;
  const mapLng = locationData?.longitude ?? DEFAULT_CHECKOUT_MAP_CENTER.lng;
  const staticMapUri = mapboxStaticImageUrl(mapLat, mapLng, { width: 400, height: 220, zoom: 15 });

  const saveAddressToAccount = async () => {
    if (!user?.id) {
      showToast("error", "Sign in to save addresses");
      return;
    }
    if (!locationData) {
      showToast("error", "Set a location first");
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
        houseNo,
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
      void setLocationData({
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

  const handleContinueToPayment = () => {
    if (!user?.id) {
      showToast("error", "Sign in to continue");
      return;
    }
    if (deliveryType === "delivery") {
      if (!locationData?.latitude || !locationData?.longitude) {
        setStep1Error("Set your delivery location.");
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
    setStep(2);
  };

  const { gst, deliveryFee: delFee, discountAmt, grandTotal } = computeOrderPricing(
    totalPrice,
    deliveryType,
    couponDiscount,
    Boolean(couponCode)
  );

  const handleApplyCoupon = (code: string, discount: number) => {
    if (!code) {
      setCouponCode(null);
      setCouponDiscount(0);
    } else {
      setCouponCode(code);
      setCouponDiscount(discount);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user?.id) {
      showToast("error", "Sign in to place your order");
      return;
    }
    if (!paymentMethod) return;
    if (paymentMethod === "upi" && !upiId.trim()) {
      Alert.alert("UPI", "Please enter UPI ID");
      return;
    }
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

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            profile_id: userId,
            total_amount: grandTotal,
            status: "pending",
            order_type: deliveryType,
            notes: instructions || null,
            payment_method: paymentMethod,
            phone: orderPhone,
            delivery_address:
              deliveryType === "delivery"
                ? {
                    recipient_name: recipientName.trim(),
                    phone: normalizeIndiaPhone(deliveryPhone),
                    address_type: addressType,
                    street: streetName.trim(),
                    house_no: houseNo.trim() || null,
                    map_reference: locationData?.displayName || "",
                    area: locationData?.city || "",
                    city: locationData?.state || "",
                    full_address: [houseNo.trim(), streetName.trim(), locationData?.displayName || ""]
                      .filter(Boolean)
                      .join(", "),
                  }
                : null,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;
      const newOrderId = orderData.id;
      const orderItemsInsert = items.map((item) => ({
        order_id: newOrderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price,
        selected_options: item.selected_options ?? [],
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsInsert);
      if (itemsError) throw itemsError;
      setOrderId(newOrderId);
      clearCart();
      setStep(3);
      onOrderComplete?.();
    } catch (e) {
      console.error(e);
      Alert.alert("Order failed", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    user,
    step,
    setStep,
    deliveryType,
    setDeliveryType,
    recipientName,
    setRecipientName,
    deliveryPhone,
    setDeliveryPhone,
    addressType,
    setAddressType,
    streetName,
    setStreetName,
    houseNo,
    setHouseNo,
    instructions,
    setInstructions,
    step1Error,
    setStep1Error,
    paymentMethod,
    setPaymentMethod,
    upiId,
    setUpiId,
    isSubmitting,
    orderId,
    couponCode,
    savedAddresses,
    loadingSavedAddresses,
    savingAddress,
    deliveryFormExpanded,
    setDeliveryFormExpanded,
    adjustPinOpen,
    setAdjustPinOpen,
    toast,
    showToast,
    matchingSavedForPin,
    deliveryCompactSaved,
    staticMapUri,
    locationData,
    nearestOutlet,
    setLocationData,
    getCurrentLocation,
    isLoadingLocation,
    saveAddressToAccount,
    handleContinueToPayment,
    handleApplyCoupon,
    handlePlaceOrder,
    applySavedAddress,
    gst,
    delFee,
    discountAmt,
    grandTotal,
    resetCheckout,
  };
}

export type UseCheckoutFlowReturn = ReturnType<typeof useCheckoutFlow>;
