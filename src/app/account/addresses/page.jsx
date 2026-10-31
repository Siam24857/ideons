"use client";

import { useEffect, useState, useCallback } from "react";
import { api, errorMessage } from "@/lib/api-client";
import toast from "react-hot-toast";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    country: "Bangladesh",
    division: "",
    district: "",
    city: "",
    streetAddress: "",
    houseInfo: "",
    postalCode: "",
    deliveryInstructions: "",
    label: "",
    isDefault: false,
  });

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/api/addresses");
      if (result.ok) {
        setAddresses(result.data?.items || []);
      } else {
        toast.error(errorMessage(result));
      }
    } catch {
      toast.error("Network error while loading addresses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      phone: "",
      email: "",
      country: "Bangladesh",
      division: "",
      district: "",
      city: "",
      streetAddress: "",
      houseInfo: "",
      postalCode: "",
      deliveryInstructions: "",
      label: "",
      isDefault: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        postalCode: form.postalCode || undefined,
        houseInfo: form.houseInfo || undefined,
        deliveryInstructions: form.deliveryInstructions || undefined,
        label: form.label || undefined,
      };
      if (editingId) {
        const result = await api.patch(`/api/addresses/${editingId}`, payload);
        if (result.ok) {
          toast.success("Address updated.");
          resetForm();
          loadAddresses();
        } else {
          toast.error(errorMessage(result));
        }
      } else {
        const result = await api.post("/api/addresses", payload);
        if (result.ok) {
          toast.success("Address saved.");
          resetForm();
          loadAddresses();
        } else {
          toast.error(errorMessage(result));
        }
      }
    } catch {
      toast.error("Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (addr) => {
    setForm({
      fullName: addr.fullName || "",
      phone: addr.phone || "",
      email: addr.email || "",
      country: addr.country || "Bangladesh",
      division: addr.division || "",
      district: addr.district || "",
      city: addr.city || "",
      streetAddress: addr.streetAddress || "",
      houseInfo: addr.houseInfo || "",
      postalCode: addr.postalCode || "",
      deliveryInstructions: addr.deliveryInstructions || "",
      label: addr.label || "",
      isDefault: !!addr.isDefault,
    });
    setEditingId(addr._id);
    setShowForm(true);
  };

  const handleSetDefault = async (id) => {
    setSaving(true);
    try {
      const result = await api.patch(`/api/addresses/${id}`, { isDefault: true });
      if (result.ok) {
        toast.success("Default address updated.");
        loadAddresses();
      } else {
        toast.error(errorMessage(result));
      }
    } catch {
      toast.error("Failed to set default address.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    setSaving(true);
    try {
      const result = await api.delete(`/api/addresses/${id}`);
      if (result.ok) {
        toast.success("Address removed.");
        loadAddresses();
      } else {
        toast.error(errorMessage(result));
      }
    } catch {
      toast.error("Failed to delete address.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-navy-500">Loading addresses…</p>
        </div>
      </div>
    );
  }

  const defaultAddr = addresses.find((a) => a.isDefault);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Saved Addresses</h1>
          <p className="mt-1 text-sm text-navy-500">
            Manage your delivery addresses for checkout.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          variant="brand"
          className="w-auto"
        >
          + Add address
        </Button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="mb-8 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-navy-950 uppercase tracking-wider">
            {editingId ? "Edit address" : "Add new address"}
          </h2>
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-600 mb-1">
                Recipient full name
              </label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">
                Phone number
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="+880 1XXX XXXXXX"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">
                Email (optional)
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">
                Country
              </label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-600 mb-1">
                Division / state
              </label>
              <input
                name="division"
                value={form.division}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">
                District
              </label>
              <input
                name="district"
                value={form.district}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">
                City / area
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-600 mb-1">
                Street address
              </label>
              <input
                name="streetAddress"
                value={form.streetAddress}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">
                House / road / apartment
              </label>
              <input
                name="houseInfo"
                value={form.houseInfo}
                onChange={handleChange}
                placeholder="e.g. House 12, Road 4"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-600 mb-1">
                Postal code
              </label>
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                type="number"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-600 mb-1">
                Delivery instructions (optional)
              </label>
              <textarea
                name="deliveryInstructions"
                value={form.deliveryInstructions}
                onChange={handleChange}
                rows={2}
                placeholder="e.g. Call before delivery, leave at gate"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-navy-600 mb-1">
                Label (e.g. Home, Office)
              </label>
              <input
                name="label"
                value={form.label}
                onChange={handleChange}
                placeholder="Home"
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="isDefault"
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-navy-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm text-navy-600">
                Set as default address
              </label>
            </div>
            <div className="col-span-2 flex gap-3">
              <Button
                type="submit"
                variant="brand"
                loading={saving}
                disabled={saving}
              >
                {editingId ? "Update address" : "Save address"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Address list */}
      <div className="rounded-2xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        {addresses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-500 text-2xl mb-3">
              📍
            </div>
            <h2 className="text-lg font-semibold text-navy-900">No saved addresses</h2>
            <p className="mt-2 max-w-md text-sm text-navy-500 mx-auto">
              Add a delivery address to speed up checkout.
            </p>
            <Button
              variant="brand"
              className="mt-5"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              + Add address
            </Button>
          </div>
        ) : (
          <table className="w-full text-left divide-y divide-navy-100">
            <thead>
              <tr className="bg-navy-50">
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Address</th>
                <th className="px-6 py-3 text-xs font-semibold text-navy-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {addresses.map((addr) => (
                <tr key={addr._id} className="hover:bg-navy-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-950">
                          {addr.label ? `${addr.label} — ` : ""}{addr.fullName}
                        </p>
                        <p className="text-xs text-navy-500 truncate">
                          {addr.streetAddress}
                          {addr.houseInfo && `, ${addr.houseInfo}`}
                        </p>
                        <p className="text-xs text-navy-500 truncate">
                          {addr.city}, {addr.district}, {addr.division},{' '}
                          {addr.country}
                        </p>
                        <p className="text-xs text-navy-400 mt-1">
                          {addr.postalCode ? addr.postalCode + " · " : ""}{addr.phone}
                        </p>
                        {addr.deliveryInstructions && (
                          <p className="text-xs text-navy-400 mt-1 italic">
                            {addr.deliveryInstructions}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          addr.isDefault
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-white text-navy-600 border-navy-200"
                        }`}
                      >
                        {addr.isDefault ? "Default" : "Set default"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {addr.isDefault ? (
                        <span className="text-xs text-blue-600 font-medium">
                          Default address
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSetDefault(addr._id)}
                        >
                          Set default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(addr)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(addr._id)}
                        loading={saving}
                        disabled={saving}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8 flex gap-3 justify-end">
        <LinkButton href="/account">Back to account</LinkButton>
      </div>
    </div>
  );
}

