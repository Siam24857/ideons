"use client";

import { useState } from "react";

export default function DestinationForm() {
  const [addressType, setAddressType] = useState("Home");

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    division: "",
    district: "",
    area: "",
    address: "",
    postalCode: "",
    note: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log({
      ...formData,
      addressType,
    });

    // এখানে API / checkout logic দিতে পারো
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Delivery Information
          </h1>

          <p className="mt-2 text-gray-500">
            Enter your delivery address and contact information
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >

              {/* Contact Information */}
              <div className="mb-8">
                <h2 className="mb-5 text-xl font-semibold text-gray-900">
                  Contact Information
                </h2>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* Full Name */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Full Name *
                    </label>

                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Phone Number *
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="01XXXXXXXXX"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                    />
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Email Address
                    </label>

                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@gmail.com"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="mb-8">
                <h2 className="mb-5 text-xl font-semibold text-gray-900">
                  Delivery Address
                </h2>

                {/* Address Type */}
                <div className="mb-5">
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Address Type
                  </label>

                  <div className="flex gap-3">
                    {["Home", "Office"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAddressType(type)}
                        className={`rounded-xl border px-6 py-3 font-medium transition ${
                          addressType === type
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-black"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* Division */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Division *
                    </label>

                    <select
                      name="division"
                      value={formData.division}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                    >
                      <option value="">Select Division</option>
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chattogram">Chattogram</option>
                      <option value="Rajshahi">Rajshahi</option>
                      <option value="Khulna">Khulna</option>
                      <option value="Barishal">Barishal</option>
                      <option value="Sylhet">Sylhet</option>
                      <option value="Rangpur">Rangpur</option>
                      <option value="Mymensingh">Mymensingh</option>
                    </select>
                  </div>

                  {/* District */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      District *
                    </label>

                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      placeholder="Enter district"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  {/* Area */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Area / Upazila *
                    </label>

                    <input
                      type="text"
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      placeholder="Enter area / upazila"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  {/* Postal Code */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Postal Code
                    </label>

                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="1200"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  {/* Full Address */}
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Full Address *
                    </label>

                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="House / Flat, Road, Block, Landmark..."
                      rows={4}
                      required
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  {/* Delivery Note */}
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Delivery Note
                    </label>

                    <textarea
                      name="note"
                      value={formData.note}
                      onChange={handleChange}
                      placeholder="Example: Please call before delivery"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full rounded-xl bg-black py-4 text-base font-semibold text-white transition hover:bg-gray-800"
              >
                Continue to Payment
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div className="sticky top-5 rounded-2xl bg-white p-6 shadow-sm">

              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                Order Summary
              </h2>

              <div className="space-y-4 border-b pb-5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>৳ 2,500</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charge</span>
                  <span>৳ 60</span>
                </div>
              </div>

              <div className="mt-5 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>৳ 2,560</span>
              </div>

              <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                Your information is securely used only for order delivery
                and payment processing.
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}