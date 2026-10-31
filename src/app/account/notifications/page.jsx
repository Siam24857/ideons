"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";

export default function AccountNotificationsPage() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const result = await fetch("/api/notifications", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (result.ok) {
        const data = await result.json();
        setItems(data.items || []);
        setUnread(data.unread || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (ids) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    loadNotifications();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    loadNotifications();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-navy-500">Loading notifications…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Notifications</h1>
          <p className="mt-1 text-sm text-navy-500">
            Order updates and account alerts.
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={items.length === 0}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-navy-100 bg-white p-12 text-center shadow-sm">
          <div className="text-navy-300 text-3xl mb-3">🔔</div>
          <h2 className="text-lg font-semibold text-navy-900">No notifications</h2>
          <p className="mt-2 text-sm text-navy-500">
            You'll see order confirmations and status updates here.
          </p>
          <LinkButton href="/account">Back to account</LinkButton>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-navy-500">
            {unread > 0 ? (
              <>
                <span className="font-medium text-navy-900">{unread}</span> {" "}
                unread notification{unread === 1 ? "" : "s"}
              </>
            ) : (
              "All notifications read"
            )}
          </div>
          <div className="rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left divide-y divide-navy-100">
              <thead>
                <tr className="bg-navy-50">
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Notification</th>
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {items.map((n) => (
                  <tr
                    key={n._id}
                    className={`hover:bg-navy-50 transition ${
                      !n.readAt ? "bg-navy-25" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <span className={`inline-flex h-2 w-2 rounded-full ${
                            n.readAt ? "bg-navy-300" : "bg-blue-500"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-900">
                            {n.title || "Notification"}
                          </p>
                          {n.body && (
                            <p className="mt-1 text-sm text-navy-600 line-clamp-2">
                              {n.body}
                            </p>
                          )}
                          {n.orderNumber && (
                            <Link
                              href={`/account/orders/${n.orderNumber}`}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View order #{n.orderNumber}
                            </Link>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-navy-600">
                      {n.orderNumber || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-navy-500">
                      {formatDate(new Date(n.createdAt))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge tone={n.readAt ? "neutral" : "brand"}>
                        {n.readAt ? "Read" : "Unread"}
                      </Badge>
                      {!n.readAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 p-1"
                          onClick={() => markRead([n._id])}
                        >
                          Read
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-8 flex justify-end">
        <LinkButton href="/account">Back to account</LinkButton>
      </div>
    </div>
  );
}

