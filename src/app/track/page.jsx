"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import toast from "react-hot-toast";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { FiAlertCircle, FiLoader, FiSearch } from "react-icons/fi";
import { formatMoney } from "@/lib/money";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  processing: "bg-amber-100 text-amber-800 border-amber-200",
  shipped: "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const DEFAULT_STATUS_COLOR = "bg-gray-100 text-gray-700 border-gray-200";

function statusLabel(s) {
  const key = String(s || "").toLowerCase();
  return STATUS_LABELS[key] || String(s || "Pending");
}

function statusColor(s) {
  const key = String(s || "").toLowerCase();
  return STATUS_COLORS[key] || DEFAULT_STATUS_COLOR;
}

// Safe date formatters — return "-" for invalid/missing dates
function formatDateOnly(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Build a normalized, render-ready timeline from history + timeline object
function buildTimeline(order) {
  const events = [];

  if (Array.isArray(order.history)) {
    order.history.forEach((h, i) => {
      if (!h) return;
      events.push({
        key: `history-${h.at || i}-${h.status || i}`,
        label: h.message || h.status || "Order update",
        at: h.at,
      });
    });
  }

  if (order.timeline && typeof order.timeline === "object") {
    Object.entries(order.timeline).forEach(([key, value]) => {
      if (!value || key === "placedAt") return;
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      events.push({
        key: `timeline-${key}`,
        label,
        at: value,
      });
    });
  }

  // Sort by date ascending; invalid/missing dates go last
  return events.sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : NaN;
    const tb = b.at ? new Date(b.at).getTime() : NaN;
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });
}

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        setError(
          result?.message ||
            "No order matches the order number and email/phone you entered."
        );
        return;
      }

      const orderData = result.data?.order || result.data || null;
      if (!orderData || typeof orderData !== "object") {
        setError("No order data received from server.");
        return;
      }

      setOrder(orderData);
      toast.success("Order found.");
    } catch (err) {
      setError(
        err?.message ||
          "Network error. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const timeline = order ? buildTimeline(order) : [];
  const itemsCount =
    order?.itemsCount ??
    (Array.isArray(order?.items) ? order.items.length : "N/A");
  const totalDisplay =
    typeof order?.total === "number"
      ? formatMoney(order.total, order.currencySymbol || "৳")
      : "N/A";

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <section className="border-b border-[#EAEDED] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#0B2545]">
            Track Order
          </h1>
          <p className="mt-1 text-sm text-[#123B69]">
            Enter your order number and the email or phone used when placing it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          {/* Tracking form */}
          <div className="rounded-xl border border-[#EAEDED] bg-white p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="orderNumber"
                  className="mb-2 block text-sm font-medium text-[#172337]"
                >
                  Order Number
                </label>
                <input
                  id="orderNumber"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="IDN-20261025-XXXXXX"
                  className="w-full rounded-lg border border-[#EAEDED] bg-white px-3 py-2 text-sm text-[#0B2545] outline-none focus:border-[#FFC928]"
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="identifier"
                  className="mb-2 block text-sm font-medium text-[#172337]"
                >
                  Email or Phone
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or 01XXXXXXXXX"
                  className="w-full rounded-lg border border-[#EAEDED] bg-white px-3 py-2 text-sm text-[#0B2545] outline-none focus:border-[#FFC928]"
                  autoComplete="email"
                />
              </div>

              <p className="text-xs text-[#123B69]/60">
                Find your order number in the order confirmation email or SMS.
              </p>

              <Button
                type="submit"
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
                  <>
                    <FiSearch className="h-4 w-4" />
                    Track Order
                  </>
                )}
              </Button>
            </form>

            {/* Error: shown under the form, not in a separate grid column */}
            {error && (
              <div
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
                  <p className="text-sm text-rose-700">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Order result */}
          {order ? (
            <div className="rounded-xl border border-[#EAEDED] bg-white p-6 shadow-sm">
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#0B2545]">
                      Order #{order.orderNumber || "N/A"}
                    </h2>
                    <p className="text-sm text-[#123B69]">
                      Placed {formatDateOnly(order.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor(
                      order.orderStatus
                    )}`}
                  >
                    {statusLabel(order.orderStatus)}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#EAEDED] bg-[#F5F7FA] p-4">
                    <p className="text-xs font-medium uppercase text-[#123B69]">
                      Items
                    </p>
                    <p className="text-lg font-bold text-[#0B2545]">
                      {itemsCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#EAEDED] bg-[#F5F7FA] p-4">
                    <p className="text-xs font-medium uppercase text-[#123B69]">
                      Total
                    </p>
                    <p className="text-lg font-bold text-[#0B2545]">
                      {totalDisplay}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#EAEDED] bg-[#F5F7FA] p-4">
                    <p className="text-xs font-medium uppercase text-[#123B69]">
                      Payment
                    </p>
                    <p className="text-sm font-medium capitalize text-[#172337]">
                      {order.paymentStatus || "Unpaid"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#0B2545]">
                  Order Timeline & Status Updates
                </h3>
                <div className="space-y-4 border-l border-[#EAEDED] pl-4">
                  {timeline.length > 0 ? (
                    timeline.map((evt) => (
                      <div key={evt.key} className="flex items-start gap-3">
                        <div className="mt-1 flex h-2 w-2 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#FFC928] bg-[#FFC928]" />
                        <div className="flex flex-col">
                          <p className="text-sm text-[#172337]">{evt.label}</p>
                          <p className="text-xs text-[#123B69]/60">
                            {formatDateTime(evt.at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#123B69]/60">
                      No status updates available yet.
                    </p>
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
          ) : (
            !error && <div className="hidden lg:block" aria-hidden="true" />
          )}
        </div>
      </section>
    </div>
  );
}