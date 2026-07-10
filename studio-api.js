/* ============================================================
   studio-api.js — 생성 API 연동 레이어
   · 사진: 제미나이(Gemini)  · 영상: 그록(Grok)
   · 키가 없으면 데모 모드로 실제 파일을 만들어 미리보기
   ============================================================ */

const StudioAPI = (() => {

  const LS_KEY = 'studioSettings_v1';

  const DEFAULTS = {
    geminiKey: '',
    geminiModel: 'gemini-2.5-flash-image',
    grokUrl: '',
    grokKey: '',
    grokModel: 'grok-video',
  };

  function getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      return { ...DEFAULTS, ...s };
    } catch (e) { return { ...DEFAULTS }; }
  }
  function saveSettings(s) {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...getSettings(), ...s }));
  }

  // 서버(백엔드) 연결 상태 — init()에서 채움
  let server = { available: false, gemini: false, video: { enabled: false, provider: null } };

  async function init() {
    // file:// 로 열면 서버가 없음 → 프로브 생략
    if (location.protocol === 'file:') return server;
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        server = { available: true, gemini: !!j.gemini, video: j.video || { enabled: false, provider: null } };
      }
    } catch (e) { /* 서버 없음 */ }
    return server;
  }
  const getServer = () => server;

  // 실제 사진 생성이 가능한가(서버 또는 클라이언트 키)
  const hasGemini = () => (server.available && server.gemini) || !!getSettings().geminiKey;
  const hasGrok   = () => (server.available && server.video.enabled) || (() => { const s = getSettings(); return !!(s.grokUrl && s.grokKey); })();

  /* ---------- 유틸 ---------- */

  // dataURL -> { mimeType, data(base64) }
  function splitDataUrl(dataUrl) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
    if (!m) return null;
    return { mimeType: m[1], data: m[2] };
  }

  function partsFromImages(images) {
    return (images || []).map(dataUrl => {
      const p = splitDataUrl(dataUrl);
      return p ? { inline_data: { mime_type: p.mimeType, data: p.data } } : null;
    }).filter(Boolean);
  }

  /* ---------- 제미나이: 사진 1장 생성 ----------
     modelImage: 모델 참조 사진(dataURL, 없을 수 있음)
     productImages: 제품 사진들(dataURL 배열)
     prompt: 연출 프롬프트
     반환: dataURL(생성 이미지)
  ------------------------------------------------ */
  async function geminiPhoto(prompt, modelImage, productImages, opts = {}) {
    // 1순위: 백엔드 서버(키를 서버가 보관)
    if (server.available && server.gemini) {
      const r = await fetch('/api/photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modelImage, productImages }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `서버 ${r.status}`);
      return (await r.json()).image;
    }
    const s = getSettings();
    if (!s.geminiKey) return demoPhoto(prompt, modelImage, productImages, opts);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.geminiModel)}:generateContent?key=${encodeURIComponent(s.geminiKey)}`;
    const parts = [{ text: prompt }];
    if (modelImage) parts.push(...partsFromImages([modelImage]));
    parts.push(...partsFromImages(productImages));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const outParts = json?.candidates?.[0]?.content?.parts || [];
    const img = outParts.find(p => p.inline_data || p.inlineData);
    const inline = img && (img.inline_data || img.inlineData);
    if (!inline) throw new Error('Gemini: 이미지가 반환되지 않았습니다');
    const mime = inline.mime_type || inline.mimeType || 'image/png';
    return `data:${mime};base64,${inline.data}`;
  }

  /* ---------- 제품 AI 분석 (브랜드 톤앤매너 + 컬러 팔레트) ---------- */
  const ANALYZE_MODELS = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash'];
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

  function str(v) { return (typeof v === 'string' && v.trim()) ? v.trim() : ''; }
  function hex6(v, fb) {
    if (typeof v === 'string') { const m = /#?([0-9a-fA-F]{6})/.exec(v); if (m) return '#' + m[1].toLowerCase(); }
    return fb;
  }
  function normalizeAnalysis(d) {
    d = d || {};
    const fb = ['#efe7e0', '#e3d5cb', '#cbb8ab', '#9c8f83', '#6f655c'];
    let pal = Array.isArray(d.palette) ? d.palette.map(c => hex6(c, null)).filter(Boolean) : [];
    while (pal.length < 5) pal.push(fb[pal.length % fb.length]);
    pal = pal.slice(0, 5);
    return {
      productName: str(d.productName), size: str(d.size), features: str(d.features),
      productColor: hex6(d.productColor, pal[1]),
      secondaryColor: hex6(d.secondaryColor, pal[3]),
      bottleShape: str(d.bottleShape), material: str(d.material),
      labelPosition: str(d.labelPosition), lighting: str(d.lighting),
      category: str(d.category), texture: str(d.texture), mood: str(d.mood),
      toneSummary: str(d.toneSummary), palette: pal, demo: !!d.demo,
    };
  }

  // 이미지에서 대표 컬러 n개 추출 (데모/폴백용)
  function paletteFromImg(img, n) {
    try {
      const c = document.createElement('canvas'), x = c.getContext('2d');
      c.width = 80; c.height = 80; x.drawImage(img, 0, 0, 80, 80);
      const d = x.getImageData(0, 0, 80, 80).data, bins = {};
      for (let i = 0; i < d.length; i += 16) {
        if (d[i + 3] < 180) continue;
        const r = Math.round(d[i] / 24) * 24, g = Math.round(d[i + 1] / 24) * 24, b = Math.round(d[i + 2] / 24) * 24;
        if (Math.min(r, g, b) > 245) continue;
        const k = r + ',' + g + ',' + b; bins[k] = (bins[k] || 0) + 1;
      }
      let cols = Object.entries(bins).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => {
        const [r, g, b] = k.split(',').map(Number);
        return '#' + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('');
      });
      const fb = ['#efe7e0', '#e3d5cb', '#cbb8ab', '#9c8f83', '#6f655c'];
      while (cols.length < n) cols.push(fb[cols.length % fb.length]);
      return cols.slice(0, n);
    } catch (e) { return ['#efe7e0', '#e3d5cb', '#cbb8ab', '#9c8f83', '#6f655c'].slice(0, n); }
  }

  async function demoAnalyze(productImages) {
    let pal = ['#efe7e0', '#e3d5cb', '#cbb8ab', '#9c8f83', '#6f655c'];
    try { const img = await loadImg(productImages[0]); pal = paletteFromImg(img, 5); } catch (e) {}
    return normalizeAnalysis({
      demo: true,
      productColor: pal[1], secondaryColor: pal[3],
      bottleShape: '', material: '', labelPosition: '',
      lighting: '제품 톤에 맞춘 소프트 스튜디오 조명',
      toneSummary: '제품 이미지에서 추출한 컬러 팔레트로 배경 톤을 맞춥니다.',
      palette: pal,
    });
  }

  function parseAnalysisText(txt) {
    let t = (txt || '').trim();
    // ```json ... ``` 감싸기 제거
    const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
    if (fence) t = fence[1].trim();
    else { const s = t.indexOf('{'), e = t.lastIndexOf('}'); if (s >= 0 && e > s) t = t.slice(s, e + 1); }
    return JSON.parse(t);
  }

  async function analyzeProduct(productImages) {
    if (!productImages || !productImages.length) throw new Error('제품 이미지가 필요합니다');
    // 1순위: 백엔드 서버
    if (server.available && server.gemini) {
      const r = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productImages }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `서버 ${r.status}`);
      return normalizeAnalysis((await r.json()).analysis);
    }
    // 2순위: 클라이언트 제미나이 키 (사용 가능한 모델을 순서대로 시도)
    const s = getSettings();
    if (s.geminiKey) {
      const parts = [{ text: ANALYZE_PROMPT }, ...partsFromImages(productImages)];
      const body = JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } });
      let lastErr = '';
      for (const model of ANALYZE_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(s.geminiKey)}`;
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          lastErr = `Gemini ${res.status}: ${t.slice(0, 160)}`;
          if (res.status === 404 || res.status === 400) continue; // 모델 미지원 → 다음 후보
          throw new Error(lastErr);
        }
        const j = await res.json();
        const txt = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join('');
        let data; try { data = parseAnalysisText(txt); } catch (e) { throw new Error('분석 결과 해석 실패'); }
        return normalizeAnalysis(data);
      }
      throw new Error(lastErr || '사용 가능한 분석 모델을 찾지 못했습니다');
    }
    // 3순위: 데모(로컬 팔레트 추출)
    return demoAnalyze(productImages);
  }

  /* ---------- 그록: 영상 생성 ----------
     반환: { url } (재생/다운로드 가능한 mp4 URL)
     엔드포인트/응답 스키마는 제공사에 맞춰 조정하세요.
  ------------------------------------------------ */
  async function grokVideo(prompt, refImages, opts = {}) {
    // 1순위: 백엔드 서버 (모델 사진+옷 사진 → 착장 스틸 → 회전 영상)
    if (server.available && server.video.enabled) {
      const r = await fetch('/api/video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt, modelImage: opts.modelImage || null, productImages: refImages, images: refImages,
          duration: opts.duration || 10, aspect: opts.aspect || '9:16',
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `서버 ${r.status}`);
      const j = await r.json();
      return { url: j.url || j.video, mime: j.mime || 'video/mp4' };
    }
    const s = getSettings();
    if (!(s.grokUrl && s.grokKey)) return demoVideo(prompt, refImages, opts);

    const res = await fetch(s.grokUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${s.grokKey}`,
      },
      body: JSON.stringify({
        model: s.grokModel,
        prompt,
        image: (refImages && refImages[0]) || undefined,
        images: refImages,
        duration: opts.duration || 10,
        aspect_ratio: opts.aspect || '9:16',
        format: 'mp4',
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Grok ${res.status}: ${t.slice(0, 200)}`);
    }

    // 응답이 바로 mp4(binary)인 경우
    const ct = res.headers.get('content-type') || '';
    if (ct.startsWith('video/')) {
      const blob = await res.blob();
      return { url: URL.createObjectURL(blob), mime: 'video/mp4' };
    }

    const json = await res.json();
    // 흔한 형태들: {url}, {video_url}, {data:[{url}]}, {output:[url]}
    const found =
      json.url || json.video_url ||
      json?.data?.[0]?.url || json?.output?.[0] ||
      json?.data?.[0]?.b64_json;
    if (!found) throw new Error('Grok: 영상 URL을 응답에서 찾지 못했습니다');
    if (found.startsWith && found.startsWith('http')) return { url: found, mime: 'video/mp4' };
    // base64
    return { url: `data:video/mp4;base64,${found}`, mime: 'video/mp4' };
  }

  /* =========================================================
     데모 모드 — 키가 없을 때 실제 파일(png/webm)을 생성
     ========================================================= */

  // 이미지 로드 헬퍼
  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = 'anonymous'; // 교차출처 이미지로 캔버스가 오염되지 않도록
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });
  }

  /* ---- 착장 합성용 유틸 ---- */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath(); }
  function drawContainInto(ctx, img, x, y, w, h) {
    const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    const r = Math.min(w / iw, h / ih);
    const nw = iw * r, nh = ih * r;
    ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
  }

  // 제품(옷) 사진의 단색/흰 배경을 제거해 옷만 컷아웃 → 몸에 입히기 위함
  function cutoutGarment(img) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    try {
      const id = ctx.getImageData(0, 0, w, h), d = id.data;
      // 네 모서리 평균색을 배경으로 추정
      const idx = [0, (w - 1) * 4, (w * (h - 1)) * 4, (w * h - 1) * 4];
      let br = 0, bg = 0, bb = 0;
      idx.forEach(i => { br += d[i]; bg += d[i + 1]; bb += d[i + 2]; });
      br /= 4; bg /= 4; bb /= 4;
      const nearWhite = br > 222 && bg > 222 && bb > 222;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const dist = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
        if (nearWhite ? (r > 230 && g > 230 && b > 230) : dist < 34) d[i + 3] = 0;
      }
      ctx.putImageData(id, 0, 0);
    } catch (e) {}
    return cv;
  }

  // 모델 피규어(사람)를 그리고 옷을 몸통에 착장
  // 로컬 좌표계: 머리~발 y ∈ [-200,200], 몸통 폭 ±64
  function paintFigure(ctx, cx, cy, s, model, garmentCv, o = {}) {
    const isMale = model && /남/.test((model.desc || '') + (model.name || ''));
    const skin = '#ecb28c', pants = '#3b4257';
    const hairCol = isMale ? '#1f1a17' : '#241b16';
    const back = !!o.back, face = o.face !== false && !back;

    // 다리
    ctx.fillStyle = pants;
    roundRect(ctx, cx - 52 * s, cy + 48 * s, 42 * s, 150 * s, 12 * s); ctx.fill();
    roundRect(ctx, cx + 10 * s, cy + 48 * s, 42 * s, 150 * s, 12 * s); ctx.fill();
    // 신발
    ctx.fillStyle = '#20242e';
    roundRect(ctx, cx - 54 * s, cy + 188 * s, 46 * s, 20 * s, 8 * s); ctx.fill();
    roundRect(ctx, cx + 8 * s, cy + 188 * s, 46 * s, 20 * s, 8 * s); ctx.fill();
    // 팔 (피부)
    ctx.fillStyle = skin;
    roundRect(ctx, cx - 90 * s, cy - 96 * s, 24 * s, 150 * s, 12 * s); ctx.fill();
    roundRect(ctx, cx + 66 * s, cy - 96 * s, 24 * s, 150 * s, 12 * s); ctx.fill();
    // 몸통 기본(옷 아래 바탕)
    ctx.fillStyle = '#c9d0db';
    roundRect(ctx, cx - 64 * s, cy - 104 * s, 128 * s, 162 * s, 22 * s); ctx.fill();
    // 목
    ctx.fillStyle = skin;
    roundRect(ctx, cx - 13 * s, cy - 128 * s, 26 * s, 32 * s, 7 * s); ctx.fill();
    // 머리
    ctx.fillStyle = skin;
    circle(ctx, cx, cy - 152 * s, 35 * s); ctx.fill();
    // 귀
    circle(ctx, cx - 34 * s, cy - 150 * s, 7 * s); ctx.fill();
    circle(ctx, cx + 34 * s, cy - 150 * s, 7 * s); ctx.fill();
    // 머리카락
    ctx.fillStyle = hairCol;
    if (back) {
      circle(ctx, cx, cy - 150 * s, 37 * s); ctx.fill();
      roundRect(ctx, cx - 37 * s, cy - 150 * s, 74 * s, (isMale ? 40 : 96) * s, 18 * s); ctx.fill();
    } else if (isMale) {
      ctx.beginPath();
      ctx.arc(cx, cy - 158 * s, 36 * s, Math.PI, Math.PI * 2); ctx.fill();
      roundRect(ctx, cx - 36 * s, cy - 168 * s, 72 * s, 26 * s, 12 * s); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy - 158 * s, 38 * s, Math.PI, Math.PI * 2); ctx.fill();
      // 양옆 긴 머리
      roundRect(ctx, cx - 42 * s, cy - 168 * s, 20 * s, 96 * s, 10 * s); ctx.fill();
      roundRect(ctx, cx + 22 * s, cy - 168 * s, 20 * s, 96 * s, 10 * s); ctx.fill();
    }
    // 얼굴
    if (face) {
      ctx.fillStyle = '#2a2320';
      circle(ctx, cx - 13 * s, cy - 154 * s, 3.4 * s); ctx.fill();
      circle(ctx, cx + 13 * s, cy - 154 * s, 3.4 * s); ctx.fill();
      ctx.strokeStyle = '#b56b57'; ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy - 140 * s, 9 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    // 옷 착장 (몸통 위에 컷아웃 얹기)
    if (garmentCv) {
      ctx.save();
      roundRect(ctx, cx - 66 * s, cy - 106 * s, 132 * s, 168 * s, 18 * s); ctx.clip();
      drawContainInto(ctx, garmentCv, cx - 70 * s, cy - 110 * s, 140 * s, 184 * s);
      ctx.restore();
    }
  }

  function studioBg(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a2f3b'); g.addColorStop(0.55, '#1a1e28'); g.addColorStop(1, '#0c0e14');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 바닥 원형 스포트
    const rg = ctx.createRadialGradient(W / 2, H * 0.86, 10, W / 2, H * 0.86, W * 0.6);
    rg.addColorStop(0, 'rgba(124,92,255,0.12)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }

  // 포즈별 배치값
  const POSE = {
    front:   { s: 1.9, cyMul: 0,   xs: 1,    face: true,  back: false },
    back:    { s: 1.9, cyMul: 0,   xs: 1,    face: false, back: true },
    side:    { s: 1.9, cyMul: 0,   xs: 0.6,  face: true,  back: false },
    mood:    { s: 1.9, cyMul: 0,   xs: 0.92, face: true,  back: false },
    upper:   { s: 2.6, cyMul: 24,  xs: 1,    face: true,  back: false },
    // 디테일: 머리가 화면 밖으로 나가도록 몸통을 크게 확대(얼굴 X, 옷만)
    detail:  { s: 6.0, cyMul: 6,   xs: 1,    face: false, back: false },
    detail2: { s: 6.0, cyMul: -16, xs: 1,    face: false, back: false },
  };

  // 데모 뷰티 컷: 모델이 제품을 들고/사용하거나, 손+제품 히어로
  function demoBeauty(W, H, product, model, pose, angleLabel) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    studioBg(ctx, W, H);
    const cx = W / 2;
    const faceType = pose === 'hold' || pose === 'apply' || pose === 'moodb';
    if (faceType) {
      // 인물(옷 없이) + 제품을 손/가슴 앞에 배치
      paintFigure(ctx, cx, H / 2 - 20, 1.7, model, null, { face: true });
      if (product) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
        drawContainInto(ctx, product, cx + 30, H * 0.34, 150, 200);
        ctx.restore();
      }
    } else {
      // 손+제품 / 텍스처 / 히어로 → 제품 크게 + 스포트라이트 (얼굴 없음)
      const rg = ctx.createRadialGradient(cx, H * 0.44, 20, cx, H * 0.44, W * 0.55);
      rg.addColorStop(0, 'rgba(255,255,255,0.12)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      if (product) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
        drawContainInto(ctx, product, cx - W * 0.33, H * 0.16, W * 0.66, H * 0.52);
        ctx.restore();
      }
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef1f7';
    ctx.font = '700 30px "Noto Sans KR", sans-serif';
    ctx.fillText(`${model ? model.name + ' · ' : ''}${angleLabel || '뷰티 컷'}`, W / 2, H - 84);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '600 17px "Noto Sans KR", sans-serif';
    ctx.fillText('DEMO · 제미나이 키를 넣으면 실사 생성', W / 2, H - 52);
    return cv.toDataURL('image/png');
  }

  // 데모 제품 단독 컷: 제품만 스포트라이트/연출
  function demoProductShot(W, H, product, angleLabel) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    studioBg(ctx, W, H);
    const cx = W / 2, cy = H * 0.44;
    const rg = ctx.createRadialGradient(cx, cy, 20, cx, cy, W * 0.6);
    rg.addColorStop(0, 'rgba(255,255,255,0.14)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    // 단상
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, cx - 150, H * 0.66, 300, 40, 14); ctx.fill();
    if (product) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 16;
      drawContainInto(ctx, product, cx - W * 0.28, H * 0.16, W * 0.56, H * 0.5);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef1f7';
    ctx.font = '700 30px "Noto Sans KR", sans-serif';
    ctx.fillText(angleLabel || '제품컷', W / 2, H - 84);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '600 17px "Noto Sans KR", sans-serif';
    ctx.fillText('DEMO · 제미나이 키를 넣으면 실사 생성', W / 2, H - 52);
    return cv.toDataURL('image/png');
  }

  // 데모 사진: 모델이 옷을 입은 연출 컷 PNG (뷰티/제품컷은 별도)
  async function demoPhoto(prompt, modelImage, productImages, opts = {}) {
    const W = 768, H = 1024;
    if (opts.beauty || opts.productOnly) {
      let product = null;
      try { if (productImages && productImages[0]) product = await loadImg(productImages[0]); } catch (e) {}
      if (opts.productOnly) return demoProductShot(W, H, product, opts.angleLabel);
      return demoBeauty(W, H, product, opts.model || null, opts.pose, opts.angleLabel);
    }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    studioBg(ctx, W, H);

    let garment = null;
    try { if (productImages && productImages[0]) garment = cutoutGarment(await loadImg(productImages[0])); } catch (e) {}

    const pose = POSE[opts.pose] || POSE.front;
    const model = opts.model || null;
    const cx = W / 2, cy = H / 2 - 30 + pose.cyMul * pose.s;

    ctx.save();
    if (pose.xs !== 1) { ctx.translate(cx, 0); ctx.scale(pose.xs, 1); ctx.translate(-cx, 0); }
    paintFigure(ctx, cx, cy, pose.s, model, garment, { face: pose.face, back: pose.back });
    ctx.restore();

    // 라벨
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef1f7';
    ctx.font = '700 30px "Noto Sans KR", sans-serif';
    ctx.fillText(`${model ? model.name + ' · ' : ''}${opts.angleLabel || '연출 컷'}`, W / 2, H - 84);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '600 17px "Noto Sans KR", sans-serif';
    ctx.fillText('DEMO · 제미나이 키를 넣으면 실사 착장 생성', W / 2, H - 52);

    return cv.toDataURL('image/png');
  }

  // 데모 영상: 모델이 옷을 입고 회전 → 클로즈업 → 퇴장하는 세로 영상(webm)
  async function demoVideo(prompt, refImages, opts = {}) {
    const W = 540, H = 960, FPS = 30;
    const seconds = opts.duration || 10;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    let garment = null;
    try { if (refImages && refImages[0]) garment = cutoutGarment(await loadImg(refImages[0])); } catch (e) {}
    const model = opts.model || null;

    const stream = cv.captureStream(FPS);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_500_000 });
    const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(r => { rec.onstop = () => r(); });
    rec.start();

    const total = seconds * FPS;
    const scenes = ['한 바퀴 회전', '로고 클로즈업', '단추 · 디테일', '옆모습', '퇴장'];
    for (let f = 0; f < total; f++) {
      drawVideoFrame(ctx, W, H, f / total, garment, model, scenes, seconds);
      await nextFrame();
    }
    rec.stop(); await done;
    return { url: URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })), mime: 'video/webm', demo: true };
  }

  function drawVideoFrame(ctx, W, H, t, garment, model, scenes, seconds) {
    studioBg(ctx, W, H);
    const phase = Math.min(4, Math.floor(t * 5));
    const localT = (t * 5) % 1;
    const cx = W / 2, baseCy = H / 2 - 10, s = 1.55;

    ctx.save();
    if (phase === 0) {
      // 한 바퀴 회전: yaw를 가로 스케일로, 90°~270°는 뒷모습
      const ang = localT * Math.PI * 2;
      const xs = Math.max(0.16, Math.abs(Math.cos(ang)));
      const back = Math.cos(ang) < 0;
      ctx.translate(cx, 0); ctx.scale(xs, 1); ctx.translate(-cx, 0);
      paintFigure(ctx, cx, baseCy, s, model, garment, { face: !back, back });
    } else if (phase === 1) {
      // 로고/가슴 클로즈업 — 머리는 화면 밖(얼굴 X, 옷만)
      paintFigure(ctx, cx, H / 2, 5.5, model, garment, { face: false });
    } else if (phase === 2) {
      // 단추·하단 디테일 — 더 아래로, 얼굴 없이 옷만
      paintFigure(ctx, cx, H / 2 - 180, 5.5, model, garment, { face: false });
    } else if (phase === 3) {
      // 옆모습
      ctx.translate(cx, 0); ctx.scale(0.6, 1); ctx.translate(-cx, 0);
      paintFigure(ctx, cx, baseCy, s, model, garment, { face: true });
    } else {
      // 퇴장: 좌측으로 걸어 나감
      const dx = -localT * (W * 0.9 + 240);
      ctx.translate(dx, 0);
      paintFigure(ctx, cx, baseCy, s, model, garment, { face: true });
    }
    ctx.restore();

    // 자막 / 진행바 / 태그
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef1f7';
    ctx.font = '800 30px "Noto Sans KR", sans-serif';
    ctx.fillText(`${model ? model.name + ' · ' : ''}${scenes[phase]}`, W / 2, H - 118);
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(40, H - 70, W - 80, 6);
    ctx.fillStyle = '#7c5cff'; ctx.fillRect(40, H - 70, (W - 80) * t, 6);
    ctx.fillStyle = '#6ee7ff';
    ctx.font = '600 14px "Noto Sans KR", sans-serif';
    ctx.fillText(`미리보기(DEMO) · API 키 연결 시 실제 인물 영상`, W / 2, H - 40);
  }

  /* ---- canvas 그리기 유틸 ---- */
  function drawCover(ctx, img, x, y, w, h) {
    const r = Math.max(w / img.width, h / img.height);
    const nw = img.width * r, nh = img.height * r;
    ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
  }
  function drawContain(ctx, img, x, y, w, h) {
    const r = Math.min(w / img.width, h / img.height);
    const nw = img.width * r, nh = img.height * r;
    ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
  }
  function drawContainCentered(ctx, img, w, h) {
    const r = Math.min(w / img.width, h / img.height);
    const nw = img.width * r, nh = img.height * r;
    ctx.drawImage(img, -nw / 2, -nh / 2, nw, nh);
  }
  function nextFrame() { return new Promise(r => requestAnimationFrame(() => r())); }

  return {
    getSettings, saveSettings, hasGemini, hasGrok,
    geminiPhoto, grokVideo, analyzeProduct,
    init, getServer,
  };
})();
