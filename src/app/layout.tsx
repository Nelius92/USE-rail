import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "USE rail — powered by crop intel",
  description: "Autonomous geospatial commodity trading intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} bg-[#000000] text-zinc-200 font-sans antialiased selection:bg-white/20`}
      >
        {children}
      </body>
    </html>
  );
}
