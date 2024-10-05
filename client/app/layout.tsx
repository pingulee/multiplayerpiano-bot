import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const d2Coding = localFont({
  src: "./fonts/D2CodingBold.woff2",
  variable: "--font-d2coding",
  weight: "400 700",
});

export const metadata: Metadata = {
  title: "MPP Bot",
  description: "MPP Bot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko-KR">
      <body className={`${d2Coding.variable} antialiased`}>{children}</body>
    </html>
  );
}
