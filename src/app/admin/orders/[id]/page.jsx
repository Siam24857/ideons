"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";
import { ORDER_STATUS, ORDER_STATUS_TRANSITIONS } from "@/lib/constants";

const statusTone = (s) => {
  const map = {
    pending: "brand",
    confirmed: "brand",
    processing: "warning",
    shipped: "info",
    delivered: "success",
    cancelled: "danger",
  };
  return map[s] || "neutral";
};

export default function AdminOrderDetailsPage({ params }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");

  const loadOrder = useCallback(async () => {
    const id = (await params).id;
    setLoading(true);
    try {
      const result = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (result.ok) {
        const data = await result.json();
        setOrder(data.order);
        setNewStatus(data.order.orderStatus);
      } else {
        console.error("Failed to load order", await result.text());
      }
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const updateStatus = async (e) => {
    e.preventDefault();
    if (!order || saving) return;
    const target = newStatus || order.orderStatus;
    if (target === order.orderStatus) return;

    setSaving(true);
    try {
      const result = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.orderNumber)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: target,
            internalNote: internalNote || undefined,
            customerMessage: customerMessage || undefined,
          }),
        }
      );
      if (result.ok) {
        const data = await result.json();
        setOrder(data.order);
        setNewStatus(data.order.orderStatus);
        setInternalNote("");
        setCustomerMessage("");
      } else {
        const err = await result.json();
        alert(err.message || "Failed to update order status.");
      }
    } catch (error) {
      alert("Network error while updating order status.");
    } finally {
      setSaving(false);
    }
  };

  const markAsDelivered = async () => {
    if (!order || saving) return;
    if (!window.confirm("Are you sure this order has been successfully delivered to the customer?")) return;

    setSaving(true);
    try {
      const result = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.orderNumber)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "delivered",
            internalNote: "Order marked as delivered by admin.",
            customerMessage: "Your order has been successfully delivered. Thank you for shopping with IDeons!",
          }),
        }
      );
      if (result.ok) {
        const data = await result.json();
        setOrder(data.order);
        setNewStatus(data.order.orderStatus);
      } else {
        const err = await result.json();
        alert(err.message || "Failed to update order status.");
      }
    } catch (error) {
      alert("Network error while updating order status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-navy-500">Loading order…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="text-navy-300 text-4xl mb-4">📦</div>
          <h2 className="text-lg font-semibold text-navy-900">Order not found</h2>
          <p className="mt-2 text-sm text-navy-500">
            The order you requested does not exist or you do not have access to it.
          </p>
          <LinkButton href="/admin/orders">Back to orders</LinkButton>
        </div>
      </div>
    );
  }

  const allowedNext = ORDER_STATUS_TRANSITIONS[order.orderStatus] || [];
  const customer = order.customer || {};
  const addr = order.shippingAddress || {};

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">
            Order #{order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Complete order details and management.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <LinkButton href="/admin/orders" variant="ghost" className="w-auto">
            Back to orders
          </LinkButton>
        </div>
      </div>

      {/* Status badge + actions */}
      <div className="mb-6 rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="text-xs font-medium text-navy-500 uppercase">Order status</p>
            <Badge tone={statusTone(order.orderStatus)}>
              {order.orderStatus ? order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1) : '-'}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-medium text-navy-500 uppercase">Payment status</p>
            <Badge tone="neutral">
              {order.paymentStatus ? order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1) : '-'}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-medium text-navy-500 uppercase">Payment method</p>
            <span className="text-sm text-navy-900">
              {order.paymentMethod ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1) : '-'}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-navy-500 uppercase">Order date</p>
            <p className="text-sm text-navy-900">
              {new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-navy-500 uppercase">Total</p>
            <p className="text-sm font-bold text-navy-950">
              ৳{Number(order.total || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-navy-500 uppercase">Items</p>
            <p className="text-sm text-navy-900">{order.itemsCount}</p>
          </div>
        </div>
      </div>

      {/* Customer information */}
      <div className="mb-6 rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            Customer information
          </h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Name</p>
              <p className="text-navy-900">{customer.name || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Customer ID</p>
              <p className="text-navy-600 truncate">{customer.userId || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Email</p>
              <p className="text-navy-900 break-all">{customer.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Phone</p>
              <p className="text-navy-900">{customer.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Registered</p>
              <p className="text-navy-900">
                {customer.createdAt
                  ? new Date(customer.createdAt).toLocaleDateString("en-GB")
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="mb-6 rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            Delivery address snapshot
          </h2>
          <p className="mt-1 text-xs text-navy-500">
            Address as captured at order placement - later profile edits do not affect this order.
          </p>
        </div>
        <div className="px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Recipient</p>
              <p className="text-navy-900">{addr.fullName || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Phone</p>
              <p className="text-navy-900">{addr.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Country</p>
              <p className="text-navy-900">{addr.country || "-"}</p>
            </div>
            <div className="col-span-full">
              <p className="text-xs font-medium text-navy-500 uppercase">Division</p>
              <p className="text-navy-900">{addr.division || "-"}</p>
            </div>
            <div className="col-span-full">
              <p className="text-xs font-medium text-navy-500 uppercase">District</p>
              <p className="text-navy-900">{addr.district || "-"}</p>
            </div>
            <div className="col-span-full">
              <p className="text-xs font-medium text-navy-500 uppercase">City / area</p>
              <p className="text-navy-900">{addr.city || "-"}</p>
            </div>
            <div className="col-span-full">
              <p className="text-xs font-medium text-navy-500 uppercase">Street address</p>
              <p className="text-navy-900 whitespace-pre-line">{addr.streetAddress || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">House / apartment</p>
              <p className="text-navy-900">{addr.houseInfo || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Postal code</p>
              <p className="text-navy-900">{addr.postalCode || "-"}</p>
            </div>
            <div className="col-span-full">
              <p className="text-xs font-medium text-navy-500 uppercase">Delivery instructions</p>
              <p className="text-navy-900">{addr.deliveryInstructions || "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="mb-6 rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            Items ({order.itemsCount})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left divide-y divide-navy-100">
            <thead>
              <tr className="bg-navy-50">
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Product</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">SKU</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Qty</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Unit price</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Line total</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Variant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {(order.items || []).map((item) => (
                <tr key={item.productId} className="hover:bg-navy-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-12 w-12 rounded-lg object-cover border border-navy-100"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-navy-50 flex items-center justify-center text-navy-300">
                          📦
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-navy-950">{item.title}</p>
                        <p className="text-xs text-navy-600">Product ID: {item.productId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-600 text-right">
                    {item.sku || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-navy-900 text-right">
                    ৳{Number(item.unitPrice || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-navy-900 text-right">
                    ৳{Number(item.lineTotal || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-600">
                    {item.variant ? `${item.variant.name}: ${item.variant.value}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial details */}
      <div className="mb-6 rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            Financial details
          </h2>
        </div>
        <div className="px-6 py-4">
          <table className="w-full text-left divide-y divide-navy-100 text-sm">
            <tbody>
              <tr>
                <td className="py-3 text-navy-600">Subtotal</td>
                <td className="py-3 text-navy-900 text-right">
                  ৳{Number(order.subtotal || 0).toLocaleString()}
                </td>
              </tr>
              {order.discount && order.discount > 0 ? (
                <tr>
                  <td className="py-3 text-emerald-600">Discount</td>
                  <td className="py-3 text-emerald-600 text-right">
                    −৳{Number(order.discount).toLocaleString()}
                  </td>
                </tr>
              ) : null}
              <tr>
                <td className="py-3 text-navy-600">Delivery charge</td>
                <td className="py-3 text-navy-900 text-right">
                  ৳{Number(order.deliveryCharge || 0).toLocaleString()}
                </td>
              </tr>
              <tr className="font-bold border-t border-navy-200 pt-4">
                <td className="py-3 text-navy-950">Order total</td>
                <td className="py-3 text-navy-950 font-bold text-right">
                  ৳{Number(order.total || 0).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="py-3 text-navy-600">Payment reference</td>
                <td className="py-3 text-navy-600 text-right">
                  {order.paymentReference || "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Status management */}
      <div className="rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            Order management
          </h2>
        </div>
        <div className="px-6 py-6">
          <form onSubmit={updateStatus} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-navy-600 mb-1">
                  New status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value={order.orderStatus}>
                    Keep {order.orderStatus ? order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1) : '-'}
                  </option>
                  {allowedNext.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-full sm:col-span-2">
                <label className="block text-xs font-medium text-navy-600 mb-1">
                  Internal admin note (optional)
                </label>
                <textarea
                  name="internalNote"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Confirmed payment received via bKash"
                  disabled={saving}
                  className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="col-span-full sm:col-span-2">
                <label className="block text-xs font-medium text-navy-600 mb-1">
                  Customer-visible message (optional)
                </label>
                <textarea
                  name="customerMessage"
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  rows={2}
                  placeholder="e.g. Your order has been confirmed and will ship soon"
                  disabled={saving}
                  className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="col-span-full flex gap-3">
                <Button type="submit" variant="brand" loading={saving} disabled={saving || allowedNext.length === 0}>
                  Update status
                </Button>
                <Button
                  variant="brand"
                  onClick={markAsDelivered}
                  loading={saving}
                  disabled={saving || order.orderStatus === "delivered"}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark as Delivered
                </Button>
                {allowedNext.length === 0 && (
                  <span className="mt-2 text-xs text-navy-500">
                    No further transitions available for this status.
                  </span>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Order timeline */}
      {(order.history || []).length > 0 && (
        <div className="mt-6 rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-100">
            <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
              Order status timeline
            </h2>
          </div>
          <div className="divide-y divide-navy-100">
            {(order.history || []).map((entry, idx) => (
              <div key={idx} className="px-6 py-4 relative pl-4">
                <div className="flex items-start gap-3">
                  <div className="relative mt-1">
                    <span
                      className="absolute -left-[10px] top-0.5 block w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white"
                    />
                    <span
                      className="absolute -left-[9px] top-2.5 h-[1px] w-[20px] bg-navy-100"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy-900">
                      {entry.note || entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </p>
                    {entry.customerMessage && (
                      <p className="mt-1 text-xs text-blue-600">{entry.customerMessage}</p>
                    )}
                    <p className="text-xs text-navy-400">
                      {new Date(entry.at).toLocaleString("en-GB")} — {entry.byName || "System"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <LinkButton href="/admin/orders">Back to orders</LinkButton>
      </div>
    </div>
  );
}
