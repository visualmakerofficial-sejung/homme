// KUK 워드마크.
// 원본은 단색 로고 PNG(assets/kuk-logo-*.png)를 사용하지만, 브랜드 자산(벡터) 미제공이라
// 두껍고 임팩트 있는 Anton 폰트로 워드마크를 대체합니다. 실제 로고 벡터로 교체 예정.

export default function Logo({
  color = "#0B0B0B",
  height = 24,
}: {
  color?: string;
  height?: number;
}) {
  return (
    <span
      className="font-anton"
      style={{
        color,
        fontSize: height,
        lineHeight: 1,
        letterSpacing: "0.04em",
        display: "inline-block",
        userSelect: "none",
      }}
      aria-label="KUK"
    >
      KUK
    </span>
  );
}
