import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A Decade Of Inspiration",
  description: "Website bình chọn realtime",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
