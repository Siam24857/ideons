import Link from "next/link";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { getSettings } from "@/lib/settings";

/**
 * Professional footer. Business contact details are read from the store
 * settings: nothing here invents a phone number, address or support promise
 * that the owner has not configured.
 */
export default async function Footer() {
  let settings = null;
  try {
    settings = await getSettings();
  } catch {
    settings = null;
  }

  const contactItems = [
    settings?.contactEmail
      ? { icon: Mail, label: settings.contactEmail, href: `mailto:${settings.contactEmail}` }
      : null,
    settings?.contactPhone ? { icon: Phone, label: settings.contactPhone, href: `tel:${settings.contactPhone}` } : null,
    settings?.addressLine ? { icon: MapPin, label: settings.addressLine, href: null } : null,
  ].filter(Boolean);

  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-navy-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
          <Link href="/" className="flex items-center gap-2">
            <span>
              <span className="block text-lg font-extrabold text-white">IDeons</span>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-400">
                Better Everyday Living
              </span>
            </span>
          </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-navy-400">
              IDeons brings useful technology gadgets, smart home solutions, practical kitchen
              products and household essentials to customers in Bangladesh.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Shop</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/products" className="hover:text-white">All Products</Link></li>
              <li><Link href="/products?category=technology-gadgets" className="hover:text-white">Technology Gadgets</Link></li>
              <li><Link href="/products?category=smart-home-products" className="hover:text-white">Smart Home Products</Link></li>
              <li><Link href="/products?category=kitchen-accessories" className="hover:text-white">Kitchen Accessories</Link></li>
              <li><Link href="/products?category=household-essentials" className="hover:text-white">Household Essentials</Link></li>
            </ul>
          </div>

          {/* Customer care */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Customer Care</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white">About IDeons</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
              <li><Link href="/track" className="hover:text-white">Track Your Order</Link></li>
              <li><Link href="/faq" className="hover:text-white">Frequently Asked Questions</Link></li>
              <li><Link href="/shipping" className="hover:text-white">Shipping & Delivery</Link></li>
              <li><Link href="/returns" className="hover:text-white">Return & Refund Policy</Link></li>
            </ul>
          </div>

          {/* Contact / policies */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Policies</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms & Conditions</Link></li>
            </ul>

            <ul className="mt-5 space-y-3 text-sm">
              {contactItems.length === 0 && (
                <li className="flex items-start gap-2 text-navy-400">
                  <Clock className="mt-0.5 h-4 w-4 shrnavy-0" />
                  <span>Contact details will be published once configured.</span>
                </li>
              )}
              {contactItems.map((item) => {
                const Icon = item.icon;
                const content = (
                  <span className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrnavy-0 text-blue-400" />
                    <span className="break-all">{item.label}</span>
                  </span>
                );
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <a href={item.href} className="hover:text-white">{content}</a>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-navy-800 pt-6 text-xs text-navy-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} IDeons. All rights reserved. — Smart Products. Better
            Everyday Living.
          </p>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="hover:text-navy-300">Privacy</Link>
            <Link href="/terms" className="hover:text-navy-300">Terms</Link>
            <Link href="/shipping" className="hover:text-navy-300">Shipping</Link>
            <Link href="/returns" className="hover:text-navy-300">Returns</Link>
            <Link href="/contact" className="hover:text-navy-300">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

