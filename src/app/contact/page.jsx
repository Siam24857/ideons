"use client";

import Link from "next/link";
import { ArrowRight, Mail, Phone, MapPin, Clock } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import toast from "react-hot-toast";
import { useState } from "react";
import { SectionHeading } from "@/components/ui/EmptyState";
import { Button, LinkButton } from "@/components/ui/Buttons";
import { STORE } from "@/lib/constants";

const CONTACT_EMAIL = "siamtechofficial1597@gmail.com";
const CONTACT_PHONE = "01804998164";
const STORE_ADDRESS = "House 12, Road 4, Gulshan, Dhaka, Bangladesh";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    orderId: "",
  });

  const handleChange = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.post("/api/contact", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: form.subject,
        message: form.message,
        orderId: form.orderId,
      });
      if (result.ok) {
        toast.success("Thanks! Your message has been received.");
        setForm({ name: "", email: "", phone: "", subject: "", message: "", orderId: "" });
      } else {
        toast.error(errorMessage(result) || "Failed to send message. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10 text-center">
        <SectionHeading
          eyebrow="Get in touch"
          title="Contact IDeons"
          description="Have a question about an order, product, or delivery? Reach out to our team."
        />
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Contact info cards */}
        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">Email</h3>
          </div>
          <p className="text-sm text-navy-600 break-all">{CONTACT_EMAIL}</p>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Phone className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">Phone</h3>
          </div>
          <p className="text-sm text-navy-600">{CONTACT_PHONE}</p>
          <p className="mt-1 text-xs text-navy-400">Call us during business hours</p>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">Address</h3>
          </div>
          <p className="text-sm text-navy-600 break-all">{STORE_ADDRESS}</p>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">Business Hours</h3>
          </div>
          <p className="text-sm text-navy-600">Sat–Thu: 10:00 AM – 8:00 PM</p>
          <p className="mt-1 text-xs text-navy-400">Friday: Closed</p>
        </div>

        {/* Contact form */}
        <div className="lg:col-span-2 rounded-2xl border border-navy-100 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-navy-950 uppercase tracking-wider">Send us a message</h2>
            <p className="mt-1 text-sm text-navy-500">
              Fill in the form below and our support team will get back to you as soon as possible.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="col-span-full">
              <label className="block text-xs font-medium text-ink-600 mb-1">Full name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange("name")}
                required
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Email address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                required
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Phone number</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange("phone")}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+880 1XXX XXXXXX"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-xs font-medium text-ink-600 mb-1">Subject</label>
              <input
                name="subject"
                value={form.subject}
                onChange={handleChange("subject")}
                required
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Order inquiry, product question, etc."
              />
            </div>
            <div className="col-span-full">
              <label className="block text-xs font-medium text-ink-600 mb-1">Order number (optional)</label>
              <input
                name="orderId"
                value={form.orderId}
                onChange={handleChange("orderId")}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. IDN-20261027-HABR9Z"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-xs font-medium text-ink-600 mb-1">Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange("message")}
                required
                rows={5}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us how we can help…"
              />
            </div>
            <div className="col-span-full flex gap-3">
              <Button type="submit" variant="brand" loading={loading} disabled={loading}>
                Send Message
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setForm({ name: "", email: "", phone: "", subject: "", message: "", orderId: "" })
                }
                disabled={loading}
              >
                Reset
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-12 flex justify-end">
        <LinkButton href="/" variant="ghost">Back to home</LinkButton>
      </div>
    </div>
  );
}
