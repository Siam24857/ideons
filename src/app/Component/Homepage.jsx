import Link from "next/link";
import {
  FiArrowRight,
  FiShoppingBag,
  FiCode,
  FiLayers,
} from "react-icons/fi";

export default function Homepage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            
            {/* Left Content */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
                <FiShoppingBag />
                <span>Modern Digital Marketplace</span>
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Find the right
                <span className="text-purple-500"> digital services </span>
                for your next project.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
                Discover websites, development services, design solutions and
                digital products from talented creators.
              </p>

              {/* Buttons */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold transition hover:bg-purple-700"
                >
                  Explore Marketplace
                  <FiArrowRight />
                </Link>

                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-6 py-3 font-semibold transition hover:bg-slate-900"
                >
                  View Services
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-slate-800 pt-8">
                <div>
                  <h3 className="text-2xl font-bold">500+</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Services
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold">100+</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Creators
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold">1K+</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Customers
                  </p>
                </div>
              </div>
            </div>

            {/* Right Cards */}
            <div className="relative">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Featured Service
                    </p>
                    <h2 className="mt-1 text-xl font-bold">
                      Full-Stack Website
                    </h2>
                  </div>

                  <div className="rounded-xl bg-purple-600/20 p-3 text-purple-400">
                    <FiCode size={24} />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-800 p-5">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600">
                      <FiLayers size={22} />
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        Professional Development
                      </h3>
                      <p className="text-sm text-slate-400">
                        React · Next.js · Node.js
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-slate-400">
                    Build modern, responsive and scalable web applications
                    for your business or personal project.
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-700 pt-4">
                    <span className="text-sm text-slate-400">
                      Starting from
                    </span>

                    <span className="text-xl font-bold text-purple-400">
                      $80
                    </span>
                  </div>
                </div>

                <Link
                  href="/marketplace"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Browse Services
                  <FiArrowRight />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <p className="font-semibold text-purple-600">
              Explore Categories
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Everything you need in one place
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-slate-500">
              Explore our marketplace and find the right digital service
              for your next idea.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Web Development",
                text: "Modern websites and web applications.",
              },
              {
                title: "UI/UX Design",
                text: "Clean and professional interface designs.",
              },
              {
                title: "E-Commerce",
                text: "Powerful online stores for businesses.",
              },
              {
                title: "Digital Products",
                text: "Ready-to-use digital products and solutions.",
              },
            ].map((category) => (
              <Link
                key={category.title}
                href="/marketplace"
                className="group rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg"
              >
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600">
                  {category.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {category.text}
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-purple-600">
                  Explore
                  <FiArrowRight />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}