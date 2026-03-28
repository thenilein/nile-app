import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useCart, type SelectedCartOption } from "../context/CartContext";
import type { ItemOptionRow } from "../lib/itemOptions";
import { ProductCustomizeSheet } from "./ProductCustomizeSheet";

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_available: boolean;
  is_popular: boolean;
  is_veg?: boolean;
}

/** Apple-style elevated card (light grouped / Wallet-like surface). */
const CARD_BG = "#FFFFFF";
const IMAGE_PLACEHOLDER_BG = "#F2F2F7";
const TAG_FILL = "rgba(60, 60, 67, 0.09)";
const LABEL_PRIMARY = "#1C1C1E";
const LABEL_SECONDARY = "#636366";
const SEPARATOR = "rgba(60, 60, 67, 0.18)";

export function MenuItemCard({
  product,
  itemOptions = [],
}: {
  product: Product;
  itemOptions?: ItemOptionRow[];
}) {
  const { items, addToCart, updateQuantity, decrementProduct } = useCart();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const hasOptions = itemOptions.length > 0;

  const totalQty = useMemo(
    () => items.filter((i) => i.product_id === product.id).reduce((s, i) => s + i.quantity, 0),
    [items, product.id]
  );

  const qtyRef = useRef(totalQty);
  useEffect(() => {
    qtyRef.current = totalQty;
  }, [totalQty]);

  const unavailable = !product.is_available || !product.is_active;
  const veg = product.is_veg !== false;

  const onAdd = () => {
    if (hasOptions) setCustomizeOpen(true);
    else addToCart(product);
  };

  const onCustomizeConfirm = useCallback(
    (selected: SelectedCartOption[], unitPrice: number) => {
      addToCart(
        {
          id: product.id,
          name: product.name,
          price: unitPrice,
          image_url: product.image_url,
        },
        1,
        selected
      );
    },
    [addToCart, product]
  );

  const onInc = () => {
    if (hasOptions) {
      setCustomizeOpen(true);
      return;
    }
    qtyRef.current += 1;
    updateQuantity(product.id, qtyRef.current);
  };

  const onDec = () => {
    decrementProduct(product.id);
  };

  return (
    <View style={[styles.card, unavailable && styles.cardDisabled]}>
      <ProductCustomizeSheet
        visible={customizeOpen}
        product={{ id: product.id, name: product.name, price: product.price }}
        options={itemOptions}
        onClose={() => setCustomizeOpen(false)}
        onConfirm={onCustomizeConfirm}
      />

      <View style={styles.imageSection}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Text style={styles.imgPhText}>No image</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.tagsRow}>
          {product.is_popular ? (
            <View style={styles.tagPill}>
              <Text style={styles.tagText} numberOfLines={1}>
                ★ Bestseller
              </Text>
            </View>
          ) : null}
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{veg ? "Veg" : "Non-veg"}</Text>
          </View>
          {hasOptions ? (
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>Customise</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        {unavailable ? (
          <Text style={styles.unavail}>Unavailable</Text>
        ) : (
          <View style={styles.priceActionRow}>
            <View style={styles.pricePill}>
              <Text style={styles.pricePillText}>₹{product.price}</Text>
            </View>
            {totalQty === 0 ? (
              <Pressable style={styles.addBtn} onPress={onAdd}>
                <Text style={styles.addBtnText}>{hasOptions ? "Choose" : "Add"}</Text>
              </Pressable>
            ) : (
              <View style={styles.qtyBar}>
                <Pressable style={styles.qtyBtn} onPress={onDec}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <Text style={styles.qtyNum}>{totalQty}</Text>
                <Pressable style={styles.qtyBtn} onPress={onInc}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: CARD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEPARATOR,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: { opacity: 0.55 },
  imageSection: {
    width: "100%",
    aspectRatio: 1.05,
    backgroundColor: IMAGE_PLACEHOLDER_BG,
  },
  image: { width: "100%", height: "100%" },
  imgPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: IMAGE_PLACEHOLDER_BG,
  },
  imgPhText: { fontSize: 10, fontWeight: "600", color: LABEL_SECONDARY, letterSpacing: 0.2 },
  content: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: TAG_FILL,
  },
  tagText: { fontSize: 10, fontWeight: "600", color: LABEL_SECONDARY },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: LABEL_PRIMARY,
    lineHeight: 18,
    letterSpacing: -0.2,
    marginBottom: 8,
    minHeight: 36,
  },
  priceActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  pricePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: TAG_FILL,
    flexShrink: 0,
  },
  pricePillText: { fontSize: 12, fontWeight: "700", color: LABEL_PRIMARY },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E5EA",
    flexShrink: 0,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: LABEL_PRIMARY },
  qtyBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#15803d",
    flexShrink: 0,
  },
  qtyBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  qtyNum: { minWidth: 20, textAlign: "center", color: "#fff", fontWeight: "700", fontSize: 13 },
  unavail: {
    fontSize: 11,
    fontWeight: "600",
    color: LABEL_SECONDARY,
    marginTop: 2,
  },
});
