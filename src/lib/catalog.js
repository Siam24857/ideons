import { ObjectId } from "mongodb";
import { collections, toObjectIdOrNull } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

/** URL friendly slug. */
export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Resolves a category reference coming from the admin form into the canonical
 * category document (creating the IDeons taxonomy reference when missing).
 */
export async function resolveCategoryRef(name, categoryId) {
  const { categories } = await collections();
  const id = toObjectIdOrNull(categoryId);
  if (id) {
    const doc = await categories.findOne({ _id: id });
    if (doc) return { id: String(doc._id), name: doc.name, slug: doc.slug };
  }
  const slug = slugify(name);
  const existing = await categories.findOne({ $or: [{ slug }, { name: name }] });
  if (existing) return { id: String(existing._id), name: existing.name, slug: existing.slug };
  return { id: null, name: String(name), slug };
}

/** Maps a legacy catalog category value onto the IDeons taxonomy. */
export function mapLegacyCategory(legacyValue) {
  const found = DEFAULT_CATEGORIES.find((c) =>
    (c.legacyValues || []).some(
      (v) => v.toLowerCase() === String(legacyValue || "").toLowerCase()
    )
  );
  return found || null;
}

/**
 * Creates the five IDeons categories when they do not exist yet.
 * Returns the category documents (existing or created).
 */
export async function ensureDefaultCategories() {
  const { categories } = await collections();
  const results = [];
  for (const def of DEFAULT_CATEGORIES) {
    const update = {
      name: def.name,
      slug: def.slug,
      description: def.description,
      order: def.order,
      isActive: true,
      updatedAt: new Date(),
    };
    await categories.updateOne(
      { slug: def.slug },
      { $set: update, $setOnInsert: { createdAt: new Date(), legacyValues: def.legacyValues } },
      { upsert: true }
    );
    results.push(await categories.findOne({ slug: def.slug }));
  }
  return results.filter(Boolean);
}

/** Ensures a unique index exists, ignoring "already exists" errors. */
export async function ensureIndex(collection, keys, options = {}) {
  try {
    await collection.createIndex(keys, options);
  } catch (error) {
    if (!/already exists|IndexOptionsConflict/i.test(String(error?.message))) {
      console.warn("[index] ", error.message);
    }
  }
}

export { ObjectId };
