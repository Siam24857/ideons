import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { StoreProvider } from "@/components/providers/StoreProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  title: {
    default: "IDeons — Smart Products. Better Everyday Living.",
    template: "%s | IDeons",
  },
  description:
    "IDeons is an innovative e-commerce brand bringing useful technology gadgets, smart home solutions, practical kitchen products and household essentials to customers in Bangladesh.",
  keywords: [
    "IDeons",
    "smart products",
    "technology gadgets Bangladesh",
    "smart home",
    "kitchen accessories",
    "household essentials",
  ],
  openGraph: {
    title: "IDeons — Smart Products. Better Everyday Living.",
    description:
      "Useful technology gadgets, smart home solutions and practical household products delivered across Bangladesh.",
    siteName: "IDeons",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-white text-navy-900">
        <StoreProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontSize: "14px",
                borderRadius: "10px",
                border: "1px solid #ccebff",
                color: "#001d3d",
              },
              success: { iconTheme: { primary: "#0056b3", secondary: "#ffffff" } },
              error: { iconTheme: { primary: "#e11d48", secondary: "#ffffff" } },
            }}
          />
        </StoreProvider>
      </body>
    </html>
  );
}

