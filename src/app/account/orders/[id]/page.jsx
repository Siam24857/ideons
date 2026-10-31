import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getOwnOrder, getAnyOrder } from "@/lib/orders";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { formatDate, orderStatusTone, orderStatusLabel } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { ORDER_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OrderDetailsPage({ params }) {
  const { id } = await params;

  const session = await getSession();
  const user = session?.user ?? null;
  if (!user) {
    return notFound();
  }

  const isAdmin = user.role === "admin";
  const order = isAdmin
    ? await getAnyOrder(id)
    : await getOwnOrder(id, String(user.id));

  if (!order) {
    return notFound();
  }

  const isCancellable = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING].includes(
    order.orderStatus
  );

  return (
    <div className="min-h-screen bg-navy-50 py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center gap-2">
          <Link
            href="/account/orders"
            className="text-sm text-navy-600 hover:text-blue-600"
          >
            Order History
          </Link>
          <span className="text-xs text-navy-400">/</span>
          <h1 className="text-sm font-medium text-navy-950">Order #{order.orderNumber}</h1>
        </nav>

        <div className="rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-navy-100 flex flex-wrap justify-between items-center gap-3 md:flex-nowrap">
            <div>
              <p className="text-xs text-navy-500 uppercase tracking-wider">Order status</p>
              <Badge tone={orderStatusTone(order.orderStatus)}>
                {orderStatusLabel(order.orderStatus)}
              </Badge>
            </div>
            <div className="flex gap-2 text-right">
              <div>
                <p className="text-xs text-navy-500">Total</p>
                <p className="font-bold text-navy-950">
                  {formatMoney(order.total, order.currencySymbol)}
                </p>
              </div>
                  <div>
                    <p className="text-xs text-navy-500">Payment</p>
                    <p className="text-sm font-medium text-navy-900">
                      {order.paymentMethod ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-500">Payment status</p>
                    <p className={`text-sm font-medium ${
                      order.paymentStatus === "paid" ? "text-emerald-600" : "text-navy-600"
                    }`}>
                      {order.paymentStatus ? order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1) : '-'}
                    </p>
                  </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 py-6">
            {/* Items */}
            <div className="lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-navy-950 uppercase tracking-wider">
                Items ({order.itemsCount})
              </h2>
              <div className="divide-y divide-navy-100">
                {(order.items || []).map((item) => (
                  <div key={item.productId} className="py-4 flex gap-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-16 w-16 shrnavy-0 rounded-lg object-cover border border-navy-100"
                      />
                    ) : (
                      <div className="h-16 w-16 shrnavy-0 rounded-lg bg-navy-50 flex items-center justify-center text-navy-300 text-2xl">
                        📦
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-950 truncate">{item.title}</p>
                      {item.sku && (
                        <p className="text-xs text-navy-400">SKU: {item.sku}</p>
                      )}
                      {item.variant && (
                        <p className="text-xs text-navy-400">
                          {item.variant.name}: {item.variant.value}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-navy-600">
                        {formatMoney(item.unitPrice, order.currencySymbol)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-navy-900 text-right">
                      {formatMoney(item.lineTotal, order.currencySymbol)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-navy-100 bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold text-navy-950 uppercase tracking-wider">
                  Order summary
                </h2>
                <table className="w-full text-left text-sm divide-y divide-navy-100">
                  <tbody>
                    <tr>
                      <td className="py-2 text-navy-600">Subtotal</td>
                      <td className="py-2 text-navy-900 text-right">
                        {formatMoney(order.subtotal, order.currencySymbol)}
                      </td>
                    </tr>
                    {order.discount && order.discount > 0 ? (
                      <tr>
                        <td className="py-2 text-navy-600">Discount</td>
                        <td className="py-2 text-emerald-600 text-right">
                          −{formatMoney(order.discount, order.currencySymbol)}
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <td className="py-2 text-navy-600">Delivery charge</td>
                      <td className="py-2 text-navy-900 text-right">
                        {formatMoney(order.deliveryCharge, order.currencySymbol)}
                      </td>
                    </tr>
                    <tr className="font-bold border-t border-navy-200 pt-4">
                      <td className="py-2 text-navy-950">Total</td>
                      <td className="py-2 text-navy-950 text-right">
                        {formatMoney(order.total, order.currencySymbol)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Shipping address */}
              {order.shippingAddress && (
                <div className="mt-6 rounded-xl border border-navy-100 bg-white p-5">
                  <h2 className="mb-3 text-sm font-semibold text-navy-950 uppercase tracking-wider">
                    Delivery address
                  </h2>
                  <div className="text-sm text-navy-600 space-y-1">
                    <p className="font-medium text-navy-900">
                      {order.shippingAddress.fullName}
                    </p>
                    <p>{order.shippingAddress.streetAddress}</p>
                    {order.shippingAddress.houseInfo && (
                      <p>{order.shippingAddress.houseInfo}</p>
                    )}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.district},
                      {order.shippingAddress.division}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    <p>{order.shippingAddress.postalCode}</p>
                    <p>{order.shippingAddress.phone}</p>
                  </div>
                </div>
              )}

              {/* Order placed date */}
              <div className="mt-6 text-xs text-navy-500">
                <p>Placed on {formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order timeline / history */}
        {(order.history || []).length > 0 && (
          <div className="mt-8 rounded-xl border border-navy-100 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-navy-100">
              <h2 className="text-sm font-semibold text-navy-950 uppercase tracking-wider">
                Order timeline
              </h2>
            </div>
            <div className="divide-y divide-navy-100">
              {(order.history || []).map((entry, idx) => (
                <div key={idx} className="px-6 py-4 relative pl-4">
                  <div className="flex items-start gap-3">
                    <div className="relative mt-1">
                      <span className="absolute -left-[10px] top-0.5 block w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
                      <span
                        className="absolute -left-[9px] top-2.5 h-[1px] w-[20px] bg-navy-100"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy-900">
                        {entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : '-'}
                      </p>
                      {entry.customerMessage && (
                        <p className="mt-1 text-xs text-emerald-600">
                          {entry.customerMessage}
                        </p>
                      )}
                      <p className="text-xs text-navy-400">
                        {formatDate(new Date(entry.at))} — {entry.byName || "System"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <LinkButton href="/account/orders">Back to orders</LinkButton>
        </div>
      </div>
    </div>
  );
}

