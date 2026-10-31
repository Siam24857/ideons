"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  Heart,
  User,
  Search,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  Bell,
  MapPin,
  Settings as SettingsIcon,
  Zap,
  Truck,
  Headphones,
  Gift,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/components/providers/StoreProvider";
import toast from "react-hot-toast";

import { Suspense } from "react";
import Container from "./Container";

export default function NavbarInner(props) {
  return (
    <Suspense fallback={null}>
      <NavbarInnerContent {...props} />
    </Suspense>
  );
}

function NavbarInnerContent({ categories = [] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authLoading, cartCount, wishlistCount } = useStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [query, setQuery] = useState("");
  const accountRef = useRef(null);
  const catRef = useRef(null);

  // Close dropdowns when the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
    setCatOpen(false);
  }, [pathname]);

  // Prefill the search box from ?q=
  useEffect(() => {
    const q = searchParams?.get("search") || searchParams?.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  // Close menus on outside click / Escape.
  useEffect(() => {
    const onClick = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
      if (catRef.current && !catRef.current.contains(event.target)) setCatOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setCatOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/products?search=${encodeURIComponent(value)}` : "/products");
  };

  const signOut = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message || "Could not sign out");
      return;
    }
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  };

  const isAdmin = user?.role === "admin";

  const navLink = (href, label) => (
    <Link
      href={href}
      className={`text-sm font-medium transition ${pathname === href ? "text-[#FFC928] bg-[#FFC928]/10" : "text-[#172337]"} hover:text-[#FFC928] hover:bg-[#F5F7FA] px-3 py-1.5 rounded-md`}
    >
      {label}
    </Link>
  );

  return (
    <>
      {/* Top Announcement Strip */}
      <div className="bg-[#0B2545] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6 lg:px-8">
          <p className="truncate">
            <span className="font-semibold text-[#FFC928]">IDeons</span> — Smart Products. Better Everyday Living.
            <span className="ml-3 flex items-center gap-1 text-[#FFD84D]">
              🇧🇩 Currency: ৳ (Bangladeshi Taka)
            </span>
          </p>
          <div className="hidden items-center gap-4 sm:flex">
            <Link href="/track" className="hover:text-[#FFD84D]">
              Track Order
            </Link>
            <Link href="/contact" className="hover:text-[#FFD84D]">
              Support
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-[#FFC928]/30 bg-[#123B69]/95 backdrop-blur-md">
        <Container>
          <div className="flex h-16 items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="IDeons home">
              <img
                src="https://i.postimg.cc/XJXVqLXB/Black-and-Gold-Elegant-Luxury-Flower-Jewelry-Logo.png"
                alt="IDeons logo"
                className="h-9 w-auto"
              />
            </Link>

            {/* Search Bar */}
            <form onSubmit={submitSearch} className="relative flex-1 md:block" role="search">
              <div className="relative mx-auto max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFC928]" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="w-full rounded-lg border border-[#FFC928] bg-white py-2.5 pl-9 pr-3 text-sm text-[#123B69] outline-none transition placeholder:text-[#123B69]/50 focus:border-[#FFD84D] focus:bg-white sm:w-80 caret-[#FFC928]"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-[#123B69] hover:text-[#FFC928]"
                  aria-label="Submit search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Icons */}
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className="relative rounded-lg p-2 text-[#172337] transition hover:bg-[#F5F7FA]"
              >
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFC928] px-1 text-[10px] font-bold text-[#123B69]">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>

              <Link
                href="/cart"
                aria-label="Shopping cart"
                className="relative rounded-lg p-2 text-[#172337] transition hover:bg-[#F5F7FA]"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFC928] px-1 text-[10px] font-bold text-[#123B69]">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {authLoading ? (
                <span className="h-8 w-8 animate-pulse rounded-full bg-[#EAEDED]" aria-hidden="true" />
              ) : user ? (
                <div className="relative" ref={accountRef}>
                  <button
                    type="button"
                    onClick={() => setAccountOpen((v) => !v)}
                    aria-expanded={accountOpen}
                    className="flex items-center gap-2 rounded-lg border border-[#FFC928]/30 px-2.5 py-1.5 text-sm font-medium text-[#172337] transition hover:bg-[#F5F7FA]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFC928] text-[11px] font-bold text-[#123B69]">
                      {(user.name || user.email || "U").charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden max-w-[100px] truncate sm:inline">{user.name}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#FFC928]/30 bg-white p-2 shadow-lg">
                      <div className="border-b border-[#EAEDED] px-3 py-2">
                        <p className="truncate text-sm font-semibold text-[#172337]">{user.name}</p>
                        <p className="truncate text-xs text-[#123B69]">{user.email}</p>
                      </div>
                      <MenuLink href="/account" icon={<User className="h-4 w-4" />} label="My Account" />
                      <MenuLink href="/account/orders" icon={<Package className="h-4 w-4" />} label="Orders" />
                      <MenuLink href="/account/addresses" icon={<MapPin className="h-4 w-4" />} label="Addresses" />
                      <MenuLink href="/account/notifications" icon={<Bell className="h-4 w-4" />} label="Notifications" />
                      {isAdmin && (
                        <MenuLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Admin Dashboard" />
                      )}
                      <button
                        type="button"
                        onClick={signOut}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/signin"
                  className="hidden items-center gap-1.5 rounded-lg border border-[#FFC928]/30 px-3 py-2 text-sm font-medium text-[#172337] transition hover:bg-[#F5F7FA] sm:flex"
                >
                  <User className="h-4 w-4" />
                  Sign in
                </Link>
              )}

              {/* Mobile toggle */}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg p-2 text-[#172337] lg:hidden"
                aria-label="Toggle navigation menu"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Categories */}
          <nav className="flex w-full overflow-x-auto whitespace-nowrap py-2">
            <Link
              href="/products"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition bg-[#FFC928] text-[#123B69] font-semibold shadow-sm hover:bg-[#FFD84D]`}
            >
              Browse All Products
            </Link>
            <Link
              href="/products"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname === "/products" ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"
              }`}
            >
              All Categories
            </Link>
            <Link
              href="/products?deal=today"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname.includes("deal=today") ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"
              }`}
            >
              Today's Deals
            </Link>
            <Link
              href="/products?sort=best-selling"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname.includes("sort=best-selling") ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"
              }`}
            >
              Best Sellers
            </Link>
            <Link
              href="/products?sort=newest"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname.includes("sort=newest") ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"
              }`}
            >
              New Arrivals
            </Link>
            <Link
              href="/products?category=technology-gadgets"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname.includes("category=technology-gadgets") ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"
              }`}
            >
              Electronics
            </Link>
            <Link
              href="/products?category=smart-home-products"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname.includes("category=smart-home-products") ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"
              }`}
            >
              Smart Home
            </Link>
            <Link
              href="/products?category=kitchen-accessories"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname.includes("category=kitchen-accessories") ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"
              }`}
            >
              Kitchen & Home
            </Link>
            <Link
              href="/products?category=household-essentials"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname.includes("category=household-essentials") ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"
              }`}
            >
              Household Essentials
            </Link>
            <Link
              href="/products?category=innovative-lifestyle-products"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname.includes("category=innovative-lifestyle-products") ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"
              }`}
            >
              Innovative Lifestyle
            </Link>
            <Link
              href="/contact"
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${pathname === "/contact" ? "bg-[#FFC928]/10 text-[#FFC928] font-semibold" : "text-[#172337] hover:bg-[#F5F7FA]"}`}
            >
              Customer Service
            </Link>
          </nav>
        </Container>
      </header>

      {/* Mobile search */}
      <div className="border-t border-[#EAEDED] px-4 py-2 md:hidden">
        <form onSubmit={submitSearch} role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FFC928]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full rounded-lg border border-[#EAEDED] bg-white py-2.5 pl-9 pr-3 text-sm text-[#123B69] outline-none focus:border-[#FFC928] caret-[#FFC928]"
            />
          </div>
        </form>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-[#EAEDED] bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            <Link href="/products" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#123B69] bg-[#FFC928] hover:bg-[#FFD84D]">
              Browse All Products
            </Link>
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[#FFC928]">Categories</p>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[#172337] hover:bg-[#F5F7FA]"
              >
                <span>{category.name}</span>
                <span className="text-xs text-[#123B69]">{category.count}</span>
              </Link>
            ))}
            <div className="my-2 border-t border-[#EAEDED]" />
            <Link href="/about" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#172337] hover:bg-[#F5F7FA]">
              About IDeons
            </Link>
            <Link href="/contact" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#172337] hover:bg-[#F5F7FA]">
              Contact & Support
            </Link>
            <Link href="/track" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#172337] hover:bg-[#F5F7FA]">
              Track Order
            </Link>
            <Link href="/faq" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#172337] hover:bg-[#F5F7FA]">
              FAQ
            </Link>

            <div className="my-2 border-t border-[#EAEDED]" />
            {user ? (
              <>
                <Link href="/account" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#172337] hover:bg-[#F5F7FA]">
                  My Account
                </Link>
                <Link href="/account/orders" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#172337] hover:bg-[#F5F7FA]">
                  Orders
                </Link>
                <Link href="/account/notifications" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#172337] hover:bg-[#F5F7FA]">
                  Notifications
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#FFC928] hover:bg-[#FFC928]/10">
                    Admin Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/signin"
                  className="flex-1 rounded-lg bg-[#FFC928] px-4 py-2.5 text-center text-sm font-semibold text-[#123B69]"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="flex-1 rounded-lg border border-[#FFC928] px-4 py-2.5 text-center text-sm font-semibold text-[#FFC928]"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MenuLink({ href, icon, label }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#172337] hover:bg-[#F5F7FA]"
    >
      {icon}
      {label}
    </Link>
  );
}
