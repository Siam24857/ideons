#!/usr/bin/env node
/**
 * IDeons store setup / migration script (run once, safe to re-run).
 *
 *   node scripts/setup.mjs              # schema, indexes, categories, admin*
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/setup.mjs
 *
 * * The administrator account is only created/promoted when ADMIN_EMAIL and
 *   ADMIN_PASSWORD are present in the environment (or .env). Public
 *   registration can never assign the admin role.
 *
 * What it does:
 *   1. creates the indexes the application relies on
 *   2. installs the five official IDeons categories
 *   3. back-fills existing product documents (createdAt, categorySlug,
 *      isActive, sold, rating baseline) WITHOUT touching product data
 *   4. creates the store settings document
 *   5. creates / promotes the administrator account
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";
import { hashPassword } from "better-auth/crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/* ---------------------------------- env ---------------------------------- */
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  console.warn("!.env not found - relying on process environment");
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required.");
  process.exit(1);
}
const DB_NAME = process.env.MONGODB_DB || "Marcateplace2";

const DEFAULT_CATEGORIES = [
  { name: "Technology Gadgets", slug: "technology-gadgets", order: 1, legacy: ["Electronics", "Computer"] },
  { name: "Smart Home Products", slug: "smart-home-products", order: 2, legacy: ["Smart Home"] },
  { name: "Kitchen Accessories", slug: "kitchen-accessories", order: 3, legacy: ["Home & Kitchen"] },
  { name: "Household Essentials", slug: "household-essentials", order: 4, legacy: ["Household"] },
  { name: "Innovative Lifestyle Products", slug: "innovative-lifestyle-products", order: 5, legacy: ["Fashion"] },
];

function mapLegacyCategory(value) {
  const v = String(value || "").toLowerCase();
  return DEFAULT_CATEGORIES.find((c) => c.legacy.some((l) => l.toLowerCase() === v)) || null;
}

async function ensureIndex(collection, keys, options = {}) {
  try {
    await collection.createIndex(keys, options);
    return `ok:${Object.keys(keys).join(",")}`;
  } catch (error) {
    if (/already exists|IndexOptionsConflict|equivalent/i.test(String(error?.message))) {
      return `exists:${Object.keys(keys).join(",")}`;
    }
    return `error:${error.message}`;
  }
}

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`Connected to ${DB_NAME} on ${redact(uri)}`);

  /* ------------------------------ 1. indexes ----------------------------- */
  const idx = [];
  idx.push(["orders.orderNumber", await ensureIndex(db.collection("orders"), { orderNumber: 1 }, { unique: true })]);
  idx.push([
    "orders.idempotencyKey",
    await ensureIndex(db.collection("orders"), { idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }),
  ]);
  idx.push(["orders.user+created", await ensureIndex(db.collection("orders"), { userId: 1, createdAt: -1 })]);
  idx.push(["orders.status", await ensureIndex(db.collection("orders"), { orderStatus: 1, createdAt: -1 })]);
  idx.push(["orders.created", await ensureIndex(db.collection("orders"), { createdAt: -1 })]);
  idx.push(["orders.email", await ensureIndex(db.collection("orders"), { "customer.email": 1 })]);
  idx.push(["orders.phone", await ensureIndex(db.collection("orders"), { "shippingAddress.phone": 1 })]);
  idx.push(["orders.orderNumber+user", await ensureIndex(db.collection("orders"), { orderNumber: 1, userId: 1 })]);

  idx.push(["products.slug", await ensureIndex(db.collection("products"), { slug: 1 }, { unique: true, sparse: true })]);
  idx.push(["products.categorySlug", await ensureIndex(db.collection("products"), { categorySlug: 1 })]);
  idx.push(["products.active+created", await ensureIndex(db.collection("products"), { isActive: 1, createdAt: -1 })]);
  idx.push(["products.price", await ensureIndex(db.collection("products"), { price: 1 })]);
  idx.push(["products.stock", await ensureIndex(db.collection("products"), { stock: 1 })]);
  idx.push(["products.title", await ensureIndex(db.collection("products"), { title: 1 })]);

  idx.push(["carts.userId", await ensureIndex(db.collection("carts"), { userId: 1 }, { unique: true })]);
  idx.push(["wishlists.userId", await ensureIndex(db.collection("wishlists"), { userId: 1 }, { unique: true })]);
  idx.push(["addresses.user", await ensureIndex(db.collection("addresses"), { userId: 1, updatedAt: -1 })]);

  idx.push([
    "notifications.dedupe",
    await ensureIndex(db.collection("notifications"), { dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } }),
  ]);
  idx.push(["notifications.user", await ensureIndex(db.collection("notifications"), { userId: 1, createdAt: -1 })]);
  idx.push(["notifications.email", await ensureIndex(db.collection("notifications"), { "email.status": 1 })]);

  idx.push(["jobs.key", await ensureIndex(db.collection("jobs"), { key: 1 }, { unique: true })]);
  idx.push(["jobs.due", await ensureIndex(db.collection("jobs"), { status: 1, runAt: 1 })]);

  idx.push(["reviews.product", await ensureIndex(db.collection("reviews"), { productId: 1, createdAt: -1 })]);
  idx.push([
    "reviews.user+product",
    await ensureIndex(db.collection("reviews"), { productId: 1, userId: 1 }, { unique: true }),
  ]);
  idx.push(["categories.slug", await ensureIndex(db.collection("categories"), { slug: 1 }, { unique: true })]);
  idx.push(["contact.status", await ensureIndex(db.collection("contactMessages"), { status: 1, createdAt: -1 })]);
  idx.push(["subscribers.email", await ensureIndex(db.collection("subscribers"), { email: 1 }, { unique: true })]);
  idx.push(["audit.created", await ensureIndex(db.collection("auditLogs"), { createdAt: -1 })]);
  idx.push(["audit.admin", await ensureIndex(db.collection("auditLogs"), { adminId: 1, createdAt: -1 })]);
  idx.push(["user.email", await ensureIndex(db.collection("user"), { email: 1 }, { unique: true, sparse: true })]);
  idx.push(["user.role", await ensureIndex(db.collection("user"), { role: 1 })]);
  idx.push(["session.user", await ensureIndex(db.collection("session"), { userId: 1 })]);
  idx.push(["account.user", await ensureIndex(db.collection("account"), { userId: 1 })]);

  console.log("\nIndexes:");
  for (const [name, result] of idx) console.log(`  - ${name}: ${result}`);

  /* --------------------------- 2. IDeons categories ---------------------- */
  const categories = db.collection("categories");
  for (const def of DEFAULT_CATEGORIES) {
    await categories.updateOne(
      { slug: def.slug },
      {
        $set: {
          name: def.name,
          slug: def.slug,
          description: descriptionFor(def.slug),
          order: def.order,
          isActive: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }
  const categoryDocs = await categories.find({}).toArray();
  console.log(`\nCategories: ${categoryDocs.length} available`);

  /* ------------------------- 3. product back-fill ------------------------ */
  const products = db.collection("products");
  const allProducts = await products.find({}).toArray();
  let backfilled = 0;
  for (const product of allProducts) {
    const set = { updatedAt: product.updatedAt || new Date() };
    const unset = {};

    if (!product.createdAt) {
      // ObjectId generation time is a trustworthy creation timestamp.
      try {
        set.createdAt = product._id.getTimestamp?.() || new Date();
      } catch {
        set.createdAt = new Date();
      }
    }
    if (product.isActive === undefined) set.isActive = true;
    if (product.sold === undefined) set.sold = 0;
    if (product.sku === undefined) set.sku = "";
    if (product.images === undefined && product.image) set.images = [product.image];
    if (product.variants === undefined) set.variants = [];
    if (product.discountPrice === undefined) set.discountPrice = null;

    if (product.rating !== undefined && product.baseRating === undefined) {
      set.baseRating = Number(product.rating) || 0;
      set.baseReviewsCount = Number(product.reviewsCount) || 0;
    }

    const category = mapLegacyCategory(product.category);
    if (category && product.categorySlug !== category.slug) {
      set.categorySlug = category.slug;
      set.categoryId = null;
    }

    if (Object.keys(set).length > 1 || Object.keys(unset).length) {
      await products.updateOne({ _id: product._id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
      backfilled += 1;
    }
  }
  console.log(`Products back-filled: ${backfilled} / ${allProducts.length}`);

  /* --------------------------- 4. store settings ------------------------- */
  const settings = db.collection("settings");
  await settings.updateOne(
    { key: "store" },
    {
      $set: {
        currency: "BDT",
        currencySymbol: "৳",
        deliveryChargeInsideDhaka: 60,
        deliveryChargeOutsideDhaka: 120,
        freeDeliveryOver: 0,
        codEnabled: true,
        stripeEnabled: false,
        contactEmail: "",
        contactPhone: "",
        addressLine: "",
        lowStockThreshold: 5,
        maxItemsPerOrder: 50,
        allowReviews: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
  console.log("Settings: ready");

  /* ------------------------ 5. administrator account --------------------- */
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "IDeons Administrator";

  if (email && password) {
    if (password.length < 8) {
      console.error("ADMIN_PASSWORD must be at least 8 characters.");
      process.exitCode = 1;
    } else {
      const users = db.collection("user");
      const accounts = db.collection("account");
      const now = new Date();
      const existing = await users.findOne({ email: email.toLowerCase() });

      if (!existing) {
        const result = await users.insertOne({
          name,
          email: email.toLowerCase(),
          emailVerified: false,
          role: "admin",
          phone: "",
          createdAt: now,
          updatedAt: now,
        });
        const userId = String(result.insertedId);
        await accounts.insertOne({
          accountId: userId,
          providerId: "credential",
          userId,
          password: await hashPassword(password),
          createdAt: now,
          updatedAt: now,
        });
        console.log(`Administrator created: ${email}`);
      } else {
        await users.updateOne({ _id: existing._id }, { $set: { role: "admin", updatedAt: now } });
        const account = await accounts.findOne({ userId: String(existing._id), providerId: "credential" });
        if (account) {
          await accounts.updateOne(
            { _id: account._id },
            { $set: { password: await hashPassword(password), updatedAt: now } }
          );
        } else {
          await accounts.insertOne({
            accountId: String(existing._id),
            providerId: "credential",
            userId: String(existing._id),
            password: await hashPassword(password),
            createdAt: now,
            updatedAt: now,
          });
        }
        console.log(`Administrator promoted / password reset: ${email}`);
      }
    }
  } else {
    console.log(
      "Administrator: skipped (set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create one)"
    );
  }

  /* ------------------------------ summary -------------------------------- */
  const counts = {};
  for (const name of [
    "products",
    "categories",
    "orders",
    "carts",
    "wishlists",
    "addresses",
    "notifications",
    "reviews",
    "contactMessages",
    "jobs",
    "auditLogs",
    "user",
  ]) {
    counts[name] = await db.collection(name).countDocuments();
  }
  console.log("\nCollection counts:", counts);

  await client.close();
  console.log("\nSetup complete.");
}

function descriptionFor(slug) {
  switch (slug) {
    case "technology-gadgets":
      return "Useful technology gadgets that make daily life easier.";
    case "smart-home-products":
      return "Smart home solutions for a more convenient home.";
    case "kitchen-accessories":
      return "Practical kitchen products and accessories.";
    case "household-essentials":
      return "Everyday household essentials you can rely on.";
    case "innovative-lifestyle-products":
      return "Innovative lifestyle products for smarter living.";
    default:
      return "";
  }
}

function redact(uri) {
  try {
    const url = new URL(uri);
    return `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch {
    return "mongodb+srv://...";
  }
}

main().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
