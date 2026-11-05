import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "Nexo PMS",
  description: "Product Management System — จัดการสินค้า, Content, Ads และยอดขาย",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} font-sans antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
