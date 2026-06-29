"""HTTP 서버 (stdlib 전용 — 의존성 0). 프론트엔드 + JSON API.

API:
  GET  /api/characters                 캐릭터 목록
  GET  /api/health                     키 연결 상태(claude/higgsfield)
  GET  /api/projects                   프로젝트 목록
  POST /api/plan        {character, product, concept, format}  → 스토리보드 생성
  GET  /api/project/<id>               상태
  POST /api/project/<id>/images        STAGE1 이미지 생성
  POST /api/project/<id>/videos        STAGE2 클립 생성
  POST /api/project/<id>/assemble      conti 조립 → 최종 mp4
  GET  /media/<id>/<path>              산출물(이미지/클립/영상) 서빙

실행:  python3 -m backend.main   (app 디렉토리에서)
       또는  python3 backend/main.py
"""
import json
import mimetypes
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

# 패키지 import 지원 (직접 실행/모듈 실행 모두)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend import config, pipeline  # noqa: E402


def _json(handler, code, obj):
    body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(body)


def _safe_media(pid, rel):
    base = (config.DATA_DIR / pid).resolve()
    target = (base / rel).resolve()
    if not str(target).startswith(str(base)) or not target.exists():
        return None
    return target


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass  # 조용히

    # ----- 공통
    def _body(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        if not n:
            return {}
        return json.loads(self.rfile.read(n).decode("utf-8") or "{}")

    def _serve_file(self, path: Path, download=False):
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        if download:
            self.send_header("Content-Disposition", f'attachment; filename="{path.name}"')
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    # ----- GET
    def do_GET(self):
        u = urlparse(self.path)
        p = u.path
        try:
            if p in ("/", "/index.html"):
                return self._serve_file(config.FRONTEND_DIR / "index.html")
            if p in ("/app.js", "/style.css"):
                return self._serve_file(config.FRONTEND_DIR / p.lstrip("/"))
            if p == "/api/health":
                return _json(self, 200, {"ok": True,
                                         "claude": config.have_claude(),
                                         "higgsfield": config.have_higgsfield()})
            if p == "/api/characters":
                return _json(self, 200, {"characters": pipeline.list_characters()})
            if p == "/api/projects":
                return _json(self, 200, {"projects": pipeline.list_projects()})
            if p.startswith("/api/project/"):
                pid = p.split("/api/project/", 1)[1].strip("/")
                return _json(self, 200, pipeline.get_state(pid))
            if p.startswith("/media/"):
                parts = p[len("/media/"):].split("/", 1)
                if len(parts) == 2:
                    tgt = _safe_media(parts[0], unquote(parts[1]))
                    if tgt:
                        dl = "download" in u.query
                        return self._serve_file(tgt, download=dl)
                return _json(self, 404, {"error": "not found"})
            return _json(self, 404, {"error": "not found", "path": p})
        except FileNotFoundError as e:
            return _json(self, 404, {"error": str(e)})
        except Exception as e:
            return _json(self, 500, {"error": str(e)})

    # ----- POST
    def do_POST(self):
        u = urlparse(self.path)
        p = u.path
        try:
            if p == "/api/plan":
                b = self._body()
                st = pipeline.create_project(
                    b.get("character"), b.get("product", {}),
                    b.get("concept", ""), b.get("format"))
                return _json(self, 200, st)
            if p.startswith("/api/project/"):
                rest = p.split("/api/project/", 1)[1].strip("/")
                pid, _, action = rest.partition("/")
                if action == "images":
                    return _json(self, 200, pipeline.run_images(pid))
                if action == "videos":
                    return _json(self, 200, pipeline.run_videos(pid))
                if action == "assemble":
                    return _json(self, 200, pipeline.run_assemble(pid))
            return _json(self, 404, {"error": "not found", "path": p})
        except Exception as e:
            return _json(self, 500, {"error": str(e)})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def main():
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    srv = ThreadingHTTPServer((host, port), Handler)
    print(f"[studio-web] http://{host}:{port}  "
          f"(claude={config.have_claude()}, higgsfield={config.have_higgsfield()})")
    print(f"[studio-web] 데이터: {config.DATA_DIR}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[studio-web] 종료")


if __name__ == "__main__":
    main()
