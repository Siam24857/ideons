"use client";

import { Addproducttocart } from "@/lib/Action/addcart";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useStore } from "@/components/providers/StoreProvider";
import { useState } from "react";
import {
  FiArrowLeft,
  FiHeart,
  FiShoppingCart,
  FiStar,
  FiMinus,
  FiPlus,
  FiTruck,
  FiShield,
  FiUser,
} from "react-icons/fi";

export default function ProductDetails({ productDetails }) {
  const product = productDetails;

  // ✅ Hook top-level এ call করা হলো
  const { data: session, isPending } = authClient.useSession();
  const { addToCart } = useStore();
  const userdata = session?.user;

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(
    product?.images?.[0]
  );
  const [adding, setAdding] = useState(false);

  const [reviewData, setReviewData] = useState({
    name: "",
    rating: 5,
    comment: "",
  });

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <h1 className="text-2xl font-bold text-gray-700">
          Product not found
        </h1>
      </main>
    );
  }

  const handleReviewSubmit = (e) => {
    e.preventDefault();

    console.log("New Review:", {
      productId: product._id,
      ...reviewData,
    });

    setReviewData({
      name: "",
      rating: 5,
      comment: "",
    });
  };

  const handleAddToCart = async () => {
    // ✅ Login check
    if (!userdata) {
      alert("Please login first to add items to cart.");
      return;
    }

    if (product.stock <= 0) {
      alert("This product is out of stock.");
      return;
    }

    try {
      setAdding(true);

      // ✅ Cart data ঠিকভাবে তৈরি
      const Cartdata = {
        userId: userdata.id,              
        name: userdata.name,
        email: userdata.email,
        productId: product._id,
        productName: product.title,
        productPrice: product.price,
        productImage: product.images?.[0],  
        quantity: quantity,                 
        stock: product.stock,
        category: product.category,
        brand: product.brand,
        seller: product.seller?.name ?? product.seller,
      };

      const Addcart = await Addproducttocart(Cartdata);
      console.log("Cart response:", Addcart);

      if (Addcart.acknowledged) {
        alert("Added to cart successfully!");
      } else {
        alert(Addcart?.message || "Failed to add to cart.");
      }
    } catch (err) {
      console.error("Add to cart error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes buy-now-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes buy-now-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .buy-now-fire {
          animation: buy-now-bounce 1s ease-in-out infinite;
        }
        .buy-now-glow {
          animation: buy-now-pulse 2s ease-in-out infinite;
        }
      `}</style>

      <main className="min-h-screen bg-gray-100">
      {/* Back */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/ProductBrowse"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-purple-600"
        >
          <FiArrowLeft />
          Back to Marketplace
        </Link>
      </div>

      {/* Product Details */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-2xl bg-white p-5 shadow-sm lg:grid-cols-2 lg:p-8">
          {/* Images */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
              <img
                src={selectedImage || product.images?.[0]}
                alt={product.title}
                className="h-full w-full object-cover"
              />

              {product.badge && (
                <span className="absolute left-4 top-4 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                  {product.badge}
                </span>
              )}

              <button
                onClick={() => console.log("Wishlist:", product)}
                className="absolute right-4 top-4 rounded-full bg-white p-3 shadow"
              >
                <FiHeart size={20} />
              </button>
            </div>

            <div className="mt-4 flex gap-3">
              {product.images?.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(image)}
                  className={`h-20 w-20 overflow-hidden rounded-lg border-2 ${
                    selectedImage === image
                      ? "border-purple-600"
                      : "border-gray-200"
                  }`}
                >
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Information */}
          <div>
            <p className="text-sm font-medium text-purple-600">
              {product.category}
              {product.subCategory && ` / ${product.subCategory}`}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              {product.title}
            </h1>

            {product.brand && (
              <p className="mt-1 text-sm text-gray-500">
                Brand: <span className="font-medium">{product.brand}</span>
              </p>
            )}

            {/* Rating */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <FiStar className="text-yellow-500" fill="currentColor" />
                <span className="font-semibold">{product.rating}</span>
              </div>

              <span className="text-gray-400">|</span>

              <span className="text-sm text-gray-500">
                {product.reviewsCount ?? product.reviews?.length ?? 0} Reviews
              </span>

              <span className="text-gray-400">|</span>

              <span
                className={`text-sm ${
                  product.stock > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            {/* Price */}
            <div className="mt-6 flex items-center gap-4">
              <span className="text-4xl font-bold text-purple-600">
                ${product.price}
              </span>

              {product.oldPrice && (
                <span className="text-lg text-gray-400 line-through">
                  ${product.oldPrice}
                </span>
              )}

              {product.discount > 0 && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  -{product.discount}%
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-6 leading-7 text-gray-600">
              {product.description}
            </p>

            {/* Features */}
            <div className="mt-6">
              <h2 className="font-bold text-gray-900">Key Features</h2>

              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {product.features?.map((feature) => (
                  <li key={feature} className="text-sm text-gray-600">
                    ✓ {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quantity */}
            <div className="mt-7 flex items-center gap-4">
              <span className="font-medium">Quantity:</span>

              <div className="flex items-center rounded-lg border">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3"
                >
                  <FiMinus />
                </button>

                <span className="w-10 text-center">{quantity}</span>

                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(product.stock, q + 1))
                  }
                  className="p-3"
                >
                  <FiPlus />
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-7 flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={adding || product.stock <= 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              >
                <FiShoppingCart />
                {adding ? "Adding..." : "Add to Cart"}
              </button>

              <button
                onClick={async () => {
                  if (!userdata) {
                    alert("Please login first to buy now.");
                    return;
                  }
                  if (product.stock <= 0) {
                    alert("This product is out of stock.");
                    return;
                  }
                  try {
                    await addToCart({
                      productId: product._id,
                      quantity: quantity,
                    });
                    window.location.href = "/checkout";
                  } catch (err) {
                    alert("Failed to add product to cart. Please try again.");
                  }
                }}
                className="flex-1 relative rounded-lg border border-rose-500 px-5 py-3 font-semibold text-rose-600 bg-rose-50 overflow-hidden transition-all hover:scale-105 group"
                style={{ boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)" }}
              >
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-rose-400 via-rose-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-rose-400 rounded-full opacity-0 group-hover:opacity-100 buy-now-glow transition-all duration-300" />
                <div className="absolute -top-3 -right-3 w-4 h-4 bg-orange-400 rounded-full opacity-0 group-hover:opacity-100 buy-now-glow transition-all duration-300" />
                <div className="flex items-center gap-2">
                  <span className="buy-now-fire">🔥</span>
                  Buy Now
                </div>
              </button>
            </div>

            {/* Seller */}
            <div className="mt-7 rounded-xl bg-gray-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <FiUser />
                </div>

                <div>
                  <p className="text-xs text-gray-500">Sold by</p>
                  <h3 className="font-bold">
                    {product.seller?.name ?? product.seller}
                  </h3>
                  {product.seller?.rating && (
                    <p className="text-xs text-gray-500">
                      ⭐ {product.seller.rating}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex gap-3 rounded-lg border p-4">
                <FiTruck className="text-purple-600" />
                <div>
                  <p className="text-sm font-semibold">Fast Delivery</p>
                  <p className="text-xs text-gray-500">
                    Delivery available
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-lg border p-4">
                <FiShield className="text-purple-600" />
                <div>
                  <p className="text-sm font-semibold">Buyer Protection</p>
                  <p className="text-xs text-gray-500">Secure purchase</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Review List */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Customer Reviews</h2>

            <div className="mt-6 flex items-center gap-5 rounded-xl bg-gray-50 p-5">
              <div>
                <p className="text-4xl font-bold text-gray-900">
                  {product.rating}
                </p>

                <div className="mt-1 flex text-yellow-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FiStar
                      key={star}
                      size={16}
                      fill={
                        star <= Math.round(product.rating)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  ))}
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  {product.reviewsCount ?? product.reviews?.length ?? 0} reviews
                </p>
              </div>
            </div>

            {product.reviews?.length ? (
              product.reviews.map((review, index) => (
                <div key={review.id ?? index} className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-600">
                        {(review.userName ?? review.name ?? "U")?.charAt(0)}
                      </div>

                      <div>
                        <h3 className="font-semibold">
                          {review.userName ?? review.name ?? "Anonymous"}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {review.date ?? "Recently"}
                        </p>
                      </div>
                    </div>

                    <div className="flex text-yellow-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar
                          key={star}
                          size={14}
                          fill={
                            star <= review.rating ? "currentColor" : "none"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    {review.comment}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-gray-500">
                No reviews yet. Be the first to review this product!
              </p>
            )}
          </div>

          {/* Write Review */}
          <div className="h-fit rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Write a Review</h2>

            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
              <input
                type="text"
                placeholder="Your name"
                value={reviewData.name}
                onChange={(e) =>
                  setReviewData({
                    ...reviewData,
                    name: e.target.value,
                  })
                }
                required
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-purple-500"
              />

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Rating
                </label>

                <select
                  value={reviewData.rating}
                  onChange={(e) =>
                    setReviewData({
                      ...reviewData,
                      rating: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border px-4 py-3 outline-none"
                >
                  <option value={5}>★★★★★ - 5</option>
                  <option value={4}>★★★★☆ - 4</option>
                  <option value={3}>★★★☆☆ - 3</option>
                  <option value={2}>★★☆☆☆ - 2</option>
                  <option value={1}>★☆☆☆☆ - 1</option>
                </select>
              </div>

              <textarea
                placeholder="Write your review..."
                rows={5}
                value={reviewData.comment}
                onChange={(e) =>
                  setReviewData({
                    ...reviewData,
                    comment: e.target.value,
                  })
                }
                required
                className="w-full resize-none rounded-lg border px-4 py-3 outline-none focus:border-purple-500"
              />

              <button
                type="submit"
                className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700"
              >
                Submit Review
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}