'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import WishlistToast from '@/components/common/WishlistToast/WishlistToast';
import { useAuth } from '@/providers/AuthProvider';
import { cartApi } from '@/services/api';

const CartContext = createContext(null);

const emptyCart = { id: null, items: [], subtotal: 0, itemCount: 0 };
const TOAST_MS = 1800;

export function CartProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [cart, setCart] = useState(emptyCart);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((message) => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }

    setToastMessage(message);
    requestAnimationFrame(() => setToastVisible(true));

    toastTimer.current = window.setTimeout(() => {
      setToastVisible(false);
      toastTimer.current = window.setTimeout(() => {
        setToastMessage('');
        toastTimer.current = null;
      }, 200);
    }, TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(emptyCart);
      return emptyCart;
    }
    setLoading(true);
    try {
      const next = await cartApi.get();
      setCart(next);
      return next;
    } catch {
      setCart(emptyCart);
      return emptyCart;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  const addItem = useCallback(
    async (variantId, quantity = 1, { notify = true } = {}) => {
      const next = await cartApi.add(variantId, quantity);
      setCart(next);
      if (notify) showToast('Added Successfully');
      return next;
    },
    [showToast],
  );

  const updateItem = useCallback(async (itemId, quantity) => {
    const next = await cartApi.update(itemId, quantity);
    setCart(next);
    return next;
  }, []);

  const removeItem = useCallback(async (itemId) => {
    setCart((prev) => {
      const items = (prev.items || []).filter((item) => item.id !== itemId);
      return {
        ...prev,
        items,
        itemCount: items.reduce((n, item) => n + (item.quantity || 0), 0),
        subtotal: items.reduce((n, item) => n + (item.lineTotal || 0), 0),
      };
    });
    try {
      const next = await cartApi.remove(itemId);
      setCart(next);
      return next;
    } catch (err) {
      await refresh();
      throw err;
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ cart, loading, refresh, addItem, updateItem, removeItem }),
    [cart, loading, refresh, addItem, updateItem, removeItem],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <WishlistToast message={toastMessage} visible={toastVisible} />
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
