import type { Metadata } from "next";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

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
      </body>
    </html>
  );
}
