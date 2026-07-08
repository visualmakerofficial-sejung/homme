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
  async function geminiPhoto(prompt, modelImage, productImages) {
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
    if (!s.geminiKey) return demoPhoto(prompt, modelImage, productImages);

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

  /* ---------- 그록: 영상 생성 ----------
     반환: { url } (재생/다운로드 가능한 mp4 URL)
     엔드포인트/응답 스키마는 제공사에 맞춰 조정하세요.
  ------------------------------------------------ */
  async function grokVideo(prompt, refImages, opts = {}) {
    // 1순위: 백엔드 서버
    if (server.available && server.video.enabled) {
      const r = await fetch('/api/video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, images: refImages, duration: opts.duration || 10, aspect: opts.aspect || '9:16' }),
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

  // 데모 사진: 제품 이미지를 카드형 연출로 합성한 PNG
  async function demoPhoto(prompt, modelImage, productImages) {
    const W = 768, H = 1024;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    // 배경 그라디언트
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#20242f'); g.addColorStop(1, '#0d0f15');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 모델 배경 (있으면)
    if (modelImage) {
      try {
        const mi = await loadImg(modelImage);
        ctx.globalAlpha = 0.28;
        drawCover(ctx, mi, 0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(10,12,18,0.45)';
        ctx.fillRect(0, 0, W, H);
      } catch (e) {}
    }

    // 제품 중앙 배치
    const prod = productImages && productImages[0];
    if (prod) {
      try {
        const pi = await loadImg(prod);
        const pad = 90;
        drawContain(ctx, pi, pad, 150, W - pad * 2, H - 380);
      } catch (e) {}
    }

    // 라벨
    ctx.fillStyle = '#eef1f7';
    ctx.font = '700 30px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    const label = (prompt || '').split('\n')[0].slice(0, 22) || '연출 컷';
    ctx.fillText(label, W / 2, H - 90);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '600 18px "Noto Sans KR", sans-serif';
    ctx.fillText('DEMO · 제미나이 키를 넣으면 실제 생성', W / 2, H - 56);

    return cv.toDataURL('image/png');
  }

  // 데모 영상: 제품이 한 바퀴 도는 세로 영상(webm)
  async function demoVideo(prompt, refImages, opts = {}) {
    const W = 540, H = 960, FPS = 30;
    const seconds = opts.duration || 10;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    let prod = null, model = null;
    try { if (refImages && refImages[0]) prod = await loadImg(refImages[0]); } catch (e) {}
    try { if (opts.modelImage) model = await loadImg(opts.modelImage); } catch (e) {}

    const stream = cv.captureStream(FPS);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
    const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);

    const done = new Promise(resolve => { rec.onstop = () => resolve(); });
    rec.start();

    const total = seconds * FPS;
    const scenes = ['한 바퀴 회전', '로고 클로즈업', '단추 · 디테일', '옆모습', '퇴장'];

    for (let f = 0; f < total; f++) {
      const t = f / total; // 0..1
      drawVideoFrame(ctx, W, H, t, prod, model, scenes, seconds);
      await nextFrame();
    }
    rec.stop();
    await done;
    const blob = new Blob(chunks, { type: 'video/webm' });
    return { url: URL.createObjectURL(blob), mime: 'video/webm', demo: true };
  }

  function drawVideoFrame(ctx, W, H, t, prod, model, scenes, seconds) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#191d28'); bg.addColorStop(1, '#0a0c12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    if (model) { ctx.globalAlpha = 0.18; drawCover(ctx, model, 0, 0, W, H); ctx.globalAlpha = 1; }

    const phase = Math.min(4, Math.floor(t * 5)); // 0..4
    const localT = (t * 5) % 1;

    ctx.save();
    ctx.translate(W / 2, H / 2 - 40);

    if (prod) {
      if (phase === 0) {
        // 회전 (yaw 시뮬레이션: 가로 스케일)
        const ang = localT * Math.PI * 2;
        const sx = Math.max(0.12, Math.abs(Math.cos(ang)));
        ctx.scale(sx, 1);
        drawContainCentered(ctx, prod, 360, 520);
      } else if (phase >= 1 && phase <= 3) {
        // 클로즈업 (줌 인 + 이동)
        const zoom = 1.7 + localT * 0.5;
        const dx = (phase - 2) * 70;
        const dy = (phase === 2 ? 60 : -30);
        ctx.translate(dx, dy);
        ctx.scale(zoom, zoom);
        drawContainCentered(ctx, prod, 360, 520);
      } else {
        // 퇴장 (좌측으로 슬라이드 아웃)
        ctx.translate(-localT * (W + 200), 0);
        drawContainCentered(ctx, prod, 360, 520);
      }
    } else {
      ctx.fillStyle = '#333b4d';
      ctx.fillRect(-120, -180, 240, 360);
    }
    ctx.restore();

    // 자막
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef1f7';
    ctx.font = '800 30px "Noto Sans KR", sans-serif';
    ctx.fillText(scenes[phase], W / 2, H - 120);

    // 진행 바
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fillRect(40, H - 70, W - 80, 6);
    ctx.fillStyle = '#7c5cff';
    ctx.fillRect(40, H - 70, (W - 80) * t, 6);

    ctx.fillStyle = '#6ee7ff';
    ctx.font = '600 15px "Noto Sans KR", sans-serif';
    ctx.fillText(`DEMO · 그록 · ${seconds}s · 9:16`, W / 2, H - 40);
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
    geminiPhoto, grokVideo,
    init, getServer,
  };
})();
