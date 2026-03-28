import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { PRIMARY_BUTTON_HEIGHT, PRIMARY_BUTTON_RADIUS } from "./flowSheet/IosFlowSheetChrome";

export type UseCurrentLocationProps = {
  onPress: () => void;
  loading?: boolean;
};

/** Primary CTA to request device / GPS location inside a location sheet. */
export function UseCurrentLocation({ onPress, loading }: UseCurrentLocationProps) {
  return (
    <Pressable style={styles.currentBtn} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.currentBtnText}>Current Location</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
