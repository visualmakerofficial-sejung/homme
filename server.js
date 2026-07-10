/* ============================================================
   server.js — Grok Studio 백엔드 (의존성 없음 · Node 18+)
   · 정적 파일 서빙 + 실제 생성 API 프록시
   · 키는 환경변수(.env)로만 보관 — 코드/프론트에 노출하지 않음
   · 사진: 제미나이(Gemini)   · 영상: 그록(xAI) 또는 제미나이 Veo
   실행:  node server.js       (환경변수는 .env 파일 자동 로드)
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

/* ---------- .env 로더 (의존성 없이) ---------- */
(function loadEnv() {
  try {
    const p = path.join(__dirname, '.env');
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch (e) { /* noop */ }
})();

const PORT = process.env.PORT || 5173;

const CFG = {
  geminiKey:     process.env.GEMINI_API_KEY || '',
  geminiModel:   process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest',
  videoProvider: (process.env.VIDEO_PROVIDER || '').toLowerCase(), // 'kling' | 'xai' | 'gemini_veo'
  xaiKey:        process.env.XAI_API_KEY || '',
  xaiVideoUrl:   process.env.XAI_VIDEO_URL || 'https://api.x.ai/v1/video/generations',
  xaiModel:      process.env.XAI_VIDEO_MODEL || 'grok-video',
  veoModel:      process.env.GEMINI_VEO_MODEL || 'veo-3.0-generate-preview',
  // 클링(fal.ai 게이트웨이) — 키 하나로 서버에서 클링 영상 호출
  falKey:        process.env.FAL_KEY || '',
  falKlingModel: process.env.FAL_KLING_MODEL || 'fal-ai/kling-video/v1.6/pro/image-to-video',
};

function videoEnabled() {
  if (CFG.videoProvider === 'kling') return !!CFG.falKey;
  if (CFG.videoProvider === 'xai') return !!CFG.xaiKey;
  if (CFG.videoProvider === 'gemini_veo') return !!CFG.geminiKey;
  return false;
}

/* ---------- 유틸 ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff2': 'font/woff2', '.map': 'application/json',
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req, limitBytes = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limitBytes) { reject(new Error('payload too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

// dataURL -> {mimeType, data}
function splitDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
  return m ? { mimeType: m[1], data: m[2] } : null;
}
function inlineParts(images) {
  return (images || []).map(d => { const p = splitDataUrl(d); return p ? { inline_data: { mime_type: p.mimeType, data: p.data } } : null; }).filter(Boolean);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ============================================================
   사진 — 제미나이
   ============================================================ */
async function generatePhoto({ prompt, modelImage, productImages }) {
  if (!CFG.geminiKey) { const e = new Error('GEMINI_API_KEY 미설정'); e.status = 400; throw e; }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(CFG.geminiModel)}:generateContent?key=${encodeURIComponent(CFG.geminiKey)}`;
  const parts = [{ text: prompt }];
  if (modelImage) parts.push(...inlineParts([modelImage]));
  parts.push(...inlineParts(productImages));

  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'] } }),
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); const e = new Error(`Gemini ${r.status}: ${t.slice(0, 300)}`); e.status = 502; throw e; }
  const j = await r.json();
  const outParts = j?.candidates?.[0]?.content?.parts || [];
  const found = outParts.find(p => p.inline_data || p.inlineData);
  const inl = found && (found.inline_data || found.inlineData);
  if (!inl) { const e = new Error('Gemini: 이미지가 반환되지 않음'); e.status = 502; throw e; }
  return { image: `data:${inl.mime_type || inl.mimeType || 'image/png'};base64,${inl.data}` };
}

/* ============================================================
   제품 AI 분석 — 제미나이 (브랜드 톤앤매너 + 컬러 팔레트)
   ============================================================ */
const ANALYZE_PROMPT =
`당신은 뷰티/제품 브랜드 아트디렉터입니다. 업로드된 제품 사진(앞면·뒷면 등 여러 장일 수 있음)을 자세히 관찰하고 라벨의 글자·성분·용량 표기까지 읽어서, 제품 정보와 브랜드 톤앤매너를 분석해 JSON 객체 하나로만 답하세요. 설명 문장이나 코드블록 없이 순수 JSON만 출력합니다.
필드:
- productName: 제품명 (라벨에서 읽은 정확한 브랜드/제품명, 원문 그대로. 불확실하면 가장 가까운 추정)
- size: 제품 규격 — 용량(ml/g)과 대략적인 크기. 라벨 표기가 있으면 그대로, 없으면 용기 형태로 추정 (예: 30ml · 높이 약 10cm 슬림 병). 손 연출 등에서 크기가 왜곡되지 않도록 최대한 실제 값에 가깝게.
- features: 제품의 핵심 특장점 2~3가지를 한국어 한두 문장으로 (라벨 문구·성분·효능 기반)
- productColor: 제품 용기/패키지의 대표 색상 HEX (#RRGGBB)
- secondaryColor: 제품의 포인트/보조 색상 HEX (#RRGGBB)
- bottleShape: 용기 모양을 한국어 짧은 구로 (예: 슬림 원통형 스포이드 병)
- material: 재질을 한국어로 (예: 서리가 낀 유리 또는 투명 유리)
- labelPosition: 라벨 위치·구성 한국어로 (예: 앞 중앙 라벨, 세로 텍스트 블록)
- lighting: 이 제품에 가장 어울리는 조명 연출 제안 한국어 한 문장
- category: 제품 종류 한국어 (예: 세럼 / 앰플)
- texture: 예상 제형 한국어 (예: 투명하고 묽은 워터리 제형)
- mood: 브랜드 무드 한국어 (예: 미니멀 프리미엄)
- toneSummary: 브랜드 톤앤매너를 한 문장으로 요약 (한국어)
- palette: 제품 톤과 어울리는 프리미엄 배경 컬러 팔레트 HEX 5개 배열`;

const ANALYZE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    productName: { type: 'STRING' }, size: { type: 'STRING' }, features: { type: 'STRING' },
    productColor: { type: 'STRING' }, secondaryColor: { type: 'STRING' },
    bottleShape: { type: 'STRING' }, material: { type: 'STRING' },
    labelPosition: { type: 'STRING' }, lighting: { type: 'STRING' },
    category: { type: 'STRING' }, texture: { type: 'STRING' }, mood: { type: 'STRING' },
    toneSummary: { type: 'STRING' },
    palette: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['productName', 'size', 'features', 'productColor', 'secondaryColor', 'bottleShape', 'material', 'labelPosition', 'lighting', 'palette'],
};

// 사용 가능한 텍스트/비전 모델을 순서대로 시도 (구모델 404 대비)
const ANALYZE_MODELS = [CFG.geminiTextModel, 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash']
  .filter((v, i, a) => v && a.indexOf(v) === i);

async function analyzeProduct({ productImages }) {
  if (!CFG.geminiKey) { const e = new Error('GEMINI_API_KEY 미설정'); e.status = 400; throw e; }
  const imgs = inlineParts(productImages);
  if (!imgs.length) { const e = new Error('제품 이미지가 필요합니다'); e.status = 400; throw e; }
  const payload = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: ANALYZE_PROMPT }, ...imgs] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: ANALYZE_SCHEMA, temperature: 0.4 },
  });

  let lastErr = '';
  for (const model of ANALYZE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(CFG.geminiKey)}`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      lastErr = `Gemini ${r.status}: ${t.slice(0, 200)}`;
      if (r.status === 404 || r.status === 400) continue; // 모델 미지원 → 다음 후보
      const e = new Error(lastErr); e.status = 502; throw e;
    }
    const j = await r.json();
    const txt = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join('');
    let data;
    try { data = JSON.parse(txt); }
    catch (e) {
      const s = txt.indexOf('{'), en = txt.lastIndexOf('}');
      if (s >= 0 && en > s) { try { data = JSON.parse(txt.slice(s, en + 1)); } catch (e2) {} }
    }
    if (!data) { const e = new Error('분석 결과 해석 실패'); e.status = 502; throw e; }
    return { analysis: data };
  }
  const e = new Error(lastErr || '사용 가능한 분석 모델 없음'); e.status = 502; throw e;
}

/* ============================================================
   영상 — 그록(xAI) 또는 제미나이 Veo
   ============================================================ */
async function generateVideo({ prompt, modelImage, productImages, images, duration, aspect }) {
  const ar = aspect || '9:16';
  const products = (productImages && productImages.length) ? productImages : (images || []);

  // 1단계: "모델이 옷을 입은" 전신 착장 스틸을 먼저 생성(제미나이) → 이걸 영상의 첫 프레임으로.
  //         (제미나이 키가 있고 제품 사진이 있을 때. 그래야 이미지가 도는 게 아니라 사람이 도는 영상이 됨)
  let startImages = products;
  if (CFG.geminiKey && products.length) {
    const still = await generatePhoto({
      prompt: `Full-body head-to-toe fashion photograph of the model wearing the uploaded outfit exactly as shown (keep colors, buttons and details faithful). The model fills the vertical ${ar} frame from head to shoes with only a little headroom, slightly low camera angle so the legs look long and elongated, front view, standing naturally. Keep the model's face identical to the reference. Clean seamless studio background, soft fashion lighting, photorealistic, high detail.`,
      modelImage, productImages: products,
    });
    startImages = [still.image];
  }

  // 2단계: 착장 스틸을 첫 프레임으로 회전 영상 생성
  if (CFG.videoProvider === 'kling')      return klingFal({ prompt, images: startImages, duration, aspect: ar });
  if (CFG.videoProvider === 'xai')        return grokXai({ prompt, images: startImages, duration, aspect: ar });
  if (CFG.videoProvider === 'gemini_veo') return geminiVeo({ prompt, images: startImages, aspect: ar });
  const e = new Error('VIDEO_PROVIDER 미설정 (kling / xai / gemini_veo)'); e.status = 400; throw e;
}

// 클링 영상 — fal.ai 게이트웨이 (이미지→영상, 큐 방식 폴링)
async function klingFal({ prompt, images, duration, aspect }) {
  if (!CFG.falKey) { const e = new Error('FAL_KEY 미설정'); e.status = 400; throw e; }
  const startImage = images && images[0];
  if (!startImage) { const e = new Error('클링: 시작 이미지가 없음(착장 스틸 생성 실패)'); e.status = 400; throw e; }
  const auth = { 'Authorization': `Key ${CFG.falKey}`, 'Content-Type': 'application/json' };

  // 제출
  const submit = await fetch(`https://queue.fal.run/${CFG.falKlingModel}`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({
      prompt,
      image_url: startImage,                       // data URI 허용
      duration: String(duration || 10) === '5' ? '5' : '10',
      aspect_ratio: aspect || '9:16',
    }),
  });
  if (!submit.ok) { const t = await submit.text().catch(() => ''); const e = new Error(`Kling(fal) ${submit.status}: ${t.slice(0, 300)}`); e.status = 502; throw e; }
  const q = await submit.json();
  const statusUrl = q.status_url, responseUrl = q.response_url;
  if (!statusUrl || !responseUrl) { const e = new Error('Kling(fal): 큐 URL 없음'); e.status = 502; throw e; }

  // 폴링 (최대 6분)
  for (let i = 0; i < 72; i++) {
    await sleep(5000);
    const st = await fetch(statusUrl, { headers: auth });
    const sj = await st.json().catch(() => ({}));
    const status = (sj.status || '').toUpperCase();
    if (status === 'COMPLETED') {
      const rr = await fetch(responseUrl, { headers: auth });
      const rj = await rr.json().catch(() => ({}));
      const url = rj?.video?.url || rj?.video_url || rj?.output?.video?.url || rj?.data?.video?.url;
      if (url) return { url, mime: 'video/mp4' };
      const e = new Error('Kling(fal): 결과 영상 URL 없음'); e.status = 502; throw e;
    }
    if (status === 'FAILED' || status === 'ERROR') { const e = new Error('Kling(fal): 생성 실패'); e.status = 502; throw e; }
  }
  const e = new Error('Kling(fal): 시간 초과(폴링)'); e.status = 504; throw e;
}

// xAI(Grok) 영상 — 제공사 스펙에 맞춰 URL/응답 필드는 환경변수/여기서 조정
async function grokXai({ prompt, images, duration, aspect }) {
  if (!CFG.xaiKey) { const e = new Error('XAI_API_KEY 미설정'); e.status = 400; throw e; }
  const r = await fetch(CFG.xaiVideoUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CFG.xaiKey}` },
    body: JSON.stringify({ model: CFG.xaiModel, prompt, image: images && images[0], images, duration: duration || 10, aspect_ratio: aspect || '9:16', format: 'mp4' }),
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); const e = new Error(`Grok ${r.status}: ${t.slice(0, 300)}`); e.status = 502; throw e; }
  const ct = r.headers.get('content-type') || '';
  if (ct.startsWith('video/')) {
    const buf = Buffer.from(await r.arrayBuffer());
    return { video: `data:video/mp4;base64,${buf.toString('base64')}`, mime: 'video/mp4' };
  }
  const j = await r.json();
  const u = j.url || j.video_url || j?.data?.[0]?.url || j?.output?.[0];
  if (u) return { url: u, mime: 'video/mp4' };
  const b64 = j?.data?.[0]?.b64_json || j.b64_json;
  if (b64) return { video: `data:video/mp4;base64,${b64}`, mime: 'video/mp4' };
  const e = new Error('Grok: 영상 URL을 응답에서 찾지 못함'); e.status = 502; throw e;
}

// 제미나이 Veo — 실제 동작하는 영상 경로(장시간 작업 → 폴링)
async function geminiVeo({ prompt, images, aspect }) {
  if (!CFG.geminiKey) { const e = new Error('GEMINI_API_KEY 미설정'); e.status = 400; throw e; }
  const base = 'https://generativelanguage.googleapis.com/v1beta';
  const instance = { prompt };
  const ref = images && images[0] && splitDataUrl(images[0]);
  if (ref) instance.image = { bytesBase64Encoded: ref.data, mimeType: ref.mimeType };

  const startRes = await fetch(`${base}/models/${encodeURIComponent(CFG.veoModel)}:predictLongRunning?key=${encodeURIComponent(CFG.geminiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [instance], parameters: { aspectRatio: aspect || '9:16' } }),
  });
  if (!startRes.ok) { const t = await startRes.text().catch(() => ''); const e = new Error(`Veo ${startRes.status}: ${t.slice(0, 300)}`); e.status = 502; throw e; }
  const op = await startRes.json();
  const name = op.name;
  if (!name) { const e = new Error('Veo: operation name 없음'); e.status = 502; throw e; }

  // 폴링 (최대 5분)
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const pr = await fetch(`${base}/${name}?key=${encodeURIComponent(CFG.geminiKey)}`);
    const pj = await pr.json().catch(() => ({}));
    if (pj.done) {
      const vids = pj?.response?.generateVideoResponse?.generatedSamples
        || pj?.response?.generatedVideos || [];
      const uri = vids?.[0]?.video?.uri || vids?.[0]?.uri;
      if (uri) return { url: `${uri}${uri.includes('?') ? '&' : '?'}key=${encodeURIComponent(CFG.geminiKey)}`, mime: 'video/mp4' };
      const e = new Error('Veo: 결과 영상 URI 없음'); e.status = 502; throw e;
    }
  }
  const e = new Error('Veo: 시간 초과(폴링)'); e.status = 504; throw e;
}

/* ============================================================
   라우팅
   ============================================================ */
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  // API
  if (u.pathname.startsWith('/api/')) {
    try {
      if (u.pathname === '/api/config' && req.method === 'GET') {
        return sendJson(res, 200, {
          gemini: !!CFG.geminiKey, geminiModel: CFG.geminiModel,
          video: { enabled: videoEnabled(), provider: CFG.videoProvider || null },
        });
      }
      if (u.pathname === '/api/photo' && req.method === 'POST') {
        const body = await readBody(req);
        if (!body.prompt) return sendJson(res, 400, { error: 'prompt 필요' });
        return sendJson(res, 200, await generatePhoto(body));
      }
      if (u.pathname === '/api/analyze' && req.method === 'POST') {
        const body = await readBody(req);
        return sendJson(res, 200, await analyzeProduct(body));
      }
      if (u.pathname === '/api/video' && req.method === 'POST') {
        const body = await readBody(req);
        if (!body.prompt) return sendJson(res, 400, { error: 'prompt 필요' });
        return sendJson(res, 200, await generateVideo(body));
      }
      return sendJson(res, 404, { error: 'not found' });
    } catch (err) {
      return sendJson(res, err.status || 500, { error: err.message || 'server error' });
    }
  }

  // 정적 파일
  let pathname = decodeURIComponent(u.pathname);
  if (pathname === '/') pathname = '/studio.html';
  const filePath = path.join(__dirname, path.normalize(pathname));
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 Not Found'); }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    // 앱 코드/문서는 항상 최신을 받도록 캐시 방지 (업데이트 즉시 반영)
    if (['.html', '.js', '.css', '.json'].includes(ext)) headers['Cache-Control'] = 'no-cache, must-revalidate';
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Grok Studio ▶  http://localhost:${PORT}\n`);
  console.log(`  사진(Gemini): ${CFG.geminiKey ? '연결됨 (' + CFG.geminiModel + ')' : '미설정 → 데모'}`);
  console.log(`  영상: ${videoEnabled() ? '연결됨 (' + CFG.videoProvider + ')' : '미설정 → 데모'}\n`);
});
