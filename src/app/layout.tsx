import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Unbounded, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers, Shell } from "@/components/app";

const unbounded = Unbounded({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700", "900"],
  variable: "--font-unbounded",
});

const grotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
});

export const metadata: Metadata = {
  title: "KavperSkins — Skrzynki, Bitwy i Upgrader",
  description:
    "Otwieraj skrzynki ze skinami, toczone bitwy ze znajomymi (tryb Standard i Joker), ulepszaj dropy w upgraderze i pnij się w rankingu. Gra demo z wirtualną walutą.",
};

export const viewport: Viewport = {
  themeColor: "#07080d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={`${unbounded.variable} ${grotesk.variable}`}>
      <body className="antialiased">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
