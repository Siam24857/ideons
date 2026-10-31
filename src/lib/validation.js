import { z } from "zod";
import { ORDER_STATUS_LIST, PAYMENT_METHOD_LIST, PAYMENT_STATUS_LIST } from "@/lib/constants";

/**
 * Server-side validation schemas (Zod).
 * Nothing that reaches MongoDB is trusted from the browser.
 */

const objectId = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier");

export const idSchema = objectId;

const phoneSchema = z
  .string()
  .trim()
  .min(6, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^[0-9+\-\s()]+$/, "Phone number may only contain digits and + - ( )");

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address");

export const quantitySchema = z
  .number({ coerce: true })
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(50, "You can order up to 50 units at once");

/* ---------------------------------- Auth --------------------------------- */

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80, "Name is too long"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

/* --------------------------------- Product -------------------------------- */

export const productListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  subCategory: z.string().trim().max(80).optional(),
  deal: z.enum(["today", "bestsellers", "new-arrivals", "best-price", "clearance"]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minDiscount: z.coerce.number().min(0).max(100).optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "rating", "best-selling", "popular", "featured", "discount-desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const productInputSchema = z.object({
  title: z.string().trim().min(3, "Product name must be at least 3 characters").max(160),
  slug: z
    .string()
    .trim()
    .max(160)
    .regex(/^[a-z0-9-]*$/, "Slug may only contain lowercase letters, numbers and dashes")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  category: z.string().trim().min(1, "Category is required").max(80),
  categoryId: objectId.optional().or(z.literal("")),
  subCategory: z.string().trim().max(80).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  oldPrice: z.coerce.number().min(0).optional().nullable(),
  discountPrice: z.coerce.number().min(0).optional().nullable(),
  sku: z.string().trim().max(64).optional().or(z.literal("")),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  images: z.array(z.string().trim().max(2000)).max(8, "Up to 8 images are allowed").default([]),
  badge: z.string().trim().max(40).optional().or(z.literal("")),
  brand: z.string().trim().max(80).optional().or(z.literal("")),
  features: z.array(z.string().trim().max(120)).max(20).default([]),
  variants: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        options: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
      })
    )
    .max(10)
    .default([]),
  isActive: z.coerce.boolean().default(true),
});

/* ---------------------------------- Cart --------------------------------- */

export const cartAddSchema = z.object({
  productId: objectId,
  quantity: quantitySchema.default(1),
  variant: z.record(z.string().trim().max(60), z.string().trim().max(60)).nullish(),
});

export const cartUpdateSchema = z.object({
  itemId: objectId,
  quantity: quantitySchema,
});

export const cartItemRefSchema = z.object({ itemId: objectId });

/* -------------------------------- Wishlist -------------------------------- */

export const wishlistSchema = z.object({ productId: objectId });

/* -------------------------------- Address -------------------------------- */

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Recipient name is required").max(80),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal("")).default(""),
  country: z.string().trim().min(2).max(60).default("Bangladesh"),
  division: z.string().trim().min(2, "Division is required").max(60),
  district: z.string().trim().min(2, "District is required").max(60),
  city: z.string().trim().min(1, "City / area is required").max(80),
  streetAddress: z.string().trim().min(5, "Street address is required").max(300),
  houseInfo: z.string().trim().max(200).optional().or(z.literal("")),
  postalCode: z
    .string()
    .trim()
    .max(12)
    .regex(/^[0-9]*$/, "Postal code may only contain digits")
    .optional()
    .or(z.literal("")),
  deliveryInstructions: z.string().trim().max(500).optional().or(z.literal("")),
  label: z.string().trim().max(30).optional().or(z.literal("")),
  isDefault: z.coerce.boolean().default(false),
});

/* -------------------------------- Checkout -------------------------------- */

export const checkoutSchema = z.object({
  /** Optional client-side idempotency key that prevents double submissions. */
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
  addressId: objectId.optional().or(z.literal("")).default(""),
  address: addressSchema.optional(),
  /** Present only for the "buy now" flow (single product purchase). */
  items: z
    .array(
      z.object({
        productId: objectId,
        quantity: quantitySchema,
        variant: z.record(z.string().trim().max(60), z.string().trim().max(60)).optional(),
      })
    )
    .min(1, "Your cart is empty")
    .max(50, "You can order up to 50 items at once")
    .optional(),
  paymentMethod: z.enum(PAYMENT_METHOD_LIST),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

/* ---------------------------------- Order --------------------------------- */

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_LIST),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  /** Optional message that is visible to the customer. */
  customerMessage: z.string().trim().max(500).optional().or(z.literal("")),
});

export const adminOrderQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(ORDER_STATUS_LIST).optional(),
  paymentMethod: z.enum(PAYMENT_METHOD_LIST).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS_LIST).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  sort: z.enum(["newest", "oldest", "total-desc", "total-asc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/* --------------------------------- Reviews -------------------------------- */

export const reviewSchema = z.object({
  productId: objectId,
  rating: z.coerce.number().int().min(1, "Please choose a rating").max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  comment: z.string().trim().min(5, "Please write a short review").max(1500),
});

/* -------------------------------- Contact --------------------------------- */

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")).default(""),
  subject: z.string().trim().min(3, "Please add a subject").max(150),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(3000),
  orderId: z.string().trim().max(40).optional().or(z.literal("")),
});

export const newsletterSchema = z.object({ email: emailSchema });

/* --------------------------------- Admin --------------------------------- */

export const adminUserQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  role: z.enum(["customer", "admin"]).optional(),
  sort: z.enum(["newest", "oldest", "name"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminProductQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  status: z.enum(["active", "inactive", "low-stock", "out-of-stock", "all"]).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "stock-asc", "name"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and dashes"),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  image: z.string().trim().max(2000).optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const settingsSchema = z.object({
  currencySymbol: z.string().trim().min(1).max(6),
  deliveryChargeInsideDhaka: z.coerce.number().min(0),
  deliveryChargeOutsideDhaka: z.coerce.number().min(0),
  freeDeliveryOver: z.coerce.number().min(0),
  codEnabled: z.coerce.boolean(),
  stripeEnabled: z.coerce.boolean(),
  contactEmail: z.string().trim().max(254).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  addressLine: z.string().trim().max(300).optional().or(z.literal("")),
  lowStockThreshold: z.coerce.number().int().min(0),
  allowReviews: z.coerce.boolean(),
});

export const contactMessageStatusSchema = z.object({
  status: z.enum(["new", "read", "replied", "closed"]),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const roleUpdateSchema = z.object({ role: z.enum(["customer", "admin"]) });
