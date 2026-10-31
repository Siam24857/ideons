import Link from "next/link";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  Headphones,
  Smartphone,
  Home,
  CookingPot,
  Package,
  Sparkles,
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/ui/EmptyState";
import Rating from "@/components/ui/Rating";
import NewsletterForm from "@/components/home/NewsletterForm";
import HeroCarousel from "@/components/home/HeroCarousel";
import ShoppingCards from "@/components/home/ShoppingCards";
import Container from "@/components/layout/Container";
import { STORE, DEFAULT_CATEGORIES } from "@/lib/constants";
import { getHomeSections } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { collections } from "@/lib/db";
import { formatMoney } from "@/lib/money";

const CATEGORY_ICONS = {
  "technology-gadgets": Smartphone,
  "smart-home-products": Home,
  "kitchen-accessories": CookingPot,
  "household-essentials": Package,
  "innovative-lifestyle-products": Sparkles,
};

const SECTION_CONFIGS = [
  {
    key: "smartTech",
    eyebrow: "Smart technology",
    title: "Technology Gadgets",
    description: "Handy tech that solves everyday problems.",
    href: "/products?category=technology-gadgets",
  },
  {
    key: "smartHome",
    eyebrow: "Smart Home",
    title: "Smart Home Products",
    description: "Make your home more convenient.",
    href: "/products?category=smart-home-products",
  },
  {
    key: "kitchen",
    eyebrow: "Kitchen Products",
    title: "Kitchen Accessories",
    description: "Practical tools that save time while you cook.",
    href: "/products?category=kitchen-accessories",
  },
  {
    key: "household",
    eyebrow: "Home Essentials",
    title: "Household Essentials",
    description: "Reliable products for a smoother routine.",
    href: "/products?category=household-essentials",
  },
];

async function loadTestimonials() {
  try {
    const { reviews } = await collections();
    const docs = await reviews
      .find({ status: { $ne: "hidden" } })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();
    return docs
      .filter((r) => r.userId && r.comment)
      .slice(0, 3)
      .map((r) => ({
        _id: String(r._id),
        rating: r.rating,
        comment: r.comment,
        userName: r.userName || "Customer",
        isVerified: Boolean(r.verifiedPurchase),
      }));
  } catch {
    return [];
  }
}

export default async function HomePage({ searchParams }) {
  const [sections, settings, testimonials] = await Promise.all([
    getHomeSections(),
    getSettings(),
    loadTestimonials(),
  ]).catch((error) => {
    console.error("[home] failed to load data:", error);
    return [
      {
        categories: [],
        featured: [],
        newest: [],
        trending: [],
        bestSellers: [],
        sections: {},
        stats: { totalProducts: 0, totalCategories: 0, totalReviews: 0 },
        hasSalesData: false,
      },
      null,
      [],
    ];
  });

  const symbol = settings?.currencySymbol || "৳";
  const stats = sections.stats || {};

  const allFeatured = sections.featured || [];
  const mosquitoProduct = allFeatured.find(
    (p) => (p.title || "").toLowerCase().includes("mosquito")
  );
  const heroProduct = mosquitoProduct || allFeatured[0];
  const hasHero = Boolean(heroProduct);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <HeroCarousel featuredProduct={heroProduct} hasHero={hasHero} symbol={symbol} />
      <ShoppingCards products={sections.featured || []} symbol={symbol} />

      <section className="bg-white py-12">
        <Container>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionHeading
                eyebrow="Explore"
                title="Shop by category"
                description="Five focused categories, chosen to keep everyday shopping simple."
              />
            </div>
            <Link
              href="/products"
              className="text-sm font-semibold text-[#FFC928] hover:text-[#FFD84D] flex items-center gap-1"
            >
              View all categories <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DEFAULT_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.slug] || Package;
              const live = sections.categories?.find((c) => c.slug === category.slug);
              return (
                <Link
                  key={category.slug}
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  className="group block rounded-xl border border-[#EAEDED] bg-white p-5 transition hover:border-[#FFC928] hover:bg-[#FFC928]/5 hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFC928]/10 text-[#FFC928] transition group-hover:bg-[#FFC928] group-hover:text-[#123B69]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-[#172337]">{category.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667eea]">{category.description}</p>
                  <p className="mt-3 text-xs font-semibold text-[#FFC928]">
                    {live?.count ?? 0} product{(live?.count ?? 0) === 1 ? "" : "s"}
                  </p>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {sections.featured?.length > 0 && (
        <ProductSection
          eyebrow="Featured products"
          title="Featured products"
          description="Products our catalogue highlights right now."
          products={sections.featured}
          symbol={symbol}
          href="/products"
          action="View all"
        />
      )}

      {SECTION_CONFIGS.map((block) => {
        const products = sections.sections?.[block.key] || [];
        if (!products.length) return null;
        return (
          <ProductSection
            key={block.key}
            eyebrow={block.eyebrow}
            title={block.title}
            description={block.description}
            products={products}
            symbol={symbol}
            href={block.href}
            action="See all"
          />
        );
      })}

      {sections.trending?.length > 0 && (
        <ProductSection
          eyebrow="Popular now"
          title="Trending products"
          description="Products customers rate highly in our catalogue."
          products={sections.trending}
          symbol={symbol}
          href="/products?sort=rating"
          action="View all"
        />
      )}

      {sections.newest?.length > 0 && (
        <ProductSection
          eyebrow="Just added"
          title="New arrivals"
          description="The latest additions to the IDeons catalogue."
          products={sections.newest}
          symbol={symbol}
          href="/products?sort=newest"
          action="View all"
        />
      )}

      {sections.hasSalesData && sections.bestSellers?.length > 0 && (
        <ProductSection
          eyebrow="Best sellers"
          title="Best sellers"
          description="Ranked by real sales recorded in our store."
          products={sections.bestSellers}
          symbol={symbol}
          href="/products?sort=best-selling"
          action="View all"
        />
      )}

      <section className="bg-white py-12">
        <Container>
          <SectionHeading
            eyebrow="Why shop at IDeons"
            title="Customer benefits"
            description="A straightforward shopping experience from browsing to delivery."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Package,
                title: "Useful, practical products",
                text: "A focused range of gadgets, smart home, kitchen and household products.",
              },
              {
                icon: Truck,
                title: "Delivery across Bangladesh",
                text: "Delivery charges are shown before you confirm your order.",
              },
              {
                icon: ShieldCheck,
                title: "Secure checkout",
                text: "Prices and stock are verified on our server before an order is created.",
              },
              {
                icon: Headphones,
                title: "Order support",
                text: "Track your order and reach our team through the contact page.",
              },
            ].map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="rounded-xl border border-[#EAEDED] bg-white p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFC928]/10 text-[#FFC928]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-[#172337]">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#667eea]">{benefit.text}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {testimonials.length > 0 && (
        <section className="bg-[#EAEDED] py-12">
          <Container>
            <SectionHeading
              eyebrow="Verified customers"
              title="What customers say"
              description="Reviews written by customers in their own account after ordering."
            />
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((review) => (
                <figure key={review._id} className="rounded-xl border border-[#EAEDED] bg-white p-6 shadow-sm">
                  <Rating value={review.rating} showCount={false} />
                  <blockquote className="mt-3 text-sm leading-6 text-[#172337]">“{review.comment}”</blockquote>
                  <figcaption className="mt-4 text-xs font-semibold text-[#172337]">
                    {review.userName}
                    {review.isVerified && <span className="ml-2 text-[#FFC928]">Verified purchase</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="bg-[#123B69] py-10">
        <Container>
          <div className="flex flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <h2 className="text-xl font-bold text-white">Stay updated</h2>
              <p className="mt-1 text-sm text-[#EAF3FF]">
                Get notified about new smart products and offers from IDeons.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </Container>
      </section>
    </div>
  );
}

function ProductSection({ eyebrow, title, description, products, symbol, href, action }) {
  return (
    <section className="bg-white py-12">
      <Container>
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#FFC928]">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl text-[#123B69]">
              {title}
            </h2>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667eea]">{description}</p>
            )}
          </div>
          <Link
            href={href}
            className="text-sm font-semibold text-[#FFC928] hover:text-[#FFD814]"
          >
            {action} →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} symbol={symbol} />
          ))}
        </div>
      </Container>
    </section>
  );
}
