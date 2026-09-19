import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
    import { Instrument_Serif } from "next/font/google";
  const display = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-display" });

export const metadata: Metadata = {
  title: "SPORTLOG — Your life in sports",
  description: "Rate, review, and rank every game ever played.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}