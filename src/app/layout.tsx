import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FindMy Family",
  description: "Family-scoped Apple FindMy app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
