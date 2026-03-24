import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import {
  CheckoutAddressStep,
  CheckoutPaymentStep,
  CheckoutSuccessStep,
  CheckoutToast,
} from "../checkout/CheckoutFlowSteps";
import { useCheckoutFlow } from "../checkout/useCheckoutFlow";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { computeOrderPricing, FREE_DELIVERY_THRESHOLD } from "../lib/pricing";
import { colors } from "../lib/theme";
import {
  ENTRY_STEP_SLIDE_DELAY_MS,
  ENTRY_STEP_SLIDE_EASING,
  ENTRY_STEP_SLIDE_MS,
  IosFlowSheetFrame,
  iosFlowSheetStyles,
  useIosFlowSheet,
} from "./flowSheet/IosFlowSheetChrome";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LocationPickerModal } from "./LocationPickerModal";
import { PhoneOtpAuthFlow } from "./PhoneOtpAuthFlow";

type FlowPage = "cart" | "auth" | "address" | "payment" | "success";

function resolveCartSheetHeight(flowPage: FlowPage, viewportHeight: number): number {
  const sheetMax = Math.min(viewportHeight * 0.9, 880);
  const cartH = Math.min(viewportHeight * 0.88, 820);
  const authH = Math.min(Math.max(316, viewportHeight * 0.38), 400);
  const addrH = Math.min(viewportHeight * 0.88, 820);
  const payH = Math.min(Math.max(480, viewportHeight * 0.58), 680);
  const okH = Math.min(Math.max(400, viewportHeight * 0.48), 520);

  if (flowPage === "cart") return Math.min(sheetMax, Math.max(340, cartH));
  if (flowPage === "auth") return Math.min(sheetMax, authH);
  if (flowPage === "address") return Math.min(sheetMax, Math.max(420, addrH));
  if (flowPage === "payment") return Math.min(sheetMax, payH);
  return Math.min(sheetMax, okH);
}

function pageOrder(startedCheckoutAsGuest: boolean): FlowPage[] {
  return startedCheckoutAsGuest
    ? ["cart", "auth", "address", "payment", "success"]
    : ["cart", "address", "payment", "success"];
}

function pageIndex(flowPage: FlowPage, startedCheckoutAsGuest: boolean): number {
  return pageOrder(startedCheckoutAsGuest).indexOf(flowPage);
}

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
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { items, updateQuantity, totalPrice } = useCart();
  const { user, isLoading: authLoading } = useAuth();

  const [flowPage, setFlowPage] = useState<FlowPage>("cart");
  const [startedCheckoutAsGuest, setStartedCheckoutAsGuest] = useState(false);
  const [checkoutEngaged, setCheckoutEngaged] = useState(false);
  const wasOpenRef = useRef(false);
  const skipSlideAnimationRef = useRef(true);

  const slideIndexAnim = useRef(new Animated.Value(0)).current;
  const sheetLayoutHeightAnim = useRef(new Animated.Value(resolveCartSheetHeight("cart", viewportHeight))).current;

  const {
    internalVisible,
    translateY,
    backdropOpacity,
    sheetPanResponder,
    sheetHeightRef,
  } = useIosFlowSheet({ visible, onClose });

  const checkoutActive =
    checkoutEngaged &&
    (flowPage === "address" || flowPage === "payment" || flowPage === "success");

  const checkout = useCheckoutFlow({
    sheetOpen: visible,
    checkoutActive,
    orderType,
    onOrderTypeChange,
  });

  const { progress, freeDeliveryUnlocked, remainingForFreeDelivery } = useMemo(() => {
    const { freeDeliveryUnlocked: f, remainingForFreeDelivery: r } = computeOrderPricing(
      totalPrice,
      orderType,
      0,
      false
    );
    return {
      progress: Math.min((totalPrice / FREE_DELIVERY_THRESHOLD) * 100, 100),
      freeDeliveryUnlocked: f,
      remainingForFreeDelivery: r,
    };
  }, [orderType, totalPrice]);

  const pages = pageOrder(startedCheckoutAsGuest);
  const pageCount = pages.length;
  const sheetOuterHorizontal = 20;
  const contentWidth = Math.max(280, viewportWidth - sheetOuterHorizontal);
  const sheetMaxHeight = Math.min(viewportHeight * 0.9, 880);

  const targetHeight = resolveCartSheetHeight(flowPage, viewportHeight);
  sheetHeightRef.current = targetHeight;

  const slideInputRange = useMemo(() => pages.map((_, i) => i), [pages]);
  const slideOutputRange = useMemo(
    () => pages.map((_, i) => -i * contentWidth),
    [contentWidth, pages]
  );

  const entryTranslateX = useMemo(
    () =>
      slideIndexAnim.interpolate({
        inputRange: slideInputRange,
        outputRange: slideOutputRange,
      }),
    [slideIndexAnim, slideInputRange, slideOutputRange]
  );

  useLayoutEffect(() => {
    if (!visible) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    skipSlideAnimationRef.current = true;
    setFlowPage("cart");
    setCheckoutEngaged(false);
    setStartedCheckoutAsGuest(false);
    slideIndexAnim.setValue(0);
    sheetLayoutHeightAnim.setValue(resolveCartSheetHeight("cart", viewportHeight));
  }, [visible, viewportHeight, slideIndexAnim, sheetLayoutHeightAnim]);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => {
        setFlowPage("cart");
        setCheckoutEngaged(false);
        setStartedCheckoutAsGuest(false);
      }, 220);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const animateToPage = useCallback(
    (page: FlowPage) => {
      const idx = pageIndex(page, startedCheckoutAsGuest);
      const h = resolveCartSheetHeight(page, viewportHeight);
      Animated.parallel([
        Animated.sequence([
          Animated.delay(ENTRY_STEP_SLIDE_DELAY_MS),
          Animated.timing(slideIndexAnim, {
            toValue: idx,
            duration: ENTRY_STEP_SLIDE_MS,
            easing: ENTRY_STEP_SLIDE_EASING,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(ENTRY_STEP_SLIDE_DELAY_MS),
          Animated.timing(sheetLayoutHeightAnim, {
            toValue: h,
            duration: ENTRY_STEP_SLIDE_MS,
            easing: ENTRY_STEP_SLIDE_EASING,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    },
    [slideIndexAnim, sheetLayoutHeightAnim, startedCheckoutAsGuest, viewportHeight]
  );

  useEffect(() => {
    if (!visible) return;
    if (skipSlideAnimationRef.current) {
      skipSlideAnimationRef.current = false;
      return;
    }
    animateToPage(flowPage);
  }, [flowPage, visible, startedCheckoutAsGuest, animateToPage]);

  useEffect(() => {
    if (!visible || !checkoutEngaged) return;
    if (checkout.step === 2 && flowPage === "address") setFlowPage("payment");
  }, [visible, checkoutEngaged, checkout.step, flowPage]);

  useEffect(() => {
    if (!visible || !checkoutEngaged) return;
    if (checkout.step === 3 && flowPage === "payment") setFlowPage("success");
  }, [visible, checkoutEngaged, checkout.step, flowPage]);

  const handleContinueFromCart = () => {
    if (items.length === 0) return;
    const asGuest = !user?.id;
    setStartedCheckoutAsGuest(asGuest);
    setCheckoutEngaged(true);
    setFlowPage(asGuest ? "auth" : "address");
  };

  const handleBack = () => {
    if (flowPage === "cart") {
      onClose();
      return;
    }
    if (flowPage === "auth") {
      setCheckoutEngaged(false);
      setFlowPage("cart");
      checkout.resetCheckout();
      return;
    }
    if (flowPage === "address") {
      if (startedCheckoutAsGuest) setFlowPage("auth");
      else {
        setCheckoutEngaged(false);
        setFlowPage("cart");
        checkout.resetCheckout();
      }
      return;
    }
    if (flowPage === "payment") {
      setFlowPage("address");
      checkout.setStep(1);
      return;
    }
  };

  const handleClosePress = () => {
    onClose();
  };

  const handleAuthSuccess = () => {
    setFlowPage("address");
  };

  const handleSuccessDismiss = () => {
    onClose();
  };

  const sheetHeader = (
    <View style={iosFlowSheetStyles.sheetHeader}>
      {flowPage === "cart" ? (
        <View style={iosFlowSheetStyles.headerSpacer} />
      ) : flowPage === "success" ? (
        <View style={iosFlowSheetStyles.headerSpacer} />
      ) : (
        <Pressable style={iosFlowSheetStyles.topActionBtn} onPress={handleBack} hitSlop={10}>
          <Ionicons name="chevron-back" size={19} color="#1f2937" />
        </Pressable>
      )}
      <Pressable style={iosFlowSheetStyles.topActionBtn} onPress={handleClosePress} hitSlop={10}>
        <Ionicons name="close" size={19} color="#1f2937" />
      </Pressable>
    </View>
  );

  return (
    <>
      <IosFlowSheetFrame
        internalVisible={internalVisible}
        onRequestClose={onClose}
        translateY={translateY}
        backdropOpacity={backdropOpacity}
        sheetHeightAnim={sheetLayoutHeightAnim}
        sheetMaxHeight={sheetMaxHeight}
        sheetPanResponder={sheetPanResponder}
        header={sheetHeader}
      >
        <View style={iosFlowSheetStyles.stepViewport}>
          <View style={{ flex: 1, position: "relative" }}>
            <CheckoutToast checkout={checkout} />
            {authLoading && checkoutEngaged && flowPage === "address" ? (
              <View style={styles.authWait}>
                <ActivityIndicator size="large" color={colors.textMuted} />
                <Text style={styles.authWaitText}>Checking your session…</Text>
              </View>
            ) : null}
            <Animated.View
              style={[
                iosFlowSheetStyles.stepTrack,
                {
                  width: contentWidth * pageCount,
                  transform: [{ translateX: entryTranslateX }],
                },
              ]}
            >
              {pages.map((page) => (
                <View key={page} style={[iosFlowSheetStyles.stepPage, { width: contentWidth }]}>
                  <ScrollView
                    style={styles.pageScroll}
                    contentContainerStyle={[
                      iosFlowSheetStyles.sheetGutter,
                      { paddingBottom: Math.max(20, insets.bottom + 12) },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {page === "cart" ? (
                      <>
                        <Text style={styles.cartTitle}>Your cart</Text>
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
                            {items.map((item) => (
                              <View key={item.id} style={styles.line}>
                                <View style={styles.thumb}>
                                  {item.image_url ? (
                                    <Image
                                      source={{ uri: item.image_url }}
                                      style={styles.thumbImg}
                                      contentFit="cover"
                                    />
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
                            <Pressable style={styles.continue} onPress={handleContinueFromCart}>
                              <Text style={styles.continueText}>Continue</Text>
                            </Pressable>
                          </>
                        )}
                      </>
                    ) : null}

                    {page === "auth" ? (
                      <PhoneOtpAuthFlow
                        active={visible && flowPage === "auth"}
                        variant="sheet"
                        showToast={checkout.showToast}
                        onAuthenticated={handleAuthSuccess}
                      />
                    ) : null}

                    {page === "address" ? (
                      <CheckoutAddressStep checkout={checkout} onOrderTypeChange={onOrderTypeChange} />
                    ) : null}

                    {page === "payment" ? <CheckoutPaymentStep checkout={checkout} /> : null}

                    {page === "success" ? (
                      <CheckoutSuccessStep checkout={checkout} onDismiss={handleSuccessDismiss} />
                    ) : null}
                  </ScrollView>
                </View>
              ))}
            </Animated.View>
          </View>
        </View>
      </IosFlowSheetFrame>

      <LocationPickerModal
        visible={checkout.adjustPinOpen}
        onClose={() => checkout.setAdjustPinOpen(false)}
        onSelectLocation={(loc) => void checkout.setLocationData(loc)}
        title="Adjust delivery pin"
        subtitle="Search or use GPS to move the pin"
        onUseCurrentLocation={async () => {
          await checkout.getCurrentLocation();
        }}
        locationLoading={checkout.isLoadingLocation}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pageScroll: { flex: 1 },
  cartTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  authWait: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 40 },
  authWaitText: { marginTop: 12, color: colors.textSecondary },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 32, paddingHorizontal: 16 },
  emptyDot: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.pillBg },
  emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: "700", color: colors.textSecondary },
  emptySub: { marginTop: 6, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  progressWrap: { paddingBottom: 12 },
  progressText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.pillBg, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.textPrimary, borderRadius: 3 },
  line: {
    flexDirection: "row",
    alignItems: "center",
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
  continue: {
    backgroundColor: colors.black,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 20,
  },
  continueText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
