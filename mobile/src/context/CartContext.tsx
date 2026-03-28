import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "nile_cart";

export type SelectedCartOption = {
  id: string;
  option_type: string;
  label: string;
  price_delta: number;
};

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  /** Unit price including selected option deltas, frozen at add time. */
  price: number;
  quantity: number;
  image_url?: string;
  selected_options?: SelectedCartOption[];
}

function optionsSignature(opts: SelectedCartOption[] | undefined): string {
  if (!opts?.length) return "";
  return [...opts]
    .map((o) => o.id)
    .sort()
    .join("|");
}

type ProductInput = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
};

interface CartContextType {
  items: CartItem[];
  addToCart: (product: ProductInput, quantity?: number, selected_options?: SelectedCartOption[]) => void;
  removeLine: (lineId: string) => void;
  /** @deprecated use removeLine */
  removeFromCart: (productId: string) => void;
  updateLineQuantity: (lineId: string, quantity: number) => void;
  /** @deprecated use updateLineQuantity */
  updateQuantity: (lineIdOrProductId: string, quantity: number) => void;
  decrementProduct: (productId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function migrateCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row: CartItem) => ({
    ...row,
    selected_options: row.selected_options ?? [],
    price: typeof row.price === "number" ? row.price : 0,
  }));
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then((raw) => {
      if (raw) {
        try {
          setItems(migrateCartItems(JSON.parse(raw)));
        } catch {
          setItems([]);
        }
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addToCart = useCallback((product: ProductInput, quantity = 1, selected_options?: SelectedCartOption[]) => {
    const sig = optionsSignature(selected_options);
    const unitPrice = product.price;
    setItems((current) => {
      const existing = current.find(
        (item) => item.product_id === product.id && optionsSignature(item.selected_options) === sig
      );
      if (existing) {
        return current.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...current,
        {
          id: Math.random().toString(36).slice(2, 11),
          product_id: product.id,
          name: product.name,
          price: unitPrice,
          quantity,
          image_url: product.image_url ?? undefined,
          selected_options: selected_options?.length ? selected_options : undefined,
        },
      ];
    });
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setItems((current) => current.filter((item) => item.id !== lineId));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.product_id !== productId));
  }, []);

  const updateLineQuantity = useCallback((lineId: string, quantity: number) => {
    if (quantity < 1) {
      setItems((current) => current.filter((item) => item.id !== lineId));
      return;
    }
    setItems((current) =>
      current.map((item) => (item.id === lineId ? { ...item, quantity } : item))
    );
  }, []);

  /** Supports line id (preferred) or legacy: last line matching product id. */
  const updateQuantity = useCallback((lineIdOrProductId: string, quantity: number) => {
    setItems((current) => {
      const byLine = current.find((i) => i.id === lineIdOrProductId);
      if (byLine) {
        if (quantity < 1) return current.filter((item) => item.id !== lineIdOrProductId);
        return current.map((item) => (item.id === lineIdOrProductId ? { ...item, quantity } : item));
      }
      const matches = current.filter((i) => i.product_id === lineIdOrProductId);
      if (matches.length === 0) return current;
      if (matches.length === 1) {
        const only = matches[0];
        if (quantity < 1) return current.filter((item) => item.id !== only.id);
        return current.map((item) => (item.id === only.id ? { ...item, quantity } : item));
      }
      const last = matches[matches.length - 1];
      if (quantity < 1) return current.filter((item) => item.id !== last.id);
      return current.map((item) => (item.id === last.id ? { ...item, quantity } : item));
    });
  }, []);

  const decrementProduct = useCallback((productId: string) => {
    setItems((current) => {
      for (let i = current.length - 1; i >= 0; i--) {
        if (current[i].product_id !== productId) continue;
        const q = current[i].quantity;
        if (q > 1) {
          return current.map((it, idx) => (idx === i ? { ...it, quantity: q - 1 } : it));
        }
        return current.filter((_, idx) => idx !== i);
      }
      return current;
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items,
      addToCart,
      removeLine,
      removeFromCart,
      updateLineQuantity,
      updateQuantity,
      decrementProduct,
      clearCart,
      totalItems,
      totalPrice,
    }),
    [
      items,
      addToCart,
      removeLine,
      removeFromCart,
      updateLineQuantity,
      updateQuantity,
      decrementProduct,
      clearCart,
      totalItems,
      totalPrice,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
