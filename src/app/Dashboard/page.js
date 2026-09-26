"use client";

import React from "react";
import {
  FiShoppingCart,
  FiPackage,
  FiHeart,
  FiDollarSign,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";
import Link from "next/link";

const Dashboardpage = () => {
  // Demo / Fake Data
  const overview = [
    {
      title: "Total Orders",
      value: "12",
      icon: FiPackage,
      description: "All your orders",
    },
    {
      title: "Cart Items",
      value: "4",
      icon: FiShoppingCart,
      description: "Items in your cart",
    },
    {
      title: "Wishlist",
      value: "8",
      icon: FiHeart,
      description: "Saved products",
    },
    {
      title: "Total Spent",
      value: "$1,249",
      icon: FiDollarSign,
      description: "Lifetime purchase",
    },
  ];

  const recentOrders = [
    {
      id: "#ORD-1025",
      product: "Wireless Headphones",
      date: "Sep 24, 2026",
      price: "$89",
      status: "Delivered",
    },
    {
      id: "#ORD-1024",
      product: "Smart Watch",
      date: "Sep 20, 2026",
      price: "$129",
      status: "Processing",
    },
    {
      id: "#ORD-1023",
      product: "Gaming Keyboard",
      date: "Sep 17, 2026",
      price: "$75",
      status: "Shipped",
    },
  ];

  return (
    <div className="space-y-6 mt-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard Overview
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage your marketplace account and track your activity.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {item.title}
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-gray-900">
                    {item.value}
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <Icon size={21} />
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-400">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <div>
              <h2 className="font-bold text-gray-900">
                Recent Orders
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Your latest purchases
              </p>
            </div>

            <Link
              href="/dashboard/orders"
              className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              View All
              <FiArrowRight size={15} />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {order.product}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span>{order.id}</span>
                    <span>•</span>
                    <span>{order.date}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <span className="font-semibold text-gray-900">
                    {order.price}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      order.status === "Delivered"
                        ? "bg-green-100 text-green-700"
                        : order.status === "Shipped"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Overview */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">
            Quick Overview
          </h2>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <FiShoppingCart className="text-purple-600" />

                <div>
                  <p className="text-sm font-medium">
                    Cart
                  </p>

                  <p className="text-xs text-gray-400">
                    4 products
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/cart"
                className="text-sm font-medium text-purple-600"
              >
                View
              </Link>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <FiHeart className="text-purple-600" />

                <div>
                  <p className="text-sm font-medium">
                    Wishlist
                  </p>

                  <p className="text-xs text-gray-400">
                    8 saved products
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/wishlist"
                className="text-sm font-medium text-purple-600"
              >
                View
              </Link>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <FiClock className="text-purple-600" />

                <div>
                  <p className="text-sm font-medium">
                    Buying History
                  </p>

                  <p className="text-xs text-gray-400">
                    12 completed orders
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/buying-history"
                className="text-sm font-medium text-purple-600"
              >
                View
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default  Dashboardpage;
 
