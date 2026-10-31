import { getSession } from "@/lib/session";
import { collections } from "@/lib/db";
import { ORDER_STATUS } from "@/lib/constants";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { getCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const session = await getSession();
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <LinkButton href="/signin" variant="primary">
          Sign in to view your account
        </LinkButton>
      </div>
    );
  }

  const user = session.user;
  const [orderCounts, recentOrders, cart] = await Promise.all([
    getOrderCounts(user.id),
    getRecentOrders(user.id),
    getCart(user.id).catch(() => ({ items: [], subtotal: 0, itemsCount: 0 })),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Account Overview</h1>
          <p className="mt-1 text-sm text-navy-500">
            Manage your orders, addresses and settings.
          </p>
        </div>
      </div>

      {/* Welcome card */}
      <div className="mb-8 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-950 text-[14px] font-bold text-blue-400">
            {(user.name || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-950">{user.name}</h2>
            <p className="text-sm text-navy-500">{user.email}</p>
            {user.phone && (
              <p className="mt-1 text-sm text-navy-500">{user.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Overview cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Total Orders"
          value={orderCounts.total}
          icon="orders"
          description="All your orders"
          href="/account/orders"
        />
        <OverviewCard
          title="Cart Items"
          value={cart.itemsCount}
          icon="cart"
          description="Items in your cart"
          href="/cart"
        />
        <OverviewCard
          title="Pending"
          value={orderCounts.pending || 0}
          icon="pending"
          description="Orders awaiting confirmation"
          href="/account/orders?status=pending"
        />
        <OverviewCard
          title="Lifetime Spent"
          value={orderCounts.totalSpent ? formatMoney(orderCounts.totalSpent) : "৳0"}
          icon="spent"
          description="Completed orders"
        />
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-navy-100 bg-white shadow-sm">
        <div className="border-b border-navy-100 px-6 py-4">
          <h2 className="text-lg font-bold text-navy-950">Recent Orders</h2>
        </div>
        <div className="divide-y divide-navy-100">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <div key={order._id} className="px-6 py-4 flex items-center justify-between sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/account/orders/${order.orderNumber || order._id}`}
                    className="text-sm font-semibold text-navy-950 hover:text-blue-600"
                  >
                    #{order.orderNumber}
                  </Link>
                  <p className="mt-1 text-xs text-navy-500">
                    {order.itemsCount} item{order.itemsCount === 1 ? "" : "s"} ·{" "}
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                  </p>
                </div>
                <div className="ml-4 flex items-end gap-2 sm:ml-0 sm:justify-end">
                  <span className="text-sm font-medium text-navy-900">
                    {formatMoney(order.total)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone(order.orderStatus)}`}
                  >
                    {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-navy-500">No orders yet.</p>
              <LinkButton href="/products" variant="brand" className="mt-4">
                Start shopping
              </LinkButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ title, value, icon, description, href }) {
  const iconMap = {
    orders: "📦",
    cart: "🛒",
    pending: "⏳",
    spent: "💰",
  };

  const body = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-navy-500">{title}</p>
        <h2 className="mt-1 text-2xl font-bold text-navy-950">{value}</h2>
        <p className="mt-2 text-xs text-navy-400">{description}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-900">
        {iconMap[icon] || "📦"}
      </div>
    </div>
  );

  return (
    <>
      {href ? (
        <Link
          href={href}
          className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm hover:border-blue-300 transition"
        >
          {body}
        </Link>
      ) : (
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm hover:border-blue-300 transition cursor-default">
          {body}
        </div>
      )}
    </>
  );
}

function statusTone(status) {
  const map = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    confirmed: "bg-indigo-100 text-indigo-700 border-indigo-200",
    processing: "bg-amber-100 text-amber-800 border-amber-200",
    shipped: "bg-blue-100 text-blue-700 border-blue-200",
    delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return map[status] || "bg-gray-100 text-gray-700 border-gray-200";
}

async function getOrderCounts(userId) {
  const { orders } = await collections();
  const [totalResult, statusAgg, revenueAgg] = await Promise.all([
    orders.countDocuments({ userId: String(userId) }),
    orders
      .aggregate([
        { $match: { userId: String(userId) } },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ])
      .toArray(),
    orders
      .aggregate([
        { $match: { userId: String(userId), paymentStatus: "paid", orderStatus: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ])
      .toArray(),
  ]);

  const counts = { total: totalResult };
  ORDER_STATUS_LIST.forEach((s) => (counts[s] = 0));
  for (const row of statusAgg) counts[row._id] = row.count;

  return {
    ...counts,
    totalSpent: revenueAgg[0]?.total || 0,
  };
}

async function getRecentOrders(userId) {
  const { orders } = await collections();
  return orders
    .find({ userId: String(userId) })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
}

const ORDER_STATUS_LIST = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
];

