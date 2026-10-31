"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiHome,
  FiUser,
  FiPackage,
  FiMapPin,
  FiBell,
  FiSettings,
  FiLogOut,
  FiCreditCard,
} from "react-icons/fi";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/components/providers/StoreProvider";
import toast from "react-hot-toast";

const links = [
  { name: "Overview", href: "/account", icon: FiHome },
  { name: "Profile", href: "/account/profile", icon: FiUser },
  { name: "Saved Addresses", href: "/account/addresses", icon: FiMapPin },
  { name: "Shopping Cart", href: "/cart", icon: FiCreditCard },
  { name: "Order History", href: "/account/orders", icon: FiPackage },
  { name: "Notifications", href: "/account/notifications", icon: FiBell },
  { name: "Account Settings", href: "/account/settings", icon: FiSettings },
];

export default function AccountLayout({ children }) {
  const pathname = usePathname();
  const { user } = useStore();
  const router = useRouter();

  const signOut = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message || "Could not sign out");
      return;
    }
    toast.success("Signed out");
    router.push("/");
  };

  return (
    <div className="flex gap-0 bg-white min-h-screen">
      <aside className="w-64 border-r border-navy-100 bg-white shrnavy-0">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-lg font-black text-navy-950">
              I
            </span>
            <span className="text-lg font-extrabold tracking-tight text-navy-950">IDeons</span>
          </Link>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-navy-700 hover:bg-navy-50 hover:text-blue-600"
                  }`}
                >
                  <Icon size={17} />
                  {link.name}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 border-t border-navy-100 pt-6">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-navy-700 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <FiLogOut size={17} />
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 bg-navy-50 pb-12">{children}</main>
    </div>
  );
}

