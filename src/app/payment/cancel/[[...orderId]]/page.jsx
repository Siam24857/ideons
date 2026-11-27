"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FiXCircle } from "react-icons/fi";
import { api, errorMessage } from "@/lib/api-client";
import { useStore } from "@/components/providers/StoreProvider";
import { Button, LinkButton, Spinner } from "@/components/ui/Buttons";

/**
 * Shown when the customer cancels on the gateway page (or the gateway sends
 * them back with a cancel_url). Nothing is marked paid here - the order simply
 * stays unpaid/pending and the customer can restart the payment.
 *
 * The order reference is read from the path (`/payment/cancel/{orderId}`) and
 * falls back to the query string, because the gateway appends its own query
 * parameters to the cancel URL.
 */

function CancelContent() {
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const pathOrder = Array.isArray(routeParams?.orderId)
    ? routeParams.orderId.filter(Boolean).join("/")
    : routeParams?.orderId;
  const orderRef =
    pathOrder || searchParams.get("orderId") || searchParams.get("order") || "";

  const { user, authLoading } = useStore();
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState(null);

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

  if (authLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Spinner label="Loading" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-navy-200 bg-white px-6 py-12 text-center shadow-sm">
      <FiXCircle className="mx-auto mb-4 text-navy-400" size={52} />
      <h1 className="text-2xl font-bold text-navy-950">Payment cancelled</h1>
      <p className="mt-2 text-sm text-navy-600">
        No payment was taken. Your order is still saved and you can complete the payment
        whenever you are ready.
      </p>
      <p className="mx-auto mt-3 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        If you already completed a payment in another tab, do not start another one - open
        your order and verify the existing transaction first.
      </p>

      {orderRef && (
        <p className="mt-3 text-xs text-navy-500">
          Order reference: <span className="font-mono">{orderRef}</span>
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {user && orderRef && (
          <Button variant="primary" loading={restarting} onClick={handleRetry} disabled={restarting}>
            Try payment again
          </Button>
        )}
        {orderRef && (
          <LinkButton href={`/account/orders/${orderRef}`}>View order</LinkButton>
        )}
        {!user && (
          <LinkButton href="/signin" variant="primary">
            Sign in
          </LinkButton>
        )}
        <LinkButton href="/account/orders" variant="secondary">
          My orders
        </LinkButton>
      </div>

      <p className="mt-5 text-xs text-navy-400">
        Need help?{" "}
        <Link href="/contact" className="text-blue-600 hover:underline">
          Contact support
        </Link>
      </p>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-navy-50 px-4 py-14 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex min-h-[360px] items-center justify-center">
            <Spinner label="Loading" />
          </div>
        }
      >
        <CancelContent />
      </Suspense>
    </div>
  );
}

export const dynamic = "force-dynamic";
