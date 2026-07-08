/* ============================================================
   studio.js — AI 스튜디오 UI 로직
   ============================================================ */

/* ---------- 상태 ---------- */
const LS_MODELS = 'studioModels_v1';

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_38eOsohcqV5hEwchok6qTqV494y/';
const DEFAULT_MODELS = [
  { id: 'm-seoa',   name: '서아', nameEn: 'Seoa',   desc: '청초·러블리 · 여성복', emoji: '👩', photo: CDN + 'hf_20260708_040519_4ee8c657-9a56-4f9a-aa34-a0a573989256.png' },
  { id: 'm-jimin',  name: '지민', nameEn: 'Jimin',  desc: '시크·모던 · 여성복',   emoji: '💃', photo: CDN + 'hf_20260708_040711_88b08c85-4668-444a-9613-259150ceb25c.png' },
  { id: 'm-haneul', name: '하늘', nameEn: 'Haneul', desc: '깔끔·훈훈 · 남성복',   emoji: '🧑', photo: CDN + 'hf_20260708_040714_6488a9e0-6215-406e-964e-25ca79cd9c5c.png' },
  { id: 'm-taesan', name: '태산', nameEn: 'Taesan', desc: '빅사이즈·듬직 · 남성복', emoji: '🧔', photo: CDN + 'hf_20260708_040717_faa9d5f9-63e8-40e4-9ad1-143d18aefd48.png' },
];

const DEFAULT_VIDEO_PROMPT =
`The character performs a 40-degree rotation in place: pausing precisely for 0.5 second, holding the pause with a natural, composed posture. Then keep rotating 40-degree in the same direction, pause 0.5 seconds. Then rotate back toward the camera and pause precisely for one full second. Then the camera moves in for close-ups of the clothing — showing the logo, the buttons, and the stitching/fabric details one by one. Then the model confidently walks to the left and leaves off-screen from the side. Vertical 9:16, 10 seconds, clean studio lighting.`;

let state = {
  models: [],
  selectedModelId: null,
  products: [],   // dataURL[]
};

/* ---------- 저장/불러오기 ---------- */
function loadModels() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_MODELS) || 'null');
    if (Array.isArray(s) && s.length) return s;
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_MODELS));
}
function saveModels() { localStorage.setItem(LS_MODELS, JSON.stringify(state.models)); }

/* ---------- 유틸 ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// 이미지 리사이즈(용량/속도) — 최대 1280px, jpeg 0.88
function shrinkImage(dataUrl, max = 1280) {
  return new Promise(resolve => {
    const im = new Image();
    im.onload = () => {
      let { width: w, height: h } = im;
      if (Math.max(w, h) > max) {
        const r = max / Math.max(w, h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(im, 0, 0, w, h);
      resolve(cv.toDataURL('image/jpeg', 0.88));
    };
    im.onerror = () => resolve(dataUrl);
    im.src = dataUrl;
  });
}

// URL/경로 이미지를 dataURL로 변환(같은 출처 또는 CORS 허용 시). 실패하면 null.
function ensureDataUrl(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    if (src.startsWith('data:')) return resolve(src);
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        cv.getContext('2d').drawImage(im, 0, 0);
        resolve(cv.toDataURL('image/jpeg', 0.9));
      } catch (e) { resolve(null); }
    };
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

async function ingestFiles(files, onEach) {
  const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!imgs.length) { toast('이미지 파일만 올릴 수 있어요'); return; }
  for (const f of imgs) {
    if (f.size > 15 * 1024 * 1024) { toast(`${f.name}: 15MB를 넘습니다`); continue; }
    const raw = await fileToDataURL(f);
    const small = await shrinkImage(raw);
    onEach(small);
  }
}

function download(url, filename) {
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ============================================================
   1. 모델
   ============================================================ */
function renderModels() {
  const grid = $('#modelGrid');
  grid.innerHTML = '';
  state.models.forEach(m => {
    const el = document.createElement('div');
    el.className = 'model-card' + (m.id === state.selectedModelId ? ' sel' : '');
    el.innerHTML = `
      <div class="mc-photo">${modelImgTag(m)}</div>
      <div class="mc-name">${escapeHtml(m.name)}${m.nameEn ? ` <span style="color:var(--ink3);font-weight:600">(${escapeHtml(m.nameEn)})</span>` : ''}</div>
      <div class="mc-desc">${escapeHtml(m.desc || '')}</div>`;
    el.onclick = () => { state.selectedModelId = m.id; renderModels(); updateGenInfo(); };
    grid.appendChild(el);
  });
  // 추가 카드
  const add = document.createElement('div');
  add.className = 'model-card add-card';
  add.innerHTML = `<div class="plus">＋</div><div>새 모델 추가</div>`;
  add.onclick = openAdmin;
  grid.appendChild(add);
}

function selectedModel() { return state.models.find(m => m.id === state.selectedModelId) || null; }

// 자체 내장 SVG 아바타 (외부 이미지가 없거나 차단됐을 때의 폴백)
const AVATAR_GRAD = {
  'm-seoa':   ['#fbc2eb', '#a18cd1'],
  'm-jimin':  ['#a6c1ee', '#7b9cf2'],
  'm-haneul': ['#a1f0c4', '#5eb6e6'],
  'm-taesan': ['#5a7bd8', '#26324f'],
};
function avatarDataUri(m) {
  const [c1, c2] = AVATAR_GRAD[m.id] || ['#a78bfa', '#5b3fd6'];
  const initial = escapeHtml((m.nameEn || m.name || '?').slice(0, 1).toUpperCase());
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='260' viewBox='0 0 240 260'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
    `<rect width='240' height='260' fill='url(#g)'/>` +
    `<circle cx='120' cy='104' r='44' fill='rgba(255,255,255,0.92)'/>` +
    `<path d='M120 158 c-48 0 -74 30 -74 66 v40 h148 v-40 c0 -36 -26 -66 -74 -66 z' fill='rgba(255,255,255,0.92)'/>` +
    `<text x='120' y='120' font-family='sans-serif' font-size='42' font-weight='700' fill='${c2}' text-anchor='middle'>${initial}</text>` +
    `</svg>`;
  // 작은따옴표까지 인코딩해야 인라인 onerror 문자열이 깨지지 않음
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/'/g, '%27');
}
// 모델 사진 <img> (실패 시 SVG 아바타로 폴백)
function modelImgTag(m, cls) {
  const fallback = avatarDataUri(m);
  const src = m.photo || fallback;
  return `<img class="${cls || ''}" src="${src}" alt="" loading="lazy" ` +
    `onerror="this.onerror=null;this.src='${fallback}'">`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ============================================================
   모델 관리 모달
   ============================================================ */
let mfPhotoData = '';

function openAdmin() { renderAdminList(); resetModelForm(); $('#adminModal').classList.add('open'); }
function renderAdminList() {
  const list = $('#adminList');
  list.innerHTML = '';
  if (!state.models.length) { list.innerHTML = '<p class="tiny">등록된 모델이 없습니다.</p>'; return; }
  state.models.forEach(m => {
    const row = document.createElement('div');
    row.className = 'admin-item';
    row.innerHTML = `
      <div class="ai-photo">${modelImgTag(m)}</div>
      <div class="ai-info">
        <div class="ai-name">${escapeHtml(m.name)} ${m.nameEn ? `<span style="color:var(--ink3);font-weight:600">(${escapeHtml(m.nameEn)})</span>` : ''}</div>
        <div class="ai-desc">${escapeHtml(m.desc || '')}</div>
      </div>
      <div class="ai-acts">
        <button class="btn sm" data-edit="${m.id}">수정</button>
        <button class="btn sm danger" data-del="${m.id}">삭제</button>
      </div>`;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editModel(b.dataset.edit));
  list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => deleteModel(b.dataset.del));
}

function resetModelForm() {
  $('#modelId').value = '';
  $('#mfName').value = ''; $('#mfNameEn').value = ''; $('#mfDesc').value = '';
  mfPhotoData = '';
  $('#mfPhotoPrev').innerHTML = '<span>사진 없음</span>';
}
function editModel(id) {
  const m = state.models.find(x => x.id === id);
  if (!m) return;
  $('#modelId').value = m.id;
  $('#mfName').value = m.name; $('#mfNameEn').value = m.nameEn || ''; $('#mfDesc').value = m.desc || '';
  mfPhotoData = m.photo || '';
  $('#mfPhotoPrev').innerHTML = m.photo ? `<img src="${m.photo}">` : '<span>사진 없음</span>';
  $('#adminModal').scrollTo?.({ top: 0 });
}
function deleteModel(id) {
  if (!confirm('이 모델을 삭제할까요?')) return;
  state.models = state.models.filter(m => m.id !== id);
  if (state.selectedModelId === id) state.selectedModelId = state.models[0]?.id || null;
  saveModels(); renderModels(); renderAdminList(); updateGenInfo();
  toast('삭제되었습니다');
}

function submitModelForm(e) {
  e.preventDefault();
  const id = $('#modelId').value || 'm-' + Date.now();
  const name = $('#mfName').value.trim();
  if (!name) return;
  const data = {
    id, name,
    nameEn: $('#mfNameEn').value.trim(),
    desc: $('#mfDesc').value.trim(),
    photo: mfPhotoData || '',
    emoji: '👤',
  };
  const idx = state.models.findIndex(m => m.id === id);
  if (idx >= 0) state.models[idx] = { ...state.models[idx], ...data };
  else state.models.push(data);
  if (!state.selectedModelId) state.selectedModelId = id;
  saveModels(); renderModels(); renderAdminList(); resetModelForm(); updateGenInfo();
  toast('저장되었습니다');
}

/* ============================================================
   2. 제품 업로드
   ============================================================ */
function addProduct(dataUrl) { state.products.push(dataUrl); renderThumbs(); updateGenInfo(); }
function renderThumbs() {
  const wrap = $('#thumbs');
  wrap.innerHTML = '';
  state.products.forEach((src, i) => {
    const t = document.createElement('div');
    t.className = 'thumb';
    t.innerHTML = `<img src="${src}"><button class="rm" title="제거">×</button>`;
    t.querySelector('.rm').onclick = () => { state.products.splice(i, 1); renderThumbs(); updateGenInfo(); };
    wrap.appendChild(t);
  });
}

function setupDropzone() {
  const dz = $('#dropZone'), fi = $('#fileInput');
  dz.onclick = () => fi.click();
  dz.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') fi.click(); };
  fi.onchange = () => { ingestFiles(fi.files, addProduct); fi.value = ''; };

  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); dz.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); if (ev === 'drop' || e.target === dz) dz.classList.remove('over');
  }));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('over');
    if (e.dataTransfer.files.length) ingestFiles(e.dataTransfer.files, addProduct);
  });
}

// 전역 붙여넣기(Ctrl+V) — 모델폼이 열려있으면 그쪽으로
function setupPaste() {
  window.addEventListener('paste', e => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    const adminOpen = $('#adminModal').classList.contains('open');
    ingestFiles([file], data => {
      if (adminOpen) setModelPhoto(data);
      else addProduct(data);
    });
    toast(adminOpen ? '모델 사진으로 붙여넣었어요' : '제품 사진을 붙여넣었어요');
  });
}

function setModelPhoto(data) {
  mfPhotoData = data;
  $('#mfPhotoPrev').innerHTML = `<img src="${data}">`;
}

/* ============================================================
   3/4. 프롬프트 & 생성
   ============================================================ */
function updateGenInfo() {
  const m = selectedModel();
  const parts = [];
  parts.push(m ? `모델: ${m.name}` : '모델 미선택');
  parts.push(`제품 ${state.products.length}장`);
  const outs = [];
  if ($('#outVideo').checked) outs.push('영상');
  if ($('#outPhoto').checked) outs.push(`사진 ${$('#photoCount').value}장`);
  parts.push(outs.length ? outs.join(' + ') : '출력 미선택');
  $('#genInfo').textContent = parts.join(' · ');
}

function updateConnBanner() {
  const b = $('#connBanner');
  const g = StudioAPI.hasGemini(), v = StudioAPI.hasGrok();
  const srv = StudioAPI.getServer();
  const via = srv.available ? ' · 서버 연동' : '';
  if (g && v) { b.className = 'conn-banner live'; b.textContent = `● 실연동: 제미나이(사진) · 영상 생성 연결됨${via}`; }
  else if (g || v) {
    b.className = 'conn-banner live';
    b.textContent = `● 부분 연동: ${g ? '제미나이(사진) 연결' : '영상 생성 연결'} · 나머지는 데모 모드${via}`;
  } else {
    b.className = 'conn-banner demo';
    b.textContent = srv.available
      ? '● 데모 모드: 서버에 API 키가 없어 미리보기 파일을 만듭니다. .env 에 키를 넣고 재시작하면 실제 생성됩니다.'
      : '● 데모 모드: 미리보기 파일을 만듭니다. node server.js 로 서버를 켜고 키를 넣거나, [🔑 API 연결]에서 키를 넣으면 실제 생성됩니다.';
  }
}

// 사진 연출 앵글 (자동)
const PHOTO_ANGLES = [
  { key: '앞모습',   en: 'full-body front view, model facing camera' },
  { key: '뒷모습',   en: 'full-body back view, showing the back of the garment' },
  { key: '옆모습',   en: 'full-body side profile view' },
  { key: '디테일',   en: 'close-up detail shot of the fabric, logo and buttons' },
  { key: '상반신',   en: 'upper-body three-quarter fashion shot' },
  { key: '착장 무드', en: 'editorial lifestyle mood shot, natural pose' },
];

function buildPhotoPrompt(model, angle, userExtra) {
  const who = model
    ? `Use the provided reference photo as the model (${model.name}${model.desc ? ', ' + model.desc : ''}). Keep the same face and body.`
    : `A professional fashion model.`;
  return [
    `${who}`,
    `Dress the model in the uploaded clothing item exactly as shown (keep colors, print, logo and details faithful).`,
    `Shot: ${angle.en}.`,
    `Clean studio background, realistic fashion catalog photography, high detail, vertical 3:4.`,
    userExtra ? `Extra direction: ${userExtra}` : '',
  ].filter(Boolean).join(' ');
}

async function generate() {
  const model = selectedModel();
  const wantVideo = $('#outVideo').checked;
  const wantPhoto = $('#outPhoto').checked;

  if (!state.products.length) { toast('제품 사진을 먼저 올려주세요'); return; }
  if (!wantVideo && !wantPhoto) { toast('출력(영상/사진)을 하나 이상 선택하세요'); return; }

  const btn = $('#btnGenerate');
  btn.disabled = true;
  const origLabel = btn.textContent;

  $('#results').hidden = false;
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 모델 참조 사진을 dataURL로(가능하면). 실패해도 진행.
  const modelImg = model ? (await ensureDataUrl(model.photo)) || model.photo || null : null;

  try {
    /* ----- 사진 (제미나이) ----- */
    if (wantPhoto) {
      const count = parseInt($('#photoCount').value, 10);
      const angles = PHOTO_ANGLES.slice(0, count);
      const userExtra = $('#photoPrompt').value.trim();
      const rv = $('#resultPhotos'); rv.hidden = false;
      const gal = $('#photoGallery'); gal.innerHTML = '';

      // 로딩 슬롯
      angles.forEach((a, i) => {
        const it = document.createElement('div');
        it.className = 'pg-item'; it.id = `pg-${i}`;
        it.innerHTML = `<div class="pg-loading"><span class="spin"></span></div><div class="pg-cap"><span>${a.key}</span></div>`;
        gal.appendChild(it);
      });

      btn.textContent = '🖼️ 사진 생성 중…';
      for (let i = 0; i < angles.length; i++) {
        const a = angles[i];
        const prompt = buildPhotoPrompt(model, a, userExtra);
        try {
          const img = await StudioAPI.geminiPhoto(prompt, modelImg, state.products);
          const slot = $(`#pg-${i}`);
          slot.innerHTML = `
            <img src="${img}" alt="${a.key}">
            <div class="pg-cap"><span>${a.key}</span>
              <a class="pg-dl" href="#" data-src="${'x'}">저장 ↓</a></div>`;
          const dl = slot.querySelector('.pg-dl');
          dl.onclick = e => { e.preventDefault(); download(img, `연출_${a.key}_${i + 1}.png`); };
        } catch (err) {
          $(`#pg-${i}`).innerHTML =
            `<div class="pg-loading" style="color:var(--red);font-size:11px;padding:10px;text-align:center">${a.key}<br>실패: ${escapeHtml(err.message)}</div>`;
        }
      }
    } else {
      $('#resultPhotos').hidden = true;
    }

    /* ----- 영상 (그록) ----- */
    if (wantVideo) {
      const rv = $('#resultVideo'); rv.hidden = false;
      const wrap = $('#rvWrap');
      wrap.innerHTML = `<div class="rv-placeholder" style="display:flex;align-items:center;justify-content:center;color:var(--ink3);font-size:12px;flex-direction:column;gap:10px"><span class="spin"></span>영상 생성 중…</div>`;
      btn.textContent = '🎬 영상 생성 중…';

      const vprompt = $('#videoPrompt').value.trim() || DEFAULT_VIDEO_PROMPT;
      try {
        const out = await StudioAPI.grokVideo(vprompt, state.products, {
          duration: 10, aspect: '9:16', modelImage: modelImg,
        });
        const ext = out.mime && out.mime.includes('webm') ? 'webm' : 'mp4';
        wrap.innerHTML = `
          <video src="${out.url}" controls autoplay muted loop playsinline></video>
          <div class="rv-dl"><a class="dlbtn" id="vdl">⬇ 영상 저장 (.${ext})</a>
            ${out.demo ? '<div class="tiny" style="margin-top:6px">DEMO 영상입니다. 그록 키를 넣으면 실제 mp4가 생성됩니다.</div>' : ''}</div>`;
        $('#vdl').onclick = () => download(out.url, `스튜디오_영상.${ext}`);
      } catch (err) {
        wrap.innerHTML = `<div class="rv-placeholder" style="display:flex;align-items:center;justify-content:center;color:var(--red);font-size:12px;padding:16px;text-align:center">영상 생성 실패<br>${escapeHtml(err.message)}</div>`;
      }
    } else {
      $('#resultVideo').hidden = true;
    }

    toast('완료되었습니다 🎉');
  } finally {
    btn.disabled = false;
    btn.textContent = origLabel;
  }
}

/* ============================================================
   설정 모달
   ============================================================ */
function openSettings() {
  const s = StudioAPI.getSettings();
  $('#setGeminiKey').value = s.geminiKey;
  $('#setGeminiModel').value = s.geminiModel;
  $('#setGrokUrl').value = s.grokUrl;
  $('#setGrokKey').value = s.grokKey;
  $('#setGrokModel').value = s.grokModel;
  $('#setStatus').textContent = '';
  $('#settingsModal').classList.add('open');
}
function saveSettingsUI() {
  StudioAPI.saveSettings({
    geminiKey: $('#setGeminiKey').value.trim(),
    geminiModel: $('#setGeminiModel').value.trim() || 'gemini-2.5-flash-image',
    grokUrl: $('#setGrokUrl').value.trim(),
    grokKey: $('#setGrokKey').value.trim(),
    grokModel: $('#setGrokModel').value.trim() || 'grok-video',
  });
  updateConnBanner();
  toast('저장되었습니다');
  $('#settingsModal').classList.remove('open');
}
async function testConn() {
  const st = $('#setStatus');
  const key = $('#setGeminiKey').value.trim();
  if (!key) { st.className = 'set-status err'; st.textContent = '제미나이 키를 입력하면 연결을 확인합니다.'; return; }
  st.className = 'set-status'; st.textContent = '확인 중…';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    if (res.ok) { st.className = 'set-status ok'; st.textContent = '✓ 제미나이 키 정상'; }
    else { st.className = 'set-status err'; st.textContent = `✗ 제미나이 응답 ${res.status}`; }
  } catch (e) {
    st.className = 'set-status err'; st.textContent = '✗ 네트워크 오류: ' + e.message;
  }
}

/* ============================================================
   초기화
   ============================================================ */
async function init() {
  state.models = loadModels();
  state.selectedModelId = state.models[0]?.id || null;
  renderModels();
  renderThumbs();
  $('#videoPrompt').value = DEFAULT_VIDEO_PROMPT;
  setupDropzone();
  setupPaste();
  updateConnBanner();
  updateGenInfo();
  // 백엔드 서버 연결 확인 후 배너 갱신
  StudioAPI.init().then(updateConnBanner);

  // 상단 버튼
  $('#btnAdmin').onclick = openAdmin;
  $('#btnAddModelInline').onclick = openAdmin;
  $('#btnSettings').onclick = openSettings;
  $('#btnGenerate').onclick = generate;
  $('#btnResetPrompt').onclick = () => { $('#videoPrompt').value = DEFAULT_VIDEO_PROMPT; toast('기본 프롬프트로 되돌렸어요'); };
  $('#btnClearResults').onclick = () => { $('#results').hidden = true; };

  // 출력 옵션 변경 → 정보 갱신
  ['outVideo', 'outPhoto', 'photoCount'].forEach(id => $('#' + id).addEventListener('change', updateGenInfo));

  // 모델 폼
  $('#modelForm').onsubmit = submitModelForm;
  $('#mfReset').onclick = resetModelForm;
  $('#mfPhotoBtn').onclick = () => $('#mfPhotoInput').click();
  $('#mfPhotoInput').onchange = e => { ingestFiles(e.target.files, setModelPhoto); e.target.value = ''; };
  // 모델 사진 미리보기 영역 드래그
  const prev = $('#mfPhotoPrev');
  prev.addEventListener('dragover', e => { e.preventDefault(); });
  prev.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length) ingestFiles(e.dataTransfer.files, setModelPhoto); });

  // 설정
  $('#btnSaveSettings').onclick = saveSettingsUI;
  $('#btnTestConn').onclick = testConn;

  // 모달 닫기
  $$('[data-close]').forEach(b => b.onclick = () => $('#' + b.dataset.close).classList.remove('open'));
  $$('.modal-ov').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); }));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal-ov.open').forEach(m => m.classList.remove('open')); });
}

document.addEventListener('DOMContentLoaded', init);
