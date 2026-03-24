import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { CouponSection } from "../components/CouponSection";
import { colors } from "../lib/theme";
import { savedAddressTypeLabel } from "../lib/savedAddresses";
import {
  ADDRESS_TYPE_LABELS,
  type AddressType,
  type DeliveryType,
  type UseCheckoutFlowReturn,
} from "./useCheckoutFlow";

export function CheckoutToast({ checkout }: { checkout: Pick<UseCheckoutFlowReturn, "toast"> }) {
  const { toast } = checkout;
  if (!toast) return null;
  return (
    <View style={[styles.toast, toast.type === "error" ? styles.toastErr : styles.toastOk]}>
      <Text style={styles.toastText}>{toast.text}</Text>
    </View>
  );
}

export function CheckoutAddressStep({
  checkout,
  onOrderTypeChange,
}: {
  checkout: UseCheckoutFlowReturn;
  onOrderTypeChange?: (t: DeliveryType) => void;
}) {
  const {
    step1Error,
    deliveryType,
    setDeliveryType,
    setDeliveryFormExpanded,
    deliveryCompactSaved,
    matchingSavedForPin,
    staticMapUri,
    setAdjustPinOpen,
    getCurrentLocation,
    isLoadingLocation,
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
    user,
    savedAddresses,
    loadingSavedAddresses,
    applySavedAddress,
    savingAddress,
    saveAddressToAccount,
    handleContinueToPayment,
    nearestOutlet,
  } = checkout;

  return (
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
            <Field label="Flat / house (optional)" value={houseNo} onChangeText={setHouseNo} placeholder="e.g. 12B" />

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
                        {row.formatted_address || [row.locality, row.street, row.city].filter(Boolean).join(", ")}
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
              <Text style={styles.hintGreen}>
                This pin matches a saved address. You can place the order without saving again.
              </Text>
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
  );
}

export function CheckoutPaymentStep({ checkout }: { checkout: UseCheckoutFlowReturn }) {
  const {
    deliveryType,
    gst,
    delFee,
    discountAmt,
    grandTotal,
    couponCode,
    handleApplyCoupon,
    paymentMethod,
    setPaymentMethod,
    upiId,
    setUpiId,
    isSubmitting,
    handlePlaceOrder,
  } = checkout;

  return (
    <View style={styles.section}>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Order summary</Text>
        <Row label="GST (5%)" value={`₹${gst}`} />
        <Row
          label="Delivery"
          value={deliveryType === "pickup" ? "Pickup" : delFee === 0 ? "Free" : `₹${delFee}`}
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
  );
}

export function CheckoutSuccessStep({
  checkout,
  onDismiss,
}: {
  checkout: UseCheckoutFlowReturn;
  onDismiss: () => void;
}) {
  const { orderId, deliveryType } = checkout;
  return (
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
