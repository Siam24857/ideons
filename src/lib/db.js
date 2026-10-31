import { MongoClient, ObjectId } from "mongodb";

/**
 * Shared MongoDB Atlas connection (official MongoDB Node.js driver, no Mongoose).
 * The client is cached globally so that route handlers reuse one connection pool
 * across hot reloads in development and across invocations in production.
 */

const GLOBAL_DB = Symbol.for("ideons.mongo.db");
const GLOBAL_CLIENT = Symbol.for("ideons.mongo.client");

function createClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured. Add it to your .env file.");
  }
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 15000,
  });
  return client;
}

export function getMongoClient() {
  const g = globalThis;
  if (!g[GLOBAL_CLIENT]) {
    g[GLOBAL_CLIENT] = createClient();
  }
  return g[GLOBAL_CLIENT];
}

export async function getDb() {
  const g = globalThis;
  if (!g[GLOBAL_DB]) {
    const client = getMongoClient();
    await client.connect();
    const dbName = process.env.MONGODB_DB || "Marcateplace2";
    g[GLOBAL_DB] = client.db(dbName);
  }
  return g[GLOBAL_DB];
}

/** Convenience collection accessors used across the application. */
export async function collections() {
  const db = await getDb();
  return {
    db,
    users: db.collection("user"),
    accounts: db.collection("account"),
    sessions: db.collection("session"),
    products: db.collection("products"),
    categories: db.collection("categories"),
    carts: db.collection("carts"),
    wishlists: db.collection("wishlists"),
    addresses: db.collection("addresses"),
    orders: db.collection("orders"),
    notifications: db.collection("notifications"),
    reviews: db.collection("reviews"),
    contactMessages: db.collection("contactMessages"),
    subscribers: db.collection("subscribers"),
    settings: db.collection("settings"),
    jobs: db.collection("jobs"),
    auditLogs: db.collection("auditLogs"),
  };
}

/** Turn a string into a valid ObjectId, or return null when it is not one. */
export function toObjectIdOrNull(value) {
  if (!value) return null;
  try {
    if (value instanceof ObjectId) return value;
    if (/^[a-fA-F0-9]{24}$/.test(String(value))) return new ObjectId(String(value));
    return null;
  } catch {
    return null;
  }
}
