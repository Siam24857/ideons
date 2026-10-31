"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { api, errorMessage } from "@/lib/api-client";

/**
 * Newsletter signup. The form only reports success after the API stored the
 * subscription (no third-party provider is configured for this store).
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const result = await api.post("/api/newsletter", { email: email.trim() });
      if (!result.ok) {
        toast.error(errorMessage(result));
        return;
      }
      toast.success(result.data?.message || "Subscribed");
      setEmail("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email address"
        className="min-w-0 flex-1 rounded-lg border border-navy-700 bg-navy-900 px-4 py-3 text-sm text-white outline-none placeholder:text-navy-400 focus:border-blue-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="shrnavy-0 rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-navy-950 transition hover:bg-blue-400 disabled:opacity-60"
      >
        {loading ? "Joining…" : "Subscribe"}
      </button>
    </form>
  );
}

