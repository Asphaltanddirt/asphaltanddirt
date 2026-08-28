import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

// Brand display typeface. Multiple weights + italic loaded so the CSS side
// can differentiate hero/h1/h2/h3/nav/buttons and selectively use italic
// for editorial headings, without needing a second font import.
const barlowCondensed = Barlow_Condensed({
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display-google",
});

const inter = Inter({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-body-google",
});

export const metadata: Metadata = {
  title: "Asphalt & Dirt",
  description: "Built street rides, off-road beasts & real talk about it all.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${inter.variable}`}>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
