"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";
import { FiHome, FiPackage, FiUser, FiSettings, FiDollarSign, FiTrash2, FiAlertCircle } from "react-icons/fi";

const Stat = ({ label, value, icon: Icon, tone = "neutral" }) => (
  <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-2xl font-bold text-navy-950">{value}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-900">
        <Icon size={16} />
      </div>
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/dashboard", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      fetch("/api/admin/orders?limit=5", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
    ])
      .then(([s, o]) => Promise.all([s.json(), o.json()]))
      .then(([sd, od]) => {
        setStats(sd.settings || {});
        setRecentOrders((od.items || []).map((o) => ({
          orderNumber: o.orderNumber,
          customerName: o.customer?.name || "Customer",
          total: o.total,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          createdAt: o.createdAt,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-navy-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const s = stats || {};
  const paidRevenue = s.paidRevenue != null ? s.paidRevenue : 0;
  const codCollectible = s.codCollectible != null ? s.codCollectible : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-navy-500">
            Store overview — real data from MongoDB.
          </p>
        </div>
        <LinkButton href="/admin/orders" variant="brand" className="w-auto">
          Manage Orders
        </LinkButton>
      </div>

      {/* Overview metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Total customers</p>
          <p className="mt-1 text-2xl font-bold text-navy-950">{s.totalCustomers ?? 0}</p>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Total orders</p>
          <p className="mt-1 text-2xl font-bold text-navy-950">{s.totalOrders ?? 0}</p>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Pending orders</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{s.pending ?? 0}</p>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Delivered orders</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{s.delivered ?? 0}</p>
        </div>
      </div>

      {/* Revenue */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Paid revenue (online)"
          value={`৳${Number(paidRevenue || 0).toLocaleString()}`}
          icon={FiDollarSign}
        />
        <Stat
          label="COD collectible"
          value={`৳${Number(codCollectible || 0).toLocaleString()}`}
          icon={FiPackage}
        />
        <Stat
          label="Cancelled orders"
          value={s.cancelled ?? 0}
          icon={FiAlertCircle}
        />
        <Stat
          label="Low-stock products"
          value={s.lowStock ?? 0}
          icon={FiAlertCircle}
          tone="warning"
        />
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-navy-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            Recent orders
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left divide-y divide-navy-100">
            <thead>
              <tr className="bg-navy-50">
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Order</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Total</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {recentOrders.length > 0 ? (
                recentOrders.map((o) => (
                  <tr key={o.orderNumber} className="hover:bg-navy-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/orders/${o.orderNumber}`}
                        className="text-sm font-medium text-navy-950 hover:text-blue-600"
                      >
                        #{o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-navy-900">{o.customerName}</td>
                    <td className="px-6 py-4 text-sm font-medium text-navy-900">
                      ৳{Number(o.total || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        tone={
                          o.orderStatus === "delivered"
                            ? "success"
                            : o.orderStatus === "cancelled"
                              ? "danger"
                              : o.orderStatus === "shipped"
                                ? "info"
                                : o.orderStatus === "processing"
                                  ? "warning"
                                  : "brand"
                        }
                      >
                        {o.orderStatus.charAt(0).toUpperCase() + o.orderStatus.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-navy-600">
                      {o.paymentStatus.charAt(0).toUpperCase() + o.paymentStatus.slice(1)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/orders/${o.orderNumber}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-navy-500">
                    No recent orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <LinkButton href="/admin/orders" variant="brand">All Orders</LinkButton>
        <LinkButton href="/admin/users" variant="ghost">Customers</LinkButton>
        <LinkButton href="/admin/products" variant="ghost">Products</LinkButton>
        <LinkButton href="/admin/settings" variant="ghost">Settings</LinkButton>
      </div>
    </div>
  );
}

