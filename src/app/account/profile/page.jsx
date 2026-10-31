"use client";

import { useEffect, useState, useCallback } from "react";
import { api, errorMessage } from "@/lib/api-client";
import toast from "react-hot-toast";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";

export default function AccountProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  const loadProfile = useCallback(async () => {
    try {
      const result = await api.get("/api/user/profile");
      if (result.ok) {
        setUser(result.data.user);
        setForm({ name: result.data.user.name || "", email: result.data.user.email || "" });
      } else {
        toast.error(errorMessage(result));
      }
    } catch {
      toast.error("Network error while loading profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api.patch("/api/user/profile", {
        name: form.name || undefined,
        email: form.email || undefined,
      });
      if (result.ok) {
        toast.success("Profile updated successfully.");
        if (user) setUser({ ...user, name: form.name, email: form.email });
      } else {
        toast.error(errorMessage(result));
      }
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-navy-500">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <LinkButton href="/account">Back to account</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Profile</h1>
          <p className="mt-1 text-sm text-navy-500">
            Manage your account information.
          </p>
        </div>
        <LinkButton href="/account">Back to account</LinkButton>
      </div>

      {/* Profile card */}
      <div className="mb-8 rounded-2xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">Account details</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Full name</p>
              <p className="text-navy-900">{user.name || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Email address</p>
              <p className="text-navy-900 break-all">{user.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Role</p>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-blue-200 bg-blue-50 text-blue-700">
                {user.role || "customer"}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Member since</p>
              <p className="text-navy-900">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Email verified</p>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                user.emailVerified ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-navy-200 bg-navy-50 text-navy-600"
              }`}>
                {user.emailVerified ? "Verified" : "Not verified"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-2xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">Edit profile</h2>
        </div>
        <form onSubmit={handleSave} className="px-6 py-6 grid gap-4 sm:grid-cols-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-navy-600 mb-1">Full name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter your full name"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-navy-600 mb-1">Email address</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              type="email"
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="you@example.com"
            />
          </div>
          <div className="col-span-2 flex gap-3">
            <Button type="submit" variant="brand" loading={saving} disabled={saving}>
              Save changes
            </Button>
            <Button type="button" variant="ghost" onClick={() => loadProfile()} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

