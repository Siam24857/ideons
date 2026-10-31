"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        ...(roleFilter && { role: roleFilter }),
      });
      const result = await fetch(`/api/admin/users?${params}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (result.ok) {
        const data = await result.json();
        setUsers(data.items || []);
        setTotal(data.total || 0);
      } else {
        console.error("Failed to load users", await result.text());
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const roleTone = (r) => (r === "admin" ? "danger" : "neutral");
  const statusColor = (banned) => (banned ? "text-rose-600" : "text-emerald-600");
  const statusText = (banned) => (banned ? "Banned" : "Active");

  const banUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to ban user "${userName}"?`)) return;
    setSaving(true);
    try {
      const result = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "banned", reason: "Banned by administrator" }),
      });
      if (result.ok) {
        fetchUsers();
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

  const unbanUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to unban user "${userName}"?`)) return;
    setSaving(true);
    try {
      const result = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active", reason: "Unbanned by administrator" }),
      });
      if (result.ok) {
        fetchUsers();
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

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"?\nThis action cannot be undone.`)) return;
    setSaving(true);
    try {
      const result = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (result.ok) {
        fetchUsers();
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Customers</h1>
          <p className="mt-1 text-sm text-navy-500">
            Search and manage customer accounts.
          </p>
        </div>
        <LinkButton href="/admin" variant="ghost" className="w-auto">
          Back to dashboard
        </LinkButton>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <form onChange={(e) => fetchUsers()} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-full sm:col-span-2">
            <label className="block text-xs font-medium text-navy-600 mb-1">
              Search by ID, name, email, or phone
            </label>
            <input
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Customer ID, name, email, phone…"
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All roles</option>
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </form>
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-navy-600">
          Showing {users.length} of {total} customer{total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
            <p className="text-sm text-navy-500">Loading customers…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-navy-500">No customers found.</p>
          </div>
        ) : (
          <table className="w-full text-left divide-y divide-navy-100">
            <thead>
              <tr className="bg-navy-50">
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Email</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Role</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Orders</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Spent</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Member since</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-navy-50">
                  <td className="px-6 py-4 text-sm text-ink-600">{u._id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-navy-900">
                    {u.name || "Customer"}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-600 truncate max-w-[180px]">
                    {u.email || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-600">{u.phone || "-"}</td>
                  <td className="px-6 py-4">
                    <Badge tone={u.role === "admin" ? "danger" : "neutral"}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-900 text-right">
                    {u.totalOrders}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-900 text-right">
                    ৳{Number(u.totalSpent || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-500 text-right">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-GB") : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.banned ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    }`}>
                      {u.banned ? "Banned" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-2">
                      <LinkButton
                        href={`/admin/users/${u._id}`}
                        size="sm"
                        variant="ghost"
                      >
                        View details
                      </LinkButton>
                      {u.role === "admin" ? (
                        <span className="text-xs text-navy-400">Admin</span>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => (u.banned ? unbanUser(u._id, u.name) : banUser(u._id, u.name))}
                            disabled={saving}
                          >
                            {u.banned ? "Unban" : "Ban"}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteUser(u._id, u.name)}
                            loading={saving}
                            disabled={saving}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
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
