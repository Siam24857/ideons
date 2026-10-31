"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";
import { ORDER_STATUS_LIST, PAYMENT_METHOD_LIST, PAYMENT_STATUS_LIST } from "@/lib/constants";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        ...(statusFilter && { status: statusFilter }),
        ...(paymentMethodFilter && { paymentMethod: paymentMethodFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
      });
      const result = await fetch(`/api/admin/orders?${params}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (result.ok) {
        const data = await result.json();
        setOrders(data.items || []);
        setTotal(data.total || 0);
      } else {
        console.error("Failed to load orders", await result.text());
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, paymentMethodFilter, paymentStatusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">All Orders</h1>
          <p className="mt-1 text-sm text-navy-500">
            Manage every store order — search, filter, and update status.
          </p>
        </div>
        <LinkButton href="/admin" variant="ghost" className="w-auto">
          Back to dashboard
        </LinkButton>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <form onChange={(e) => fetchOrders()} className="grid gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-full sm:col-span-2">
            <label className="block text-xs font-medium text-navy-600 mb-1">Search order / customer</label>
            <input
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order number, customer name, email, phone…"
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Order status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All statuses</option>
              {ORDER_STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Payment method</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All methods</option>
              {PAYMENT_METHOD_LIST.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Payment status</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All payment statuses</option>
              {PAYMENT_STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-navy-600">
          Showing {orders.length} of {total} order{total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Orders table */}
      <div className="rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
            <p className="text-sm text-navy-500">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-navy-500">No orders found.</p>
          </div>
        ) : (
          <table className="w-full text-left divide-y divide-navy-100">
            <thead>
              <tr className="bg-navy-50">
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Order</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Email</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Total</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {orders.map((o) => (
                <tr key={o.orderNumber} className="hover:bg-navy-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${o.orderNumber}`}
                      className="text-sm font-medium text-navy-950 hover:text-blue-600"
                    >
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-900">
                    {o.customerName || "Customer"}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-600 truncate max-w-[150px]">
                    {o.customerEmail || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-navy-900 text-right">
                    ৳{Number(o.total || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={statusTone(o.orderStatus)}>
                      {o.orderStatus.charAt(0).toUpperCase() + o.orderStatus.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-600">
                    {o.paymentMethod.charAt(0).toUpperCase() + o.paymentMethod.slice(1)}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-500 text-right">
                    {new Date(o.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/orders/${o.orderNumber}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-navy-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

