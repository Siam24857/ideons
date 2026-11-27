This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## IDeons backend and payments

The storefront and authenticated backend APIs run in this Next.js App Router
application. API handlers use Better Auth and MongoDB Native Driver; this
repository has no separate backend start command. Run the full frontend and API
with `npm run dev`, then open `http://localhost:3000`.

Configure `.env` with `MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET`, and
`BETTER_AUTH_URL`. For bKash checkout through the existing Jonota Pay
integration, set the server-only `JONOTA_PAY_API_KEY` and keep callback URLs
pointed at this application. Set `FRONTEND_URL` (or `NEXT_PUBLIC_APP_URL`) to
the public storefront origin when the app is behind a proxy; do not use
`NEXT_PUBLIC_SERVER_URL`, which is the API server address. The default cancel
URL carries the order and product reference; a custom `JONOTA_PAY_CANCEL_URL`
may use `{orderId}`, `{orderNumber}`, and `{productRef}` placeholders. Orders
are marked paid only after server-side gateway verification.

Production commands:

```bash
npm run build
npm run start
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
