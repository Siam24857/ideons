import { getSession } from "@/lib/session";
import { collections } from "@/lib/db";
import { ORDER_STATUS_LIST } from "@/lib/constants";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { FiPackage } from "react-icons/fi";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage({ searchParams }) {
  const session = await getSession();
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <LinkButton href="/signin" variant="primary">
          Sign in to view your orders
        </LinkButton>
      </div>
    );
  }

  const user = session.user;
  const page = Number.parseInt(String(searchParams?.page ?? "1"), 10) || 1;
  const limit = 10;
  const status = searchParams?.status || "";

  const { orders, collections: db } = await import("@/lib/db");
  const { orders: ordersCol } = await collections();

  const query = { userId: String(user.id) };
  if (status && ORDER_STATUS_LIST.includes(status)) {
    query.orderStatus = status;
  }

  const [items, total, statusCounts] = await Promise.all([
    ordersCol
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    ordersCol.countDocuments(query),
    ordersCol
      .aggregate([
        { $match: { userId: String(user.id) } },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const counts = Object.fromEntries(ORDER_STATUS_LIST.map((s) => [s, 0]));
  for (const row of statusCounts) counts[row._id] = row.count;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Order History</h1>
          <p className="mt-1 text-sm text-navy-500">
            Track your orders and view past purchases.
          </p>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/account/orders"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!status ? "bg-blue-50 text-blue-600 border border-blue-200" : "border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"}`}
        >
          All ({total})
        </Link>
        {ORDER_STATUS_LIST.map((s) => (
          <Link
            key={s}
            href={`/account/orders?status=${s}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${status === s ? "bg-blue-50 text-blue-600 border border-blue-200" : "border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] || 0})
          </Link>
        ))}
      </div>

      {items.length > 0 ? (
        <>
          <div className="rounded-xl border border-navy-100 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left border-b border-navy-100">
              <thead>
                <tr className="bg-navy-50">
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-navy-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {items.map((order) => (
                  <tr key={order._id} className="hover:bg-navy-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/account/orders/${order.orderNumber || order._id}`}
                        className="text-sm font-medium text-navy-950 hover:text-blue-600"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-navy-500">
                      {formatDate(order.createdAt, { withTime: false })}
                    </td>
                    <td className="px-6 py-4 text-sm text-navy-500">{order.itemsCount}</td>
                    <td className="px-6 py-4 text-sm font-medium text-navy-900">
                      {formatMoney(order.total, order.currencySymbol)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={order.orderStatus} />
                    </td>
                    <td className="px-6 py-4 text-sm text-navy-500">
                      {order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <LinkButton
                        href={`/account/orders/${order.orderNumber || order._id}`}
                        variant="ghost"
                        size="sm"
                      >
                        View
                      </LinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} total={total} className="mt-6" />
        </>
      ) : (
        <EmptyState
          icon={<FiPackage className="h-10 w-10 text-navy-300" />}
          title="No orders found"
          description={status ? "No orders match this status." : "You haven't placed any orders yet."}
          actionLabel="Start shopping"
          actionHref="/products"
        />
      )}
    </div>
  );
}

