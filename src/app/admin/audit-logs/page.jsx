"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(actionFilter ? { action: actionFilter } : {}),
      });
      const result = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (result.ok) {
        const data = await result.json();
        setLogs(data.items || []);
        setTotal(data.total || 0);
      } else {
        console.error("Failed to load audit logs", await result.text());
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, limit, search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Audit Logs</h1>
          <p className="mt-1 text-sm text-navy-500">
            View authorized administrative actions.
          </p>
        </div>
        <LinkButton href="/admin" variant="ghost" className="w-auto">
          Back to dashboard
        </LinkButton>
      </div>

      <div className="mb-6 rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <form onChange={(e) => {
          const formData = new FormData(e.currentTarget);
          const searchVal = formData.get("search") || "";
          const actionVal = formData.get("action") || "";
          router.push(`/admin/audit-logs?${new URLSearchParams({
            page: "1",
            limit: String(limit),
            ...(searchVal ? { search: searchVal } : {}),
            ...(actionVal ? { action: actionVal } : {}),
          }).toString()}`);
        }} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-full sm:col-span-2">
            <label className="block text-xs font-medium text-navy-600 mb-1">
              Search by action, admin, or target
            </label>
            <input
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit logs…"
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All actions</option>
              <option value="order.status.update">Order Status Update</option>
              <option value="user.ban">User Banned</option>
              <option value="user.unban">User Unbanned</option>
              <option value="user.delete">User Deleted</option>
              <option value="product.create">Product Created</option>
              <option value="product.update">Product Updated</option>
              <option value="product.delete">Product Deleted</option>
            </select>
          </div>
        </form>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-navy-600">
          Showing {logs.length} of {total} audit log entr{total === 1 ? "y" : "ies"}
        </p>
      </div>

      <div className="rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
            <p className="text-sm text-navy-500">Loading audit logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-navy-500">No audit log entries found.</p>
          </div>
        ) : (
          <table className="w-full text-left divide-y divide-navy-100">
            <thead>
              <tr className="bg-navy-50">
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Action</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Admin</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Target</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-navy-50">
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-navy-900 truncate">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-600 truncate max-w-[150px]">
                    {log.adminEmail || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-600 truncate max-w-[150px]">
                    {log.targetType || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-500 text-right">
                    {new Date(log.createdAt || log.created_at).toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
