import { collections } from "@/lib/db";
import { sendMail, renderNotificationEmail, isMailConfigured } from "@/lib/mail";

/**
 * In-app notifications.
 *
 * An in-app notification is a document in the `notifications` collection and
 * is what the customer sees in their account. Email delivery is a separate,
 * asynchronous concern handled by the job queue in `@/lib/jobs` - we never
 * report "email sent" unless the provider confirmed it.
 */

export const NOTIFICATION_TITLES = {
  order_placed: "Order placed",
  order_confirmed: "Order confirmed",
  order_processing: "Order is being prepared",
  order_shipped: "Order shipped",
  order_delivered: "Order delivered",
  order_cancelled: "Order cancelled",
  payment_success: "Payment received",
  payment_failed: "Payment failed",
  welcome: "Welcome to IDeons",
  order_confirmation_pending: "Order confirmation pending",
};

export function buildNotificationMessage(type, order) {
  const number = order?.orderNumber || "";
  const total = order?.total;
  switch (type) {
    case "order_placed":
      return {
        title: "Order placed",
        body: `We have received order ${number}. It is waiting for confirmation.`,
      };
    case "order_confirmation_pending":
      return {
        title: "Order confirmation pending",
        body: `Order ${number} has been received. We are confirming availability and will update you shortly.`,
      };
    case "order_confirmed":
      return { title: "Order confirmed", body: `Order ${number} has been confirmed and will be prepared soon.` };
    case "order_processing":
      return { title: "Order is being prepared", body: `Order ${number} is now being prepared for dispatch.` };
    case "order_shipped":
      return { title: "Order shipped", body: `Order ${number} has been shipped. Please keep your phone available for delivery.` };
    case "order_delivered":
      return { title: "Order delivered", body: `Order ${number} has been delivered. Thank you for shopping with IDeons.` };
    case "order_cancelled":
      return { title: "Order cancelled", body: `Order ${number} has been cancelled.` };
    case "payment_success":
      return { title: "Payment received", body: `We have received your payment for order ${number}.` };
    case "payment_failed":
      return { title: "Payment failed", body: `Your payment for order ${number} could not be completed. ${total != null ? "" : ""}` };
    case "welcome":
      return { title: "Welcome to IDeons", body: "Your account is ready. Start exploring smart products for everyday living." };
    default:
      return { title: "Update", body: "You have a new update." };
  }
}

/**
 * Creates an in-app notification (and schedules the email through the queue).
 * `dedupeKey` guarantees a given event produces at most one notification.
 */
export async function createNotification({
  userId,
  type,
  order = null,
  title,
  body,
  dedupeKey,
  emailWanted = true,
}) {
  if (!userId) return null;
  const { notifications } = await collections();
  const content =
    title && body ? { title, body } : buildNotificationMessage(type, order);

  const doc = {
    userId: String(userId),
    type,
    title: content.title,
    body: content.body,
    orderNumber: order?.orderNumber || null,
    orderId: order?._id ? String(order._id) : null,
    data: order
      ? {
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
        }
      : {},
    readAt: null,
    createdAt: new Date(),
    email: {
      status: isMailConfigured() && emailWanted ? "pending" : "skipped",
      attempts: 0,
      sentAt: null,
      messageId: null,
      reason: isMailConfigured() && emailWanted ? null : "not_configured",
    },
  };

  try {
    if (dedupeKey) {
      doc.dedupeKey = dedupeKey;
      const result = await notifications.updateOne(
        { dedupeKey },
        { $setOnInsert: doc },
        { upsert: true }
      );
      if (!result.upsertedId) return null; // already existed
    } else {
      const result = await notifications.insertOne(doc);
      doc._id = result.insertedId;
    }
    return doc;
  } catch (error) {
    if (error?.code === 11000) return null; // duplicate dedupe key
    console.error("[notifications] failed to create:", error.message);
    return null;
  }
}

export async function listNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const { notifications } = await collections();
  const query = { userId: String(userId), ...(unreadOnly ? { readAt: null } : {}) };
  const [items, total, unread] = await Promise.all([
    notifications
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    notifications.countDocuments(query),
    notifications.countDocuments({ userId: String(userId), readAt: null }),
  ]);
  return { items, total, unread, page, limit };
}

export async function markRead(userId, ids) {
  const { notifications } = await collections();
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean).map(String);
  if (!list.length) return { modified: 0 };
  const { ObjectId } = await import("mongodb");
  const objectIds = list
    .map((v) => {
      try {
        return /^[a-fA-F0-9]{24}$/.test(v) ? new ObjectId(v) : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (!objectIds.length) return { modified: 0 };
  const result = await notifications.updateMany(
    { _id: { $in: objectIds }, userId: String(userId), readAt: null },
    { $set: { readAt: new Date() } }
  );
  return { modified: result.modifiedCount };
}

export async function markAllRead(userId) {
  const { notifications } = await collections();
  const result = await notifications.updateMany(
    { userId: String(userId), readAt: null },
    { $set: { readAt: new Date() } }
  );
  return { modified: result.modifiedCount };
}

/**
 * Delivers the email for a pending notification. Called by the job queue so
 * retries are counted and duplicates are impossible.
 */
export async function deliverNotificationEmail(notificationId) {
  const { notifications } = await collections();
  const { ObjectId } = await import("mongodb");
  const _id = typeof notificationId === "string" ? new ObjectId(notificationId) : notificationId;

  const notification = await notifications.findOne({ _id });
  if (!notification) return { sent: false, reason: "not_found" };
  if (notification.email?.status === "sent") return { sent: false, reason: "already_sent" };

  const { users } = await collections();
  const user = await users.findOne({ _id: new ObjectId(notification.userId) });
  if (!user?.email) return { sent: false, reason: "no_recipient" };

  const { html, text } = renderNotificationEmail({
    type: notification.type,
    title: notification.title,
    body: notification.body,
    actionUrl: notification.orderNumber ? `/account/orders/${notification.orderNumber}` : "/account/notifications",
    orderNumber: notification.orderNumber,
  });

  const result = await sendMail({
    to: user.email,
    subject: `${notification.title} | IDeons`,
    html,
    text,
    type: notification.type,
  });

  await notifications.updateOne(
    { _id },
    {
      $set: {
        "email.status": result.sent ? "sent" : "failed",
        "email.sentAt": result.sent ? new Date() : null,
        "email.messageId": result.messageId || null,
        "email.reason": result.sent ? null : result.reason,
        "email.updatedAt": new Date(),
      },
      $inc: { "email.attempts": 1 },
    }
  );

  return result;
}
