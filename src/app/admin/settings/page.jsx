"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button, LinkButton } from "@/components/ui/Buttons";
import EmptyState from "@/components/ui/EmptyState";

const SETTINGS_FIELDS = [
  {
    key: "contactEmail",
    label: "Contact email",
    type: "email",
    placeholder: "support@ideons.com",
    hint: "Customer-facing support email address.",
  },
  {
    key: "contactPhone",
    label: "Contact phone",
    type: "tel",
    placeholder: "+880 1XXX XXXXXX",
    hint: "Customer-facing support phone number.",
  },
  {
    key: "addressLine",
    label: "Business address",
    type: "text",
    placeholder: "House 12, Road 4, Gulshan, Dhaka",
    hint: "Physical business address (configurable until verified).",
  },
  {
    key: "deliveryChargeInsideDhaka",
    label: "Delivery charge inside Dhaka (৳)",
    type: "number",
    placeholder: "60",
    hint: "Standard delivery fee for Dhaka division.",
  },
  {
    key: "deliveryChargeOutsideDhaka",
    label: "Delivery charge outside Dhaka (৳)",
    type: "number",
    placeholder: "120",
    hint: "Standard delivery fee outside Dhaka.",
  },
  {
    key: "freeDeliveryOver",
    label: "Free delivery over (৳)",
    type: "number",
    placeholder: "0",
    hint: "0 disables free delivery threshold.",
  },
  {
    key: "currencySymbol",
    label: "Currency symbol",
    type: "text",
    placeholder: "৳",
    hint: "Symbol displayed with prices.",
  },
  {
    key: "lowStockThreshold",
    label: "Low-stock threshold",
    type: "number",
    placeholder: "5",
    hint: "Products at or below this stock are flagged low stock.",
  },
  {
    key: "maxItemsPerOrder",
    label: "Max items per order",
    type: "number",
    placeholder: "50",
    hint: "Maximum units a customer can order at once.",
  },
  {
    key: "allowReviews",
    label: "Allow customer reviews",
    type: "boolean",
    hint: "Let customers leave product reviews.",
  },
  {
    key: "codEnabled",
    label: "Cash on Delivery enabled",
    type: "boolean",
    hint: "Allow customers to pay on delivery.",
  },
  {
    key: "stripeEnabled",
    label: "Online card payment (Stripe) enabled",
    type: "boolean",
    hint: "Requires STRIPE_SECRET_KEY to be configured.",
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const result = await fetch("/api/admin/settings", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (result.ok) {
        const data = await result.json();
        setSettings(data.settings);
        setForm({ ...data.settings });
      } else {
        toast.error("Failed to load settings.");
      }
    } catch {
      toast.error("Network error while loading settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const patch = {};
      for (const field of SETTINGS_FIELDS) {
        const val = form[field.key];
        if (field.type === "boolean") {
          patch[field.key] = val === true || val === "true" || val === "on";
        } else if (field.type === "number") {
          patch[field.key] = val === "" ? 0 : Number(val);
        } else {
          patch[field.key] = val === undefined ? "" : String(val);
        }
      }
      const result = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (result.ok) {
        const data = await result.json();
        setSettings(data.settings);
        setForm({ ...data.settings });
        toast.success("Settings saved.");
      } else {
        const err = await result.json();
        toast.error(err.message || "Failed to save settings.");
      }
    } catch {
      toast.error("Network error while saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-navy-500">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <LinkButton href="/account">Back to account</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Store Settings</h1>
          <p className="mt-1 text-sm text-navy-500">
            Configure delivery, payments, and business information.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            General settings
          </h2>
        </div>
        <form onSubmit={handleSave} className="px-6 py-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SETTINGS_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-navy-600 mb-1">
                {field.label}
              </label>
              {field.type === "boolean" ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[field.key] === true || form[field.key] === "true" || form[field.key] === "on"}
                    onChange={(e) =>
                      handleChange(field.key, e.target.checked ? "true" : "false")
                    }
                    className="rounded border-navy-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-navy-700">Enabled</span>
                </label>
              ) : (
                <input
                  type={field.type}
                  name={field.key}
                  value={form[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              )}
              <p className="mt-1 text-xs text-navy-400">{field.hint}</p>
            </div>
          ))}
          <div className="col-span-full flex gap-3 pt-2">
            <Button type="submit" variant="brand" loading={saving} disabled={saving}>
              Save settings
            </Button>
            <Button type="button" variant="ghost" onClick={() => loadSettings()} disabled={saving}>
              Reload
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 flex justify-end">
        <LinkButton href="/account">Back to account</LinkButton>
      </div>
    </div>
  );
}

