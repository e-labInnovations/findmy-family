import type { Metadata, Viewport } from "next";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { ServiceWorkerRegister } from "@/lib/sw-register";

export const metadata: Metadata = {
  title: "FindMy Family",
  description: "Family-scoped Apple FindMy app",
  applicationName: "FindMy Family",
  appleWebApp: {
    capable: true,
    title: "FindMy",
    statusBarStyle: "black-translucent",
  },
  // Explicit list overrides Next's auto-detection of /icon.svg so older
  // browsers / Android home-screen get PNG fallbacks too.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-icon-180.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Anti-flash: pick theme synchronously before paint. Without
            this the first frame renders with whatever data-theme is in
            JSX, then flips on hydration — visible flicker on light/dark. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning silences the noise from browser
          extensions (Grammarly, etc.) that mutate <body> before React
          hydrates. Doesn't suppress real hydration bugs in our own code. */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
