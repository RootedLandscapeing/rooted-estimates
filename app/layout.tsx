import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rooted Estimates",
  description: "A lightweight estimate, quote, job, and invoice workflow for a growing service business."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
