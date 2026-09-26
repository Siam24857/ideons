"use client";

import Link from "next/link";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  Store,
  Heart,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;

  const logout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/signin";
        },
      },
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-purple-600"
        >
          <Store size={26} />
          <span>MarketHub</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-5 md:flex">

          <Link
            href="/marketplace"
            className="text-sm font-medium text-gray-700 hover:text-purple-600"
          >
            Marketplace
          </Link>

          <Link
            href="/favorites"
            className="text-gray-700 hover:text-purple-600"
            aria-label="Favorites"
          >
            <Heart size={21} />
          </Link>

          <Link
            href="/cart"
            className="relative text-gray-700 hover:text-purple-600"
            aria-label="Shopping cart"
          >
            <ShoppingCart size={21} />

            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] text-white">
              0
            </span>
          </Link>

          {/* User */}
          {isPending ? (
            <span className="text-sm text-gray-500">
              Loading...
            </span>
          ) : user ? (
            <>
              {/* Dashboard Link */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>

              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <User size={18} />
                <span>{user.name}</span>
              </Link>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} />
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/signin"
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <User size={18} />
              Login
            </Link>
          )}

          <Link
            href="/sell"
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            Become a Seller
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-md p-2 text-gray-700 md:hidden"
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t bg-white px-4 py-4 md:hidden">

          <div className="flex flex-col gap-2">

            <Link
              href="/marketplace"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100"
            >
              Marketplace
            </Link>

            <Link
              href="/favorites"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100"
            >
              <Heart size={18} />
              Favorites
            </Link>

            <Link
              href="/cart"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100"
            >
              <ShoppingCart size={18} />
              Cart
            </Link>

            {/* Mobile User */}
            {isPending ? (
              <span className="px-3 py-2.5 text-sm text-gray-500">
                Loading...
              </span>
            ) : user ? (
              <div className="flex flex-col gap-2">

                {/* Mobile Dashboard Link */}
                <Link
                  href="/Dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </Link>

                <Link 
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100"
                >
                  <User size={18} />
                  {user.name}
                </Link>

                {/* Mobile Logout */}
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={18} />
                  Logout
                </button>

              </div>
            ) : (
              <Link
                href="/signin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-100"
              >
                <User size={18} />
                Login
              </Link>
            )}

            <Link
              href="/sell"
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded-lg bg-purple-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Become a Seller
            </Link>

          </div>
        </div>
      )}
    </header>
  );
}