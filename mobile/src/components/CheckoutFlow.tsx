import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
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
  savedAddressTypeLabel,
  type SavedAddressRow,
} from "../lib/savedAddresses";
import { findMatchingSavedAddress } from "../lib/addressCoordMatch";
import { mapboxReverseGeocode, mergeFormattedAddress, mapboxStaticImageUrl } from "../lib/mapboxGeocoding";
import type { LocationData } from "../types/location";
import { PhoneOtpAuthFlow } from "./PhoneOtpAuthFlow";
import { CouponSection } from "./CouponSection";
import { LocationPickerModal } from "./LocationPickerModal";
import { colors } from "../lib/theme";

type AddressType = "home" | "work" | "other";
const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  home: "Home",
  work: "Work",
  other: "Other",
};

function normalizeIndiaPhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

function isValidIndiaMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

type DeliveryType = "delivery" | "pickup";
type PaymentMethod = "cash" | "upi" | "card" | "wallet";
type CheckoutStep = 0 | 1 | 2 | 3;

type ToastFn = (type: "error" | "success", text: string) => void;

export function CheckoutFlow({
  visible,
  orderType,
  onOrderTypeChange,
  onBackToCart,
  onDismiss,
  onOrderComplete,
}: {
  visible: boolean;
  orderType: DeliveryType;
  onOrderTypeChange?: (t: DeliveryType) => void;
  onBackToCart: () => void;
  onDismiss: () => void;
  onOrderComplete?: () => void;
}) {
  const { totalPrice, items, clearCart } = useCart();
  const { user, isLoading: authLoading } = useAuth();
  const { locationData, nearestOutlet, setLocationData, getCurrentLocation, isLoadingLocation } = useLocation();

  const [step, setStep] = useState<CheckoutStep>(0);
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
    if (!visible) return;
    setDeliveryType(orderType);
  }, [visible, orderType]);

  useLayoutEffect(() => {
    if (!visible) {
      checkoutBootstrapped.current = false;
      return;
    }
    if (authLoading) return;
    if (!checkoutBootstrapped.current) {
      checkoutBootstrapped.current = true;
      setStep(user?.id ? 1 : 0);
    }
  }, [visible, authLoading, user?.id]);

  useEffect(() => {
    if (!visible || !user?.id || step !== 0) return;
    setStep(1);
  }, [visible, user?.id, step]);

  const matchingSavedForPin = useMemo(() => {
    if (!locationData || savedAddresses.length === 0) return undefined;
    return findMatchingSavedAddress(savedAddresses, locationData.latitude, locationData.longitude);
  }, [locationData, savedAddresses]);

  const deliveryCompactSaved = Boolean(
    user?.id && !loadingSavedAddresses && matchingSavedForPin && !deliveryFormExpanded
  );

  useEffect(() => {
    if (!visible || step !== 1 || !user?.id) {
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
  }, [visible, step, user?.id]);

  useEffect(() => {
    if (!visible || step !== 1 || deliveryType !== "delivery") return;
    const fromUser =
      (user?.user_metadata?.phone as string | undefined) || (user?.phone as string | undefined) || "";
    if (!fromUser) return;
    setDeliveryPhone((prev) => (prev.trim() ? prev : normalizeIndiaPhone(fromUser)));
  }, [visible, step, deliveryType, user?.id, user?.user_metadata, user?.phone]);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => {
        setStep(0);
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
      }, 200);
      return () => clearTimeout(t);
    }
  }, [visible]);

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
    if (!visible || step !== 1 || deliveryType !== "delivery") return;
    if (!deliveryCompactSaved || !matchingSavedForPin) return;
    applySavedAddress(matchingSavedForPin);
  }, [visible, step, deliveryType, deliveryCompactSaved, matchingSavedForPin, applySavedAddress]);

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
      setStep(0);
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
      setStep(0);
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

  if (!visible) return null;

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.textMuted} />
        <Text style={styles.muted}>Checking your session…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {toast ? (
        <View style={[styles.toast, toast.type === "error" ? styles.toastErr : styles.toastOk]}>
          <Text style={styles.toastText}>{toast.text}</Text>
        </View>
      ) : null}

      <LocationPickerModal
        visible={adjustPinOpen}
        onClose={() => setAdjustPinOpen(false)}
        onSelectLocation={(loc) => void setLocationData(loc)}
        title="Adjust delivery pin"
        subtitle="Search or use GPS to move the pin"
        onUseCurrentLocation={async () => {
          await getCurrentLocation();
        }}
        locationLoading={isLoadingLocation}
      />

      {step !== 3 ? (
        <View style={styles.topBar}>
          <Pressable onPress={() => (step === 2 ? setStep(1) : onBackToCart())} hitSlop={12}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <Pressable onPress={onDismiss} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <PhoneOtpAuthFlow
            active={visible && step === 0}
            showToast={showToast}
            onAuthenticated={() => setStep(1)}
          />
        ) : null}

        {step === 1 ? (
          <View style={styles.section}>
            {step1Error ? (
              <View style={styles.errBanner}>
                <Text style={styles.errBannerText}>{step1Error}</Text>
              </View>
            ) : null}

            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, deliveryType === "delivery" && styles.toggleBtnOn]}
                onPress={() => {
                  setDeliveryType("delivery");
                  setDeliveryFormExpanded(false);
                  onOrderTypeChange?.("delivery");
                }}
              >
                <Text style={[styles.toggleTxt, deliveryType === "delivery" && styles.toggleTxtOn]}>Delivery</Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, deliveryType === "pickup" && styles.toggleBtnOn]}
                onPress={() => {
                  setDeliveryType("pickup");
                  onOrderTypeChange?.("pickup");
                }}
              >
                <Text style={[styles.toggleTxt, deliveryType === "pickup" && styles.toggleTxtOn]}>Pickup</Text>
              </Pressable>
            </View>

            {deliveryType === "delivery" ? (
              deliveryCompactSaved && matchingSavedForPin ? (
                <View style={styles.savedCard}>
                  <Text style={styles.savedTitle}>Delivering to saved address</Text>
                  <Text style={styles.savedName}>
                    {matchingSavedForPin.recipient_name || "Saved address"}{" "}
                    {matchingSavedForPin.address_type &&
                    ["home", "work", "other"].includes(matchingSavedForPin.address_type)
                      ? `· ${ADDRESS_TYPE_LABELS[matchingSavedForPin.address_type as AddressType]}`
                      : ""}
                  </Text>
                  <Text style={styles.savedAddr}>
                    {matchingSavedForPin.formatted_address ||
                      [matchingSavedForPin.locality, matchingSavedForPin.street, matchingSavedForPin.city]
                        .filter(Boolean)
                        .join(", ") ||
                      "—"}
                  </Text>
                  <Pressable style={styles.changeAddr} onPress={() => setDeliveryFormExpanded(true)}>
                    <Text style={styles.changeAddrText}>Change address</Text>
                  </Pressable>
                  <Text style={styles.label}>Instructions (optional)</Text>
                  <TextInput
                    style={styles.textarea}
                    value={instructions}
                    onChangeText={setInstructions}
                    placeholder="E.g. Ring the bell…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>
              ) : (
                <View style={styles.block}>
                  {staticMapUri ? (
                    <Image source={{ uri: staticMapUri }} style={styles.mapImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.mapImg, styles.mapPh]}>
                      <Text style={styles.mapPhText}>Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN for map preview</Text>
                    </View>
                  )}
                  <Pressable style={styles.gpsBtn} onPress={() => setAdjustPinOpen(true)}>
                    <Text style={styles.gpsBtnText}>Adjust delivery pin</Text>
                  </Pressable>
                  <Pressable style={styles.gpsBtnSecondary} onPress={() => void getCurrentLocation()}>
                    {isLoadingLocation ? (
                      <ActivityIndicator color={colors.green} />
                    ) : (
                      <Text style={styles.gpsBtnText}>Use my current location</Text>
                    )}
                  </Pressable>

                  <Field label="Recipient name" value={recipientName} onChangeText={setRecipientName} placeholder="Full name" />
                  <Field
                    label="Phone number"
                    value={deliveryPhone}
                    onChangeText={(t) => setDeliveryPhone(t.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    keyboardType="phone-pad"
                    prefix="+91"
                  />
                  <Text style={styles.label}>Save as</Text>
                  <View style={styles.toggleRow}>
                    {(["home", "work", "other"] as const).map((t) => (
                      <Pressable
                        key={t}
                        style={[styles.toggleBtn, addressType === t && styles.toggleBtnOn]}
                        onPress={() => setAddressType(t)}
                      >
                        <Text style={[styles.toggleTxt, addressType === t && styles.toggleTxtOn]}>
                          {ADDRESS_TYPE_LABELS[t]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Field
                    label="Street / road name"
                    value={streetName}
                    onChangeText={setStreetName}
                    placeholder="e.g. Gandhi Road"
                  />
                  <Field
                    label="Flat / house (optional)"
                    value={houseNo}
                    onChangeText={setHouseNo}
                    placeholder="e.g. 12B"
                  />

                  {user?.id ? (
                    <>
                      <Text style={styles.label}>Saved addresses</Text>
                      {loadingSavedAddresses ? (
                        <ActivityIndicator style={{ marginVertical: 12 }} />
                      ) : savedAddresses.length === 0 ? (
                        <Text style={styles.hint}>No saved addresses yet.</Text>
                      ) : (
                        savedAddresses.map((row) => (
                          <Pressable key={row.id} style={styles.savedPick} onPress={() => applySavedAddress(row)}>
                            <Text style={styles.savedPickName}>
                              {row.recipient_name || "Saved"}{" "}
                              {row.address_type ? `· ${savedAddressTypeLabel(row.address_type)}` : ""}
                            </Text>
                            <Text style={styles.savedPickAddr} numberOfLines={2}>
                              {row.formatted_address ||
                                [row.locality, row.street, row.city].filter(Boolean).join(", ")}
                            </Text>
                          </Pressable>
                        ))
                      )}
                    </>
                  ) : null}

                  <Text style={styles.label}>Instructions (optional)</Text>
                  <TextInput
                    style={styles.textarea}
                    value={instructions}
                    onChangeText={setInstructions}
                    placeholder="E.g. Leave at door…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />

                  {user?.id && matchingSavedForPin && !loadingSavedAddresses ? (
                    <Text style={styles.hintGreen}>This pin matches a saved address. You can place the order without saving again.</Text>
                  ) : (
                    <Pressable
                      style={[styles.outlineBtn, savingAddress && { opacity: 0.6 }]}
                      onPress={() => void saveAddressToAccount()}
                      disabled={savingAddress}
                    >
                      <Text style={styles.outlineBtnText}>{savingAddress ? "Saving…" : "Save address"}</Text>
                    </Pressable>
                  )}
                </View>
              )
            ) : (
              <View style={styles.pickupCard}>
                <Text style={styles.pickupTitle}>{nearestOutlet?.name || "Nile Cafe"}</Text>
                <Text style={styles.pickupAddr}>{nearestOutlet?.address || "Store address"}</Text>
                <Text style={styles.pickupBadge}>You’ll pick up from this branch</Text>
              </View>
            )}

            <Pressable style={styles.cta} onPress={handleContinueToPayment}>
              <Text style={styles.ctaText}>Continue</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.section}>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Order summary</Text>
              <Row label="GST (5%)" value={`₹${gst}`} />
              <Row
                label="Delivery"
                value={
                  deliveryType === "pickup" ? "Pickup" : delFee === 0 ? "Free" : `₹${delFee}`
                }
                valueHighlight={deliveryType !== "pickup" && delFee === 0}
              />
              {couponCode && discountAmt > 0 ? (
                <Row label={`Discount (${couponCode})`} value={`−₹${discountAmt}`} green />
              ) : null}
              <View style={styles.divider} />
              <Row label="Total" value={`₹${grandTotal}`} bold />
            </View>

            <CouponSection onApply={handleApplyCoupon} applied={couponCode} />

            <Text style={styles.label}>Payment</Text>
            <View style={styles.payGrid}>
              {(
                [
                  ["cash", "Cash on delivery"],
                  ["upi", "UPI"],
                  ["card", "Card"],
                  ["wallet", "Wallet"],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  style={[styles.payCell, paymentMethod === key && styles.payCellOn]}
                  onPress={() => setPaymentMethod(key)}
                >
                  <Text style={[styles.payLabel, paymentMethod === key && styles.payLabelOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {paymentMethod === "upi" ? (
              <Field label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="you@upi" autoCapitalize="none" />
            ) : null}

            <Pressable
              style={[styles.placeOrder, (!paymentMethod || isSubmitting) && styles.placeOrderDisabled]}
              disabled={!paymentMethod || isSubmitting}
              onPress={() => void handlePlaceOrder()}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.placeOrderText}>Place order</Text>
              )}
            </Pressable>
            <Text style={styles.secure}>Secure checkout</Text>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.success}>
            <Text style={styles.successEmoji}>✓</Text>
            <Text style={styles.successTitle}>Order placed!</Text>
            {orderId ? <Text style={styles.orderRef}>#{String(orderId).split("-")[0].toUpperCase()}</Text> : null}
            <Text style={styles.successSub}>
              {deliveryType === "delivery"
                ? "Estimated delivery: 30–45 mins"
                : "Ready for pickup in ~15 mins"}
            </Text>
            <Pressable style={styles.cta} onPress={onDismiss}>
              <Text style={styles.ctaText}>Continue shopping</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  green,
  valueHighlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  green?: boolean;
  valueHighlight?: boolean;
}) {
  return (
    <View style={styles.rowBetween}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          bold && styles.bold,
          green && { color: colors.green },
          valueHighlight && { color: colors.green, fontWeight: "700" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  prefix,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
  prefix?: string;
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, prefix && { flex: 1 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { marginTop: 12, color: colors.textSecondary },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  close: { fontSize: 16, fontWeight: "600", color: colors.green },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { gap: 4 },
  errBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errBannerText: { color: "#dc2626", fontWeight: "600" },
  toggleRow: { flexDirection: "row", backgroundColor: colors.pillBg, borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  toggleBtnOn: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4 },
  toggleTxt: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  toggleTxtOn: { color: colors.greenDark },
  savedCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  savedTitle: { fontSize: 11, fontWeight: "700", color: "#166534", letterSpacing: 1 },
  savedName: { marginTop: 6, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  savedAddr: { marginTop: 8, fontSize: 14, color: "#374151", lineHeight: 20 },
  changeAddr: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  changeAddrText: { fontWeight: "700", color: colors.greenDark },
  block: { marginBottom: 8 },
  mapImg: { width: "100%", height: 220, borderRadius: 14, backgroundColor: "#f3f4f6" },
  mapPh: { alignItems: "center", justifyContent: "center", padding: 16 },
  mapPhText: { textAlign: "center", color: colors.textMuted, fontSize: 13 },
  gpsBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
  },
  gpsBtnSecondary: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  gpsBtnText: { fontWeight: "600", color: colors.greenDark },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  inputPrefix: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  input: { paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.textPrimary },
  textarea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    textAlignVertical: "top",
  },
  hint: { fontSize: 12, color: colors.textMuted, marginVertical: 8 },
  hintGreen: { fontSize: 13, color: "#166534", marginVertical: 8 },
  savedPick: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  savedPickName: { fontWeight: "700", color: colors.textPrimary },
  savedPickAddr: { marginTop: 4, fontSize: 14, color: colors.textSecondary },
  outlineBtn: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  outlineBtnText: { fontWeight: "700", color: colors.greenDark },
  pickupCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  pickupTitle: { fontSize: 18, fontWeight: "700" },
  pickupAddr: { marginTop: 8, fontSize: 14, color: "#4b5563", lineHeight: 20 },
  pickupBadge: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#15803d",
  },
  cta: {
    backgroundColor: colors.black,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  summary: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  summaryTitle: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 10, letterSpacing: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: "500", color: colors.textPrimary },
  bold: { fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  payGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  payCell: {
    width: "48%",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
  },
  payCellOn: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  payLabel: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, textAlign: "center" },
  payLabelOn: { color: colors.greenDark },
  placeOrder: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  placeOrderDisabled: { opacity: 0.45 },
  placeOrderText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  secure: { textAlign: "center", marginTop: 12, fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 1 },
  success: { alignItems: "center", paddingVertical: 32 },
  successEmoji: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#dcfce7",
    textAlign: "center",
    lineHeight: 88,
    fontSize: 44,
    color: colors.green,
    overflow: "hidden",
  },
  successTitle: { marginTop: 20, fontSize: 24, fontWeight: "700" },
  orderRef: {
    marginTop: 8,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#166534",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  successSub: { marginTop: 12, fontSize: 15, color: colors.textSecondary, textAlign: "center" },
  toast: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    zIndex: 50,
    padding: 14,
    borderRadius: 12,
  },
  toastErr: { backgroundColor: "#fef2f2" },
  toastOk: { backgroundColor: "#f0fdf4" },
  toastText: { fontWeight: "600", color: colors.textPrimary, textAlign: "center" },
});
