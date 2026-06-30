import ProductCard from "./ProductCard";
import type { Product } from "@/lib/data";

export default function ProductSection({
  id,
  eyebrow,
  title,
  products,
  accent = "#0B0B0B",
  showRanking = false,
  paddingTop = 64,
}: {
  id: string;
  eyebrow: string;
  title: string;
  products: Product[];
  accent?: string;
  showRanking?: boolean;
  paddingTop?: number;
}) {
  return (
    <section
      id={id}
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: `${paddingTop}px 32px 64px`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 34,
          borderBottom: "2px solid #0B0B0B",
          paddingBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: accent,
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </div>
          <h2
            className="font-anton"
            style={{
              fontSize: "clamp(34px,5vw,56px)",
              lineHeight: 0.95,
              textTransform: "uppercase",
            }}
          >
            {title}
          </h2>
        </div>
        <a
          href={`#${id}`}
          style={{
            fontSize: 13,
            fontWeight: 600,
            borderBottom: "1px solid #0B0B0B",
            paddingBottom: 2,
          }}
        >
          전체보기 →
        </a>
      </div>

      <div
        className="kuk-grid-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "28px 22px",
        }}
      >
        {products.map((p) => (
          <ProductCard
            key={p.slot}
            product={p}
            href={`#${id}`}
            accent={accent}
            showRanking={showRanking}
          />
        ))}
      </div>
    </section>
  );
}
