import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropDeploy — Instant Deploy .zip ke Vercel & GitHub",
  description:
    "Seret & lepas arsip .zip lalu deploy ke Vercel & GitHub — 90% client-side, backend hanya NextAuth. Token BYOK di localStorage.",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}