import Logo from "./Logo";
import ImageSlot from "./ImageSlot";
import { heroModels } from "@/lib/data";

export default function Hero() {
  return (
    <section
      id="top"
      style={{
        position: "relative",
        background: "linear-gradient(180deg,#eef2f5 0%,#e4eaef 100%)",
        overflow: "hidden",
      }}
    >
      {/* brand mark */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          textAlign: "center",
          padding: "42px 20px 0",
        }}
      >
        <Logo color="#0B0B0B" height={26} />
      </div>

      {/* model lineup — 사이즈별 AI 모델 라인업 */}
      <div
        className="kuk-hero-lineup"
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1560,
          margin: "0 auto",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: "clamp(2px,0.6vw,10px)",
          padding: "18px 14px 0",
        }}
      >
        {heroModels.map((hm) => (
          <div
            key={hm.slot}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "clamp(330px,42vw,520px)",
              }}
            >
              <ImageSlot
                label="AI 모델"
                bg="transparent"
                fit="contain"
                position="50% 100%"
              />
            </div>
            <div
              style={{
                borderTop: "1px solid #b9c2ca",
                paddingTop: 8,
                width: "82%",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                textAlign: "center",
              }}
            >
              <span
                className="font-anton"
                style={{
                  fontSize: "clamp(11px,1vw,14px)",
                  letterSpacing: "0.03em",
                  color: "#111",
                }}
              >
                TOP {hm.top}
              </span>
              <span
                className="font-anton"
                style={{
                  fontSize: "clamp(11px,1vw,14px)",
                  letterSpacing: "0.03em",
                  color: "#777",
                }}
              >
                BTM {hm.btm}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* centered title overlay */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "30%",
          zIndex: 3,
          textAlign: "center",
          pointerEvents: "none",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background:
              "radial-gradient(ellipse 120% 130% at 50% 50%, rgba(238,242,245,0.92) 0%, rgba(238,242,245,0.78) 45%, rgba(238,242,245,0) 78%)",
            padding: "40px 70px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.16em",
              fontWeight: 600,
              color: "#333",
              marginBottom: 16,
            }}
          >
            #패션 &nbsp; #빅사이즈
          </div>
          <h1
            style={{
              fontFamily: "'Pretendard',sans-serif",
              fontWeight: 800,
              fontSize: "clamp(34px,5.2vw,68px)",
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              color: "#111",
            }}
          >
            박시한 핏의 기준
          </h1>
          <p
            style={{
              fontSize: "clamp(15px,1.9vw,24px)",
              fontWeight: 600,
              color: "#333",
              marginTop: 14,
            }}
          >
            &ldquo;누구나 입는 빅사이즈 와이드 핏&rdquo;
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 26,
              justifyContent: "center",
              flexWrap: "wrap",
              pointerEvents: "auto",
            }}
          >
            <a
              href="#new"
              className="kuk-cta-dark"
              style={{
                padding: "14px 30px",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              SHOP NOW
            </a>
            <a
              href="#lookbook"
              className="kuk-cta-ghost"
              style={{
                padding: "14px 30px",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              LOOKBOOK
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
