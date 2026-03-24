import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import {
  AUTH_STAGE_SLIDE_DELAY_MS,
  AUTH_STAGE_SLIDE_EASING,
  AUTH_STAGE_SLIDE_MS,
  ENTRY_STEP_SLIDE_DELAY_MS,
  ENTRY_STEP_SLIDE_EASING,
  ENTRY_STEP_SLIDE_MS,
  IosFlowSheetFrame,
  PRIMARY_BUTTON_HEIGHT,
  PRIMARY_BUTTON_RADIUS,
  SHEET_CONTENT_GUTTER,
  iosFlowSheetStyles,
  iosPalette,
  useIosFlowSheet,
} from "./flowSheet/IosFlowSheetChrome";
import { mapboxForwardGeocode, type GeocodeSuggestion } from "../lib/mapboxGeocoding";
import { fetchUserSavedAddresses, savedAddressToLocation, type SavedAddressRow } from "../lib/savedAddresses";
import type { LocationData } from "../types/location";

export type LocationPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (loc: LocationData) => void;
  title?: string;
  subtitle?: string;
  onUseCurrentLocation: () => Promise<void>;
  locationLoading?: boolean;
  requireAuthFirst?: boolean;
  showBackButton?: boolean;
  authOnly?: boolean;
};

const RECENT_LOCATIONS_KEY = "nile_recent_locations";
const CURRENT_LOCATION_KEY = "nile_location";
type RecentLocation = LocationData & { id: string };
const ROWS_PER_SLIDE = 3;
const HORIZONTAL_SLIDE_GAP = 10;

function resolveSheetTargetHeight(
  viewportHeight: number,
  opts: { showAuthStep: boolean; authOnly: boolean; authStage: "phone" | "verify" }
) {
  const sheetMaxHeight = Math.min(viewportHeight * 0.9, 880);
  const loginSheetMinHeight = opts.authStage === "verify" ? 360 : 316;
  const locationSheetMinHeight = Math.max(420, Math.min(viewportHeight * 0.56, 620));
  const sheetMinHeight =
    opts.showAuthStep || opts.authOnly ? loginSheetMinHeight : locationSheetMinHeight;
  return Math.min(sheetMaxHeight, Math.max(300, sheetMinHeight));
}

function chunkItems<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function getLocationLines(loc: { city?: string; state?: string; displayName?: string }) {
  const rawDisplay = loc.displayName?.trim() || "";
  const city = loc.city?.trim() || rawDisplay.split(",")[0]?.trim() || "";
  const state = loc.state?.trim() || "";

  let secondary = "";
  if (rawDisplay) {
    if (rawDisplay.includes(",")) {
      const parts = rawDisplay.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        const [, ...rest] = parts;
        secondary = rest.join(", ");
      }
    } else if (rawDisplay.toLowerCase() !== city.toLowerCase()) {
      secondary = rawDisplay;
    }
  }

  if (!secondary && state && state.toLowerCase() !== city.toLowerCase()) {
    secondary = state;
  }

  return {
    primaryLine: city || rawDisplay || "Selected location",
    secondaryLine: secondary,
  };
}

export function LocationPickerModal({
  visible,
  onClose,
  onSelectLocation,
  title = "Choose Location",
  onUseCurrentLocation,
  locationLoading,
  requireAuthFirst = false,
  showBackButton = true,
  authOnly = false,
}: LocationPickerModalProps) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const { user } = useAuth();
  const [entryStep, setEntryStep] = useState<"auth" | "location">("location");
  const [authPhone, setAuthPhone] = useState("");
  const [authOtpPart1, setAuthOtpPart1] = useState("");
  const [authOtpPart2, setAuthOtpPart2] = useState("");
  const [authStage, setAuthStage] = useState<"phone" | "verify">("phone");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedAddressRow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const slideAnim = useRef(new Animated.Value(entryStep === "auth" ? 0 : 1)).current;
  const authStageAnim = useRef(new Animated.Value(authStage === "phone" ? 0 : 1)).current;
  const otpPart1Ref = useRef<TextInput>(null);
  const otpPart2Ref = useRef<TextInput>(null);
  const wasVisibleRef = useRef(false);
  const sheetLayoutHeightAnim = useRef(new Animated.Value(420)).current;
  const { internalVisible, translateY, backdropOpacity, sheetPanResponder, sheetHeightRef } = useIosFlowSheet({
    visible,
    onClose,
  });
  /** Skip auth-stage height animation on first auth paint; entry transition already sets height. */
  const prevAuthStageForSheetRef = useRef<"phone" | "verify" | null>(null);
  const showAuthStep = authOnly || entryStep === "auth";

  useEffect(() => {
    if (!visible) {
      setAuthPhone("");
      setAuthOtpPart1("");
      setAuthOtpPart2("");
      setAuthStage("phone");
      setQuery("");
      setSuggestions([]);
      setSavedLocations([]);
      setLoadingSaved(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(RECENT_LOCATIONS_KEY).then((raw) => {
      if (!raw) {
        setRecentLocations([]);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as RecentLocation[];
        setRecentLocations(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRecentLocations([]);
      }
    });
  }, [visible]);

  useEffect(() => {
    if (!visible || !user?.id) {
      setSavedLocations([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSaved(true);
      const rows = await fetchUserSavedAddresses(user.id, 8);
      if (!cancelled) {
        setSavedLocations(rows);
        setLoadingSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, user?.id]);

  useLayoutEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      return;
    }
    if (wasVisibleRef.current) return;
    wasVisibleRef.current = true;
    const nextEntryStep = authOnly ? "auth" : requireAuthFirst && !user?.id ? "auth" : "location";
    setEntryStep(nextEntryStep);
    setAuthStage("phone");
    slideAnim.setValue(nextEntryStep === "auth" ? 0 : 1);
    authStageAnim.setValue(0);
    sheetLayoutHeightAnim.setValue(
      resolveSheetTargetHeight(viewportHeight, {
        showAuthStep: authOnly || nextEntryStep === "auth",
        authOnly,
        authStage: "phone",
      })
    );
  }, [
    authOnly,
    authStageAnim,
    requireAuthFirst,
    sheetLayoutHeightAnim,
    slideAnim,
    user?.id,
    visible,
    viewportHeight,
  ]);

  useEffect(() => {
    const toHeight = resolveSheetTargetHeight(viewportHeight, {
      showAuthStep,
      authOnly,
      authStage,
    });
    const anim = Animated.parallel([
      Animated.sequence([
        Animated.delay(ENTRY_STEP_SLIDE_DELAY_MS),
        Animated.timing(slideAnim, {
          toValue: showAuthStep ? 0 : 1,
          duration: ENTRY_STEP_SLIDE_MS,
          easing: ENTRY_STEP_SLIDE_EASING,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(ENTRY_STEP_SLIDE_DELAY_MS),
        Animated.timing(sheetLayoutHeightAnim, {
          toValue: toHeight,
          duration: ENTRY_STEP_SLIDE_MS,
          easing: ENTRY_STEP_SLIDE_EASING,
          useNativeDriver: false,
        }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
    // authStage read for toHeight when showAuthStep/viewport change; omit from deps so phone↔verify uses AUTH_* effect only.
  }, [authOnly, showAuthStep, sheetLayoutHeightAnim, slideAnim, viewportHeight]);

  useEffect(() => {
    if (!showAuthStep && !authOnly) {
      prevAuthStageForSheetRef.current = null;
      return;
    }
    const prev = prevAuthStageForSheetRef.current;
    prevAuthStageForSheetRef.current = authStage;
    if (prev === null) {
      authStageAnim.setValue(authStage === "phone" ? 0 : 1);
      return;
    }
    if (prev === authStage) return;
    const toHeight = resolveSheetTargetHeight(viewportHeight, {
      showAuthStep,
      authOnly,
      authStage,
    });
    const anim = Animated.parallel([
      Animated.sequence([
        Animated.delay(AUTH_STAGE_SLIDE_DELAY_MS),
        Animated.timing(authStageAnim, {
          toValue: authStage === "phone" ? 0 : 1,
          duration: AUTH_STAGE_SLIDE_MS,
          easing: AUTH_STAGE_SLIDE_EASING,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(AUTH_STAGE_SLIDE_DELAY_MS),
        Animated.timing(sheetLayoutHeightAnim, {
          toValue: toHeight,
          duration: AUTH_STAGE_SLIDE_MS,
          easing: AUTH_STAGE_SLIDE_EASING,
          useNativeDriver: false,
        }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [authOnly, authStage, authStageAnim, showAuthStep, sheetLayoutHeightAnim, viewportHeight]);

  useEffect(() => {
    if (!visible || authStage !== "verify") return;
    const t = setTimeout(() => {
      otpPart1Ref.current?.focus();
    }, 120);
    return () => clearTimeout(t);
  }, [authStage, visible]);

  useEffect(() => {
    if (!visible || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await mapboxForwardGeocode(query.trim(), 8);
      if (!cancelled) {
        setSuggestions(res);
        setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, visible]);

  const pushRecentLocation = useCallback(async (loc: LocationData) => {
    const id = `${loc.latitude.toFixed(5)}:${loc.longitude.toFixed(5)}`;
    const next: RecentLocation = { ...loc, id };
    setRecentLocations((prev) => {
      const deduped = [next, ...prev.filter((p) => p.id !== id)].slice(0, 6);
      void AsyncStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(deduped));
      return deduped;
    });
  }, []);

  const selectLocation = useCallback(
    async (loc: LocationData) => {
      await pushRecentLocation(loc);
      onSelectLocation(loc);
      onClose();
    },
    [onClose, onSelectLocation, pushRecentLocation]
  );

  const pick = useCallback(
    (s: GeocodeSuggestion) => {
      void selectLocation({
        latitude: s.latitude,
        longitude: s.longitude,
        city: s.city,
        state: s.state,
        displayName: s.displayName,
      });
    },
    [selectLocation]
  );

  const handleContinueAuth = useCallback(() => {
    const digits = authPhone.replace(/\D/g, "").slice(0, 10);
    if (digits.length !== 10) return;
    setAuthStage("verify");
  }, [authPhone]);

  const handleVerifyAuth = useCallback(() => {
    const otp = `${authOtpPart1}${authOtpPart2}`.replace(/\D/g, "").slice(0, 6);
    if (otp.length !== 6) return;
    if (authOnly) {
      onClose();
      return;
    }
    setEntryStep("location");
    setAuthOtpPart1("");
    setAuthOtpPart2("");
    setAuthStage("phone");
  }, [authOnly, authOtpPart1, authOtpPart2, onClose]);

  const hasSearch = query.trim().length >= 2;
  const sheetMaxHeight = Math.min(viewportHeight * 0.9, 880);
  const targetSheetHeight = resolveSheetTargetHeight(viewportHeight, {
    showAuthStep,
    authOnly,
    authStage,
  });
  const showSavedSection = !hasSearch && Boolean(user?.id);
  const sheetOuterHorizontal = 20; // sheet marginHorizontal 10 + 10
  const contentWidth = Math.max(280, viewportWidth - sheetOuterHorizontal);
  const innerContentWidth = Math.max(240, contentWidth - 2 * SHEET_CONTENT_GUTTER);
  const pageCount = authOnly ? 1 : 2;
  /** Integer width avoids subpixel horizontal overflow past the gutter on iOS. */
  const slideWidth = Math.min(360, Math.max(1, Math.floor(innerContentWidth)));
  const snapInterval = slideWidth + HORIZONTAL_SLIDE_GAP;
  const recentSlides = useMemo(() => chunkItems(recentLocations, ROWS_PER_SLIDE), [recentLocations]);
  const savedSlides = useMemo(() => chunkItems(savedLocations, ROWS_PER_SLIDE), [savedLocations]);

  const entryTranslateX = useMemo(
    () =>
      slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -contentWidth],
      }),
    [contentWidth, slideAnim]
  );
  const authStageTranslateX = useMemo(
    () =>
      authStageAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -innerContentWidth],
      }),
    [authStageAnim, innerContentWidth]
  );

  sheetHeightRef.current = targetSheetHeight;

  const handleUseCurrentLocation = useCallback(async () => {
    await onUseCurrentLocation();
    const raw = await AsyncStorage.getItem(CURRENT_LOCATION_KEY);
    if (!raw) return;
    try {
      const loc = JSON.parse(raw) as LocationData;
      if (loc?.latitude && loc?.longitude) {
        await pushRecentLocation(loc);
      }
    } catch {
      // ignore invalid cache
    }
  }, [onUseCurrentLocation, pushRecentLocation]);

  const sheetHeader = (
    <View style={iosFlowSheetStyles.sheetHeader}>
      {showAuthStep || !showBackButton ? (
        <View style={iosFlowSheetStyles.headerSpacer} />
      ) : (
        <Pressable
          style={iosFlowSheetStyles.topActionBtn}
          onPress={() => {
            if (requireAuthFirst && !authOnly) {
              setAuthStage("phone");
              setEntryStep("auth");
              return;
            }
            onClose();
          }}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={19} color="#1f2937" />
        </Pressable>
      )}
      <Pressable
        onPress={
          showAuthStep
            ? () => {
                if (authOnly) {
                  onClose();
                  return;
                }
                setEntryStep("location");
              }
            : onClose
        }
        hitSlop={10}
        style={iosFlowSheetStyles.topActionBtn}
      >
        {showAuthStep ? (
          <Text style={iosFlowSheetStyles.topActionText}>Skip</Text>
        ) : (
          <Ionicons name="close" size={19} color="#1f2937" />
        )}
      </Pressable>
    </View>
  );

  return (
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
            <Animated.View
              style={[
                iosFlowSheetStyles.stepTrack,
                {
                  width: contentWidth * pageCount,
                  transform: [{ translateX: entryTranslateX }],
                },
              ]}
            >
              <View style={[iosFlowSheetStyles.stepPage, { width: contentWidth }]}>
                <View style={iosFlowSheetStyles.sheetGutter}>
                  <View style={styles.authWrap}>
                    <View style={styles.authTopRow}>
                      <Text style={styles.authStepTitle}>
                        {authStage === "verify" ? "Verify number" : "Continue with phone"}
                      </Text>
                    </View>
                    <View style={styles.authStageViewport}>
                      <Animated.View
                        style={[
                          styles.authStageTrack,
                          {
                            width: innerContentWidth * 2,
                            transform: [{ translateX: authStageTranslateX }],
                          },
                        ]}
                      >
                        <View style={{ width: innerContentWidth }}>
                          <Text style={styles.stepSubtitle}>Sign in quickly to continue your order.</Text>
                          <View style={styles.phoneRow}>
                            <Text style={styles.phonePrefix}>+91</Text>
                            <TextInput
                              style={styles.phoneInput}
                              value={authPhone}
                              onChangeText={(t) => setAuthPhone(t.replace(/\D/g, "").slice(0, 10))}
                              keyboardType="phone-pad"
                              placeholder="9876543210"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                          <Pressable style={styles.primaryCta} onPress={handleContinueAuth}>
                            <Text style={styles.primaryCtaText}>Continue</Text>
                          </Pressable>
                        </View>

                        <View style={{ width: innerContentWidth }}>
                          <Text style={styles.stepSubtitle}>Enter the code sent to your phone.</Text>
                          <View style={styles.otpRow}>
                            <TextInput
                              ref={otpPart1Ref}
                              style={styles.otpInput}
                              value={authOtpPart1}
                              onChangeText={(t) => {
                                const value = t.replace(/\D/g, "").slice(0, 3);
                                setAuthOtpPart1(value);
                                if (value.length === 3) otpPart2Ref.current?.focus();
                              }}
                              keyboardType="number-pad"
                              placeholder="123"
                              placeholderTextColor="#9ca3af"
                              autoCorrect={false}
                              maxLength={3}
                            />
                            <TextInput
                              ref={otpPart2Ref}
                              style={styles.otpInput}
                              value={authOtpPart2}
                              onChangeText={(t) => setAuthOtpPart2(t.replace(/\D/g, "").slice(0, 3))}
                              onKeyPress={({ nativeEvent }) => {
                                if (nativeEvent.key === "Backspace" && authOtpPart2.length === 0) {
                                  otpPart1Ref.current?.focus();
                                }
                              }}
                              keyboardType="number-pad"
                              placeholder="456"
                              placeholderTextColor="#9ca3af"
                              autoCorrect={false}
                              maxLength={3}
                            />
                          </View>
                          <Pressable style={styles.primaryCta} onPress={handleVerifyAuth}>
                            <Text style={styles.primaryCtaText}>Verify</Text>
                          </Pressable>
                        </View>
                      </Animated.View>
                    </View>
                  </View>
                </View>
              </View>

              {!authOnly ? (
                <View style={[iosFlowSheetStyles.stepPage, { width: contentWidth }]}>
                <View style={iosFlowSheetStyles.sheetGutter}>
                  <Text style={styles.locationStepTitle}>{title || "Choose Location"}</Text>

                  <Pressable style={styles.currentBtn} onPress={() => void handleUseCurrentLocation()} disabled={locationLoading}>
                    {locationLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.currentBtnText}>Current Location</Text>
                    )}
                  </Pressable>

                  <TextInput
                    style={styles.search}
                    placeholder="Search"
                    placeholderTextColor="#9ca3af"
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                  />

                  {searching ? (
                    <ActivityIndicator style={{ marginTop: 16 }} color="#9ca3af" />
                  ) : (
                    <View style={styles.locationSections}>
                      {hasSearch ? (
                        <>
                          <Text style={styles.sectionTitle}>Results</Text>
                          {suggestions.length > 0 ? (
                            suggestions.map((item) => (
                              <Pressable key={item.id} style={styles.suggestionCard} onPress={() => pick(item)}>
                                <Text style={styles.suggestionTitle}>{item.displayName}</Text>
                                <Text style={styles.suggestionMeta}>
                                  {item.city}
                                  {item.state ? ` · ${item.state}` : ""}
                                </Text>
                              </Pressable>
                            ))
                          ) : (
                            <Text style={styles.emptyText}>No matches found.</Text>
                          )}
                        </>
                      ) : null}

                      {!hasSearch && recentLocations.length > 0 ? (
                        <>
                          <Text style={styles.sectionTitle}>Recent</Text>
                          <View style={styles.horizontalSlidesShell} collapsable={false}>
                            <View style={styles.horizontalSlidesScrollClip} collapsable={false}>
                              <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                                alwaysBounceVertical={false}
                                directionalLockEnabled={Platform.OS === "ios"}
                                decelerationRate="fast"
                                disableIntervalMomentum
                                removeClippedSubviews={false}
                                snapToAlignment="start"
                                snapToInterval={snapInterval}
                                style={styles.horizontalSlidesScrollFill}
                                contentContainerStyle={{ paddingBottom: 8 }}
                                automaticallyAdjustContentInsets={false}
                                contentInsetAdjustmentBehavior="never"
                              >
                                <View
                                  style={[
                                    styles.horizontalSlides,
                                  ]}
                                >
                                  {recentSlides.map((slide, slideIndex) => (
                                    <View
                                      key={`recent-slide-${slideIndex}`}
                                      style={[
                                        styles.insetSlide,
                                        { width: slideWidth },
                                        slideIndex === recentSlides.length - 1 && styles.insetSlideLast,
                                      ]}
                                    >
                                      <View style={styles.insetListCard}>
                                        {slide.map((item, index) => (
                                          <View key={item.id}>
                                            {index > 0 ? <View style={styles.insetDivider} /> : null}
                                            {(() => {
                                              const { primaryLine, secondaryLine } = getLocationLines(item);
                                              return (
                                                <Pressable style={styles.insetRow} onPress={() => void selectLocation(item)}>
                                                  <View style={styles.insetLeadingIcon}>
                                                    <Ionicons name="time-outline" size={16} color="#059669" />
                                                  </View>
                                                  <View style={styles.insetCopy}>
                                                    <Text style={styles.insetTitle} numberOfLines={1}>
                                                      {primaryLine}
                                                    </Text>
                                                    {secondaryLine ? (
                                                      <Text style={styles.insetSubtitle} numberOfLines={1}>
                                                        {secondaryLine}
                                                      </Text>
                                                    ) : null}
                                                  </View>
                                                  <Ionicons name="ellipsis-horizontal" size={18} color="#9ca3af" />
                                                </Pressable>
                                              );
                                            })()}
                                          </View>
                                        ))}
                                      </View>
                                    </View>
                                  ))}
                                </View>
                              </ScrollView>
                            </View>
                          </View>
                        </>
                      ) : null}

                      {showSavedSection ? (
                        <>
                          <Text style={styles.sectionTitle}>Saved</Text>
                          {loadingSaved ? (
                            <ActivityIndicator style={{ marginVertical: 10 }} color="#9ca3af" />
                          ) : savedLocations.length > 0 ? (
                            <View style={styles.horizontalSlidesShell} collapsable={false}>
                              <View style={styles.horizontalSlidesScrollClip} collapsable={false}>
                                <ScrollView
                                  horizontal
                                  showsHorizontalScrollIndicator={false}
                                  showsVerticalScrollIndicator={false}
                                  bounces={false}
                                  alwaysBounceVertical={false}
                                  directionalLockEnabled={Platform.OS === "ios"}
                                  decelerationRate="fast"
                                  disableIntervalMomentum
                                  removeClippedSubviews={false}
                                  snapToAlignment="start"
                                  snapToInterval={snapInterval}
                                  style={styles.horizontalSlidesScrollFill}
                                  contentContainerStyle={{ paddingBottom: 8 }}
                                  automaticallyAdjustContentInsets={false}
                                  contentInsetAdjustmentBehavior="never"
                                >
                                  <View
                                    style={[
                                      styles.horizontalSlides,
                                    ]}
                                  >
                                    {savedSlides.map((slide, slideIndex) => (
                                      <View
                                        key={`saved-slide-${slideIndex}`}
                                        style={[
                                          styles.insetSlide,
                                          { width: slideWidth },
                                          slideIndex === savedSlides.length - 1 && styles.insetSlideLast,
                                        ]}
                                      >
                                        <View style={styles.insetListCard}>
                                          {slide.map((row, index) => {
                                            const loc = savedAddressToLocation(row);
                                            if (!loc) return null;
                                            return (
                                              <View key={`saved-${row.id}`}>
                                                {index > 0 ? <View style={styles.insetDivider} /> : null}
                                                <Pressable style={styles.insetRow} onPress={() => void selectLocation(loc)}>
                                                  <View style={styles.insetLeadingIcon}>
                                                    <Ionicons name="home-outline" size={16} color="#059669" />
                                                  </View>
                                                  <View style={styles.insetCopy}>
                                                    <Text style={styles.insetTitle} numberOfLines={1}>
                                                      {loc.displayName}
                                                    </Text>
                                                    <Text style={styles.insetSubtitle} numberOfLines={1}>
                                                      {[loc.city, loc.state].filter(Boolean).join(", ")}
                                                    </Text>
                                                  </View>
                                                  <Ionicons name="ellipsis-horizontal" size={18} color="#9ca3af" />
                                                </Pressable>
                                              </View>
                                            );
                                          })}
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                </ScrollView>
                              </View>
                            </View>
                          ) : (
                            <Text style={styles.emptyText}>No saved locations yet.</Text>
                          )}
                        </>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
              ) : null}
            </Animated.View>
          </View>
    </IosFlowSheetFrame>
  );
}

const styles = StyleSheet.create({
  authWrap: { paddingTop: 4 },
  authTopRow: { flexDirection: "row", alignItems: "center" },
  authStageViewport: { overflow: "hidden" },
  authStageTrack: { flexDirection: "row", alignItems: "flex-start", alignSelf: "flex-start", }, authStepTitle: { color: iosPalette.textPrimary, fontSize: 17, fontWeight: "700", letterSpacing: -0.2, flex: 1 },
  locationStepTitle: {
    color: iosPalette.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  stepSubtitle: {
    color: iosPalette.textSecondary,
    fontSize: 14,
    fontWeight: "400",
    marginTop: 4,
    marginBottom: 14,
  },
  phoneRow: {
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    minHeight: PRIMARY_BUTTON_HEIGHT,
  },
  phonePrefix: {
    width: 96,
    textAlign: "center",
    color: iosPalette.textSecondary,
    fontSize: 18,
    fontWeight: "500",
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: iosPalette.border,
  },
  phoneInput: {
    flex: 1,
    color: iosPalette.textPrimary,
    fontSize: 17,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontWeight: "500",
    minHeight: PRIMARY_BUTTON_HEIGHT,
  },
  otpRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  otpInput: {
    flex: 1,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    color: iosPalette.textPrimary,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 2,
    paddingVertical: 12,
    fontWeight: "600",
    minHeight: PRIMARY_BUTTON_HEIGHT,
  },
  primaryCta: {
    marginTop: 20,
    alignSelf: "stretch",
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryCtaText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  currentBtn: {
    alignSelf: "stretch",
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: "#000",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  currentBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  search: {
    alignSelf: "stretch",
    marginTop: 12,
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    color: iosPalette.textPrimary,
    fontSize: 17,
    paddingHorizontal: SHEET_CONTENT_GUTTER,
    paddingVertical: 12,
  },
  locationSections: { marginTop: 4, paddingBottom: 4, backgroundColor: iosPalette.sheetBg },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: "600",
    color: iosPalette.textPrimary,
  },
  /**
   * Bleed to the step content edge so the carousel isn’t a narrower “box” inside
   * sheetGutter padding (that nesting is what tends to show native white at the sides).
   * Titles stay gutter-aligned; list uses paddingLeft on the scroll content only.
   */
  horizontalSlidesShell: {
    alignSelf: "stretch",
    flexGrow: 0,
    marginHorizontal: -SHEET_CONTENT_GUTTER,
    overflow: "hidden",
    backgroundColor: iosPalette.sheetBg,
  },
  horizontalSlidesScrollClip: {
    alignSelf: "stretch",
    width: "100%",
    overflow: "hidden",
    backgroundColor: iosPalette.sheetBg,
  },
  horizontalSlidesScrollFill: {
    width: "100%",
    backgroundColor: iosPalette.sheetBg,
  },
  horizontalSlides: {
    flexDirection: "row",
    paddingLeft: SHEET_CONTENT_GUTTER,
    paddingRight: SHEET_CONTENT_GUTTER,
    backgroundColor: iosPalette.sheetBg,
    alignItems: "stretch",
  },
  /** paddingBottom replaces card marginBottom so column height matches painted area (avoids iOS gap under card). */
  insetSlide: {
    width: 320,
    marginRight: HORIZONTAL_SLIDE_GAP,
    paddingBottom: 8,
    backgroundColor: iosPalette.sheetBg,
  },
  insetSlideLast: { marginRight: 0 },
  insetListCard: {
    borderRadius: PRIMARY_BUTTON_RADIUS,
    borderWidth: 1,
    borderColor: iosPalette.border,
    backgroundColor: iosPalette.cardBg,
    overflow: "hidden",
  },
  insetDivider: {
    height: 1,
    backgroundColor: iosPalette.border,
    marginLeft: SHEET_CONTENT_GUTTER + 18 + 10,
    marginRight: SHEET_CONTENT_GUTTER,
  },
  insetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SHEET_CONTENT_GUTTER,
    paddingVertical: 12,
  },
  insetLeadingIcon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  insetCopy: { flex: 1, minWidth: 0 },
  insetTitle: { fontSize: 14, fontWeight: "500", color: iosPalette.textPrimary },
  insetSubtitle: { fontSize: 12, color: iosPalette.textSecondary, marginTop: 2 },
  suggestionCard: {
    alignSelf: "stretch",
    minHeight: 92,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    marginBottom: 12,
    paddingHorizontal: SHEET_CONTENT_GUTTER,
    paddingVertical: 12,
    justifyContent: "center",
  },
  suggestionTitle: { fontSize: 15, fontWeight: "600", color: iosPalette.textPrimary },
  suggestionMeta: { marginTop: 4, fontSize: 14, color: iosPalette.textSecondary },
  emptyText: { color: iosPalette.textSecondary, fontSize: 14, marginBottom: 10 },
});
