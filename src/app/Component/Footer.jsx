import Link from "next/link";

import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";

import {
  FiShoppingBag,
  FiMail,
  FiMapPin,
  FiPhone,
} from "react-icons/fi";
export default function Footer() {
  return (
    <footer className="border-t bg-gray-950 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Main Footer */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div>
            <Link
              href="/"
              className="mb-4 flex items-center gap-2 text-xl font-bold text-white"
            >
              <FiShoppingBag size={25} />
              MarketHub
            </Link>

            <p className="max-w-sm text-sm leading-6 text-gray-400">
              Discover quality products and services from trusted sellers
              around the world.
            </p>

            {/* Social Icons */}
            <div className="mt-5 flex gap-3">

              <a
                href="#"
                aria-label="Facebook"
                className="rounded-lg border border-gray-800 p-2 hover:bg-gray-800"
              >
                <FaFacebookF size={17} />
              </a>

              <a
                href="#"
                aria-label="Twitter"
                className="rounded-lg border border-gray-800 p-2 hover:bg-gray-800"
              >
                <FaTwitter size={17} />
              </a>

              <a
                href="#"
                aria-label="Instagram"
                className="rounded-lg border border-gray-800 p-2 hover:bg-gray-800"
              >
                <FaInstagram size={17} />
              </a>

              <a
                href="#"
                aria-label="LinkedIn"
                className="rounded-lg border border-gray-800 p-2 hover:bg-gray-800"
              >
                <FaLinkedinIn size={17} />
              </a>

            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="mb-4 font-semibold text-white">
              Marketplace
            </h3>

            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/marketplace" className="hover:text-white">
                  Browse Marketplace
                </Link>
              </li>

              <li>
                <Link href="/categories" className="hover:text-white">
                  Categories
                </Link>
              </li>

              <li>
                <Link href="/featured" className="hover:text-white">
                  Featured Products
                </Link>
              </li>

              <li>
                <Link href="/deals" className="hover:text-white">
                  Deals & Offers
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 font-semibold text-white">
              Company
            </h3>

            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className="hover:text-white">
                  About Us
                </Link>
              </li>

              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact Us
                </Link>
              </li>

              <li>
                <Link href="/help" className="hover:text-white">
                  Help Center
                </Link>
              </li>

              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms & Conditions
                </Link>
              </li>

              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-semibold text-white">
              Get in Touch
            </h3>

            <ul className="space-y-4 text-sm">

              <li className="flex gap-3">
                <FiMail
                  size={18}
                  className="mt-0.5 shrnavy-0 text-purple-400"
                />
                <span>support@markethub.com</span>
              </li>

              <li className="flex gap-3">
                <FiPhone
                  size={18}
                  className="mt-0.5 shrnavy-0 text-purple-400"
                />
                <span>+880 1234-567890</span>
              </li>

              <li className="flex gap-3">
                <FiMapPin
                  size={18}
                  className="mt-0.5 shrnavy-0 text-purple-400"
                />
                <span>Dhaka, Bangladesh</span>
              </li>

            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>
              <h3 className="font-semibold text-white">
                Stay updated
              </h3>

              <p className="mt-1 text-sm text-gray-400">
                Get the latest products, deals and marketplace updates.
              </p>
            </div>

            <div className="flex w-full max-w-md">
              <input
                type="email"
                placeholder="Enter your email"
                className="min-w-0 flex-1 rounded-l-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-purple-500"
              />

              <button
                type="button"
                className="rounded-r-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
              >
                Subscribe
              </button>
            </div>

          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 flex flex-col gap-3 border-t border-gray-800 pt-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">

          <p>
            © {new Date().getFullYear()} MarketHub. All rights reserved.
          </p>

          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-gray-300">
              Privacy
            </Link>

            <Link href="/terms" className="hover:text-gray-300">
              Terms
            </Link>

            <Link href="/contact" className="hover:text-gray-300">
              Contact
            </Link>
          </div>

        </div>

      </div>
    </footer>
  );
}
