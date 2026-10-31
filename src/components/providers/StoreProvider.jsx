"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { api, errorMessage } from "@/lib/api-client";
import { addGuestItem, clearGuestCart, guestCount, readGuestCart, writeGuestCart } from "@/lib/guest-cart";

/**
 * Store-wide client state: cart & wishlist counters plus the actions used by
 * product cards and the navigation.
 *
 * Rules honoured here:
 *  - nothing reports success before the API confirmed the operation
 *  - guests get a local cart that is merged into the account cart on sign-in
 *  - wishlist actions require a session
 */

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user || null;
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCartCount(guestCount());
      return;
    }
    const result = await api.get("/api/cart");
    if (result.ok) setCartCount(result.data?.cart?.itemsCount || 0);
  }, [user]);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setWishlistIds([]);
      return;
    }
    const result = await api.get("/api/wishlist");
    if (result.ok) {
      setWishlistIds((result.data?.wishlist?.items || []).map((i) => i.productId));
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
    refreshWishlist();
  }, [refreshCart, refreshWishlist]);

  // Keep the guest counter in sync when the tab edits its local cart.
  useEffect(() => {
    if (user) return undefined;
    const onChange = () => setCartCount(guestCount());
    window.addEventListener("ideons:guest-cart", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ideons:guest-cart", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [user]);

  const addToCart = useCallback(
    async ({ productId, quantity = 1, variant = null }) => {
      setBusy(true);
      try {
        if (!user) {
          addGuestItem(productId, quantity, variant);
          setCartCount(guestCount());
          toast.success("Added to cart");
          return { ok: true, guest: true };
        }
        const result = await api.post("/api/cart", { productId, quantity, variant });
        if (!result.ok) {
          toast.error(errorMessage(result));
          return { ok: false, error: result };
        }
        setCartCount(result.data.cart.itemsCount);
        toast.success("Added to cart");
        return { ok: true, cart: result.data.cart };
      } finally {
        setBusy(false);
      }
    },
    [user]
  );

  const toggleWishlist = useCallback(
    async (productId, currentSaved) => {
      if (!user) {
        toast.error("Please sign in to save products to your wishlist.");
        return { ok: false };
      }
      const saved = currentSaved ?? wishlistIds.includes(productId);
      const result = saved
        ? await api.delete(`/api/wishlist?productId=${encodeURIComponent(productId)}`)
        : await api.post("/api/wishlist", { productId });

      if (!result.ok) {
        toast.error(errorMessage(result));
        return { ok: false };
      }
      setWishlistIds(result.data.wishlist.items.map((i) => i.productId));
      toast.success(saved ? "Removed from wishlist" : "Saved to wishlist");
      return { ok: true, saved: !saved };
    },
    [user, wishlistIds]
  );

  /** Called after sign-in to move the local cart into the account cart. */
  const mergeGuestCart = useCallback(async () => {
    const items = readGuestCart();
    if (items.length) {
      const result = await api.post("/api/cart/merge", { items });
      if (result.ok) {
        clearGuestCart();
        setCartCount(result.data.cart.itemsCount);
        toast.success(`${result.data.merged || items.length} item(s) moved to your cart`);
      }
    } else {
      refreshCart();
    }
    refreshWishlist();
  }, [refreshCart, refreshWishlist]);

  const clearCart = useCallback(async () => {
    if (!user) {
      writeGuestCart([]);
      setCartCount(0);
      return { ok: true };
    }
    const result = await api.delete("/api/cart");
    if (result.ok) setCartCount(0);
    return result;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      authLoading: isPending,
      cartCount,
      wishlistIds,
      wishlistCount: wishlistIds.length,
      busy,
      addToCart,
      toggleWishlist,
      refreshCart,
      refreshWishlist,
      mergeGuestCart,
      clearCart,
      isWishlistSaved: (id) => wishlistIds.includes(id),
    }),
    [
      user,
      isPending,
      cartCount,
      wishlistIds,
      busy,
      addToCart,
      toggleWishlist,
      refreshCart,
      refreshWishlist,
      mergeGuestCart,
      clearCart,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
