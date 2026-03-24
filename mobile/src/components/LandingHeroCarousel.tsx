import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { colors } from "../lib/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = Math.round(SCREEN_W * 0.52);
const CARD_H = Math.round(CARD_W * (330 / 204));

export type HeroBanner = {
  id: string;
  title: string;
  meta: string;
  badge: { label: string; variant: "hosting" | "going" };
  image: string;
};

const BANNERS: HeroBanner[] = [
  {
    id: "1",
    title: "Mango festival",
    meta: "Saturday · 4:00 PM · Indiranagar",
    badge: { label: "Hosting", variant: "hosting" },
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=900&q=85",
  },
  {
    id: "2",
    title: "Midnight scoops",
    meta: "Friday · 9:00 PM · Koramangala",
    badge: { label: "Going", variant: "going" },
    image: "https://images.unsplash.com/photo-1497534444932-c925b458314e?w=900&q=85",
  },
  {
    id: "3",
    title: "Family sundae night",
    meta: "Sunday · 6:00 PM · Jayanagar",
    badge: { label: "Going", variant: "going" },
    image: "https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=900&q=85",
  },
  {
    id: "4",
    title: "Gelato tasting",
    meta: "Wednesday · 5:00 PM · Whitefield",
    badge: { label: "Hosting", variant: "hosting" },
    image: "https://images.unsplash.com/photo-1580915411954-282cb1c0d780?w=900&q=85",
  },
  {
    id: "5",
    title: "Birthday party pack",
    meta: "Next weekend · All day · HSR",
    badge: { label: "Going", variant: "going" },
    image: "https://images.unsplash.com/photo-1557142046-c704a93d8f8f?w=900&q=85",
  },
];

export function LandingHeroCarousel() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % BANNERS.length;
        listRef.current?.scrollToOffset({
          offset: next * (CARD_W + 18),
          animated: true,
        });
        return next;
      });
    }, 4500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / (CARD_W + 18));
    if (i >= 0 && i < BANNERS.length) setIndex(i);
  };

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        horizontal
        data={BANNERS}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 18}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <ImageBackground source={{ uri: item.image }} style={[styles.card, { width: CARD_W, height: CARD_H }]} imageStyle={styles.cardImg}>
            <View style={styles.cardInner}>
              <View
                style={[
                  styles.badge,
                  item.badge.variant === "hosting" ? styles.badgeHost : styles.badgeGoing,
                ]}
              >
                <Text style={styles.badgeText}>{item.badge.label}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>{item.meta}</Text>
            </View>
          </ImageBackground>
        )}
      />
      <View style={styles.dots}>
        {BANNERS.map((_, i) => (
          <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: CARD_H + 40 },
  listContent: { paddingHorizontal: (SCREEN_W - CARD_W) / 2, gap: 18, alignItems: "center" },
  card: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },
  cardImg: { borderRadius: 28 },
  cardInner: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeHost: { backgroundColor: "rgba(255,255,255,0.95)" },
  badgeGoing: { backgroundColor: "rgba(34,197,94,0.9)" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#111" },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  cardMeta: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 4 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#d1d5db" },
  dotActive: { width: 18, backgroundColor: colors.textSecondary },
});
