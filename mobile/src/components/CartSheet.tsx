import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { computeOrderPricing, FREE_DELIVERY_THRESHOLD } from "../lib/pricing";
import { CheckoutFlow } from "./CheckoutFlow";
import { colors } from "../lib/theme";

export function CartSheet({
  visible,
  onClose,
  orderType,
  onOrderTypeChange,
}: {
  visible: boolean;
  onClose: () => void;
  orderType: "delivery" | "pickup";
  onOrderTypeChange?: (t: "delivery" | "pickup") => void;
}) {
  const insets = useSafeAreaInsets();
  const { items, updateQuantity, totalItems, totalPrice } = useCart();
  const [checkoutActive, setCheckoutActive] = useState(false);

  const { freeDeliveryUnlocked, remainingForFreeDelivery } = computeOrderPricing(
    totalPrice,
    orderType,
    0,
    false
  );
  const progress = Math.min((totalPrice / FREE_DELIVERY_THRESHOLD) * 100, 100);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.shell, { paddingTop: insets.top }]}>
        {!checkoutActive ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Your cart</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>

            {items.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyDot} />
                <Text style={styles.emptyTitle}>Your cart is empty</Text>
                <Text style={styles.emptySub}>Add items from the menu to get started.</Text>
              </View>
            ) : (
              <>
                {orderType === "delivery" ? (
                  <View style={styles.progressWrap}>
                    <Text style={styles.progressText}>
                      {freeDeliveryUnlocked
                        ? "Free delivery unlocked"
                        : `Add ₹${remainingForFreeDelivery.toFixed(0)} more for free delivery`}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                  </View>
                ) : null}

                <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }}>
                  {items.map((item) => (
                    <View key={item.id} style={styles.line}>
                      <View style={styles.thumb}>
                        {item.image_url ? (
                          <Image source={{ uri: item.image_url }} style={styles.thumbImg} contentFit="cover" />
                        ) : (
                          <Text style={styles.thumbPh}>—</Text>
                        )}
                      </View>
                      <View style={styles.lineBody}>
                        <Text style={styles.lineName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.linePrice}>₹{item.price}</Text>
                      </View>
                      <View style={styles.qty}>
                        <Pressable
                          style={styles.qtyHit}
                          onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Text style={styles.qtyTxt}>−</Text>
                        </Pressable>
                        <Text style={styles.qtyNum}>{item.quantity}</Text>
                        <Pressable
                          style={styles.qtyHit}
                          onPress={() => updateQuantity(item.product_id, item.quantity + 1)}
                        >
                          <Text style={styles.qtyTxt}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
                  <Pressable style={styles.continue} onPress={() => setCheckoutActive(true)}>
                    <Text style={styles.continueText}>Continue</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        ) : (
          <CheckoutFlow
            visible={checkoutActive}
            orderType={orderType}
            onOrderTypeChange={onOrderTypeChange}
            onBackToCart={() => setCheckoutActive(false)}
            onDismiss={() => {
              setCheckoutActive(false);
              onClose();
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  close: { fontSize: 16, fontWeight: "600", color: colors.green },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyDot: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.pillBg },
  emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: "700", color: colors.textSecondary },
  emptySub: { marginTop: 6, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  progressWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  progressText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.pillBg, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.textPrimary, borderRadius: 3 },
  list: { flex: 1 },
  line: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f3f3",
    gap: 10,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.pillBg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbPh: { color: colors.textMuted },
  lineBody: { flex: 1, minWidth: 0 },
  lineName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  linePrice: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  qty: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingHorizontal: 4,
  },
  qtyHit: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  qtyTxt: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  qtyNum: { minWidth: 22, textAlign: "center", fontWeight: "700", fontSize: 14 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.white,
  },
  continue: {
    backgroundColor: colors.black,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
  },
  continueText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
