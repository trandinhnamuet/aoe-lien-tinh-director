import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AoE Liên Tỉnh — Cổng thông tin giải đấu",
  description: "Theo dõi trực tiếp tình hình giải đấu AoE Liên Tỉnh · CSDN Studio",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080b1e",
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?" +
  "family=Saira+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,600;1,700;1,800&" +
  "family=IBM+Plex+Mono:wght@400;500;600&" +
  "family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
