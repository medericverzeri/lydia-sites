import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lydia Charpentier — Matériosol",
  description: "Chargée de développement Matériosol : l’économie circulaire des matériaux et les partenariats du réemploi.",
  icons: { icon: "/media/reference/1b62b3661fff.webp" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
