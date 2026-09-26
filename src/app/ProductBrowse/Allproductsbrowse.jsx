
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiHeart,
  FiShoppingCart,
  FiSearch,
  FiStar,
  FiFilter,
  FiChevronDown,
} from "react-icons/fi";

const product = [
  {
    id: 1,
    title: "Premium Wireless Headphones",
    slug: "premium-wireless-headphones",
    category: "Electronics",
    subCategory: "Audio",
    price: 59.99,
    oldPrice: 79.99,
    discount: 25,
    rating: 4.8,
    reviewsCount: 124,
    stock: 45,
    brand: "SoundPro",
    badge: "Best Seller",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1000",
    ],
    description:
      "Premium wireless headphones with high-quality sound, comfortable ear cushions and long battery life. Perfect for music, gaming and everyday use.",
    features: [
      "Bluetooth 5.3",
      "40 Hours Battery",
      "Noise Cancellation",
      "Fast Charging",
      "Built-in Microphone",
    ],
    seller: {
      name: "Tech Store",
      rating: 4.8,
    },
    reviews: [
      {
        userName: "Rahim",
        rating: 5,
        comment: "Excellent sound quality and very comfortable to use.",
        date: "2026-09-20",
      },
      {
        userName: "Karim",
        rating: 4,
        comment: "Good headphones for the price. Battery backup is great.",
        date: "2026-09-17",
      },
    ],
  },

  {
    id: 2,
    title: "Smart Watch Series 8",
    slug: "smart-watch-series-8",
    category: "Electronics",
    subCategory: "Smart Watch",
    price: 89.99,
    oldPrice: 119.99,
    discount: 25,
    rating: 4.6,
    reviewsCount: 89,
    stock: 28,
    brand: "SmartTech",
    badge: "Popular",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000",
    ],
    description:
      "Modern smart watch with fitness tracking, notifications, heart-rate monitoring and a beautiful high-resolution display.",
    features: [
      "Fitness Tracking",
      "Heart Rate Monitor",
      "Water Resistant",
      "Bluetooth",
      "Long Battery Life",
    ],
    seller: {
      name: "Digital World",
      rating: 4.7,
    },
    reviews: [
      {
        userName: "Hasan",
        rating: 5,
        comment: "The watch looks premium and works perfectly.",
        date: "2026-09-19",
      },
      {
        userName: "Nayeem",
        rating: 4,
        comment: "Good features and nice display.",
        date: "2026-09-15",
      },
    ],
  },

  {
    id: 3,
    title: "Minimal Leather Backpack",
    slug: "minimal-leather-backpack",
    category: "Fashion",
    subCategory: "Bags",
    price: 39.99,
    oldPrice: 55.99,
    discount: 29,
    rating: 4.7,
    reviewsCount: 67,
    stock: 32,
    brand: "UrbanCarry",
    badge: "New",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1000",
    ],
    description:
      "Stylish minimal leather backpack suitable for school, office, travel and everyday use.",
    features: [
      "Premium Leather",
      "Laptop Compartment",
      "Water Resistant",
      "Multiple Pockets",
      "Adjustable Straps",
    ],
    seller: {
      name: "Fashion Hub",
      rating: 4.6,
    },
    reviews: [
      {
        userName: "Sakib",
        rating: 5,
        comment: "Very stylish and comfortable backpack.",
        date: "2026-09-18",
      },
      {
        userName: "Fahim",
        rating: 4,
        comment: "Good quality leather and enough space.",
        date: "2026-09-12",
      },
    ],
  },

  {
    id: 4,
    title: "Modern Running Shoes",
    slug: "modern-running-shoes",
    category: "Fashion",
    subCategory: "Shoes",
    price: 49.99,
    oldPrice: 69.99,
    discount: 29,
    rating: 4.5,
    reviewsCount: 102,
    stock: 50,
    brand: "RunX",
    badge: "Trending",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000",
    ],
    description:
      "Lightweight and comfortable running shoes designed for daily walking, running and outdoor activities.",
    features: [
      "Lightweight Design",
      "Breathable Material",
      "Comfortable Sole",
      "Flexible",
      "Non-Slip Grip",
    ],
    seller: {
      name: "Sports Zone",
      rating: 4.5,
    },
    reviews: [
      {
        userName: "Rafi",
        rating: 5,
        comment: "Very comfortable for daily walking and running.",
        date: "2026-09-16",
      },
      {
        userName: "Tanvir",
        rating: 4,
        comment: "Good shoes and comfortable sole.",
        date: "2026-09-10",
      },
    ],
  },

  {
    id: 5,
    title: "Mechanical Gaming Keyboard",
    slug: "mechanical-gaming-keyboard",
    category: "Computer",
    subCategory: "Keyboard",
    price: 74.99,
    oldPrice: 99.99,
    discount: 25,
    rating: 4.9,
    reviewsCount: 215,
    stock: 35,
    brand: "GameMaster",
    badge: "Best Seller",
    images: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1000",
    ],
    description:
      "High-performance mechanical gaming keyboard with responsive switches, RGB lighting and durable construction.",
    features: [
      "Mechanical Switches",
      "RGB Backlight",
      "Anti-Ghosting",
      "USB Connection",
      "Durable Design",
    ],
    seller: {
      name: "Gaming Store",
      rating: 4.9,
    },
    reviews: [
      {
        userName: "Arif",
        rating: 5,
        comment: "Excellent keyboard for gaming and programming.",
        date: "2026-09-21",
      },
      {
        userName: "Siam",
        rating: 5,
        comment: "Keys feel great and RGB looks amazing.",
        date: "2026-09-18",
      },
    ],
  },

  {
    id: 6,
    title: "Wireless Gaming Mouse",
    slug: "wireless-gaming-mouse",
    category: "Computer",
    subCategory: "Mouse",
    price: 29.99,
    oldPrice: 44.99,
    discount: 33,
    rating: 4.4,
    reviewsCount: 78,
    stock: 60,
    brand: "GameMaster",
    badge: "Sale",
    images: [
      "https://images.unsplash.com/photo-1527814050087-3793815479db?w=1000",
    ],
    description:
      "Responsive wireless gaming mouse with ergonomic design, adjustable DPI and long battery life.",
    features: [
      "Wireless Connection",
      "Adjustable DPI",
      "Ergonomic Design",
      "Long Battery",
      "RGB Lighting",
    ],
    seller: {
      name: "Gaming Store",
      rating: 4.8,
    },
    reviews: [
      {
        userName: "Jahid",
        rating: 4,
        comment: "Good mouse with smooth tracking.",
        date: "2026-09-14",
      },
      {
        userName: "Rakib",
        rating: 5,
        comment: "Very responsive and comfortable.",
        date: "2026-09-11",
      },
    ],
  },

  {
    id: 7,
    title: "Premium Coffee Maker",
    slug: "premium-coffee-maker",
    category: "Home & Kitchen",
    subCategory: "Kitchen Appliances",
    price: 69.99,
    oldPrice: 89.99,
    discount: 22,
    rating: 4.6,
    reviewsCount: 54,
    stock: 22,
    brand: "HomeBrew",
    badge: "Popular",
    images: [
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=1000",
    ],
    description:
      "Premium coffee maker designed for preparing delicious coffee quickly at home or in the office.",
    features: [
      "Fast Brewing",
      "Easy to Clean",
      "Large Water Tank",
      "Temperature Control",
      "Compact Design",
    ],
    seller: {
      name: "Home Store",
      rating: 4.7,
    },
    reviews: [
      {
        userName: "Imran",
        rating: 5,
        comment: "Makes excellent coffee and is very easy to use.",
        date: "2026-09-13",
      },
      {
        userName: "Nabil",
        rating: 4,
        comment: "Good coffee maker for home use.",
        date: "2026-09-08",
      },
    ],
  },

  {
    id: 8,
    title: "Smart LED Desk Lamp",
    slug: "smart-led-desk-lamp",
    category: "Home & Kitchen",
    subCategory: "Lighting",
    price: 24.99,
    oldPrice: 34.99,
    discount: 29,
    rating: 4.3,
    reviewsCount: 43,
    stock: 40,
    brand: "BrightHome",
    badge: "New",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000",
    ],
    description:
      "Modern LED desk lamp with adjustable brightness, flexible design and energy-efficient lighting.",
    features: [
      "LED Lighting",
      "Adjustable Brightness",
      "Flexible Neck",
      "Energy Efficient",
      "Touch Control",
    ],
    seller: {
      name: "Home Store",
      rating: 4.6,
    },
    reviews: [
      {
        userName: "Amin",
        rating: 4,
        comment: "Nice desk lamp with good brightness.",
        date: "2026-09-12",
      },
      {
        userName: "Rony",
        rating: 4,
        comment: "Simple design and works well.",
        date: "2026-09-06",
      },
    ],
  },
];

const categories = [
  "All Categories",
  "Electronics",
  "Fashion",
  "Computer",
  "Home & Kitchen",
];

export default function ProductBrowse({products}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState("default");
  const [maxPrice, setMaxPrice] = useState(150);
  const [minRating, setMinRating] = useState(0);
  const [showFilter, setShowFilter] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesSearch = product.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        category === "All Categories" ||
        product.category === category;

      const matchesPrice = product.price <= maxPrice;
      const matchesRating = product.rating >= minRating;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPrice &&
        matchesRating
      );
    });

    if (sort === "price-low") {
      result.sort((a, b) => a.price - b.price);
    }

    if (sort === "price-high") {
      result.sort((a, b) => b.price - a.price);
    }

    if (sort === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    }

    if (sort === "newest") {
      result = [...result].reverse();
    }

    return result;
  }, [search, category, maxPrice, minRating, sort]);

  return (
    <main className="min-h-screen bg-gray-100">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 pl-11 pr-4 outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium md:hidden"
            >
              <FiFilter />
              Filters
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">

          <aside
            className={`rounded-xl bg-white p-5 shadow-sm ${
              showFilter ? "block" : "hidden lg:block"
            }`}
          >
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              Categories
            </h2>

            <div className="space-y-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    category === item
                      ? "bg-purple-100 font-semibold text-purple-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="my-6 border-t" />

            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Price
            </h2>

            <input
              type="range"
              min="0"
              max="150"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-purple-600"
            />

            <div className="mt-2 flex justify-between text-sm text-gray-500">
              <span>$0</span>
              <span>${maxPrice}</span>
            </div>

            <div className="my-6 border-t" />

            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Rating
            </h2>

            {[4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setMinRating(rating)}
                className={`mb-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm ${
                  minRating === rating
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-600"
                }`}
              >
                <span className="flex text-yellow-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FiStar
                      key={star}
                      size={14}
                      fill={star <= rating ? "currentColor" : "none"}
                    />
                  ))}
                </span>

                <span>& up</span>
              </button>
            ))}

            <button
              onClick={() => setMinRating(0)}
              className="mt-2 text-sm font-medium text-purple-600"
            >
              Clear rating
            </button>
          </aside>

          <div>
            <div className="mb-5 flex flex-col gap-4 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  All Products
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredProducts.length} products found
                </p>
              </div>

              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-sm outline-none focus:border-purple-500"
                >
                  <option value="default">Sort: Recommended</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">
                    Price: Low to High
                  </option>
                  <option value="price-high">
                    Price: High to Low
                  </option>
                  <option value="rating">Highest Rated</option>
                </select>

                <FiChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                  size={16}
                />
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                 
                  <div
                    key={product.id}
                    className="group overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                       <Link href={`/productdettails/${product._id}`} passHref>
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                      <span className="absolute left-2 top-2 rounded-md bg-purple-600 px-2 py-1 text-xs font-semibold text-white">
                        {product.badge}
                      </span>

                      <button
                        onClick={() =>
                          console.log("Wishlist:", product)
                        }
                        className="absolute right-2 top-2 rounded-full bg-white p-2 text-gray-600 shadow hover:text-red-500"
                      >
                        <FiHeart size={18} />
                      </button>
                    </div>

                    <div className="p-4">
                      <p className="text-xs text-gray-400">
                        {product.category}
                      </p>

                      <Link href={`/product/${product.id}`}>
                        <h3 className="mt-1 line-clamp-2 min-h-[40px] text-sm font-semibold text-gray-900 hover:text-purple-600">
                          {product.title}
                        </h3>
                      </Link>

                      <div className="mt-2 flex items-center gap-1">
                        <FiStar
                          size={14}
                          className="text-yellow-500"
                          fill="currentColor"
                        />

                        <span className="text-sm font-medium">
                          {product.rating}
                        </span>

                        <span className="text-xs text-gray-400">
                          ({product.reviewsCount})
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-lg font-bold text-purple-600">
                          ${product.price}
                        </span>

                        <span className="text-xs text-gray-400 line-through">
                          ${product.oldPrice}
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          console.log("Add to cart:", product)
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
                      >
                        <FiShoppingCart size={16} />
                        Add to Cart
                      </button>
                    </div>
                    </Link>
                  </div>
                  
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-white py-20 text-center">
                <h2 className="text-xl font-bold text-gray-800">
                  No products found
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Try changing your search or filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
 