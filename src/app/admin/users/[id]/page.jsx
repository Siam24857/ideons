"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";

export default function AdminUserDetailsPage({ params }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadUser = useCallback(async () => {
    const id = (await params).id;
    setLoading(true);
    try {
      const result = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (result.ok) {
        const data = await result.json();
        setUser(data.user);
        setOrders(data.recentOrders || []);
      } else {
        console.error("Failed to load user", await result.text());
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const banUser = async () => {
    if (!user || saving) return;
    if (!window.confirm(`Are you sure you want to ban user "${user.name}"?`)) return;
    setSaving(true);
    try {
      const result = await fetch(`/api/admin/users/${encodeURIComponent(user._id)}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "banned", reason: "Banned by administrator" }),
      });
      if (result.ok) {
        const data = await result.json();
        setUser({ ...user, ...data.user });
      } else {
        const err = await result.json();
        alert(err.message || "Failed to ban user.");
      }
    } catch (error) {
      alert("Network error while banning user.");
    } finally {
      setSaving(false);
    }
  };

  const unbanUser = async () => {
    if (!user || saving) return;
    if (!window.confirm(`Are you sure you want to unban user "${user.name}"?`)) return;
    setSaving(true);
    try {
      const result = await fetch(`/api/admin/users/${encodeURIComponent(user._id)}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active", reason: "Unbanned by administrator" }),
      });
      if (result.ok) {
        const data = await result.json();
        setUser({ ...user, ...data.user });
      } else {
        const err = await result.json();
        alert(err.message || "Failed to unban user.");
      }
    } catch (error) {
      alert("Network error while unbanning user.");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!user || saving) return;
    if (!window.confirm(`Are you sure you want to delete user "${user.name}"?\nThis action cannot be undone.`)) return;
    setSaving(true);
    try {
      const result = await fetch(`/api/admin/users/${encodeURIComponent(user._id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (result.ok) {
        router.push("/admin/users");
      } else {
        const err = await result.json();
        alert(err.message || "Failed to delete user.");
      }
    } catch (error) {
      alert("Network error while deleting user.");
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-navy-500">Loading customer details…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="text-navy-300 text-4xl mb-4">👤</div>
          <h2 className="text-lg font-semibold text-navy-900">Customer not found</h2>
          <p className="mt-2 text-sm text-navy-500">
            The customer you requested does not exist.
          </p>
          <LinkButton href="/admin/users">Back to customers</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Customer Details</h1>
          <p className="mt-1 text-sm text-navy-500">
            Manage customer account.
          </p>
        </div>
        <LinkButton href="/admin/users" variant="ghost" className="w-auto">
          Back to customers
        </LinkButton>
      </div>

      {/* Customer profile */}
      <div className="mb-6 rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            Account Information
          </h2>
        </div>
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-100 text-[24px] font-bold text-navy-900">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-navy-950">{user.name || "Customer"}</p>
                <p className="text-sm text-navy-600 break-all">{user.email || "-"}</p>
                <p className="text-xs text-[#FFC928]">{user.banned ? "BANNED" : user.role === "admin" ? "ADMIN" : "CUSTOMER"}</p>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex gap-2">
                {user.banned ? (
                  <Button variant="danger" onClick={unbanUser} loading={saving} disabled={saving}>
                    Unban User
                  </Button>
                ) : (
                  <Button variant="danger" onClick={banUser} loading={saving} disabled={saving}>
                    Ban User
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={deleteUser}
                  loading={saving}
                  disabled={saving}
                  className="text-rose-600 hover:bg-rose-50"
                >
                  Delete User
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Customer ID</p>
              <p className="text-navy-600 truncate">{user._id}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Email</p>
              <p className="text-navy-900 break-all">{user.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Phone</p>
              <p className="text-navy-900">{user.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Registration Date</p>
              <p className="text-navy-900">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB") : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Total Orders</p>
          <p className="mt-1 text-2xl font-bold text-navy-950">{user.totalOrders}</p>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Total Spent</p>
          <p className="mt-1 text-2xl font-bold text-navy-950">
            ৳{Number(user.totalSpent || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Orders by Status</p>
          <div className="mt-2">
            {Object.entries(user.ordersByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm text-navy-600">
                <span>{status.charAt(0).toUpperCase() + status.slice(1)}:</span>
                <span className="font-medium text-[#172337]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            Recent Orders
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left divide-y divide-navy-100">
            <thead>
              <tr className="bg-navy-50">
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Order</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Total</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {(orders || []).map((o) => (
                <tr key={o.orderNumber} className="hover:bg-navy-50">
                  <td className="px-6 py-4">
                    <Link href={`/admin/orders/${o.orderNumber}`} className="text-sm font-medium text-navy-950 hover:text-blue-600">
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={statusTone(o.orderStatus)}>
                      {o.orderStatus.charAt(0).toUpperCase() + o.orderStatus.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-900 text-right">
                    ৳{Number(o.total || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-500 text-right">
                    {new Date(o.createdAt).toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <LinkButton href="/admin/users">Back to customers</LinkButton>
      </div>
    </div>
  );
}
