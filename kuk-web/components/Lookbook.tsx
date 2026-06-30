import ImageSlot from "./ImageSlot";
import { lookbook } from "@/lib/data";

export default function Lookbook() {
  return (
    <section id="lookbook" style={{ background: "#0B0B0B", padding: "90px 32px" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 14,
            }}
          >
            LOOKBOOK
          </div>
          <h2
            className="font-anton"
            style={{
              color: "#fff",
              fontSize: "clamp(40px,6vw,80px)",
              lineHeight: 0.92,
              textTransform: "uppercase",
            }}
          >
            AI MODEL FITTING
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 15,
              marginTop: 16,
            }}
          >
            사이즈별 빅사이즈 AI 모델이 직접 착용한 연출컷
          </p>
        </div>

        <div
          className="kuk-grid-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 18,
          }}
        >
          {lookbook.map((l) => (
            <div
              key={l.slot}
              style={{
                position: "relative",
                aspectRatio: "3 / 4.4",
                overflow: "hidden",
                background: "#1a1a1a",
              }}
            >
              <ImageSlot label="AI 모델 룩북 컷" bg="#1a1a1a" />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(0,0,0,0.72) 100%)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 22,
                  bottom: 22,
                  color: "#fff",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    fontWeight: 600,
                    opacity: 0.8,
                    marginBottom: 6,
                  }}
                >
                  {l.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{l.caption}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
