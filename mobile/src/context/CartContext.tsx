import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "nile_cart";

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: {
    id: string;
    name: string;
    price: number;
    image_url?: string | null;
  }, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then((raw) => {
      if (raw) {
        try {
          setItems(JSON.parse(raw));
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

  const addToCart = useCallback(
    (
      product: { id: string; name: string; price: number; image_url?: string | null },
      quantity = 1
    ) => {
      setItems((current) => {
        const existing = current.find((item) => item.product_id === product.id);
        if (existing) {
          return current.map((item) =>
            item.product_id === product.id ? { ...item, quantity: item.quantity + quantity } : item
          );
        }
        return [
          ...current,
          {
            id: Math.random().toString(36).slice(2, 11),
            product_id: product.id,
            name: product.name,
            price: product.price,
            quantity,
            image_url: product.image_url ?? undefined,
          },
        ];
      });
    },
    []
  );

  const removeFromCart = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.product_id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      setItems((current) => current.filter((item) => item.product_id !== productId));
      return;
    }
    setItems((current) =>
      current.map((item) => (item.product_id === productId ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
    }),
    [items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
