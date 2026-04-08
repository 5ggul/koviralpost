import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KoViralPost — 트위터 대본 생성기",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
