import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import CategoryGrid from "@/components/CategoryGrid";
import ProductSection from "@/components/ProductSection";
import BrandStatement from "@/components/BrandStatement";
import Lookbook from "@/components/Lookbook";
import SizeFinder from "@/components/SizeFinder";
import Footer from "@/components/Footer";
import { theme, newProducts, bestProducts } from "@/lib/data";

export default function Home() {
  const { accent, showMarquee, showRanking } = theme;

  return (
    <div
      style={
        {
          "--accent": accent,
          background: "#fff",
          color: "#0B0B0B",
          minHeight: "100vh",
          overflowX: "hidden",
        } as React.CSSProperties
      }
    >
      <AnnouncementBar />
      <Header />
      <Hero />

      {showMarquee ? <Marquee /> : null}

      <CategoryGrid />

      <ProductSection
        id="new"
        eyebrow="NEW ARRIVALS"
        title="신상품"
        products={newProducts}
        accent={accent}
      />

      <BrandStatement />

      <ProductSection
        id="best"
        eyebrow="WEEKLY BEST"
        title="베스트"
        products={bestProducts}
        accent={accent}
        showRanking={showRanking}
        paddingTop={80}
      />

      <Lookbook />

      <SizeFinder accent={accent} />

      <Footer />
    </div>
  );
}
