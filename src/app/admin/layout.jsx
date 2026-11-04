import React from "react";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-navy-950">Access Denied</h1>
          <p className="mt-2 text-sm text-navy-500">
            Administrator access is required.
          </p>
          <a
            href="/account"
            className="mt-4 inline-block bg-navy-950 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-navy-800"
          >
            Back to account
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col bg-white md:flex-row">
      {/* Mobile top nav */}
      <div className="border-b border-navy-100 bg-white p-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-lg font-black text-navy-950">
            I
          </span>
          <span className="text-lg font-extrabold tracking-tight text-navy-950">IDeons</span>
        </div>
        <nav className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {[
            { name: "Overview", href: "/admin" },
            { name: "Orders", href: "/admin/orders" },
            { name: "Customers", href: "/admin/users" },
            { name: "Products", href: "/admin/products" },
            { name: "Settings", href: "/admin/settings" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50"
            >
              {link.name}
            </a>
          ))}
        </nav>
      </div>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-navy-100 bg-white md:block">
        <div className="p-6">
          <a href="/" className="flex items-center gap-2 mb-8">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-lg font-black text-navy-950">
              I
            </span>
            <span className="text-lg font-extrabold tracking-tight text-navy-950">
              IDeons
            </span>
          </a>
          <nav className="space-y-1">
            {[
              { name: "Overview", href: "/admin" },
              { name: "Orders", href: "/admin/orders" },
              { name: "Customers", href: "/admin/users" },
              { name: "Products", href: "/admin/products" },
              { name: "Settings", href: "/admin/settings" },
            ].map((link) => {
              const active = typeof window !== "undefined"
                ? window.location.pathname === link.href
                : false;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-navy-700 hover:bg-navy-50 hover:text-blue-600"
                  }`}
                >
                  {link.name}
                </a>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="flex-1 bg-navy-50 pb-12 min-w-0">{children}</main>
    </div>
  );
}

