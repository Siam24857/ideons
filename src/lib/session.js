import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { collections } from "@/lib/db";
import { USER_ROLES } from "@/lib/constants";

/**
 * Server-side session helpers.
 * Every protected route handler must call one of these - the client never
 * decides whether a request belongs to a customer or an admin.
 */

export async function getSession() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    return session;
  } catch (error) {
    console.error("[session] failed to resolve session:", error.message);
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export function isAdmin(user) {
  return user?.role === USER_ROLES.ADMIN;
}

/**
 * Returns the authenticated user or throws an ApiError(401).
 * Use inside route handlers.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("You must be signed in to continue.");
    err.status = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }
  return user;
}

/**
 * Returns the authenticated admin or throws (401 when anonymous, 403 when the
 * signed-in account is only a customer).
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("You must be signed in to continue.");
    err.status = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }
  if (user.role !== USER_ROLES.ADMIN) {
    const err = new Error("Administrator access is required.");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }
  return user;
}

/**
 * Loads a user-scoped document and guarantees ownership.
 * Returns null when the document does not exist OR belongs to somebody else,
 * so an attacker cannot distinguish "not yours" from "not found".
 */
export async function findOwnDocument(collection, query, userId) {
  const doc = await collection.findOne({ ...query, userId: String(userId) });
  return doc;
}

export async function loadCart(userId) {
  const { carts } = await collections();
  return carts.findOne({ userId: String(userId) });
}
