"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FiXCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import { api, errorMessage } from "@/lib/api-client";
import { useStore } from "@/components/providers/StoreProvider";
import { Button, LinkButton, Spinner } from "@/components/ui/Buttons";

/**
 * Shown when the customer cancels on the gateway page (or the gateway sends
 * them back with a cancel_url). URL status values are never trusted; a
 * transaction reference, when present, is checked through the server verifier.
 *
 * The gateway callback path carries both the order and product reference;
 * older URLs can resolve the product from the authenticated order API.
 */

function CancelContent() {
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathSegments = Array.isArray(routeParams?.orderId)
    ? routeParams.orderId.filter(Boolean)
    : routeParams?.orderId
      ? [routeParams.orderId]
      : [];
  const pathOrder = pathSegments[0] || "";
  const pathProduct = pathSegments[1] || "";
  const orderRef =
    pathOrder || searchParams.get("orderId") || searchParams.get("order") || "";
  const transactionId =
    searchParams.get("transactionId") ||
    searchParams.get("transaction_id") ||
    searchParams.get("txn") ||
    "";

  const { user, authLoading } = useStore();
  const handledRedirect = useRef("");
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return undefined;
    const redirectKey = `${orderRef}:${pathProduct}:${transactionId}`;
    if (handledRedirect.current === redirectKey) return undefined;
    handledRedirect.current = redirectKey;
    let active = true;

    async function returnToProduct() {
      if (pathProduct) {
        toast("Payment cancelled. You can try again whenever you're ready.");
        router.replace(`/products/${encodeURIComponent(pathProduct)}`);
        if (user && orderRef && transactionId) {
          api.post("/api/payments/jonota/verify", {
            orderId: orderRef,
            transactionId,
          }).then((verification) => {
            if (!verification.ok) {
              console.error(
                "[jonota] cancellation transaction verification was not applied:",
                errorMessage(verification)
              );
            }
          }).catch((verificationError) => {
            console.error("[jonota] cancellation transaction verification failed:", verificationError);
          });
        }
        return;
      }

      let order = null;
      if (user && orderRef) {
        if (transactionId) {
          const verification = await api.post("/api/payments/jonota/verify", {
            orderId: orderRef,
            transactionId,
          });
          if (verification.ok) order = verification.data.order;
        }

        if (!order) {
          const result = await api.get(`/api/orders/${encodeURIComponent(orderRef)}`);
          if (result.ok) order = result.data.order;
        }
      }

      if (!active) return;
      const productRef =
        pathProduct || order?.items?.[0]?.slug || order?.items?.[0]?.productId;
      toast("Payment cancelled. You can try again whenever you're ready.");
      router.replace(
        productRef ? `/products/${encodeURIComponent(String(productRef))}` : "/products"
      );
    }

    returnToProduct().catch((redirectError) => {
      console.error("[jonota] could not resolve product after payment cancellation:", redirectError);
      if (!active) return;
      toast("Payment cancelled. You can try again whenever you're ready.");
      router.replace(
        pathProduct ? `/products/${encodeURIComponent(pathProduct)}` : "/products"
      );
    });

    return () => {
      active = false;
    };
  }, [authLoading, orderRef, pathProduct, transactionId, user, router]);

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
