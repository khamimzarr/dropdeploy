import type { Metadata } from "next";
import Providers from "./providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropDeploy — Instant Deploy .zip ke Vercel & GitHub",
  description:
    "Seret & lepas arsip .zip, lalu langsung deploy ke Vercel & GitHub.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport = {
  themeColor: "#3cdd8c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <ServiceWorkerRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}