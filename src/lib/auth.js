import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getMongoClient, getDb } from "@/lib/db";
import { USER_ROLES } from "@/lib/constants";

/**
 * Better Auth configuration for IDeons.
 *
 * Security notes:
 * - The customer `role` is server-owned: `input: false` means a public
 *   signup can NEVER send a role field. Only a trusted admin action (or the
 *   provisioning script) may promote a user to `admin`.
 * - Cookies are secure in production and use SameSite=lax so that the session
 *   survives normal same-site navigation while blocking cross-site POSTs.
 */

const globalAuth = Symbol.for("ideons.auth");

function buildAuth() {
  const client = getMongoClient();
  const db = process.env.MONGODB_DB || "Marcateplace2";

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      "http://localhost:3000",
      "https://ideons.vercel.app",
    ],
    database: mongodbAdapter(client.db(db), { client }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Accounts are created explicitly through /signup - sign-in requires an
      // existing account.
      disableSignUp: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh daily
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24,
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: USER_ROLES.CUSTOMER,
          input: false, // never trusted from the client
        },
        phone: {
          type: "string",
          defaultValue: "",
          input: true,
        },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      cookies: {
        session_token: {
          attributes: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
          },
        },
      },
      database: {
        generateId: false,
      },
    },
  });
}

export function getAuth() {
  const g = globalThis;
  if (!g[globalAuth]) g[globalAuth] = buildAuth();
  return g[globalAuth];
}

export const auth = getAuth();

/** Invalidate the cached instance (used by tests / HMR safety). */
export function resetAuthCache() {
  delete globalThis[globalAuth];
}

/** Exposed for scripts that need the raw db handle with the same config. */
export async function getAuthDb() {
  await getDb();
  return getAuth();
}
