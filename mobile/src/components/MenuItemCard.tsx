import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useCart } from "../context/CartContext";
import { colors } from "../lib/theme";

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

export function MenuItemCard({ product }: { product: Product }) {
  const { items, addToCart, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.product_id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const qtyRef = useRef(qty);
  useEffect(() => {
    qtyRef.current = qty;
  }, [qty]);

  const unavailable = !product.is_available || !product.is_active;
  const veg = product.is_veg !== false;

  const onAdd = () => addToCart(product);
  const onInc = () => {
    qtyRef.current += 1;
    updateQuantity(product.id, qtyRef.current);
  };
  const onDec = () => {
    qtyRef.current -= 1;
    updateQuantity(product.id, qtyRef.current);
  };

  return (
    <View style={[styles.row, unavailable && styles.rowDisabled]}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <View style={[styles.vegBox, veg ? styles.vegBoxVeg : styles.vegBoxNon]}>
            <View style={[styles.vegDot, veg ? styles.vegDotVeg : styles.vegDotNon]} />
          </View>
          <View style={styles.titleTextCol}>
            {product.is_popular ? (
              <View style={styles.popular}>
                <Text style={styles.popularText}>Bestseller</Text>
              </View>
            ) : null}
            <Text style={styles.name}>{product.name}</Text>
          </View>
        </View>
        <Text style={styles.price}>₹{product.price}</Text>
        {product.description ? (
          <Text style={styles.desc} numberOfLines={3}>
            {product.description}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <View style={styles.imgWrap}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.img} />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Text style={styles.imgPhText}>No image</Text>
            </View>
          )}
        </View>
        <View style={styles.addWrap}>
          {unavailable ? (
            <Text style={styles.unavail}>Unavailable</Text>
          ) : qty === 0 ? (
            <Pressable style={styles.addBtn} onPress={onAdd}>
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>
          ) : (
            <View style={styles.qtyBar}>
              <Pressable style={styles.qtyBtn} onPress={onDec}>
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qtyNum}>{qty}</Text>
              <Pressable style={styles.qtyBtn} onPress={onInc}>
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: 12,
  },
  rowDisabled: { opacity: 0.55 },
  left: { flex: 1, minWidth: 0, paddingRight: 8 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  vegBox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  vegBoxVeg: { borderColor: "#16a34a" },
  vegBoxNon: { borderColor: "#ef4444" },
  vegDot: { width: 8, height: 8, borderRadius: 4 },
  vegDotVeg: { backgroundColor: "#16a34a" },
  vegDotNon: { backgroundColor: "#ef4444" },
  titleTextCol: { flex: 1 },
  popular: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  popularText: { fontSize: 10, fontWeight: "700", color: "#C2410C" },
  name: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },
  price: { fontSize: 18, fontWeight: "600", color: colors.textPrimary, marginTop: 6 },
  desc: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  right: { width: 118, alignItems: "center" },
  imgWrap: {
    width: 118,
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FEF3C7",
  },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  imgPhText: { fontSize: 10, fontWeight: "600", color: colors.textMuted, letterSpacing: 1 },
  addWrap: { marginTop: -16, alignItems: "center" },
  addBtn: {
    minWidth: 78,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: colors.green },
  qtyBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: colors.green,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  qtyBtn: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  qtyNum: { minWidth: 28, textAlign: "center", color: "#fff", fontWeight: "700" },
  unavail: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
});
