/**
 * Domain constants for the IDeons store.
 * Keeping these in one place guarantees that the storefront, the customer
 * dashboard and the admin dashboard all agree on the same vocabulary.
 */

export const STORE = {
  name: "IDeons",
  tagline: "Smart Products. Better Everyday Living.",
  description:
    "IDeons is an innovative e-commerce brand focused on bringing useful technology gadgets, smart home solutions, practical kitchen products and household essentials to customers in Bangladesh.",
};

/** IDeons official product categories. */
export const DEFAULT_CATEGORIES = [
  {
    name: "Technology Gadgets",
    slug: "technology-gadgets",
    description: "Useful technology gadgets that make daily life easier.",
    order: 1,
    legacyValues: ["Electronics", "Computer"],
  },
  {
    name: "Smart Home Products",
    slug: "smart-home-products",
    description: "Smart home solutions for a more convenient home.",
    order: 2,
    legacyValues: ["Smart Home"],
  },
  {
    name: "Kitchen Accessories",
    slug: "kitchen-accessories",
    description: "Practical kitchen products and accessories.",
    order: 3,
    legacyValues: ["Home & Kitchen"],
  },
  {
    name: "Household Essentials",
    slug: "household-essentials",
    description: "Everyday household essentials you can rely on.",
    order: 4,
    legacyValues: ["Household"],
  },
  {
    name: "Innovative Lifestyle Products",
    slug: "innovative-lifestyle-products",
    description: "Innovative lifestyle products for smarter living.",
    order: 5,
    legacyValues: ["Fashion"],
  },
];

export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const ORDER_STATUS_LIST = Object.values(ORDER_STATUS);

/**
 * Allowed order status transitions. Validated on the server so an admin can
 * never push an order into an impossible state.
 */
export const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

/** Order status values that are still cancellable (stock can be restored). */
export const CANCELLABLE_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
];

export const PAYMENT_METHOD = {
  COD: "cod",
  STRIPE: "stripe",
};

export const PAYMENT_METHOD_LIST = Object.values(PAYMENT_METHOD);

export const PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

export const PAYMENT_STATUS_LIST = Object.values(PAYMENT_STATUS);

export const USER_ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
};

export const NOTIFICATION_TYPES = [
  "order_placed",
  "order_confirmed",
  "order_processing",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "payment_success",
  "payment_failed",
  "welcome",
];

export const ORDER_STATUS_NOTIFICATION = {
  [ORDER_STATUS.PENDING]: "order_placed",
  [ORDER_STATUS.CONFIRMED]: "order_confirmed",
  [ORDER_STATUS.PROCESSING]: "order_processing",
  [ORDER_STATUS.SHIPPED]: "order_shipped",
  [ORDER_STATUS.DELIVERED]: "order_delivered",
  [ORDER_STATUS.CANCELLED]: "order_cancelled",
};

/** All 8 administrative divisions of Bangladesh (used by the address form). */
export const BANGLADESH_DIVISIONS = [
  "Barishal",
  "Chattogram",
  "Dhaka",
  "Khulna",
  "Mymensingh",
  "Rajshahi",
  "Rangpur",
  "Sylhet",
];

export const COUNTRY = "Bangladesh";

/** Settings keys stored in the `settings` collection (single document). */
export const SETTINGS_KEY = "store";

export const DEFAULT_SETTINGS = {
  key: "store",
  currency: "BDT",
  currencySymbol: "৳",
  /** Delivery charge inside Dhaka division (in minor units / poisha-free). */
  deliveryChargeInsideDhaka: 70,
  /** Delivery charge outside Dhaka division. */
  deliveryChargeOutsideDhaka: 130,
  /** Free delivery threshold; 0 disables the rule. */
  freeDeliveryOver: 0,
  /** Cash on delivery availability. */
  codEnabled: true,
  /** Stripe availability - also requires STRIPE_SECRET_KEY to be configured. */
  stripeEnabled: false,
  /** Business contact details are configurable until verified by the owner. */
  contactEmail: "siamtechofficial1597@gmail.com",
  contactPhone: "01804998164",
  addressLine: "",
  lowStockThreshold: 5,
  maxItemsPerOrder: 50,
  allowReviews: true,
  updatedAt: null,
};

export const ADMIN_NAV = [
  { name: "Overview", href: "/admin", section: "overview" },
  { name: "Orders", href: "/admin/orders", section: "orders" },
  { name: "Customers", href: "/admin/customers", section: "customers" },
  { name: "Products", href: "/admin/products", section: "products" },
  { name: "Categories", href: "/admin/categories", section: "categories" },
  { name: "Inventory", href: "/admin/inventory", section: "inventory" },
  { name: "Reviews", href: "/admin/reviews", section: "reviews" },
  { name: "Notifications", href: "/admin/notifications", section: "notifications" },
  { name: "Contact Messages", href: "/admin/contact-messages", section: "contact" },
  { name: "Store Settings", href: "/admin/settings", section: "settings" },
  { name: "Audit Logs", href: "/admin/audit-logs", section: "audit" },
];
