'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import WishlistToast from '@/components/common/WishlistToast/WishlistToast';
import { useAuth } from '@/providers/AuthProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { wishlistApi } from '@/services/api';

const WishlistContext = createContext(null);

const emptyWishlist = { id: null, items: [], itemCount: 0 };
const TOAST_MS = 1800;

export function WishlistProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { openLogin } = useLoginModal();
  const [wishlist, setWishlist] = useState(emptyWishlist);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const generation = useRef(0);
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
      setWishlist(emptyWishlist);
      return emptyWishlist;
    }
    const mine = ++generation.current;
    setLoading(true);
    try {
      const next = await wishlistApi.get();
      if (mine !== generation.current) return next;
      setWishlist(next);
      return next;
    } catch {
      if (mine !== generation.current) return emptyWishlist;
      setWishlist(emptyWishlist);
      return emptyWishlist;
    } finally {
      if (mine === generation.current) setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  const ids = useMemo(
    () => new Set((wishlist.items || []).map((item) => item.productId)),
    [wishlist.items],
  );

  const has = useCallback((productId) => ids.has(productId), [ids]);

  const add = useCallback(
    async (productId) => {
      const next = await wishlistApi.add(productId);
      generation.current += 1;
      setWishlist(next);
      showToast('Added to wishlist');
      return next;
    },
    [showToast],
  );

  const remove = useCallback(
    async (productId) => {
      setWishlist((prev) => {
        const items = (prev.items || []).filter((item) => item.productId !== productId);
        return { ...prev, items, itemCount: items.length };
      });
      try {
        const next = await wishlistApi.remove(productId);
        generation.current += 1;
        setWishlist(next);
        showToast('Removed from wishlist');
        return next;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh, showToast],
  );

  const toggle = useCallback(
    async (productId) => {
      if (!isAuthenticated) {
        openLogin({
          onSuccess: async () => {
            setPendingId(productId);
            try {
              await add(productId);
            } finally {
              setPendingId(null);
            }
          },
        });
        return null;
      }

      setPendingId(productId);
      try {
        if (ids.has(productId)) return await remove(productId);
        return await add(productId);
      } finally {
        setPendingId(null);
      }
    },
    [add, ids, isAuthenticated, openLogin, remove],
  );

  const value = useMemo(
    () => ({
      wishlist,
      loading,
      pendingId,
      refresh,
      has,
      add,
      remove,
      toggle,
      itemCount: wishlist.itemCount || 0,
    }),
    [wishlist, loading, pendingId, refresh, has, add, remove, toggle],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
      <WishlistToast message={toastMessage} visible={toastVisible} />
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
