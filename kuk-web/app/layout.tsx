import type { Metadata } from "next";
import { Anton } from "next/font/google";
import "./globals.css";

// 디스플레이/숫자용 폰트 (Anton). 본문은 globals.css 의 Pretendard CDN.
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KUK — 박시한 유니섹스 스트릿 · 빅사이즈",
  description:
    "KUK은 단순한 큰 옷이 아니라, 누구나 패셔너블하게 입는 박시한 유니섹스 스트릿 브랜드입니다. 빅사이즈 전문 (상의 XL~6XL · 하의 34~44).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={anton.variable}>{children}</body>
    </html>
  );
}
