"use client";

import { useStore } from "@/components/providers/StoreProvider";
import { useState } from "react";
import { ShoppingCart, CreditCard, Truck, ShieldCheck, Headphones } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

export function ProductActions({ product, symbol, effectivePrice }) {
  const { addToCart, busy } = useStore();
  const [quantity, setQuantity] = useState(1);
const maxQty = product.stock || 1;
const inStock = product.inStock ?? (product.stock > 0);

  const handleAddToCart = async () => {
    if (!inStock) {
      toast.error("This product is out of stock.");
      return;
    }
    if (quantity > maxQty) {
      toast.error(`Only ${maxQty} unit(s) available.`);
      return;
    }
    const result = await addToCart({ productId: product._id, quantity });
    if (result.ok) {
      toast.success("Added to cart");
    }
  };

  const hasDiscount = product.oldPrice && Number(product.oldPrice) > effectivePrice;
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.oldPrice) - effectivePrice) / Number(product.oldPrice)) * 100)
    : 0;

  return (
    <div className="space-y-4 pt-6 border-t border-navy-100">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-navy-600">Quantity:</span>
        <div className="flex items-center rounded-lg border border-navy-200">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1 || busy}
            className="p-2 text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty || busy}
            className="p-2 text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="primary"
          size="lg"
          loading={busy}
          disabled={busy || !inStock}
          className="w-full sm:w-auto"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4" />
          {inStock ? "Add to Cart" : "Out of Stock"}
        </Button>
        <LinkButton
          href="/checkout"
          // variant="outlineDark"
          size="lg"
          disabled={!inStock}
          className="w-full sm:w-auto"
        >
          <CreditCard className="h-4 w-4 " /> 
          Buy Now
        </LinkButton>
      </div>

      {hasDiscount && (
        <Badge tone="brand" className="w-fit">
          -{discountPercent}%
        </Badge>
      )}

      <div className="grid gap-2 sm:grid-cols-3 text-xs text-navy-500">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-blue-500" />
          <span>Delivery across Bangladesh</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-500" />
          <span>Secure checkout</span>
        </div>
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-blue-500" />
          <span>Order support</span>
        </div>
      </div>
    </div>
  );
}

