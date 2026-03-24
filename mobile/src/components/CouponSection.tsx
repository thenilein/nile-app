import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../lib/theme";

const VALID_COUPONS: Record<string, number> = {
  NILE10: 10,
  NILE20: 20,
  ICECREAM50: 50,
};

export function CouponSection({
  onApply,
  applied,
}: {
  onApply: (code: string, discount: number) => void;
  applied: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleApply = () => {
    const upper = code.trim().toUpperCase();
    const discount = VALID_COUPONS[upper];
    if (discount) {
      onApply(upper, discount);
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 700);
    }
  };

  if (applied) {
    return (
      <View style={styles.appliedRow}>
        <View style={styles.appliedLeft}>
          <View style={styles.check} />
          <Text style={styles.appliedText}>{applied} applied</Text>
        </View>
        <Pressable onPress={() => onApply("", 0)}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Text style={styles.toggle}>Have a coupon? {open ? "▲" : "▼"}</Text>
      </Pressable>
      {open ? (
        <View style={styles.row}>
          <TextInput
            style={[styles.input, error && styles.inputErr]}
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setError(false);
            }}
            placeholder="Enter code"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            onSubmitEditing={handleApply}
          />
          <Pressable style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  toggle: { fontSize: 13, fontWeight: "600", color: colors.green },
  row: { flexDirection: "row", gap: 8, marginTop: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputErr: { borderColor: "#f87171" },
  applyBtn: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.green,
  },
  applyText: { fontSize: 12, fontWeight: "700", color: colors.greenDark },
  appliedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  appliedLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  check: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
  },
  appliedText: { fontSize: 12, fontWeight: "600", color: "#15803d" },
  remove: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
});
