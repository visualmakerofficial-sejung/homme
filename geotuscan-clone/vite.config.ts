import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

/**
 * BASE_PATH / OUT_DIR 로 배포 경로를 바꾼다.
 * - 개발·기본 빌드: 루트(/) 기준, dist/ 로 출력
 * - GitHub Pages : `npm run build:pages` → /homme/geotuscan/ 기준,
 *                  리포 루트의 geotuscan/ 로 출력 (워크플로가 루트 전체를 올린다)
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  build: {
    outDir: process.env.OUT_DIR ?? "dist",
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
})
