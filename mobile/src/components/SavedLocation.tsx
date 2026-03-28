import React from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { savedAddressToLocation, type SavedAddressRow } from "../lib/savedAddresses";
import type { LocationData } from "../types/location";
import {
  PRIMARY_BUTTON_RADIUS,
  SHEET_CONTENT_GUTTER,
  iosPalette,
} from "./flowSheet/IosFlowSheetChrome";

export type SavedLocationProps = {
  visible: boolean;
  loading: boolean;
  slides: SavedAddressRow[][];
  snapInterval: number;
  slideWidth: number;
  onSelectLocation: (loc: LocationData) => void;
};

const HORIZONTAL_SLIDE_GAP = 10;

/** Horizontal “Saved” address cards inside a location sheet. */
export function SavedLocation({
  visible,
  loading,
  slides,
  snapInterval,
  slideWidth,
  onSelectLocation,
}: SavedLocationProps) {
  if (!visible) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Saved</Text>
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 10 }} color="#9ca3af" />
      ) : slides.some((s) => s.length > 0) ? (
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
              <View style={styles.horizontalSlides}>
                {slides.map((slide, slideIndex) => (
                  <View
                    key={`saved-slide-${slideIndex}`}
                    style={[
                      styles.insetSlide,
                      { width: slideWidth },
                      slideIndex === slides.length - 1 && styles.insetSlideLast,
                    ]}
                  >
                    <View style={styles.insetListCard}>
                      {slide.map((row, index) => {
                        const loc = savedAddressToLocation(row);
                        if (!loc) return null;
                        return (
                          <View key={`saved-${row.id}`}>
                            {index > 0 ? <View style={styles.insetDivider} /> : null}
                            <Pressable style={styles.insetRow} onPress={() => onSelectLocation(loc)}>
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
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: "600",
    color: iosPalette.textPrimary,
  },
  emptyText: { color: iosPalette.textSecondary, fontSize: 14, marginBottom: 10 },
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
});
