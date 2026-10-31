"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useState } from "react";
 

export default function SignInPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { data, error } = await authClient.signIn.email({
      email: formData.email,
      password: formData.password,
      rememberMe: true,
      callbackURL: "/",
    });

    if (error) {
      alert(error.message || "Sign in failed. Please check your credentials.");
      return;
    }
    window.location.href = "/";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Welcome Back
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Sign in to your marketplace account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-purple-500"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-purple-400 hover:text-purple-300"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </main>
  );
}