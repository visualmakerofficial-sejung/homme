// 이미지 슬롯 플레이스홀더.
// 원본 프로토타입의 드래그&드롭 image-slot 을 대체합니다.
// 실제 구현에서는 이 자리에 <Image>(상품/AI 모델 컷)를 렌더링하세요.

export default function ImageSlot({
  label = "이미지",
  bg = "#efece6",
  fit = "cover",
  position = "50% 50%",
  src,
}: {
  label?: string;
  bg?: string;
  fit?: "cover" | "contain";
  position?: string;
  src?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={label}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: fit,
          objectPosition: position,
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "rgba(11,11,11,0.34)",
          textAlign: "center",
          padding: "0 12px",
        }}
      >
        {label}
      </span>
    </div>
  );
}
