"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiUser,
  FiShoppingCart,
  FiPackage,
  FiHeart,
  FiClock,
  FiStar,
  FiSettings,
  FiLogOut,
  FiHome,
} from "react-icons/fi";

export default function UserDashboardSidebar() {
  const pathname = usePathname();

  const links = [
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: FiUser,
    },
    {
      name: "Add to Cart",
      href: "/Dashboard/Cartproduct",
      icon: FiShoppingCart,
    },
    {
      name: "My Orders",
      href: "/Dashboard/Orders",
      icon: FiPackage,
    },
    {
      name: "Buying History",
      href: "/dashboard/buying-history",
      icon: FiClock,
    },
    {
      name: "Wishlist",
      href: "/dashboard/wishlist",
      icon: FiHeart,
    },
    {
      name: "My Reviews",
      href: "/dashboard/reviews",
      icon: FiStar,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: FiSettings,
    },
  ];

  return (
    <aside className="w-64  border border-gray-200 bg-white p-4 shadow-sm">
      {/* Dashboard */}
      <Link
        href="/dashboard"
        className={`mb-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
          pathname === "/dashboard"
            ? "bg-purple-600 text-white"
            : "text-gray-700 hover:bg-purple-50 hover:text-purple-600"
        }`}
      >
        <FiHome size={19} />
        Dashboard
      </Link>

      {/* User Links */}
      <div className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;

          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-purple-600 text-white"
                  : "text-gray-700 hover:bg-purple-50 hover:text-purple-600"
              }`}
            >
              <Icon size={19} />
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <div className="mt-4 border-t border-gray-200 pt-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-red-50 hover:text-red-600"
        >
          <FiLogOut size={19} />
          Logout
        </button>
      </div>
    </aside>
  );
}
 
