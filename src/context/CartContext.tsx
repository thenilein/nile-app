import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

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
    addToCart: (product: any, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('nile_cart');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('nile_cart', JSON.stringify(items));
    }, [items]);

    const addToCart = useCallback((product: any, quantity = 1) => {
        setItems(current => {
            const existing = current.find(item => item.product_id === product.id);
            if (existing) {
                return current.map(item =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...current, {
                id: Math.random().toString(36).substr(2, 9),
                product_id: product.id,
                name: product.name,
                price: product.price,
                quantity,
                image_url: product.image_url
            }];
        });
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setItems(current => current.filter(item => item.product_id !== productId));
    }, []);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        if (quantity < 1) {
            setItems(current => current.filter(item => item.product_id !== productId));
            return;
        }
        setItems(current =>
            current.map(item =>
                item.product_id === productId ? { ...item, quantity } : item
            )
        );
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
    const totalPrice = useMemo(() => items.reduce((sum, item) => sum + (item.price * item.quantity), 0), [items]);

    const contextValue = useMemo(() => ({
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice
    }), [items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice]);

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
