import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../lib/theme";

export type CategoryPickerItem = {
  id: string;
  name: string;
  image_url?: string | null;
};

/** Window coordinates of the category pill (from `measureInWindow`). */
export type CategoryOriginRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const OPEN_SPRING = { damping: 28, stiffness: 340, mass: 0.82, overshootClamping: false };
const CLOSE_MS = 260;
const EASING_CLOSE = Easing.bezier(0.42, 0, 0.58, 1);

function fallbackOrigin(vw: number, vh: number, bottomPad: number): CategoryOriginRect {
  const w = Math.min(260, Math.max(160, vw * 0.5));
  const h = 50;
  return {
    x: (vw - w) / 2 - vw * 0.08,
    y: vh - bottomPad - h,
    width: w,
    height: h,
  };
}

/** Sheet morphs from the category FAB rect to a bottom card (no blur). */
export function CategoryPickerSheet({
  visible,
  onClose,
  categories,
  activeCategoryId,
  onSelectCategory,
  originRect,
}: {
  visible: boolean;
  onClose: () => void;
  categories: CategoryPickerItem[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  /** Measured FAB; when null, a bottom-left-ish fallback is used. */
  originRect: CategoryOriginRect | null;
}) {
  const insets = useSafeAreaInsets();
  const { width: vw, height: vh } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [internalVisible, setInternalVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const bottomPad = Math.max(12, insets.bottom + 8);

  const { maxH, openWidth, start, end } = useMemo(() => {
    const maxHeight = Math.min(vh * 0.52, vh - insets.top - 24);
    const wOpen = Math.min(vw - 48, vw * 0.86);
    const o = originRect ?? fallbackOrigin(vw, vh, bottomPad);
    const endLeft = (vw - wOpen) / 2;
    const endTop = vh - bottomPad - maxHeight;
    const startR = Math.min(o.width, o.height) / 2;
    return {
      maxH: maxHeight,
      openWidth: wOpen,
      start: o,
      end: { left: endLeft, top: endTop, width: wOpen, height: maxHeight, radius: 22, startRadius: startR },
    };
  }, [vh, vw, insets.top, originRect, bottomPad]);

  useLayoutEffect(() => {
    if (visible) setInternalVisible(true);
  }, [visible]);

  useEffect(() => {
    if (!visible || !internalVisible) return;
    progress.setValue(0);
    const anim = Animated.spring(progress, {
      toValue: 1,
      ...OPEN_SPRING,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [visible, internalVisible, progress]);

  useEffect(() => {
    if (visible || !internalVisible) return;
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_MS,
      easing: EASING_CLOSE,
      useNativeDriver: false,
    });
    let cancelled = false;
    anim.start(({ finished }) => {
      if (finished && !cancelled) setInternalVisible(false);
    });
    return () => {
      cancelled = true;
      anim.stop();
    };
  }, [visible, internalVisible, progress]);

  const leftAnim = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [start.x, end.left],
  });
  const topAnim = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [start.y, end.top],
  });
  const widthAnim = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [start.width, end.width],
  });
  const heightAnim = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [start.height, end.height],
  });
  const borderRadiusAnim = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [end.startRadius, end.radius],
  });
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const contentOpacity = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0, 1, 1],
  });

  return (
    <Modal
      visible={internalVisible}
      animationType="none"
      transparent
      statusBarTranslucent
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      onRequestClose={onClose}
    >
      <View style={styles.wrap} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              left: leftAnim,
              top: topAnim,
              width: widthAnim,
              height: heightAnim,
              borderRadius: borderRadiusAnim,
            },
          ]}
        >
          <View style={styles.grabberRow}>
            <View style={styles.grabber} />
          </View>

          <Animated.View style={[styles.sheetInner, { opacity: contentOpacity }]}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {categories.map((cat) => {
                const active = activeCategoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => {
                      onSelectCategory(cat.id);
                      onCloseRef.current();
                    }}
                  >
                    <View style={styles.thumbWrap}>
                      {cat.image_url ? (
                        <Image source={{ uri: cat.image_url }} style={styles.thumbImg} contentFit="cover" />
                      ) : (
                        <Text style={styles.thumbLetter}>{cat.name.charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={[styles.rowLabel, active && styles.rowLabelActive]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const THUMB = 48;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },
  sheet: {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  grabberRow: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  sheetInner: {
    flex: 1,
    minHeight: 0,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginBottom: 2,
  },
  rowActive: {
    backgroundColor: colors.borderLight,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.pillBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
  thumbLetter: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  rowLabelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
