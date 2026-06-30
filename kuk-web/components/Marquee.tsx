const TEXT =
  "BIG SIZE M·L·XL·2XL·3XL·4XL  ✦  박시한 유니섹스 스트릿  ✦  답답함을 벗다  ✦  KUK  ✦  BIG SIZE M·L·XL·2XL·3XL·4XL  ✦  박시한 유니섹스 스트릿  ✦  답답함을 벗다  ✦  KUK  ✦ ";

export default function Marquee() {
  return (
    <div
      style={{
        background: "#0B0B0B",
        color: "#fff",
        overflow: "hidden",
        padding: "16px 0",
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          animation: "kuk-marquee 26s linear infinite",
          willChange: "transform",
        }}
      >
        {[0, 1].map((i) => (
          <span
            key={i}
            className="font-anton"
            style={{
              fontSize: 30,
              letterSpacing: "0.02em",
              paddingRight: 36,
            }}
          >
            {TEXT}
          </span>
        ))}
      </div>
    </div>
  );
}
