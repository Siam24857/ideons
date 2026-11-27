"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { api, errorMessage } from "@/lib/api-client";

/**
 * Store-wide client state: cart & wishlist counters plus the actions used by
 * product cards and the navigation.
 *
 * Rules honoured here:
 *  - nothing reports success before the API confirmed the operation
 *  - cart and wishlist actions require a Better Auth session
 */

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const user = session?.user || null;
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) return;
    const result = await api.get("/api/cart");
    if (result.ok) setCartCount(result.data?.cart?.itemsCount || 0);
  }, [user]);

  const refreshWishlist = useCallback(async () => {
    if (!user) return;
    const result = await api.get("/api/wishlist");
    if (result.ok) {
      setWishlistIds((result.data?.wishlist?.items || []).map((i) => i.productId));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    (async () => {
      const [cartResult, wishlistResult] = await Promise.all([
        api.get("/api/cart"),
        api.get("/api/wishlist"),
      ]);
      if (!active) return;
      if (cartResult.ok) setCartCount(cartResult.data?.cart?.itemsCount || 0);
      if (wishlistResult.ok) {
        setWishlistIds((wishlistResult.data?.wishlist?.items || []).map((item) => item.productId));
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const addToCart = useCallback(
    async ({ productId, quantity = 1, variant = null }) => {
      if (isPending) return { ok: false, authLoading: true };
      const goToSignIn = () => {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        router.push(`/signin?callbackURL=${encodeURIComponent(returnTo)}`);
      };
      if (!user) {
        goToSignIn();
        return { ok: false, requiresAuth: true };
      }

      setBusy(true);
      try {
        const result = await api.post("/api/cart", { productId, quantity, variant });
        if (!result.ok) {
          if (result.status === 401) {
            goToSignIn();
            return { ok: false, requiresAuth: true };
          }
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
    [isPending, router, user]
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

  /** Kept for compatibility with the existing sign-in flow. */
  const mergeGuestCart = useCallback(async () => {
    await refreshCart();
    refreshWishlist();
  }, [refreshCart, refreshWishlist]);

  const clearCart = useCallback(async () => {
    if (!user) {
      return { ok: false, requiresAuth: true };
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
      wishlistIds: user ? wishlistIds : [],
      wishlistCount: user ? wishlistIds.length : 0,
      busy,
      addToCart,
      toggleWishlist,
      refreshCart,
      refreshWishlist,
      mergeGuestCart,
      clearCart,
      isWishlistSaved: (id) => Boolean(user) && wishlistIds.includes(id),
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
