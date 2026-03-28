import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LandingHeroCarousel } from "../src/components/LandingHeroCarousel";
import { StartScreenFlow } from "../src/components/flowSheet/StartScreenFlow";
import { useLocation } from "../src/context/LocationContext";
import { colors } from "../src/lib/theme";
import type { LocationData } from "../src/types/location";

export default function StartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setLocationData, getCurrentLocation, isLoadingLocation } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const onPickLocation = useCallback(
    async (loc: LocationData) => {
      await setLocationData(loc);
      setSheetOpen(false);
      router.push("/home");
    },
    [router, setLocationData]
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(12, insets.top + 8) }]}>
      <View style={styles.hero}>
        <LandingHeroCarousel />
      </View>

      <View style={styles.copy}>
        <Text style={styles.welcome}>Welcome to</Text>
        <Text style={styles.brand}>Nile Cafe</Text>
        <Text style={styles.tagline}>
          Create beautiful moments for every craving. Order favourites delivered fresh to you — same experience as our web
          app.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <Pressable style={styles.cta} onPress={() => setSheetOpen(true)}>
          <Text style={styles.ctaText}>Order now</Text>
        </Pressable>
      </View>

      <StartScreenFlow
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelectLocation={onPickLocation}
        title="Choose Location"
        requireAuthFirst
        onUseCurrentLocation={async () => {
          const ok = await getCurrentLocation();
          if (ok) {
            setSheetOpen(false);
            router.push("/home");
          }
        }}
        locationLoading={isLoadingLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgLanding },
  hero: { flex: 1, minHeight: 0 },
  copy: { paddingHorizontal: 24, alignItems: "center" },
  welcome: { fontSize: 15, color: "#737373", letterSpacing: 0.5 },
  brand: {
    marginTop: 6,
    fontSize: 34,
    fontWeight: "600",
    color: "#0a0a0a",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  tagline: {
    marginTop: 16,
    maxWidth: 340,
    fontSize: 15,
    lineHeight: 22,
    color: "#525252",
    textAlign: "center",
  },
  footer: { paddingHorizontal: 24, paddingTop: 28 },
  cta: {
    backgroundColor: "#0a0a0a",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    maxWidth: 360,
    alignSelf: "center",
    width: "100%",
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
