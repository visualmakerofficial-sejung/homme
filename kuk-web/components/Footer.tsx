import Logo from "./Logo";

const shopLinks = [
  { label: "NEW", href: "#new" },
  { label: "BEST", href: "#best" },
  { label: "OUTER", href: "#cat" },
  { label: "TOP / BOTTOM", href: "#cat" },
  { label: "SET", href: "#cat" },
];

const helpLinks = ["사이즈 가이드", "배송 / 교환·반품", "자주 묻는 질문", "1:1 문의"];

export default function Footer() {
  return (
    <footer
      style={{ background: "#0B0B0B", color: "#fff", padding: "64px 32px 40px" }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 48,
            paddingBottom: 48,
            borderBottom: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <div style={{ maxWidth: 300 }}>
            <div style={{ marginBottom: 18 }}>
              <Logo color="#fff" height={30} />
            </div>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              박시한 유니섹스 스트릿, 빅사이즈 전문.
              <br />
              답답함을 벗다 — KUK.
            </p>
          </div>

          <div style={{ display: "flex", gap: 56, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  marginBottom: 16,
                }}
              >
                SHOP
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                {shopLinks.map((l) => (
                  <a key={l.label} href={l.href}>
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  marginBottom: 16,
                }}
              >
                HELP
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                {helpLinks.map((l) => (
                  <a key={l} href="#">
                    {l}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  marginBottom: 16,
                }}
              >
                CS CENTER
              </div>
              <div
                className="font-anton"
                style={{ fontSize: 28, marginBottom: 8 }}
              >
                1577-0000
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.7,
                }}
              >
                평일 10:00 – 17:00
                <br />
                점심 12:30 – 13:30 / 주말·공휴일 휴무
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            paddingTop: 28,
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.9,
          }}
        >
          상호 KUK (오디션) &nbsp;|&nbsp; 대표 오세정 &nbsp;|&nbsp; 주소 경기
          안산시 [주소 확인필요]
          <br />
          사업자등록번호 000-00-00000 &nbsp;|&nbsp; 통신판매업신고 0000-지역-0000
          &nbsp;|&nbsp; 개인정보보호책임자 오세정
          <br />
          <span style={{ opacity: 0.7 }}>© 2026 KUK. ALL RIGHTS RESERVED.</span>
        </div>
      </div>
    </footer>
  );
}
