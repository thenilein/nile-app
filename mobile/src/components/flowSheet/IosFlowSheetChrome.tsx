import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

export const SHEET_CONTENT_GUTTER = 16;
export const PRIMARY_BUTTON_HEIGHT = 48;
export const PRIMARY_BUTTON_RADIUS = 12;

export const iosPalette = {
  sheetBg: "#f7f7f8",
  cardBg: "#eef0f4",
  border: "#d9dde4",
  textPrimary: "#1f2937",
  textSecondary: "#6b7280",
} as const;

export const SHEET_OPEN_MS = 560;
export const SHEET_CLOSE_MS = 460;
export const SHEET_DRAG_DISMISS_MS = 460;
export const SHEET_EASING_PRESENT = Easing.bezier(0.22, 1, 0.36, 1);
export const SHEET_EASING_DISMISS = Easing.bezier(0.42, 0, 0.58, 1);

/** Match horizontal step slide so sheet height and content move together (iOS-style). */
export const ENTRY_STEP_SLIDE_MS = 760;
export const ENTRY_STEP_SLIDE_DELAY_MS = 90;
export const ENTRY_STEP_SLIDE_EASING = Easing.bezier(0.2, 0.9, 0.22, 1);
export const AUTH_STAGE_SLIDE_MS = 620;
export const AUTH_STAGE_SLIDE_DELAY_MS = 70;
export const AUTH_STAGE_SLIDE_EASING = Easing.bezier(0.2, 0.9, 0.22, 1);

export type UseIosFlowSheetOptions = {
  visible: boolean;
  onClose: () => void;
};

export function useIosFlowSheet({ visible, onClose }: UseIosFlowSheetOptions) {
  const { height: viewportHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [internalVisible, setInternalVisible] = useState(false);
  const dragStartYRef = useRef(0);
  const sheetHeightRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
    return () => {
      anim.stop();
    };
  }, [visible, internalVisible, backdropOpacity, translateY, viewportHeight]);

  useEffect(() => {
    if (visible || !internalVisible) return;
    let cancelled = false;
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

  return {
    internalVisible,
    setInternalVisible,
    translateY,
    backdropOpacity,
    sheetPanResponder,
    sheetHeightRef,
    viewportHeight,
  };
}

export type IosFlowSheetFrameProps = {
  internalVisible: boolean;
  onRequestClose: () => void;
  translateY: Animated.Value;
  backdropOpacity: Animated.Value;
  sheetHeightAnim: Animated.Value;
  sheetMaxHeight: number;
  sheetPanResponder: ReturnType<typeof PanResponder.create>;
  header: React.ReactNode;
  children: React.ReactNode;
};

export function IosFlowSheetFrame({
  internalVisible,
  onRequestClose,
  translateY,
  backdropOpacity,
  sheetHeightAnim,
  sheetMaxHeight,
  sheetPanResponder,
  header,
  children,
}: IosFlowSheetFrameProps) {
  return (
    <Modal
      visible={internalVisible}
      animationType="none"
      transparent
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      onRequestClose={onRequestClose}
    >
      <View style={iosFlowSheetStyles.overlay}>
        <Animated.View
          pointerEvents="none"
          style={[iosFlowSheetStyles.backdropShade, { opacity: backdropOpacity }]}
        />
        <Pressable style={iosFlowSheetStyles.backdrop} onPress={onRequestClose} />
        <Animated.View
          style={[
            iosFlowSheetStyles.sheet,
            {
              height: sheetHeightAnim,
              maxHeight: sheetMaxHeight,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={iosFlowSheetStyles.sheetDragZone} collapsable={false} {...sheetPanResponder.panHandlers}>
            <View style={iosFlowSheetStyles.grabberHit} pointerEvents="box-only">
              <View style={iosFlowSheetStyles.grabber} />
            </View>
            {header}
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export const iosFlowSheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  backdropShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(17, 24, 39, 0.22)" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 34,
    overflow: "hidden",
    backgroundColor: iosPalette.sheetBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    flexDirection: "column",
  },
  sheetDragZone: {
    paddingBottom: 4,
    paddingHorizontal: SHEET_CONTENT_GUTTER,
  },
  grabberHit: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
    marginBottom: 4,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#cfd5de",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerSpacer: { width: 44, height: 44 },
  topActionBtn: {
    minWidth: 44,
    height: 44,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    paddingHorizontal: 12,
  },
  topActionText: { color: iosPalette.textPrimary, fontSize: 17, fontWeight: "500" },
  stepViewport: { flex: 1, overflow: "hidden", backgroundColor: iosPalette.sheetBg },
  stepTrack: { flex: 1, flexDirection: "row", alignItems: "stretch", backgroundColor: iosPalette.sheetBg },
  stepPage: { flex: 1, backgroundColor: iosPalette.sheetBg },
  sheetGutter: {
    flex: 1,
    alignSelf: "stretch",
    paddingHorizontal: SHEET_CONTENT_GUTTER,
    paddingBottom: 16,
    backgroundColor: iosPalette.sheetBg,
  },
});
