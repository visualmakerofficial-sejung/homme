import { topChips, btmChips } from "@/lib/data";

function ChipRow({ chips }: { chips: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        maxWidth: 460,
      }}
    >
      {chips.map((s) => (
        <span
          key={s}
          className="kuk-chip font-anton"
          style={{
            padding: "11px 18px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

export default function SizeFinder({ accent = "#0B0B0B" }: { accent?: string }) {
  return (
    <section style={{ background: accent, color: "#fff", padding: "80px 32px" }}>
      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 36,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.16em",
              opacity: 0.75,
              marginBottom: 14,
            }}
          >
            SIZE FINDER
          </div>
          <h2
            className="font-anton"
            style={{
              fontSize: "clamp(34px,5vw,60px)",
              lineHeight: 0.95,
              textTransform: "uppercase",
            }}
          >
            내 사이즈 찾기
          </h2>
          <p
            style={{
              fontSize: 16,
              opacity: 0.82,
              marginTop: 16,
              maxWidth: 460,
              lineHeight: 1.6,
            }}
          >
            체형 정보를 입력하면 딱 맞는 AI 모델 착용컷과 추천 사이즈를
            보여드려요.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.14em",
                opacity: 0.7,
                marginBottom: 11,
              }}
            >
              상의 TOP &nbsp;
              <span style={{ opacity: 0.6 }}>(XL부터 빅사이즈)</span>
            </div>
            <ChipRow chips={topChips} />
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.14em",
                opacity: 0.7,
                marginBottom: 11,
              }}
            >
              하의 BOTTOM &nbsp;<span style={{ opacity: 0.6 }}>(inch)</span>
            </div>
            <ChipRow chips={btmChips} />
          </div>

          <a
            href="#new"
            style={{
              background: "#fff",
              color: "#0B0B0B",
              padding: "15px 34px",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            사이즈 가이드 보기 →
          </a>
        </div>
      </div>
    </section>
  );
}
