"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import toast from "react-hot-toast";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { FiAlertCircle, FiLoader, FiPackage, FiTruck, FiClock, FiMapPin } from "react-icons/fi";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setError(null);
    setOrder(null);

    const orderNum = String(orderNumber || "").trim();
    const ident = String(identifier || "").trim();

    if (!orderNum) {
      setError("Please enter your order number.");
      return;
    }
    if (!ident) {
      setError("Please enter your email or phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.post("/api/track", {
        orderNumber: orderNum,
        identifier: ident,
      });

      if (!result || !result.ok) {
        const msg =
          result?.message ||
          "No order matches the order number and email/phone you entered.";
        setError(msg);
        return;
      }

      const orderData = result.data?.order || result.data || null;
      if (!orderData) {
        setError("No order data received from server.");
        return;
      }

      setOrder(orderData);
      toast.success("Order found.");
    } catch (err) {
      setError(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (s) => {
    const map = {
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return map[String(s || "").toLowerCase()] || String(s || "Pending");
  };

  const statusColor = (s) => {
    const map = {
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      confirmed: "bg-indigo-100 text-indigo-700 border-indigo-200",
      processing: "bg-amber-100 text-amber-800 border-amber-200",
      shipped: "bg-blue-100 text-blue-700 border-blue-200",
      delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
      cancelled: "bg-rose-100 text-rose-700 border-rose-200",
    };
    return map[String(s || "").toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">Track Order</h1>
          <p className="mt-1 text-sm text-ink-500">
            Enter your order number and the email or phone used when placing it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">

          {/* Tracking form */}
          <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">
                  Order Number
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="IDN-20261025-XXXXXX"
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">
                  Email or Phone
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or 01XXXXXXXXX"
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500"
                />
              </div>

              <p className="text-xs text-ink-400">
                Find your order number in the order confirmation email or SMS.
              </p>

              <Button
                variant="primary"
                size="lg"
                loading={submitting}
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  "Track Order"
                )}
              </Button>
            </form>
          </div>

          {/* Error - prominent */}
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="h-5 w-5 text-rose-600 mt-0.5" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* Order result */}
          {order && (
            <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
              {/* Order header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-ink-950">
                      Order #{order.orderNumber || order.order_number || "N/A"}
                    </h2>
                    <p className="text-sm text-ink-500">
                      Placed{" "}
                      {order.createdAt
                        ? formatDate(order.createdAt, { withTime: false })
                        : "-"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor(order.orderStatus)}`}>
                    {statusLabel(order.orderStatus)}
                  </span>
                </div>

                {/* Order summary cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                    <p className="text-xs font-medium text-ink-500 uppercase">Items</p>
                    <p className="text-lg font-bold text-ink-900">{order.itemsCount || 0}</p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                    <p className="text-xs font-medium text-ink-500 uppercase">Total</p>
                    <p className="text-lg font-bold text-ink-900">
                      {formatMoney(order.total || 0, order.currencySymbol || "৳")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                    <p className="text-xs font-medium text-ink-500 uppercase">Payment</p>
                    <p className="text-sm font-medium text-ink-700 capitalize">
                      {order.paymentStatus || "Unpaid"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order timeline */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-ink-900 uppercase tracking-wider">
                  Order Timeline & Status Updates
                </h3>
                <div className="space-y-4 pl-4 border-l border-ink-200">
                  {(order.history || []).map((h, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 flex h-2 w-2 items-center justify-center rounded-full bg-brand-500 border-2 border-brand-500" />
                      <div className="flex flex-col">
                        <p className="text-sm text-ink-600">
                          {h.message || h.status || "Order update"}
                        </p>
                        <p className="text-xs text-ink-400">
                          {h.at ? new Date(h.at).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(order.timeline && typeof order.timeline === "object" && Object.keys(order.timeline).length > 0) && (
                    <>
                      {Object.entries(order.timeline).map(([key, value]) => {
                        if (!value || key === "placedAt") return null;
                        const label = key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase());
                        return (
                          <div key={key} className="flex items-start gap-3">
                            <div className="mt-1 flex h-2 w-2 items-center justify-center rounded-full bg-brand-500 border-2 border-brand-500" />
                            <div className="flex flex-col">
                              <p className="text-sm text-ink-600">{label}</p>
                              <p className="text-xs text-ink-400">
                                {new Date(value).toLocaleString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              <LinkButton
                href="/account/orders"
                variant="ghost"
                size="sm"
                className="mt-4"
              >
                Back to order history
              </LinkButton>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
