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
      {/* suppressHydrationWarning silences the noise from browser
          extensions (Grammarly, etc.) that mutate <body> before React
          hydrates. Doesn't suppress real hydration bugs in our own code. */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
