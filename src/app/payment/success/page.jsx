"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FiAlertCircle, FiCheckCircle, FiClock, FiRefreshCw, FiXCircle } from "react-icons/fi";
import { api, errorMessage } from "@/lib/api-client";
import { useStore } from "@/components/providers/StoreProvider";
import { formatMoney } from "@/lib/money";
import { formatDate, paymentMethodLabel } from "@/lib/format";
import { LinkButton, Spinner } from "@/components/ui/Buttons";
import { PaymentBadge, StatusBadge } from "@/components/ui/Badge";

function PaymentSuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const transactionHint = params.get("txn") || "";
  const { user, authLoading } = useStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const autoTried = useRef(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return null;
    const result = await api.get(
      `/api/payments/jonota/status?orderId=${encodeURIComponent(orderId)}`
    );
    if (!result.ok) {
      setError(errorMessage(result));
      return null;
    }
    setOrder(result.data.order);
    setError("");
    return result.data.order;
  }, [orderId]);

  const verifyPayment = useCallback(
    async (transactionId) => {
      if (!orderId || !transactionId) return null;
      setVerifying(true);
      const result = await api.post("/api/payments/jonota/verify", {
        orderId,
        transactionId,
      });
      setVerifying(false);
      if (!result.ok) {
        setError(errorMessage(result));
        return null;
      }
      setOrder(result.data.order);
      setError("");
      return result.data.order;
    },
    [orderId]
  );

  useEffect(() => {
    if (authLoading || !user || !orderId) return undefined;
    let active = true;

    (async () => {
      setLoading(true);
      const current = await loadOrder();
      if (!active) return;
      setLoading(false);

      const transactionId = transactionHint || current?.transactionId;
      if (
        current &&
        current.paymentStatus !== "paid" &&
        transactionId &&
        !autoTried.current
      ) {
        autoTried.current = true;
        await verifyPayment(transactionId);
      }
    })();

    return () => {
      active = false;
    };
  }, [authLoading, user, orderId, transactionHint, loadOrder, verifyPayment]);

  useEffect(() => {
    if (!user || order?.paymentStatus !== "pending") return undefined;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const current = await loadOrder();
      if (current && current.paymentStatus !== "pending") clearInterval(timer);
      if (attempts >= 12) clearInterval(timer);
    }, 5_000);
    return () => clearInterval(timer);
  }, [user, order?.paymentStatus, loadOrder]);

  if (authLoading || (loading && user && orderId)) {
    return <Spinner label="Checking your payment" />;
  }

  if (!user) {
    const returnTo = `/payment/success?orderId=${encodeURIComponent(orderId)}${
      transactionHint ? `&txn=${encodeURIComponent(transactionHint)}` : ""
    }`;
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-navy-200 bg-white p-8 text-center shadow-sm">
        <FiAlertCircle className="mx-auto mb-4 text-navy-400" size={48} />
        <h1 className="text-2xl font-bold text-navy-950">Sign in to view your payment</h1>
        <p className="mt-2 text-sm text-navy-600">
          Payment details are available only to the account that placed the order.
        </p>
        <LinkButton
          href={`/signin?callbackURL=${encodeURIComponent(returnTo)}`}
          variant="brand"
          className="mt-6"
        >
          Sign in
        </LinkButton>
      </section>
    );
  }

  if (!orderId || !order) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <FiAlertCircle className="mx-auto mb-4 text-amber-500" size={48} />
        <h1 className="text-2xl font-bold text-navy-950">Payment status unavailable</h1>
        <p className="mt-2 text-sm text-navy-600">
          {error || "We could not load this order. Check your order history or try again."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <LinkButton href="/account/orders" variant="brand">Back to Dashboard</LinkButton>
          <LinkButton href="/" variant="secondary">Continue Shopping</LinkButton>
        </div>
      </section>
    );
  }

  const paid = order.paymentStatus === "paid";
  const isBkashOrder = order.paymentMethod === "jonota_pay";
  if (!isBkashOrder) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-navy-200 bg-white p-8 text-center shadow-sm">
        <FiAlertCircle className="mx-auto mb-4 text-navy-400" size={48} />
        <h1 className="text-2xl font-bold text-navy-950">This is not a bKash payment order</h1>
        <p className="mt-2 text-sm text-navy-600">
          View the order history for its current payment and delivery status.
        </p>
        <LinkButton
          href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
          variant="brand"
          className="mt-6"
        >
          View Order Details
        </LinkButton>
      </section>
    );
  }
  const confirmedPaid =
    paid &&
    order.paymentVerification?.status === "COMPLETED" &&
    ["bkash", "bkashpayment", "bkashcheckout"].includes(
      String(order.paymentVerification?.paymentMethod || "")
        .toLowerCase()
        .replace(/[^a-z]/g, "")
    );
  const failed = order.paymentStatus === "failed";
  const Icon = confirmedPaid ? FiCheckCircle : failed ? FiXCircle : FiClock;
  const statusTone = confirmedPaid
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : failed
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className={`rounded-2xl border p-6 text-center shadow-sm sm:p-8 ${statusTone}`}>
        <Icon className="mx-auto mb-3" size={56} aria-hidden="true" />
        <h1 className="text-2xl font-bold text-navy-950 sm:text-3xl">
          {confirmedPaid ? "Payment Successful!" : failed ? "Payment Not Completed" : "Payment Processing"}
        </h1>
        <p className="mt-2 text-sm text-navy-700">
          {confirmedPaid
            ? "আপনার বিকাশ পেমেন্ট সফলভাবে সম্পন্ন হয়েছে।"
            : failed
              ? "আপনার পেমেন্ট সম্পন্ন হয়নি। অর্ডারের বিস্তারিত দেখুন বা আবার চেষ্টা করুন।"
              : "পেমেন্ট যাচাই করা হচ্ছে। নিশ্চিতকরণ না পাওয়া পর্যন্ত অর্ডারটি PAID হিসেবে দেখানো হবে না।"}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <PaymentBadge status={confirmedPaid ? "paid" : paid ? "pending" : order.paymentStatus} />
          <StatusBadge status={order.orderStatus} />
        </div>
        {!confirmedPaid && (
          <button
            type="button"
            onClick={() => verifyPayment(transactionHint || order.transactionId)}
            disabled={verifying || !(transactionHint || order.transactionId)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw className={verifying ? "animate-spin" : ""} />
            {verifying ? "Verifying..." : "Check payment status"}
          </button>
        )}
        {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
      </section>

      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-navy-950">Payment details</h2>
        <dl className="grid gap-x-6 sm:grid-cols-2">
          <div className="border-b border-navy-100 py-3">
            <dt className="text-xs text-navy-500">Order ID</dt>
            <dd className="mt-1 break-all font-semibold text-navy-950">#{order.orderNumber}</dd>
          </div>
          <div className="border-b border-navy-100 py-3">
            <dt className="text-xs text-navy-500">Payment method</dt>
            <dd className="mt-1 font-semibold text-navy-950">
              {paymentMethodLabel(order.paymentMethod)}
            </dd>
          </div>
          <div className="border-b border-navy-100 py-3">
            <dt className="text-xs text-navy-500">Total paid</dt>
            <dd className="mt-1 font-semibold text-navy-950">
              {formatMoney(order.total, order.currencySymbol)}
            </dd>
          </div>
          <div className="border-b border-navy-100 py-3">
            <dt className="text-xs text-navy-500">Transaction ID</dt>
            <dd className="mt-1 break-all font-mono text-sm text-navy-950">
              {confirmedPaid ? order.transactionId : "Awaiting gateway confirmation"}
            </dd>
          </div>
          <div className="border-b border-navy-100 py-3 sm:col-span-2">
            <dt className="text-xs text-navy-500">{confirmedPaid ? "Payment date/time" : "Last verification"}</dt>
            <dd className="mt-1 font-medium text-navy-950">
              {formatDate(order.paidAt || order.paymentVerification?.verifiedAt)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-navy-950">
          Products ({order.itemsCount})
        </h2>
        <div className="divide-y divide-navy-100">
          {(order.items || []).map((item) => (
            <div key={item.productId} className="flex items-center gap-4 py-4">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-16 w-16 shrink-0 rounded-lg border border-navy-100 object-cover"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-lg bg-navy-50" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-navy-950">{item.title}</p>
                <p className="mt-1 text-sm text-navy-500">Quantity: {item.quantity}</p>
              </div>
              <p className="shrink-0 text-right text-sm font-semibold text-navy-950">
                {formatMoney(item.lineTotal, order.currencySymbol)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <nav className="flex flex-col justify-center gap-3 sm:flex-row">
        <LinkButton href="/account" variant="brand" className="w-full sm:w-auto">
          Back to Dashboard
        </LinkButton>
        <LinkButton
          href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          View Order Details
        </LinkButton>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-navy-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-800 transition hover:bg-navy-50"
        >
          Continue Shopping
        </Link>
      </nav>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-navy-50 px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<Spinner label="Loading payment details" />}>
        <PaymentSuccessContent />
      </Suspense>
    </main>
  );
}
