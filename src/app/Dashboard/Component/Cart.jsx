 "use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiMinus,
  FiPlus,
  FiTrash2,
  FiShoppingBag,
} from "react-icons/fi";

import { authClient } from "@/lib/auth-client";

const Cartpage = ({ cartdata }) => {
  const { data: session, isPending: sessionLoading } =
    authClient.useSession();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user;

  // --------------------------------
  // Load real cart data from props
  // --------------------------------
  useEffect(() => {
    if (cartdata) {
      // If cartdata is directly an array
      if (Array.isArray(cartdata)) {
        setCartItems(cartdata);
      }

      // If cartdata is { cartItems: [...] }
      else if (Array.isArray(cartdata.cartItems)) {
        setCartItems(cartdata.cartItems);
      }

      // If cartdata is { data: [...] }
      else if (Array.isArray(cartdata.data)) {
        setCartItems(cartdata.data);
      }

      else {
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }

    setLoading(false);
  }, [cartdata]);

  // --------------------------------
  // Increase quantity
  // --------------------------------
  const increaseQuantity = (index) => {
    setCartItems((items) =>
      items.map((item, i) => {
        if (i !== index) return item;

        const currentQuantity = Number(item.quantity || 1);
        const stock = Number(item.stock);

        return {
          ...item,
          quantity:
            stock > 0
              ? Math.min(currentQuantity + 1, stock)
              : currentQuantity + 1,
        };
      })
    );
  };

  // --------------------------------
  // Decrease quantity
  // --------------------------------
  const decreaseQuantity = (index) => {
    setCartItems((items) =>
      items.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          quantity: Math.max(1, Number(item.quantity || 1) - 1),
        };
      })
    );
  };

  // --------------------------------
  // Remove item
  // --------------------------------
  const removeItem = (index) => {
    setCartItems((items) =>
      items.filter((_, i) => i !== index)
    );
  };

  // --------------------------------
  // Total price
  // --------------------------------
  const total = cartItems.reduce((sum, item) => {
    const price = Number(
      item.productPrice ?? item.price ?? 0
    );

    const quantity = Number(item.quantity || 1);

    return sum + price * quantity;
  }, 0);

  // --------------------------------
  // Total quantity
  // --------------------------------
  const totalItems = cartItems.reduce((sum, item) => {
    return sum + Number(item.quantity || 1);
  }, 0);

  // --------------------------------
  // Loading
  // --------------------------------
  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-500">
          Loading cart...
        </p>
      </div>
    );
  }

  // --------------------------------
  // Login required
  // --------------------------------
  if (!user) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <FiShoppingBag
          size={45}
          className="text-gray-400"
        />

        <h2 className="mt-4 text-xl font-bold text-gray-800">
          Please login first
        </h2>

        <Link
          href="/login"
          className="mt-4 rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700"
        >
          Login
        </Link>
      </div>
    );
  }

  // --------------------------------
  // Empty cart
  // --------------------------------
  if (cartItems.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-white p-8">
        <FiShoppingBag
          size={55}
          className="text-gray-300"
        />

        <h2 className="mt-4 text-2xl font-bold text-gray-800">
          Your cart is empty
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          You haven't added any products to your cart yet.
        </p>

        <Link
          href="/ProductBrowse"
          className="mt-5 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  // --------------------------------
  // Cart UI
  // --------------------------------
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          My Cart
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {cartItems.length} product
          {cartItems.length !== 1 ? "s" : ""} saved in your cart
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">

        {/* =========================
            CART ITEMS
        ========================== */}
        <div className="space-y-4">

          {cartItems.map((item, index) => {
            const price = Number(
              item.productPrice ?? item.price ?? 0
            );

            const quantity = Number(
              item.quantity || 1
            );

            const itemTotal = price * quantity;

            return (
              <div
                key={item._id || item.cartId || index}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex gap-4">

                  {/* Product Image */}
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100">

                    {item.productImage ||
                    item.image ? (
                      <img
                        src={
                          item.productImage ||
                          item.image
                        }
                        alt={
                          item.productName ||
                          item.name ||
                          "Product"
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        No Image
                      </div>
                    )}

                  </div>

                  {/* Product Information */}
                  <div className="min-w-0 flex-1">

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <h2 className="font-bold text-gray-900">
                          {item.productName ||
                            item.name ||
                            "Unnamed Product"}
                        </h2>

                        {item.category && (
                          <p className="mt-1 text-sm text-gray-500">
                            {item.category}
                          </p>
                        )}

                        {item.brand && (
                          <p className="mt-1 text-xs text-gray-400">
                            Brand: {item.brand}
                          </p>
                        )}

                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(index)
                        }
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title="Remove"
                      >
                        <FiTrash2 size={18} />
                      </button>

                    </div>

                    {/* Price */}
                    <p className="mt-3 text-lg font-bold text-purple-600">
                      ${price.toFixed(2)}
                    </p>

                    {/* Quantity + Item Total */}
                    <div className="mt-3 flex items-center justify-between">

                      {/* Quantity */}
                      <div className="flex items-center rounded-lg border border-gray-200">

                        <button
                          type="button"
                          onClick={() =>
                            decreaseQuantity(index)
                          }
                          disabled={quantity <= 1}
                          className="p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FiMinus size={15} />
                        </button>

                        <span className="w-10 text-center text-sm font-medium">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            increaseQuantity(index)
                          }
                          className="p-2 hover:bg-gray-50"
                        >
                          <FiPlus size={15} />
                        </button>

                      </div>

                      {/* Item Total */}
                      <p className="font-bold text-gray-900">
                        ${itemTotal.toFixed(2)}
                      </p>

                    </div>

                  </div>

                </div>
              </div>
            );
          })}

        </div>

        {/* =========================
            CART SUMMARY
        ========================== */}
        <div className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-gray-900">
            Cart Summary
          </h2>

          <div className="mt-5 space-y-3 text-sm">

            {/* Items */}
            <div className="flex justify-between">
              <span className="text-gray-500">
                Items
              </span>

              <span className="font-medium">
                {totalItems}
              </span>
            </div>

            {/* Subtotal */}
            <div className="flex justify-between">
              <span className="text-gray-500">
                Subtotal
              </span>

              <span className="font-medium">
                ${total.toFixed(2)}
              </span>
            </div>

            {/* Delivery */}
            <div className="flex justify-between">
              <span className="text-gray-500">
                Delivery
              </span>

              <span className="font-medium">
                Free
              </span>
            </div>

          </div>

          <div className="my-5 border-t" />

          {/* Total */}
          <div className="flex items-center justify-between">

            <span className="font-bold text-gray-900">
              Total
            </span>

            <span className="text-2xl font-bold text-purple-600">
              ${total.toFixed(2)}
            </span>

          </div>

          {/* Checkout */}
          <Link
            href="/checkout"
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700"
          >
            Proceed to Checkout
          </Link>

        </div>

      </div>
    </div>
  );
};

export default Cartpage;
 
