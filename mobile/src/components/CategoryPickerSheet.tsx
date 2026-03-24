import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
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

export type MenuGroup = {
  id: string;
  name?: string;
  categories: { id: string; name: string; image_url?: string | null }[];
};

const SHEET_MAX_HEIGHT_RATIO = 0.58;
/** iOS-like sheet motion (ease-in-out ≈ Apple CAMediaTimingFunction) */
const SHEET_OPEN_MS = 560;
const SHEET_CLOSE_MS = 460;
const SHEET_DRAG_DISMISS_MS = 460;
/** Standard ease-in-out; avoids the harsh end of (0.32, 0.72, 0, 1) on dismiss */
const SHEET_EASING_PRESENT = Easing.bezier(0.22, 1, 0.36, 1);
const SHEET_EASING_DISMISS = Easing.bezier(0.42, 0, 0.58, 1);

export function CategoryPickerSheet({
  visible,
  onClose,
  menuGroups,
  activeCategoryId,
  onSelectCategory,
}: {
  visible: boolean;
  onClose: () => void;
  menuGroups: MenuGroup[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [internalVisible, setInternalVisible] = useState(false);
  const dragStartYRef = useRef(0);
  const sheetHeightRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const sheetHeight = Math.min(viewportHeight * SHEET_MAX_HEIGHT_RATIO, viewportHeight * 0.72);
  sheetHeightRef.current = sheetHeight;

  useEffect(() => {
    if (visible) setInternalVisible(true);
  }, [visible]);

  useEffect(() => {
    if (!visible || !internalVisible) return;
    translateY.setValue(viewportHeight);
    backdropOpacity.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: SHEET_OPEN_MS,
        easing: SHEET_EASING_PRESENT,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: SHEET_OPEN_MS - 40,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, internalVisible, backdropOpacity, translateY, viewportHeight]);

  useEffect(() => {
    if (visible || !internalVisible) return;
    const anim = Animated.parallel([
      Animated.timing(translateY, {
        toValue: viewportHeight,
        duration: SHEET_CLOSE_MS,
        easing: SHEET_EASING_DISMISS,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: SHEET_CLOSE_MS,
        easing: SHEET_EASING_DISMISS,
        useNativeDriver: false,
      }),
    ]);
    let cancelled = false;
    anim.start(({ finished }) => {
      if (finished && !cancelled) setInternalVisible(false);
    });
    return () => {
      cancelled = true;
      anim.stop();
    };
  }, [visible, internalVisible, backdropOpacity, translateY, viewportHeight]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx) * 0.5,
        onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx) * 0.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          translateY.stopAnimation((v) => {
            dragStartYRef.current = typeof v === "number" ? v : 0;
          });
        },
        onPanResponderMove: (_, g) => {
          const y = Math.max(0, dragStartYRef.current + g.dy);
          translateY.setValue(y);
          const maxDim = Math.min(viewportHeight * 0.5, 420);
          backdropOpacity.setValue(Math.max(0.12, 1 - y / maxDim));
        },
        onPanResponderRelease: (_, g) => {
          const y = Math.max(0, dragStartYRef.current + g.dy);
          const threshold = Math.max(96, sheetHeightRef.current * 0.22);
          const vel = g.vy ?? 0;
          if (y > threshold || vel > 0.45) {
            Animated.parallel([
              Animated.timing(translateY, {
                toValue: viewportHeight,
                duration: SHEET_DRAG_DISMISS_MS,
                easing: SHEET_EASING_DISMISS,
                useNativeDriver: false,
              }),
              Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: SHEET_DRAG_DISMISS_MS,
                easing: SHEET_EASING_DISMISS,
                useNativeDriver: false,
              }),
            ]).start(({ finished }) => {
              if (finished) {
                setInternalVisible(false);
                onCloseRef.current();
              }
            });
          } else {
            Animated.parallel([
              Animated.spring(translateY, {
                toValue: 0,
                damping: 28,
                stiffness: 260,
                mass: 0.95,
                useNativeDriver: false,
              }),
              Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 320,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
              }),
            ]).start();
          }
        },
      }),
    [backdropOpacity, translateY, viewportHeight]
  );

  return (
    <Modal visible={internalVisible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[styles.backdropShade, { opacity: backdropOpacity }]} />
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={styles.sheetDragZone}
            collapsable={false}
            {...sheetPanResponder.panHandlers}
          >
            <View style={styles.grabberHit} pointerEvents="box-only">
              <View style={styles.grabber} />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Categories</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {menuGroups.map((group) => (
              <View key={group.id} style={styles.group}>
                {group.name ? <Text style={styles.groupLabel}>{group.name}</Text> : null}
                {group.categories.map((cat) => {
                  const active = activeCategoryId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[styles.catRow, active && styles.catRowActive]}
                      onPress={() => {
                        onSelectCategory(cat.id);
                        onClose();
                      }}
                    >
                      <View style={styles.catIcon}>
                        {cat.image_url ? (
                          <Image source={{ uri: cat.image_url }} style={styles.catImg} contentFit="cover" />
                        ) : (
                          <Text style={styles.catLetter}>{cat.name.charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                      <Text style={[styles.catName, active && styles.catNameActive]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  backdropShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  backdropPress: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetDragZone: { paddingBottom: 4 },
  /** Tall touch target so the pan wins before ScrollView / buttons */
  grabberHit: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 2,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  close: { fontSize: 18, color: colors.textMuted, padding: 8 },
  scroll: { flexGrow: 0 },
  group: { marginBottom: 20 },
  groupLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  catRowActive: { backgroundColor: colors.greenSoft },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.pillBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  catImg: { width: "100%", height: "100%" },
  catLetter: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  catName: { flex: 1, fontSize: 15, fontWeight: "500", color: "#374151" },
  catNameActive: { color: colors.greenDark, fontWeight: "600" },
});
