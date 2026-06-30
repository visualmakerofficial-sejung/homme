export default function BrandStatement() {
  return (
    <section style={{ background: "#F4F1EA", padding: "96px 32px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.18em",
            marginBottom: 26,
          }}
        >
          WHAT IS KUK
        </div>
        <p
          style={{
            fontSize: "clamp(24px,3.4vw,40px)",
            lineHeight: 1.42,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          KUK은 단순한 큰 옷이 아니라, 누구나 패셔너블하게 입는
          <br />
          <span className="font-anton" style={{ fontWeight: 400 }}>
            박시한 유니섹스 스트릿
          </span>{" "}
          브랜드입니다.
        </p>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            color: "#555",
            maxWidth: 660,
            margin: "30px auto 0",
          }}
        >
          ‘컥’ — 목구멍에 깊이 걸린 답답함을 힘 있게 벗어내는 소리. KUK의 옷은 그
          해방을 입습니다. 큰 사이즈도, 박시한 실루엣도, 망설임 없이.
        </p>
      </div>
    </section>
  );
}
