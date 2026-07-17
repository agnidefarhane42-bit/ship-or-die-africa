import type { Metadata } from "next";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Ship or Die Africa — Ship ton projet en 30 jours ou sors",
  description: "Communauté de builders africains francophones. 30 jours pour shipper ton projet, sinon tu es exclu à jamais.",
  openGraph: {
    title: "Ship or Die Africa",
    description: "Ship ton projet en 30 jours ou sors. La communauté des builders africains.",
    locale: "fr_FR",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark">
      <body className="min-h-screen bg-base-100 text-base-content">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
