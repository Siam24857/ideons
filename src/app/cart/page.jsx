"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiAlertCircle } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import toast from "react-hot-toast";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Price } from "@/components/ui/Price";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { useStore } from "@/components/providers/StoreProvider";

export default function CartPage() {
  const { user, authLoading } = useStore();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  const [hasIssues, setHasIssues] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const result = await api.get("/api/cart");
        if (mounted && result.ok) {
          const cart = result.data.cart;
          setItems(cart.items || []);
          setSubtotal(cart.subtotal || 0);
          setItemsCount(cart.itemsCount || 0);
          setHasIssues(cart.hasIssues || false);
        }
      } catch {
        // handled by api client
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user, authLoading]);

  const refreshCart = async () => {
    try {
      const result = await api.get("/api/cart");
      if (result.ok) {
        const cart = result.data.cart;
        setItems(cart.items || []);
        setSubtotal(cart.subtotal || 0);
        setItemsCount(cart.itemsCount || 0);
        setHasIssues(cart.hasIssues || false);
      }
    } catch {
      // ignore
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-navy-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
        <FiShoppingBag size={55} className="text-navy-300 mb-4" />
        <h2 className="text-2xl font-bold text-navy-900">Please sign in</h2>
        <p className="mt-2 text-sm text-navy-500">
          Sign in to view your saved cart and check out.
        </p>
        <LinkButton
          href="/signin"
          variant="primary"
          className="mt-5"
        >
          Sign in
        </LinkButton>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
        <FiShoppingBag size={55} className="text-navy-300 mb-4" />
        <h2 className="text-2xl font-bold text-navy-900">Your cart is empty</h2>
        <p className="mt-2 text-sm text-navy-500">
          You have not added any products to your cart yet.
        </p>
        <LinkButton
          href="/products"
          variant="primary"
          className="mt-5"
        >
          Browse products
        </LinkButton>
      </div>
    );
  }

  const deliveryCharge = subtotal >= 2000 ? 0 : 120;
  const total = subtotal + deliveryCharge;
  const freeDeliveryGap = Math.max(0, 2000 - subtotal);

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-navy-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">My Cart</h1>
          <p className="mt-1 text-sm text-navy-500">
            {itemsCount} item{itemsCount === 1 ? "" : "s"} in your cart
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {items.map((item) => (
              <CartItem
                key={item._id}
                item={item}
                onSave={refreshCart}
                onRemove={refreshCart}
                updating={updating[item._id]}
                setUpdating={(id, v) => setUpdating((prev) => ({ ...prev, [id]: v }))}
              />
            ))}

            {hasIssues && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
                <FiAlertCircle className="h-4 w-4 text-rose-600 mr-2" />
                <span className="text-sm text-rose-700">
                  Some items have availability issues. Please review quantities before checkout.
                </span>
              </div>
            )}
          </div>

          <div className="h-fit rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sticky top-5">
            <h2 className="mb-6 text-lg font-bold text-navy-950">Order Summary</h2>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">Subtotal</span>
                <span className="font-medium text-navy-900">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">
                  Delivery Charge
                  {deliveryCharge === 0 ? " (Free)" : ""}
                </span>
                <span className="font-medium text-navy-900">{formatMoney(deliveryCharge)}</span>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-lg bg-navy-50 text-xs text-navy-500">
              {freeDeliveryGap > 0 ? (
                <>
                  Add <span className="font-semibold text-navy-900">{formatMoney(freeDeliveryGap)}</span>
                  more for free delivery
                </>
              ) : (
                <span className="font-semibold text-emerald-700">You qualify for free delivery</span>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between text-xl font-bold">
              <span className="text-navy-950">Total</span>
              <span className="text-blue-600">{formatMoney(total)}</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/checkout")}
              className="w-full"
              disabled={hasIssues}
            >
              {hasIssues ? "Fix cart issues" : "Proceed to Checkout"}
            </Button>

            {hasIssues && (
              <p className="mt-3 text-xs text-navy-400 text-center">
                Some items are out of stock or exceed available quantity. Please adjust before checking out.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CartItem({
  item,
  onSave,
  onRemove,
  updating,
  setUpdating,
} ) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [optimistic, setOptimistic] = useState(null);
  const displayQty = optimistic !== null ? optimistic : quantity;

  const availabilityTone = {
    ok: "border-emerald-200 bg-emerald-100 text-emerald-700",
    insufficient: "border-amber-200 bg-amber-100 text-amber-700",
    out: "border-rose-200 bg-rose-100 text-rose-700",
    inactive: "border-gray-200 bg-gray-100 text-gray-700",
  };

  const availabilityLabel = {
    ok: "In stock",
    insufficient: "Limited stock",
    out: "Out of stock",
    inactive: "Unavailable",
  };

  const avail = item.availability || "ok";
  const tone = availabilityTone[avail] || availabilityTone.ok;
  const label = availabilityLabel[avail] || availabilityLabel.ok;

  const handleSave = async () => {
    setUpdating(item._id, true);
    try {
      const result = await api.patch(`/api/cart/${item._id}`, { itemId: item._id, quantity: displayQty });
      if (result.ok) {
        setQuantity(displayQty);
        setOptimistic(null);
        await onSave();
      } else {
        toast.error(errorMessage(result));
        setOptimistic(null);
      }
    } catch {
      toast.error("Failed to update quantity.");
      setOptimistic(null);
    } finally {
      setUpdating(item._id, false);
    }
  };

  const handleRemove = async () => {
    setUpdating(item._id, true);
    try {
      const result = await api.delete(`/api/cart/${item._id}`);
      if (result.ok) {
        toast.success("Item removed from cart");
        await onRemove();
      } else {
        toast.error(errorMessage(result));
      }
    } catch {
      toast.error("Failed to remove item.");
    } finally {
      setUpdating(item._id, false);
    }
  };

  const lineTotal = item.unitPrice * displayQty;
  const maxQty = item.maxQuantity || 50;

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="h-24 w-24 shrnavy-0 overflow-hidden rounded-xl bg-navy-50">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-navy-400">No Image</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                href={`/products/${item.slug || item.productId}`}
                className="text-sm font-semibold text-navy-950 hover:text-blue-600 line-clamp-1"
              >
                {item.title}
              </Link>
              {item.category && (
                <p className="mt-1 text-xs text-navy-500">{item.category}</p>
              )}
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
                {label}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={updating}
              className="rounded-lg p-2 text-navy-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              title="Remove"
            >
              <FiTrash2 size={16} />
            </button>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex items-center rounded-lg border border-navy-200">
              <button
                type="button"
                onClick={() => setOptimistic((p) => (p !== null ? Math.max(1, p - 1) : Math.max(1, quantity - 1)))}
                disabled={updating || displayQty <= 1}
                className="p-2 text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiMinus size={14} />
              </button>
              <span className="w-10 text-center text-sm font-medium">{displayQty}</span>
              <button
                type="button"
                onClick={() => setOptimistic((p) => (p !== null ? Math.min(maxQty, p + 1) : Math.min(maxQty, quantity + 1)))}
                disabled={updating || displayQty >= maxQty}
                className="p-2 text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiPlus size={14} />
              </button>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium text-navy-900">{formatMoney(item.unitPrice)}</div>
              <div className="text-xs text-navy-500">{formatMoney(lineTotal)}</div>
            </div>

            {optimistic !== null && (
              <button
                type="button"
                onClick={handleSave}
                className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
                disabled={updating}
              >
                {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

