import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

const PROMOS = [
  {
    id: "bogo",
    headline: "Blissfully balanced blends",
    sub: "Rich mocha favourites crafted for cozy evenings.",
    flavorA: "Mocha Praline",
    flavorB: "Nutty Mocha Praline",
  },
  {
    id: "mango",
    headline: "Seasonal specials are here",
    sub: "Small-batch flavours inspired by summer cravings.",
    flavorA: "Mango Velvet",
    flavorB: "Berry Bloom",
  },
  {
    id: "choco",
    headline: "Perfect pairings for every mood",
    sub: "Signature drinks and desserts, made to share.",
    flavorA: "Hazelnut Cocoa",
    flavorB: "Salted Caramel",
  },
];

export function PromoBanner() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setActive((a) => (a + 1) % PROMOS.length), 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]);

  const p = PROMOS[active];

  return (
    <View style={styles.card}>
      <Text style={styles.headline}>{p.headline}</Text>
      <Text style={styles.sub}>{p.sub}</Text>
      <View style={styles.cups}>
        <View style={styles.cupCol}>
          <View style={[styles.cup, styles.cupA]} />
          <Text style={styles.cupLabel}>{p.flavorA}</Text>
        </View>
        <View style={styles.cupCol}>
          <View style={[styles.cup, styles.cupB]} />
          <Text style={styles.cupLabel}>{p.flavorB}</Text>
        </View>
      </View>
      <View style={styles.dots}>
        {PROMOS.map((_, i) => (
          <Pressable key={i} onPress={() => setActive(i)} hitSlop={8}>
            <View style={[styles.dot, i === active ? styles.dotOn : null]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E8DCCB",
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: "#F2E5D5",
  },
  headline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#9A7B61",
    textAlign: "center",
    textTransform: "uppercase",
  },
  sub: {
    marginTop: 8,
    fontSize: 13,
    color: "#8B6B52",
    textAlign: "center",
    lineHeight: 20,
  },
  cups: { flexDirection: "row", justifyContent: "center", gap: 28, marginTop: 16 },
  cupCol: { alignItems: "center" },
  cup: {
    width: 76,
    height: 110,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  cupA: { backgroundColor: "#D9B18D" },
  cupB: { backgroundColor: "#9C5636", height: 128, width: 82 },
  cupLabel: { marginTop: 8, fontSize: 10, fontWeight: "500", color: "#7C5B43", textAlign: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C7AE97" },
  dotOn: { width: 18, backgroundColor: "#8B6B52" },
});
