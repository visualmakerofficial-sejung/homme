import { categories } from "@/lib/data";

export default function CategoryGrid() {
  return (
    <section
      id="cat"
      style={{ maxWidth: 1360, margin: "0 auto", padding: "64px 32px 8px" }}
    >
      <div
        className="kuk-grid-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 1,
          background: "#0B0B0B",
          border: "1px solid #0B0B0B",
        }}
      >
        {categories.map((c) => (
          <a
            key={c.en}
            href="#new"
            className="kuk-cat-cell"
            style={{
              padding: "30px 26px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span
              className="font-anton"
              style={{ fontSize: 34, lineHeight: 1 }}
            >
              {c.en}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}>
              {c.kr}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
