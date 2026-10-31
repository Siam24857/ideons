"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiAlertCircle, FiLoader, FiCreditCard, FiMapPin, FiUser, FiPhone } from "react-icons/fi";
import { api, errorMessage, getIdempotencyKey, clearIdempotencyKey } from "@/lib/api-client";
import toast from "react-hot-toast";
import { Button, LinkButton, Spinner } from "@/components/ui/Buttons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Price } from "@/components/ui/Price";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { useStore } from "@/components/providers/StoreProvider";
import { BANGLADESH_DIVISIONS } from "@/lib/constants";

export default function CheckoutPage() {
  const { user, authLoading } = useStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [addressError, setAddressError] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [newAddress, setNewAddress] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    division: "",
    district: "",
    city: "",
    streetAddress: "",
    houseInfo: "",
    postalCode: "",
    deliveryInstructions: "",
    label: "",
  });

  const idempotencyKey = getIdempotencyKey();

  const loadCheckout = useCallback(async () => {
    if (!user) return null;
    try {
      const result = await api.get("/api/checkout");
      return result;
    } catch {
      return null;
    }
  }, [user]);

  const loadAddresses = useCallback(async () => {
    if (!user) return null;
    try {
      const result = await api.get("/api/addresses");
      return result;
    } catch {
      return null;
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;

    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }

      const [checkoutRes, addressesRes] = await Promise.all([
        loadCheckout(),
        loadAddresses(),
      ]);

      if (cancelled) return;

      if (checkoutRes?.ok) {
        setCheckoutData(checkoutRes.data);
      } else {
        toast.error("Failed to load checkout details.");
        router.push("/cart");
      }

      if (addressesRes?.ok) {
        setAddresses(addressesRes.data.items || []);
        const items = addressesRes.data.items || [];
        const defaultAddr = items.find((a) => a.isDefault);
        setSelectedAddressId(defaultAddr ? defaultAddr._id : (items[0] ? items[0]._id : ""));
      }

      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user, authLoading, loadCheckout, loadAddresses, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <Spinner label="Loading checkout" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[600px] flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
        <FiUser size={55} className="text-navy-300 mb-4" />
        <h2 className="text-2xl font-bold text-navy-900">Please sign in</h2>
        <p className="mt-2 text-sm text-navy-500">
          Sign in to complete your order.
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

  if (!checkoutData) {
    return (
      <div className="flex min-h-[600px] flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
        <FiAlertCircle size={55} className="text-navy-300 mb-4" />
        <h2 className="text-2xl font-bold text-navy-900">Your cart is empty</h2>
        <p className="mt-2 text-sm text-navy-500">
          Add some products before checking out.
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

  const { cart, totals, settings, shippingAddress, division } = checkoutData;
  const codEnabled = settings?.codEnabled !== false;
  const stripeEnabled = settings?.stripeEnabled === true;
  const currencySymbol = settings?.currencySymbol || "৳";

  const selectedAddress = addresses.find((a) => a._id === selectedAddressId);
  const usingNewAddress = showNewAddressForm && !selectedAddressId;
  const activeAddress = usingNewAddress ? newAddress : selectedAddress;

  // Live delivery charge based on the active division/district so the summary
  // reflects Dhaka (70 BDT) vs outside (130 BDT) as the user changes inputs.
  const activeDivision = usingNewAddress
    ? formData.division
    : (selectedAddress?.division || division || "");
  const activeDistrict = usingNewAddress
    ? formData.district
    : (selectedAddress?.district || "");
  const freeOver = Number(settings?.freeDeliveryOver) || 0;
  const itemsTotalNum = Number(totals?.itemsTotal) || 0;
  const freeApplied = freeOver > 0 && itemsTotalNum * 100 >= freeOver * 100;
  const isDhaka =
    String(activeDivision || "").trim().toLowerCase() === "dhaka" ||
    String(activeDistrict || "").trim().toLowerCase() === "dhaka";
  const displayDelivery = freeApplied
    ? 0
    : isDhaka
      ? Number(settings?.deliveryChargeInsideDhaka) || 70
      : Number(settings?.deliveryChargeOutsideDhaka) || 130;
  const displayTotal = itemsTotalNum + displayDelivery;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!idempotencyKey) {
      toast.error("Unable to process order. Please try again.");
      return;
    }

    const addressPayload = activeAddress || null;
    const addressIdPayload = usingNewAddress ? "" : selectedAddressId;

    if (!addressIdPayload && !addressPayload) {
      setFormError("Please select or enter a delivery address.");
      return;
    }

    // Validate new address fields if entering new
    if (usingNewAddress) {
      const required = ["fullName", "phone", "division", "district", "city", "streetAddress"];
      const missing = required.filter((k) => !formData[k]);
      if (missing.length > 0) {
        setFormError("Please fill in all required address fields.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await api.post("/api/checkout", {
        idempotencyKey,
        addressId: addressIdPayload,
        address: usingNewAddress ? addressPayload : undefined,
        paymentMethod,
        notes: formData.deliveryInstructions || undefined,
      });

      clearIdempotencyKey();

      if (!result.ok) {
        setFormError(errorMessage(result));
        return;
      }

      const { order, duplicate, checkoutUrl } = result.data;

      if (duplicate) {
        toast.info("This order was already placed.");
        router.push(`/account/orders/${order.orderNumber}`);
        return;
      }

      if (paymentMethod === "stripe" && checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      toast.success("Order placed successfully!");
      router.push(`/account/orders/${order.orderNumber}`);
    } catch {
      setFormError("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setNewAddress((prev) => ({
      ...prev,
      [name]: value,
      country: "Bangladesh",
    }));
  };

  const deliveryMethods = [
    { label: "Cash on Delivery", value: "cod", enabled: codEnabled, icon: <FiMapPin className="h-4 w-4" /> },
    { label: "Card (Stripe)", value: "stripe", enabled: stripeEnabled, icon: <FiCreditCard className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-navy-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Checkout</h1>
          <p className="mt-1 text-sm text-navy-500">
            Review your order and delivery details before placing it.
          </p>
        </div>
      </section>

      {formError && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
            <FiAlertCircle className="h-4 w-4 text-rose-600 mr-2" />
            <span className="text-sm text-rose-700">{formError}</span>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left: Items + Address + Payment */}
          <div className="space-y-6">
            {/* Order Items */}
            <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-navy-950">Order Items</h2>
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item._id} className="flex gap-3">
                    <div className="h-16 w-16 shrnavy-0 overflow-hidden rounded-lg bg-navy-50">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-navy-400">No Image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.slug || item.productId}`}
                        className="text-sm font-semibold text-navy-950 hover:text-blue-600 line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-1 text-xs text-navy-500">
                        <span>{item.quantity}x</span>
                        <span>•</span>
                        <span>{formatMoney(item.unitPrice)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-navy-900">{formatMoney(item.lineTotal)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-navy-950">Delivery Address</h2>

              <div className="space-y-3">
                {addresses.length > 0 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-400 mb-3">Saved addresses</p>
                    {addresses.map((addr) => (
                      <button
                        key={addr._id}
                        type="button"
                        onClick={() => {
                          setSelectedAddressId(addr._id);
                          setShowNewAddressForm(false);
                          setNewAddress(null);
                        }}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                          selectedAddressId === addr._id
                            ? "border-blue-500 bg-blue-50 text-blue-600"
                            : "border-navy-200 text-navy-700 hover:bg-navy-50"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={selectedAddressId === addr._id}
                          readOnly
                          className="h-4 w-4 text-blue-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-navy-900">{addr.fullName}</div>
                          <div className="text-xs text-navy-500">
                            {addr.city}, {addr.district}, {addr.division}
                          </div>
                        </div>
                        {addr.isDefault && (
                          <Badge tone="brand" size="sm">Default</Badge>
                        )}
                      </button>
                    ))}
                  </>
                )}

                <div className="pt-3 border-t border-navy-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewAddressForm(!showNewAddressForm);
                      if (!showNewAddressForm) {
                        setSelectedAddressId("");
                        setNewAddress(null);
                      }
                    }}
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-navy-200 bg-navy-50 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                  >
                    {showNewAddressForm ? "Use saved address" : "+ Enter a new address"}
                  </button>
                </div>

                {showNewAddressForm && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">Full Name *</label>
                        <input
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">Phone *</label>
                        <input
                          name="phone"
                          value={formData.phone}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">Email</label>
                        <input
                          name="email"
                          value={formData.email}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">Division *</label>
                        <select
                          name="division"
                          value={formData.division}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                        >
                          <option value="">Select division</option>
                          {BANGLADESH_DIVISIONS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">District *</label>
                        <input
                          name="district"
                          value={formData.district}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">City / Area *</label>
                        <input
                          name="city"
                          value={formData.city}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-navy-600">Street Address *</label>
                        <input
                          name="streetAddress"
                          value={formData.streetAddress}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                          placeholder="House/Flat, Road, Block, Landmark"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">House / Flat</label>
                        <input
                          name="houseInfo"
                          value={formData.houseInfo}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">Postal Code</label>
                        <input
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-navy-600">Delivery Instructions</label>
                        <textarea
                          name="deliveryInstructions"
                          value={formData.deliveryInstructions}
                          onChange={handleNewAddressChange}
                          rows={2}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-navy-600">Address Label</label>
                        <input
                          name="label"
                          value={formData.label}
                          onChange={handleNewAddressChange}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500"
                          placeholder="e.g. Home, Office"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-navy-950">Payment Method</h2>
              <div className="space-y-3">
                {deliveryMethods.map((method) => {
                  if (!method.enabled) return null;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                        paymentMethod === method.value
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-navy-200 text-navy-700 hover:bg-navy-50"
                      }`}
                    >
                      {method.icon}
                      <div>
                        <div className="font-medium">{method.label}</div>
                        {method.value === "cod" ? (
                          <div className="text-xs text-navy-500">Pay when you receive your order</div>
                        ) : (
                          <div className="text-xs text-navy-500">Secure online card payment</div>
                        )}
                      </div>
                    </button>
                  );
                })}
                {deliveryMethods.length === 0 && (
                  <div className="text-xs text-navy-400">No payment methods available.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="h-fit rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sticky top-5">
            <h2 className="mb-6 text-lg font-bold text-navy-950">Order Summary</h2>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">Subtotal</span>
                <span className="font-medium text-navy-900">{formatMoney(totals.subtotal, currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">Discount</span>
                <span className="font-medium text-navy-900">-{formatMoney(totals.discount || 0, currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">Delivery Charge</span>
                <span className="font-medium text-navy-900">{formatMoney(displayDelivery, currencySymbol)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-xl font-bold">
              <span className="text-navy-950">Total</span>
              <span className="text-blue-600">{formatMoney(displayTotal, currencySymbol)}</span>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-navy-50 text-xs text-navy-500">
              <span className="font-medium">Secure checkout.</span>{" "}
              Prices and stock are verified before your order is confirmed.
            </div>

            <Button
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={submitting || paymentMethod === "stripe" && !stripeEnabled}
              onClick={handleSubmit}
              className="w-full"
            >
              {submitting ? "Placing order…" : "Place Order"}
            </Button>

            <p className="mt-3 text-xs text-navy-400 text-center">
              Your order will be confirmed once payment is processed.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";

