import ImageSlot from "./ImageSlot";
import type { Product } from "@/lib/data";

export default function ProductCard({
  product,
  href = "#new",
  accent = "#0B0B0B",
  showRanking = false,
}: {
  product: Product;
  href?: string;
  accent?: string;
  showRanking?: boolean;
}) {
  return (
    <a href={href} className="kuk-card">
      <div
        style={{
          position: "relative",
          aspectRatio: "3 / 4",
          overflow: "hidden",
          background: "#efece6",
        }}
      >
        <div className="kuk-card-img" style={{ position: "absolute", inset: 0 }}>
          <ImageSlot label="제품 / AI 모델 컷" />
        </div>

        {showRanking && product.rank != null ? (
          <span
            className="font-anton"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              background: accent,
              color: "#fff",
              fontSize: 22,
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {product.rank}
          </span>
        ) : null}

        {!showRanking && product.tag ? (
          <span
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "#0B0B0B",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: "5px 9px",
            }}
          >
            {product.tag}
          </span>
        ) : null}
      </div>

      <div style={{ paddingTop: 14 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#999",
            marginBottom: 5,
          }}
        >
          KUK
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>
          {product.name}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>
          {product.price}
        </div>
        <div
          style={{
            display: "flex",
            gap: 5,
            marginTop: 11,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              border: "1px solid #0B0B0B",
              color: "#0B0B0B",
              padding: "3px 8px",
            }}
          >
            {product.cat}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid #d8d4cc",
              color: "#555",
              padding: "3px 8px",
            }}
          >
            SIZE {product.sizes}
          </span>
        </div>
      </div>
    </a>
  );
}
