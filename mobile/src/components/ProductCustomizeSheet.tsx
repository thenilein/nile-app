import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../lib/theme";
import {
  formatOptionTypeHeading,
  groupItemOptionsByType,
  isMultiSelectOptionType,
  type ItemOptionRow,
  sortedOptionTypeEntries,
} from "../lib/itemOptions";
import type { SelectedCartOption } from "../context/CartContext";

export type CustomizeProduct = {
  id: string;
  name: string;
  price: number;
};

type Props = {
  visible: boolean;
  product: CustomizeProduct | null;
  options: ItemOptionRow[];
  onClose: () => void;
  onConfirm: (selected: SelectedCartOption[], unitPrice: number) => void;
};

function buildInitialSingleSelection(groups: Map<string, ItemOptionRow[]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [type, rows] of groups) {
    if (isMultiSelectOptionType(type)) continue;
    const def = rows.find((r) => r.is_default) ?? rows[0];
    if (def) out[type] = def.id;
  }
  return out;
}

function buildInitialMultiSelection(groups: Map<string, ItemOptionRow[]>): Set<string> {
  const out = new Set<string>();
  for (const [type, rows] of groups) {
    if (!isMultiSelectOptionType(type)) continue;
    for (const r of rows) {
      if (r.is_default) out.add(r.id);
    }
  }
  return out;
}

export function ProductCustomizeSheet({ visible, product, options, onClose, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const { height: vh } = useWindowDimensions();
  const groups = useMemo(() => groupItemOptionsByType(options), [options]);
  const typeEntries = useMemo(() => sortedOptionTypeEntries(groups), [groups]);

  const [singleByType, setSingleByType] = useState<Record<string, string>>({});
  const [multiIds, setMultiIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!visible || !product) return;
    setSingleByType(buildInitialSingleSelection(groups));
    setMultiIds(buildInitialMultiSelection(groups));
  }, [visible, product, groups]);

  const selectedList: SelectedCartOption[] = useMemo(() => {
    const list: SelectedCartOption[] = [];
    for (const [type, rows] of typeEntries) {
      if (isMultiSelectOptionType(type)) {
        for (const r of rows) {
          if (multiIds.has(r.id)) {
            list.push({
              id: r.id,
              option_type: r.option_type,
              label: r.label,
              price_delta: Number(r.price_delta) || 0,
            });
          }
        }
      } else {
        const id = singleByType[type];
        const row = rows.find((r) => r.id === id);
        if (row) {
          list.push({
            id: row.id,
            option_type: row.option_type,
            label: row.label,
            price_delta: Number(row.price_delta) || 0,
          });
        }
      }
    }
    return list;
  }, [typeEntries, singleByType, multiIds]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const extra = selectedList.reduce((s, o) => s + o.price_delta, 0);
    return Math.round((product.price + extra) * 100) / 100;
  }, [product, selectedList]);

  const pickSingle = useCallback((type: string, optionId: string) => {
    setSingleByType((prev) => ({ ...prev, [type]: optionId }));
  }, []);

  const toggleMulti = useCallback((optionId: string) => {
    setMultiIds((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    if (!product) return;
    onConfirm(selectedList, unitPrice);
    onClose();
  }, [product, selectedList, unitPrice, onConfirm, onClose]);

  if (!product) return null;

  const maxH = Math.min(vh * 0.88, vh - insets.top - 16);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={[styles.sheet, { maxHeight: maxH, paddingBottom: Math.max(16, insets.bottom + 8) }]}>
          <View style={styles.grabberRow}>
            <View style={styles.grabber} />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.basePrice}>Base ₹{product.price}</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {typeEntries.map(([type, rows]) => (
              <View key={type} style={styles.group}>
                <Text style={styles.groupTitle}>{formatOptionTypeHeading(type)}</Text>
                {isMultiSelectOptionType(type) ? (
                  <View style={styles.chips}>
                    {rows.map((row) => {
                      const on = multiIds.has(row.id);
                      const delta = Number(row.price_delta) || 0;
                      return (
                        <Pressable
                          key={row.id}
                          onPress={() => toggleMulti(row.id)}
                          style={[styles.chip, on && styles.chipOn]}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={2}>
                            {row.label}
                            {delta > 0 ? `  +₹${delta}` : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.radioCol}>
                    {rows.map((row) => {
                      const on = singleByType[type] === row.id;
                      const delta = Number(row.price_delta) || 0;
                      return (
                        <Pressable
                          key={row.id}
                          onPress={() => pickSingle(type, row.id)}
                          style={[styles.radioRow, on && styles.radioRowOn]}
                        >
                          <View style={[styles.radioOuter, on && styles.radioOuterOn]}>
                            {on ? <View style={styles.radioInner} /> : null}
                          </View>
                          <Text style={styles.radioLabel} numberOfLines={2}>
                            {row.label}
                            {delta > 0 ? `  +₹${delta}` : delta < 0 ? `  ₹${delta}` : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerPriceCol}>
              <Text style={styles.footerLabel}>Item total</Text>
              <Text style={styles.footerPrice}>₹{unitPrice}</Text>
            </View>
            <Pressable style={styles.addCta} onPress={handleAdd}>
              <Text style={styles.addCtaText}>Add to cart</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 18,
  },
  grabberRow: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  grabber: { width: 36, height: 5, borderRadius: 999, backgroundColor: colors.border },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  basePrice: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  scroll: { maxHeight: 360 },
  scrollContent: { paddingBottom: 8 },
  group: { marginBottom: 18 },
  groupTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.pillBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    maxWidth: "100%",
  },
  chipOn: {
    backgroundColor: colors.borderLight,
    borderColor: colors.textMuted,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  chipTextOn: { color: colors.textPrimary },
  radioCol: { gap: 8 },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  radioRowOn: {
    borderColor: colors.textMuted,
    backgroundColor: colors.borderLight,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterOn: { borderColor: colors.textPrimary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textPrimary,
  },
  radioLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerPriceCol: { flex: 1 },
  footerLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  footerPrice: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  addCta: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#15803d",
  },
  addCtaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
