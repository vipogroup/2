'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { analytics } from '@/app/components/GoogleAnalytics';
import { getPrimaryImageSrc } from '@/app/lib/mediaSSOT';

const STORAGE_KEY = 'vipo_cart_v1';

const CartContext = createContext(null);

function normalizeItem(rawItem = {}) {
  if (!rawItem?.productId) return null;
  const quantity = Number(rawItem.quantity) || 1;
  return {
    productId: String(rawItem.productId),
    name: rawItem.name || '',
    price: Number(rawItem.price) || 0,
    image: rawItem.image || '',
    originalPrice: rawItem.originalPrice ? Number(rawItem.originalPrice) : null,
    quantity: quantity < 1 ? 1 : quantity,
    shippingEnabled: rawItem.shippingEnabled || false,
    shippingPrice: Number(rawItem.shippingPrice) || 0,
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);

  // Load cart from localStorage on first render (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map(normalizeItem).filter(Boolean);
          setItems(normalized);
        }
      }
    } catch (error) {
      console.warn('Failed to load cart from storage', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('Failed to persist cart to storage', error);
    }
  }, [items, hydrated]);

  const addItem = useCallback((product, quantity = 1) => {
    if (!product?._id) return;
    const qtyToAdd = Math.max(1, Number(quantity) || 1);
    let finalQuantity = qtyToAdd;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product._id);
      if (existingIndex >= 0) {
        const next = [...prev];
        const updatedQuantity = next[existingIndex].quantity + qtyToAdd;
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: updatedQuantity,
        };
        finalQuantity = updatedQuantity;
        return next;
      }

      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice ?? null,
          image: getPrimaryImageSrc(product),
          quantity: qtyToAdd,
          shippingEnabled: product.shippingEnabled || false,
          shippingPrice: Number(product.shippingPrice) || 0,
        },
      ];
    });

    setLastAdded({
      productId: product._id,
      name: product.name,
      addedQuantity: qtyToAdd,
      totalQuantity: finalQuantity,
      timestamp: Date.now(),
    });

    // Track add to cart event in Google Analytics
    if (analytics?.addToCart) {
      analytics.addToCart(product, qtyToAdd);
    }
  }, []);

  const setItemQuantity = useCallback((productId, nextQuantity) => {
    setItems((prev) => {
      const qty = Math.max(1, Number(nextQuantity) || 1);
      return prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item));
    });
  }, []);

  const incrementItem = useCallback((productId) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }, []);

  const decrementItem = useCallback((productId) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const nextQty = Math.max(1, item.quantity - 1);
        return { ...item, quantity: nextQty };
      }),
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    // Also clear localStorage immediately to ensure cart is empty even if redirect happens before useEffect runs
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear cart from storage', error);
      }
    }
  }, []);

  const dismissLastAdded = useCallback(() => {
    setLastAdded(null);
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      subtotal,
      totalQuantity,
    };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      hydrated,
      addItem,
      setItemQuantity,
      incrementItem,
      decrementItem,
      removeItem,
      clearCart,
      totals,
      isEmpty: items.length === 0,
      lastAdded,
      dismissLastAdded,
    }),
    [
      items,
      hydrated,
      addItem,
      setItemQuantity,
      incrementItem,
      decrementItem,
      removeItem,
      clearCart,
      totals,
      lastAdded,
      dismissLastAdded,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCartContext must be used within CartProvider');
  }
  return ctx;
}
