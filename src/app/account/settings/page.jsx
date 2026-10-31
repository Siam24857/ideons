import { getSession } from "@/lib/session";
import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/Buttons";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await getSession();
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-navy-950">Please sign in</h1>
          <p className="mt-2 text-sm text-navy-500">
            Sign in to manage your account settings.
          </p>
          <LinkButton href="/signin" variant="primary" className="mt-4">
            Sign in
          </LinkButton>
        </div>
      </div>
    );
  }

  const user = session.user;
  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Account Settings</h1>
          <p className="mt-1 text-sm text-navy-500">
            Manage your account preferences and security.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-navy-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
            Account information
          </h2>
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
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-navy-200 bg-navy-50 text-navy-600">
                {user.role || "customer"}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase">Member since</p>
              <p className="text-navy-900">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-navy-100">
          <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider mb-4">
            Manage account
          </h2>
          <div className="space-y-3">
            <Link
              href="/account/profile"
              className="block px-4 py-3 rounded-xl border border-navy-100 bg-white hover:bg-navy-50 hover:border-blue-200 text-sm font-medium text-navy-900 transition"
            >
              Edit profile (name & email)
            </Link>
            <Link
              href="/account/addresses"
              className="block px-4 py-3 rounded-xl border border-navy-100 bg-white hover:bg-navy-50 hover:border-blue-200 text-sm font-medium text-navy-900 transition"
            >
              Manage delivery addresses
            </Link>
            <Link
              href="/account/notifications"
              className="block px-4 py-3 rounded-xl border border-navy-100 bg-white hover:bg-navy-50 hover:border-blue-200 text-sm font-medium text-navy-900 transition"
            >
              Notification preferences
            </Link>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-8 rounded-2xl border border-navy-100 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-100">
            <h2 className="text-lg font-semibold text-navy-950 uppercase tracking-wider">
              Store settings
            </h2>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-navy-600 mb-4">
              As an administrator, you can configure delivery charges, payment
              methods, and business information.
            </p>
            <LinkButton
              href="/admin/settings"
              variant="brand"
              className="w-auto"
            >
              Open store settings
            </LinkButton>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <LinkButton href="/account">Back to account</LinkButton>
      </div>
    </div>
  );
}

