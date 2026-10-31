import { handleApi, ok, fail } from "@/lib/api";
import { verifyStripeEvent } from "@/lib/stripe";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { scheduleJob } from "@/lib/jobs";
import { PAYMENT_STATUS, ORDER_STATUS } from "@/lib/constants";

/**
 * POST /api/webhooks/stripe
 *
 * The ONLY place an online payment is marked as paid. The payload signature
 * is verified with STRIPE_WEBHOOK_SECRET, and every event is handled
 * idempotently (`paymentStatus !== paid` guard + dedupe keys), so replayed
 * webhook deliveries can never double-apply.
 *
 * A redirect to a success page is never accepted as proof of payment.
 */
export const POST = handleApi(async (request) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return fail("Stripe webhooks are not configured.", 503, "NOT_CONFIGURED");
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  let event;
  try {
    event = await verifyStripeEvent(payload, signature || "");
  } catch (error) {
    console.error("[stripe] signature verification failed:", error.message);
    return fail("Invalid webhook signature.", 400, "INVALID_SIGNATURE");
  }

  const { orders } = await collections();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderNumber = session.metadata?.orderNumber || session.client_reference_id;
    if (!orderNumber) return ok({ received: true, skipped: "no_order_reference" });

    const order = await orders.findOne({ orderNumber });
    if (!order) return ok({ received: true, skipped: "order_not_found" });

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      return ok({ received: true, idempotent: true }); // replayed event
    }

    await orders.updateOne(
      { _id: order._id, paymentStatus: { $ne: PAYMENT_STATUS.PAID } },
      {
        $set: {
          paymentStatus: PAYMENT_STATUS.PAID,
          paymentReference: session.payment_intent || session.id,
          transactionId: session.payment_intent || null,
          paidAt: new Date(),
          updatedAt: new Date(),
        },
        $push: {
          history: {
            status: order.orderStatus,
            at: new Date(),
            by: "stripe-webhook",
            byRole: "system",
            previous: order.orderStatus,
            note: "Online payment confirmed",
            customerMessage: "Your payment has been received.",
          },
        },
      }
    );

    const updated = await orders.findOne({ _id: order._id });
    const notification = await createNotification({
      userId: order.userId,
      type: "payment_success",
      order: updated,
      dedupeKey: `paid_${order.orderNumber}`,
    });
    if (notification?.email?.status === "pending") {
      await scheduleJob({
        key: `mail_${notification._id}`,
        type: "send_notification_email",
        payload: { notificationId: String(notification._id) },
        runAt: new Date(Date.now() + 5_000),
      });
    }
    return ok({ received: true, markedPaid: true });
  }

  if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
    const obj = event.data.object;
    const orderNumber = obj.metadata?.orderNumber || obj.client_reference_id || obj.metadata?.orderNumber;
    if (orderNumber) {
      const order = await orders.findOne({ orderNumber });
      if (order && order.paymentStatus !== PAYMENT_STATUS.PAID) {
        await createNotification({
          userId: order.userId,
          type: "payment_failed",
          order,
          dedupeKey: `payfail_${order.orderNumber}_${event.id}`,
          body: `We could not complete the online payment for order ${order.orderNumber}. You can try again or choose Cash on Delivery.`,
        });
      }
    }
    return ok({ received: true });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const order = await orders.findOne({
      $or: [{ paymentReference: intent.id }, { transactionId: intent.id }],
    });
    if (order && order.paymentStatus !== PAYMENT_STATUS.PAID) {
      await orders.updateOne(
        { _id: order._id },
        { $set: { paymentStatus: PAYMENT_STATUS.PAID, paidAt: new Date(), updatedAt: new Date() } }
      );
    }
    return ok({ received: true });
  }

  return ok({ received: true, ignored: event.type });
});

/** Stripe retries non-2xx responses; acknowledge with 400 on signature errors only. */
export const GET = async () => fail("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
