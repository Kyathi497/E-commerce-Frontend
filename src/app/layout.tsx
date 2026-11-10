import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Kaushan_Script, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { CatalogProvider } from "@/components/catalog/CatalogProvider";
import { StockProvider } from "@/components/catalog/StockProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OfferStrip } from "@/components/OfferStrip";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCatalogOrNull } from "@/lib/catalog-data";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const kaushan = Kaushan_Script({ variable: "--font-kaushan", subsets: ["latin"], weight: "400" });
const telugu = Noto_Sans_Telugu({ variable: "--font-noto-telugu", subsets: ["telugu"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: {
    default: "Tej Organics: freshly prepared after every order",
    template: "%s · Tej Organics",
  },
  description:
    "Organic turmeric, spice powders, ginger-garlic paste, wild forest honey, buffalo ghee, moringa and sprouted ragi from Vijayawada. Freshly prepared after every order, packed with care and sent straight to you.",
};

export const viewport: Viewport = {
  themeColor: "#1F4D2E",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${bricolage.variable} ${kaushan.variable} ${telugu.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <CatalogProvider catalog={getCatalogOrNull()}>
            <StockProvider>
              <CartProvider>
                <a
                  href="#main"
                  className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
                >
                  Skip to content
                </a>
                <OfferStrip />
                <SiteHeader />
                <main id="main" className="flex-1">
                  {children}
                </main>
                <SiteFooter />
                <CartDrawer />
              </CartProvider>
            </StockProvider>
          </CatalogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
