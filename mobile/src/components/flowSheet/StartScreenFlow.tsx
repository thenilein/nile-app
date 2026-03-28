import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Animated, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import {
  FORWARD_GEOCODE_MIN_QUERY_LENGTH,
  mapboxForwardGeocode,
  type GeocodeSuggestion,
} from "../../lib/mapboxGeocoding";
import { fetchUserSavedAddresses, type SavedAddressRow } from "../../lib/savedAddresses";
import type { LocationData } from "../../types/location";
import { LoginNumber } from "../LoginNumber";
import { LoginVerify } from "../LoginVerify";
import { RecentLocation, type RecentLocationRow } from "../RecentLocation";
import { SavedLocation } from "../SavedLocation";
import { SearchLocation } from "../SearchLocation";
import { UseCurrentLocation } from "../UseCurrentLocation";
import {
  AUTH_STAGE_SLIDE_DELAY_MS,
  AUTH_STAGE_SLIDE_EASING,
  AUTH_STAGE_SLIDE_MS,
  ENTRY_STEP_SLIDE_DELAY_MS,
  ENTRY_STEP_SLIDE_EASING,
  ENTRY_STEP_SLIDE_MS,
  IosFlowSheetFrame,
  SHEET_CONTENT_GUTTER,
  iosFlowSheetStyles,
  iosPalette,
  useIosFlowSheet,
} from "./IosFlowSheetChrome";

export type StartScreenFlowProps = {
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

/** Debounced delay after typing stops before geocode (typical for maps / delivery apps). */
const LOCATION_SEARCH_DEBOUNCE_MS = 400;

const RECENT_LOCATIONS_KEY = "nile_recent_locations";
const CURRENT_LOCATION_KEY = "nile_location";
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

export function StartScreenFlow({
  visible,
  onClose,
  onSelectLocation,
  title = "Choose Location",
  subtitle,
  onUseCurrentLocation,
  locationLoading,
  requireAuthFirst = false,
  showBackButton = true,
  authOnly = false,
}: StartScreenFlowProps) {
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
  const [recentLocations, setRecentLocations] = useState<RecentLocationRow[]>([]);
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
        const parsed = JSON.parse(raw) as RecentLocationRow[];
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
    const q = query.trim();
    if (!visible || q.length < FORWARD_GEOCODE_MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setSearching(true);
      const res = await mapboxForwardGeocode(q, 8);
      if (!cancelled) {
        setSuggestions(res);
        setSearching(false);
      }
    }, LOCATION_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setSearching(false);
    };
  }, [query, visible]);

  const pushRecentLocation = useCallback(async (loc: LocationData) => {
    const id = `${loc.latitude.toFixed(5)}:${loc.longitude.toFixed(5)}`;
    const next: RecentLocationRow = { ...loc, id };
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

  const hasSearch = query.trim().length >= FORWARD_GEOCODE_MIN_QUERY_LENGTH;
  const sheetMaxHeight = Math.min(viewportHeight * 0.9, 880);
  const targetSheetHeight = resolveSheetTargetHeight(viewportHeight, {
    showAuthStep,
    authOnly,
    authStage,
  });
  const showSavedSection = !hasSearch && Boolean(user?.id);
  const sheetOuterHorizontal = 20;
  const contentWidth = Math.max(280, viewportWidth - sheetOuterHorizontal);
  const innerContentWidth = Math.max(240, contentWidth - 2 * SHEET_CONTENT_GUTTER);
  const pageCount = authOnly ? 1 : 2;
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
              <View style={authStepStyles.authWrap}>
                <View style={authStepStyles.authTopRow}>
                  <Text style={authStepStyles.authStepTitle}>
                    {authStage === "verify" ? "Verify number" : "Continue with phone"}
                  </Text>
                </View>
                <View style={authStepStyles.authStageViewport}>
                  <Animated.View
                    style={[
                      authStepStyles.authStageTrack,
                      {
                        width: innerContentWidth * 2,
                        transform: [{ translateX: authStageTranslateX }],
                      },
                    ]}
                  >
                    <View style={{ width: innerContentWidth }}>
                      <LoginNumber
                        authPhone={authPhone}
                        onAuthPhoneChange={setAuthPhone}
                        onContinue={handleContinueAuth}
                      />
                    </View>
                    <View style={{ width: innerContentWidth }}>
                      <LoginVerify
                        authOtpPart1={authOtpPart1}
                        authOtpPart2={authOtpPart2}
                        onAuthOtpPart1Change={setAuthOtpPart1}
                        onAuthOtpPart2Change={setAuthOtpPart2}
                        otpPart1Ref={otpPart1Ref}
                        otpPart2Ref={otpPart2Ref}
                        onVerify={handleVerifyAuth}
                        verifyDisabled={
                          `${authOtpPart1}${authOtpPart2}`.replace(/\D/g, "").length !== 6
                        }
                      />
                    </View>
                  </Animated.View>
                </View>
              </View>
            </View>
          </View>

          {!authOnly ? (
            <View style={[iosFlowSheetStyles.stepPage, { width: contentWidth }]}>
              <View style={iosFlowSheetStyles.sheetGutter}>
                <Text style={locationStepStyles.locationStepTitle}>{title || "Choose Location"}</Text>
                {subtitle ? <Text style={locationStepStyles.locationSubtitle}>{subtitle}</Text> : null}
                <UseCurrentLocation
                  loading={locationLoading}
                  onPress={() => {
                    void handleUseCurrentLocation();
                  }}
                />
                <SearchLocation
                  query={query}
                  onQueryChange={setQuery}
                  searching={searching}
                  hasSearch={hasSearch}
                  suggestions={suggestions}
                  onPickSuggestion={pick}
                >
                  {!hasSearch ? (
                    <RecentLocation
                      slides={recentSlides}
                      snapInterval={snapInterval}
                      slideWidth={slideWidth}
                      onSelectLocation={(loc) => void selectLocation(loc)}
                    />
                  ) : null}
                  <SavedLocation
                    visible={showSavedSection}
                    loading={loadingSaved}
                    slides={savedSlides}
                    snapInterval={snapInterval}
                    slideWidth={slideWidth}
                    onSelectLocation={(loc) => void selectLocation(loc)}
                  />
                </SearchLocation>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </IosFlowSheetFrame>
  );
}

const authStepStyles = StyleSheet.create({
  authWrap: { paddingTop: 4 },
  authTopRow: { flexDirection: "row", alignItems: "center" },
  authStageViewport: { overflow: "hidden" },
  authStageTrack: { flexDirection: "row", alignItems: "flex-start", alignSelf: "flex-start" },
  authStepTitle: {
    color: iosPalette.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    flex: 1,
  },
});

const locationStepStyles = StyleSheet.create({
  locationStepTitle: {
    color: iosPalette.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  locationSubtitle: {
    color: iosPalette.textSecondary,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
});
