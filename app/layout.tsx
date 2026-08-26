import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropDeploy — Instant Deploy .zip ke Vercel & GitHub",
  description:
    "Seret & lepas arsip .zip lalu deploy langsung ke Vercel dan publish ke GitHub — sepenuhnya dari browser, tanpa backend.",
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