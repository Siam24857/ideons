"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiShield,
  FiXCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { api, errorMessage } from "@/lib/api-client";
import { useStore } from "@/components/providers/StoreProvider";
import { formatMoney } from "@/lib/money";
import { formatDate, paymentMethodLabel } from "@/lib/format";
import { Button, LinkButton, Spinner } from "@/components/ui/Buttons";
import { PaymentBadge, MethodBadge } from "@/components/ui/Badge";

/**
 * Payment result screen.
 *
 * The redirect from the gateway is only a hint. This page:
 *   - reads the stored payment state from our own API
 *   - asks the server to re-verify the transaction with the provider
 *   - polls the stored state while it is pending
 *
 * Every action is idempotent on the server, so refreshing this page can never
 * create a second order or apply a payment twice.
 */

const STATUS_COPY = {
  paid: {
    title: "Payment received",
    body: "Your payment has been verified and your order is confirmed.",
    icon: FiCheckCircle,
    tone: "text-emerald-600",
    ring: "border-emerald-200 bg-emerald-50",
  },
  pending: {
    title: "Confirming your payment",
    body: "We have not received confirmation of this payment yet. We will keep checking automatically.",
    icon: FiClock,
    tone: "text-amber-600",
    ring: "border-amber-200 bg-amber-50",
  },
  failed: {
    title: "Payment did not complete",
    body: "This payment was not successful. You can try again.",
    icon: FiXCircle,
    tone: "text-rose-600",
    ring: "border-rose-200 bg-rose-50",
  },
  unpaid: {
    title: "Payment not started",
    body: "No online payment has been recorded for this order yet.",
    icon: FiAlertCircle,
    tone: "text-navy-600",
    ring: "border-navy-200 bg-navy-50",
  },
};

function statusCopy(order) {
  if (!order) return null;
  return STATUS_COPY[order.paymentStatus] || STATUS_COPY.unpaid;
}

function VerifyContent() {
  const params = useSearchParams();
  const orderRef = params.get("order") || "";
  const txn = params.get("txn") || "";
  const unmatched = params.get("unmatched") === "1";
  const { user, authLoading } = useStore();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const autoTried = useRef(false);

  const loadStatus = useCallback(async () => {
    if (!orderRef) return null;
    const result = await api.get(
      `/api/payments/jonota/status?orderNumber=${encodeURIComponent(orderRef)}`
    );
    if (result.ok) {
      setOrder(result.data.order);
      setError(null);
      return result.data.order;
    }
    setError(errorMessage(result));
    return null;
  }, [orderRef]);

  const runVerify = useCallback(
    async ({ silent = false } = {}) => {
      if (!orderRef) return null;
      if (!silent) setVerifying(true);
      const result = await api.post("/api/payments/jonota/verify", {
        orderNumber: orderRef,
        transactionId: txn || undefined,
      });
      if (!silent) setVerifying(false);
      if (result.ok) {
        setOrder(result.data.order);
        setError(null);
        if (result.data.paid) toast.success("Payment verified.");
        return result.data.order;
      }
      setError(errorMessage(result));
      return null;
    },
    [orderRef, txn]
  );

  useEffect(() => {
    if (authLoading || !user || !orderRef) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      const current = await loadStatus();
      if (cancelled) return;
      setLoading(false);

      /* Auto-verify once, only when we actually have a transaction id. */
      if (
        current &&
        current.paymentStatus !== "paid" &&
        !autoTried.current &&
        (txn || current.transactionId)
      ) {
        autoTried.current = true;
        await runVerify({ silent: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, orderRef, txn, loadStatus, runVerify]);

  /* Poll the stored status while the payment is still pending. */
  useEffect(() => {
    if (!orderRef || order?.paymentStatus !== "pending" || !user) return;
    let ticks = 0;
    const id = setInterval(async () => {
      ticks += 1;
      if (ticks > 12) {
        clearInterval(id);
        return;
      }
      const current = await loadStatus();
      if (current && current.paymentStatus !== "pending") clearInterval(id);
    }, 5_000);
    return () => clearInterval(id);
  }, [orderRef, order?.paymentStatus, user, loadStatus]);

  const handleRetry = async () => {
    if (!orderRef) return;
    setRestarting(true);
    const result = await api.post("/api/payments/jonota/create", { orderNumber: orderRef });
    setRestarting(false);
    if (result.ok && result.data.paymentUrl) {
      window.location.href = result.data.paymentUrl;
      return;
    }
    setError(errorMessage(result));
  };

  if (authLoading || (loading && user && Boolean(orderRef))) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner label="Checking your payment" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
        <FiShield className="mx-auto mb-4 text-navy-300" size={48} />
        <h1 className="text-2xl font-bold text-navy-950">Sign in to see your payment</h1>
        <p className="mt-2 text-sm text-navy-500">
          For your security, payment results are only shown to the account that placed the order.
        </p>
        <LinkButton href="/signin" variant="primary" className="mt-5">
          Sign in
        </LinkButton>
      </div>
    );
  }

  if (unmatched || !orderRef) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
        <FiAlertCircle className="mx-auto mb-4 text-amber-500" size={48} />
        <h1 className="text-2xl font-bold text-navy-950">We could not match this payment</h1>
        <p className="mt-2 text-sm text-navy-600">
          If money left your account, please contact support with your order number and the
          transaction id from the payment confirmation. We will verify it manually.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href="/account/orders" variant="primary">
            My orders
          </LinkButton>
          <LinkButton href="/contact">Contact support</LinkButton>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-navy-200 bg-white px-6 py-12 text-center">
        <FiAlertCircle className="mx-auto mb-4 text-navy-300" size={48} />
        <h1 className="text-2xl font-bold text-navy-950">Payment status unavailable</h1>
        <p className="mt-2 text-sm text-navy-500">
          {error || "We could not load this order. Please check your order history."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={loadStatus}>
            Try again
          </Button>
          <LinkButton href="/account/orders">My orders</LinkButton>
        </div>
      </div>
    );
  }

  const copy = statusCopy(order);
  const Icon = copy.icon;
  const canVerify = Boolean(order.transactionId || txn);
  const canRetry = order.canRetry && order.orderStatus !== "cancelled";

  return (
    <div className="mx-auto max-w-2xl">
      <div className={`rounded-2xl border p-8 text-center ${copy.ring}`}>
        <Icon className={`mx-auto mb-4 ${copy.tone}`} size={56} />
        <h1 className="text-2xl font-bold text-navy-950">{copy.title}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-navy-600">{copy.body}</p>

        {order.paymentVerification?.message && order.paymentStatus !== "paid" && (
          <p className="mx-auto mt-4 max-w-lg rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-xs text-navy-600">
            {order.paymentVerification.message}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <PaymentBadge status={order.paymentStatus} />
          <MethodBadge method={order.paymentMethod} />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {canVerify && order.paymentStatus !== "paid" && (
            <Button
              variant="primary"
              loading={verifying}
              onClick={() => runVerify()}
              disabled={verifying}
            >
              <FiRefreshCw className="mr-1" /> Verify payment
            </Button>
          )}
          {canRetry && (
            <Button variant="secondary" loading={restarting} onClick={handleRetry} disabled={restarting}>
              Try payment again
            </Button>
          )}
          <LinkButton href={`/account/orders/${order.orderNumber}`} variant="secondary">
            View order
          </LinkButton>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy-950">
          Payment details
        </h2>
        <dl className="divide-y divide-navy-100 text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-navy-500">Order</dt>
            <dd className="text-right font-medium text-navy-900">
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="hover:text-blue-600"
              >
                #{order.orderNumber}
              </Link>
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-navy-500">Amount</dt>
            <dd className="text-right font-medium text-navy-900">
              {formatMoney(order.total, order.currencySymbol)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-navy-500">Payment method</dt>
            <dd className="text-right font-medium text-navy-900">
              {paymentMethodLabel(order.paymentMethod)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-navy-500">Transaction ID</dt>
            <dd className="max-w-[60%] break-all text-right font-mono text-xs text-navy-900">
              {order.transactionId || txn || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-navy-500">Paid at</dt>
            <dd className="text-right font-medium text-navy-900">
              {order.paidAt ? formatDate(order.paidAt) : "-"}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 text-center text-xs text-navy-400">
        Refreshing this page is safe - payments are only applied once and are always
        re-checked with the payment service.
      </p>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <div className="min-h-screen bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex min-h-[420px] items-center justify-center">
            <Spinner label="Loading" />
          </div>
        }
      >
        <VerifyContent />
      </Suspense>
    </div>
  );
}

export const dynamic = "force-dynamic";
