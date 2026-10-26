import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kings Body Empire — Train. Eat. Track. Transform.",
    template: "%s · Kings Body Empire",
  },
  description:
    "Coaching built for real life: log your training, food and measurements, climb from Bronze to Diamond, book a call with the coach and train with programs made for Nigerian kitchens and gyms.",
  openGraph: {
    title: "Kings Body Empire",
    description:
      "Train. Eat. Track. Transform. Logging, consistency ranks, coaching programs and e-books in one place.",
    url: siteUrl,
    siteName: "Kings Body Empire",
    type: "website",
    locale: "en_NG",
    images: [
      {
        url: "/images/hero-gym.jpg",
        width: 1376,
        height: 768,
        alt: "Athletes training in a dark gym lit by warm gold light",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kings Body Empire",
    description: "Train. Eat. Track. Transform.",
    images: ["/images/hero-gym.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0E0C0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
