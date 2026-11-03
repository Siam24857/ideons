import Link from "next/link";

export const metadata = {
  title: "About | IDeons Marketplace",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA]">
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[#0B2545]">About IDeons Marketplace</h1>
        <p className="mt-4 text-base leading-7 text-[#172337]">
          IDeons Marketplace is your trusted destination for smart products and
          everyday essentials. We bring together innovative, high-quality items
          that make life easier, more comfortable, and more efficient.
        </p>
        <p className="mt-4 text-base leading-7 text-[#172337]">
          From smart home gadgets to household essentials, our curated collection
          is designed to deliver value, reliability, and convenience to customers
          across Bangladesh.
        </p>
        <div className="mt-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-lg bg-[#FFC928] px-6 py-3 text-sm font-bold text-[#123B69] transition hover:bg-[#FFD84D]"
          >
            Browse All Products
          </Link>
        </div>
      </section>
    </main>
  );
}
