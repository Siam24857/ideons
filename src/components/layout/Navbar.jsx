import { getCategoriesWithCounts } from "@/lib/products";
import NavbarInner from "./NavbarInner";

/**
 * Server wrapper for the navigation: reads the live category list once per
 * request and hands it to the interactive navbar.
 */
export default async function Navbar() {
  let categories = [];
  try {
    categories = await getCategoriesWithCounts();
  } catch (error) {
    console.error("[navbar] failed to load categories:", error.message);
  }

  return (
    <NavbarInner
      categories={categories.map((c) => ({ name: c.name, slug: c.slug, count: c.count || 0 }))}
    />
  );
}
