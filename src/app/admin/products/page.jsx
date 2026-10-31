"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { Badge } from "@/components/ui/Badge";

const CATEGORIES = [
  "technology-gadgets",
  "smart-home-products",
  "kitchen-accessories",
  "household-essentials",
  "innovative-lifestyle-products",
];

const CATEGORY_LABELS = {
  "technology-gadgets": "Technology Gadgets",
  "smart-home-products": "Smart Home Products",
  "kitchen-accessories": "Kitchen Accessories",
  "household-essentials": "Household Essentials",
  "innovative-lifestyle-products": "Innovative Lifestyle Products",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ active: 0, inactive: 0, outOfStock: 0, lowStock: 0, total: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    category: "",
    subCategory: "",
    price: "",
    oldPrice: "",
    discountPrice: "",
    sku: "",
    stock: "",
    images: "",
    badge: "",
    brand: "",
    features: "",
    isActive: "true",
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        category: categoryFilter,
        ...(statusFilter && { status: statusFilter }),
        sort,
      });
      const result = await fetch(`/api/admin/products?${params}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (result.ok) {
        const data = await result.json();
        setProducts(data.items || []);
        setTotal(data.total || 0);
        setSummary(data.summary || { active: 0, inactive: 0, outOfStock: 0, lowStock: 0, total: 0 });
      } else {
        console.error("Failed to load products", await result.text());
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, categoryFilter, statusFilter, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const openCreate = () => {
    setForm({
      title: "", slug: "", description: "", category: "", subCategory: "",
      price: "", oldPrice: "", discountPrice: "", sku: "", stock: "",
      images: "", badge: "", brand: "", features: "", isActive: "true",
    });
    setOpenForm(true);
  };

  const closeForm = () => {
    setOpenForm(false);
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const images = form.images.split(",").map((s) => s.trim()).filter(Boolean);
      const features = form.features.split(",").map((s) => s.trim()).filter(Boolean);
      const payload = {
        title: form.title,
        slug: form.slug,
        description: form.description,
        category: form.category,
        categoryId: "",
        subCategory: form.subCategory,
        price: Number(form.price) || 0,
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        sku: form.sku || "",
        stock: Number(form.stock) || 0,
        images,
        badge: form.badge,
        brand: form.brand,
        features,
        isActive: form.isActive === "true",
      };
      const result = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (result.ok) {
        closeForm();
        fetchProducts();
      } else {
        const err = await result.json();
        alert(err.message || "Failed to create product.");
      }
    } catch (error) {
      alert("Network error while creating product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Products</h1>
          <p className="mt-1 text-sm text-navy-500">
            Manage your product catalog — add new products.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="brand" onClick={openCreate} disabled={saving}>
            + Add product
          </Button>
          <LinkButton href="/admin" variant="ghost" className="w-auto">
            Back to dashboard
          </LinkButton>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Total products</p>
          <p className="mt-1 text-2xl font-bold text-navy-950">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{summary.active}</p>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Inactive</p>
          <p className="mt-1 text-2xl font-bold text-navy-600">{summary.inactive}</p>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-navy-500 uppercase tracking-wider">Out of stock</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{summary.outOfStock}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <form onChange={(e) => fetchProducts()} className="grid gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-full sm:col-span-2">
            <label className="block text-xs font-medium text-navy-600 mb-1">Search product</label>
            <input
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product name, SKU, slug…"
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] || c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="low-stock">Low stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-600 mb-1">Sort by</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="stock-asc">Stock: low to high</option>
              <option value="name">Name</option>
            </select>
          </div>
        </form>
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-navy-600">
          Showing {products.length} of {total} product{total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Products table */}
      <div className="rounded-xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
            <p className="text-sm text-navy-500">Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-navy-500">No products found.</p>
          </div>
        ) : (
          <table className="w-full text-left divide-y divide-navy-100">
            <thead>
              <tr className="bg-navy-50">
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Image</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Product</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Category</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Price</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase text-right">Stock</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-navy-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.title}
                          className="h-12 w-12 rounded-lg object-cover border border-navy-100"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-navy-50 flex items-center justify-center text-navy-300">
                          📦
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/products/${p.slug || p._id}`}
                      className="text-sm font-medium text-navy-950 hover:text-blue-600"
                    >
                      {p.title}
                    </Link>
                    {p.sku && (
                      <p className="text-xs text-navy-400 mt-1">SKU: {p.sku}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-600">
                    {p.category || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-navy-900 text-right">
                    ৳{Number(p.price || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.stock <= 0 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    }`}>
                      {p.stock <= 0 ? "Out of stock" : p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={p.isActive !== false ? "brand" : "neutral"}>
                      {p.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-navy-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add product form */}
      {openForm && (
        <div className="mt-8 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy-950 uppercase tracking-wider">Add new product</h2>
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="col-span-full">
              <label className="block text-xs font-medium text-navy-600 mb-1">Product name</label>
              <input
                name="title"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-xs font-medium text-navy-600 mb-1">Slug</label>
              <input
                name="slug"
                value={form.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                required
                placeholder="e.g. portable-bluetooth-speaker"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-xs font-medium text-navy-600 mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c] || c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">Sub-category</label>
              <input
                name="subCategory"
                value={form.subCategory}
                onChange={(e) => handleChange("subCategory", e.target.value)}
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">Price (৳)</label>
              <input
                name="price"
                type="number"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">Old price (৳)</label>
              <input
                name="oldPrice"
                type="number"
                value={form.oldPrice}
                onChange={(e) => handleChange("oldPrice", e.target.value)}
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">Discount price (৳)</label>
              <input
                name="discountPrice"
                type="number"
                value={form.discountPrice}
                onChange={(e) => handleChange("discountPrice", e.target.value)}
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">SKU</label>
              <input
                name="sku"
                value={form.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">Stock quantity</label>
              <input
                name="stock"
                type="number"
                value={form.stock}
                onChange={(e) => handleChange("stock", e.target.value)}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-xs font-medium text-navy-600 mb-1">Images (comma-separated URLs)</label>
              <input
                name="images"
                value={form.images}
                onChange={(e) => handleChange("images", e.target.value)}
                placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">Badge</label>
              <input
                name="badge"
                value={form.badge}
                onChange={(e) => handleChange("badge", e.target.value)}
                placeholder="e.g. New, Best Seller, Sale"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">Brand</label>
              <input
                name="brand"
                value={form.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-xs font-medium text-navy-600 mb-1">Features (comma-separated)</label>
              <input
                name="features"
                value={form.features}
                onChange={(e) => handleChange("features", e.target.value)}
                placeholder="e.g. Bluetooth 5.3, 20 hrs battery"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-xs font-medium text-navy-600 mb-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive === "true"}
                  onChange={(e) => handleChange("isActive", e.target.checked ? "true" : "false")}
                  className="rounded border-navy-300 text-blue-500 focus:ring-blue-500"
                />
                Active (visible on storefront)
              </label>
            </div>
            <div className="col-span-full flex gap-3">
              <Button type="submit" variant="brand" loading={saving} disabled={saving}>
                Create product
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

