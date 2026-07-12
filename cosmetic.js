/* ============================================================
   cosmetic.js — 화장품 제품 연출 이미지 9컷 자동 생성기
   · 제품 사진 1장 분석 → 브랜드 톤·용량·크기 추정(수기 수정)
   · 9개 연출컷을 각각 "독립된 이미지"로 개별 생성 (콜라주 아님)
   · 제품 정체성 보존 공통 프롬프트 + 네거티브 프롬프트
   · 1:1 / 4:5 / 9:16 / 16:9 · 1080 / 2K / 4K · JPG/PNG/WEBP · 개별+ZIP
   · 이미지 생성/분석은 studio-api.js(StudioAPI) 프로바이더 재사용(제미나이)
   ============================================================ */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
let _toastT;
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
function download(dataUrl, name) {
  const a = document.createElement('a'); a.href = dataUrl; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}
function slug(s) {
  return (s || 'product').toString().trim().toLowerCase()
    .replace(/[^\w가-힣-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'product';
}
function loadImg(src) {
  return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

/* ============================================================
   제품 종류 & 제형 프로파일
   ============================================================ */
const PRODUCT_TYPE_LABELS = {
  serum: '세럼·앰플·오일',
  cream: '크림·로션·젤',
  cushion: '쿠션·콤팩트',
  perfume: '향수',
  lip: '립스틱·틴트·립글로스',
};
const PRODUCT_PROFILES = {
  serum: {
    typeEn: 'facial serum / ampoule / oil',
    formulaDescription: 'a serum that keeps the color, transparency and viscosity analyzed from the uploaded image',
    applicator: 'dropper, pump or the actual dispensing structure of the product',
  },
  cream: {
    typeEn: 'face cream / lotion / gel',
    formulaDescription: 'a cream or gel that keeps the color and density analyzed from the uploaded image',
    applicator: 'spatula, pump, tube nozzle or jar opening',
  },
  cushion: {
    typeEn: 'cushion / compact foundation',
    formulaDescription: 'a cushion foundation with the same color and finish as the uploaded image',
    applicator: 'puff, cushion sponge, compact',
  },
  perfume: {
    typeEn: 'perfume / eau de parfum',
    formulaDescription: 'a perfume liquid with the same color and transparency as the uploaded image',
    applicator: 'spray nozzle, cap, atomizer',
  },
  lip: {
    typeEn: 'lipstick / tint / lip gloss',
    formulaDescription: 'a lip formula with the same color, saturation and gloss as the uploaded image',
    applicator: 'lipstick bullet, tip, wand, tube',
  },
};

/* 출력 비율 / 해상도 / 화질 */
const ASPECTS = [
  { ar: '1:1', label: '1:1 정사각형' },
  { ar: '4:5', label: '4:5 피드' },
  { ar: '9:16', label: '9:16 릴스·스토리' },
  { ar: '16:9', label: '16:9 배너' },
];
const RESOLUTION_MAP = {
  '1080': { '1:1': [1080, 1080], '4:5': [1080, 1350], '9:16': [1080, 1920], '16:9': [1920, 1080] },
  '2K': { '1:1': [2048, 2048], '4:5': [2048, 2560], '9:16': [1440, 2560], '16:9': [2560, 1440] },
  '4K': { '1:1': [3840, 3840], '4:5': [3072, 3840], '9:16': [2160, 3840], '16:9': [3840, 2160] },
};
const EXPORT = {
  jpg: { mime: 'image/jpeg', ext: 'jpg', q: { '1080': 0.92, '2K': 0.95, '4K': 0.96 } },
  webp: { mime: 'image/webp', ext: 'webp', q: { '1080': 0.90, '2K': 0.93, '4K': 0.95 } },
  png: { mime: 'image/png', ext: 'png', q: null },
};

/* ============================================================
   공통 프롬프트 (모든 장면 앞에 자동 결합) + 네거티브
   ============================================================ */
const COMMON_PROMPT =
`Use the uploaded product image(s) as the primary and strict visual reference.
When multiple reference images are provided (front, back, side, styled shots), they ALL show the SAME single product from different angles — study them together to understand its true 3D form, then reproduce THAT exact product. Never blend in, swap, or invent a different product.
CRITICAL PRODUCT PRESERVATION:
Preserve the exact product identity shown in the uploaded reference image.
Do not change the product container shape, dimensions, proportions, cap shape, applicator shape, label size, label position, logo, typography, printed text, capacity text, material, transparency, formula color, fill level, or packaging structure.
The generated product must remain recognizable as the exact same real product from the uploaded image.
Do not redesign, simplify, replace, translate, reinterpret, or invent any label or packaging detail.
Read the capacity text printed on the product label and use it to estimate the realistic physical scale of the product.
Use the analyzed capacity and container proportions to maintain realistic scale relative to hands, props, boxes, furniture, and other products.
Product type: {{PRODUCT_TYPE}}.
Product name: {{PRODUCT_NAME}}.
Capacity: {{CAPACITY_TEXT}}.
Estimated product width: {{ESTIMATED_WIDTH_MM}} mm.
Estimated product height: {{ESTIMATED_HEIGHT_MM}} mm.
Container type: {{CONTAINER_TYPE}}.
Container material: {{CONTAINER_MATERIAL}}.
Applicator type: {{APPLICATOR_TYPE}}.
Formula description: {{FORMULA_DESCRIPTION}}.
Dominant palette: {{DOMINANT_PALETTE}}.
Brand mood: {{BRAND_MOOD}}.
Derive the background, props, materials, styling, and lighting from the actual product color palette and brand mood.
Ultra-realistic commercial cosmetic photography. High-end beauty campaign photography. Natural material rendering. Crisp product focus. Realistic reflections. Physically believable shadows. Premium editorial lighting. No cartoon appearance. No fake CGI texture. No obvious AI artifacts.
The product must always remain the visual hero.
Do not allow props, hands, texture, ingredients, splashes, packaging, shadows, or reflections to cover the main label.
Unless the current scene explicitly allows moisture, keep the product completely clean and dry. Do not generate water droplets outside the designated moisture scene.
Produce ONE single standalone image only — never a grid, collage, split-screen, or multi-panel layout.`;

const NEGATIVE_PROMPT =
`changed bottle shape, changed container proportions, distorted packaging, warped bottle, warped label, misspelled brand name, fake typography, invented text, translated label, missing capacity text, altered logo, changed formula color, changed fill level, extra cap, duplicate applicator, duplicate product parts, impossible product geometry, fake packaging details, unreadable label, blurry label, plastic-looking glass, deformed hand, extra fingers, missing fingers, oversized product, undersized product, incorrect hand scale, excessive props, overcrowded composition, cartoon, illustration, low resolution, obvious AI artifacts, heavy condensation outside moisture scene, water droplets outside moisture scene, collage, grid, split screen, multiple panels`;

/* ============================================================
   9개 연출컷 정의 (각 장면 프롬프트는 스펙 원문)
   ============================================================ */
const SCENES = [
  { id: 'hero', order: 1, name: '정면 히어로컷', file: 'hero-front', prompt:
`Create a front-facing hero shot of one product standing upright at the center of the frame.
Use a straight-on, eye-level camera angle. Keep the entire product visible inside the frame.
Make the main label, logo, product name, and capacity text fully visible, readable, and sharply focused.
Use a clean minimal background derived from the product's own color palette. Add a soft tonal gradient and a subtle premium shadow beneath the product. Use generous negative space.
Do not add additional products. Do not add botanical ingredients, towels, water, texture smears, or decorative props. A single minimal pedestal or clean flat surface is allowed only when necessary.
Use soft studio lighting with elegant highlights that reveal the real container material. Keep the product completely clean and dry.
The result must feel like an official premium cosmetic brand key visual.
Output ratio: {{OUTPUT_ASPECT_RATIO}}.` },

  { id: 'multi', order: 2, name: '듀얼·멀티 제품컷', file: 'multi-product', prompt:
`Create a premium multi-product composition using two or three instances of the exact same product.
Maintain the correct physical size based on the analyzed product capacity. Place the products with generous breathing room. Do not let the products touch each other. Do not place the products too close together.
The main product should face forward. The second product may be rotated only slightly, within approximately 10 degrees from the front view. An optional third product may be placed farther behind to create depth.
{{OUTER_BOX_RULE}}
Use subtle height differences, staggered depth, or minimal platforms. Keep the main product label fully readable. Use a restrained background derived from the product palette. Keep all product surfaces completely clean and dry. Do not add water droplets.
The result should feel balanced, spacious, editorial, and suitable for a premium cosmetic campaign.
Output ratio: {{OUTPUT_ASPECT_RATIO}}.` },

  { id: 'hand', order: 3, name: '손에 들고 있는 컷', file: 'handheld', prompt:
`Create a realistic hand-held product shot.
Use the capacity and estimated product dimensions to create a realistic scale between the hand and the product. A small-capacity product must look appropriately small in the hand. A large-capacity product must look appropriately large in the hand.
Show one clean, natural hand holding the product gently. Do not let the fingers cover the logo, product name, label, or capacity text. Use realistic skin texture and anatomically correct fingers. Use neat natural nails. Do not use bold nail art. Do not add distracting jewelry or accessories.
The grip should look natural and physically believable. The product must remain the main visual focus. Use a soft, bright background derived from the product palette. Subtle natural window-light shadows may appear in the background. Keep both the product and the hand completely clean and dry. Do not add water droplets.
The final image should feel premium, realistic, approachable, and suitable for social advertising.
Output ratio: {{OUTPUT_ASPECT_RATIO}}.` },

  { id: 'texture', order: 4, name: '제형 강조컷', file: 'texture-focus', prompt:
`Create a texture-focused product image. Show one main product standing upright.
Place the real product applicator, dropper, spatula, pump output, puff, spray nozzle, lipstick tip, or wand beside or slightly above the product, depending on the detected product type.
Display a controlled formula texture on a separate, clearly visible area of the surface. The formula must match the exact color, transparency, opacity, gloss, thickness, and estimated viscosity of the uploaded product. Keep the formula texture separated from the product and label. Do not allow the formula to overlap the product label. Leave enough empty space around the formula texture.
For serum, show a controlled glossy serum pool or one suspended droplet. For cream, show a smooth cream swipe with visible thickness. For cushion, show a small foundation swatch that matches the detected shade. For perfume, do not create a cosmetic smear — show a refined fragrance mist or delicate scent trail. For lip products, show a precise color swatch matching the actual product shade and finish.
Keep the product container itself completely clean and dry. Only the separate formula texture may appear glossy or wet. Use a minimal premium studio background.
Output ratio: {{OUTPUT_ASPECT_RATIO}}.` },

  { id: 'floating', order: 5, name: '공중 분리·플로팅컷', file: 'floating-exploded', prompt:
`Create a refined floating exploded-view cosmetic product shot.
Separate only components that are genuinely detachable in real use. Float the product body, cap, dropper, applicator, puff, lid, or outer box with clean and controlled spacing. Do not invent internal components that are not visible in the uploaded reference images.
Align the cap, applicator, dropper, or closure naturally with the product opening. Preserve the exact real-world geometry and scale of each component. Do not create impossible connections. Do not bend, stretch, or distort the product.
{{OUTER_BOX_RULE}}
Use soft shadows beneath each floating component to create believable depth.
For a serum product, one small formula droplet may remain at the pipette tip. For a cream jar, float the lid above the jar only when the lid is detachable. For a cushion, preserve the compact hinge and do not detach fixed parts. For perfume, preserve the spray nozzle, collar, cap, and bottle structure. For lip products, separate the cap only when it is detachable in real use.
Keep all components clean and dry. Do not add water droplets. Use a minimal background derived from the product palette. The scene may feel three-dimensional but must remain photorealistic and physically believable.
Output ratio: {{OUTPUT_ASPECT_RATIO}}.` },

  { id: 'ingredient', order: 6, name: '자연 성분 연출컷', file: 'natural-ingredient', prompt:
`Create a premium natural-ingredient concept shot. Show one main product standing upright, centered or slightly off-center.
Use only one or two key ingredients. {{INGREDIENT_RULE}}
Arrange the ingredients naturally around the product. Do not cover the logo, label, product name, or capacity text. Do not overcrowd the frame. Use ingredient shapes, colors, and textures that support the product's actual color palette and brand mood.
Use soft natural light. Use a clean background derived from the product palette. Keep the product completely clean and dry. The ingredients may look fresh, but do not add visible water droplets to the product.
The final image should feel fresh, elegant, botanical, and premium.
Output ratio: {{OUTPUT_ASPECT_RATIO}}.` },

  { id: 'moisture', order: 7, name: '수분광·물기씬', file: 'water-moisture', prompt:
`Create a refined hydration and moisture scene appropriate for the detected product type. This is the only scene where moisture is allowed on the product.
Add only a small and refined amount of realistic moisture. Do not cover the logo, label, product name, or capacity text with water. Do not soak the product. Do not create excessive condensation. Do not create a dramatic water explosion.
For serum, place the product on a lightly reflective damp surface or in very shallow water; add only a few fine droplets to the outer glass and cap, with gentle ripples near the base. For cream, place the closed jar, tube, or pump product on a lightly reflective damp surface; add only a few fine droplets to the outside packaging; do not place water inside the container. For cushion, do not submerge the compact; use a reflective surface with a few tiny droplets around the compact; never place water inside the compact, mirror, puff, or cushion sponge. For perfume, use a refined wet reflective surface or a delicate mist atmosphere; add only a few elegant droplets to the outer glass when appropriate. For lip products, do not place the product in water; use a glossy reflective surface with a few tiny droplets around the product; never place water on the lipstick bullet, applicator, or wand.
Use gentle ripples, delicate reflections, and restrained splash details only when physically appropriate. Use bright, clean lighting that communicates freshness, purity, and hydration. Use a minimal background derived from the product palette.
Output ratio: {{OUTPUT_ASPECT_RATIO}}.` },

  { id: 'lifestyle', order: 8, name: '라이프스타일 공간컷', file: 'lifestyle', prompt:
`Create a premium lifestyle environment shot. Place the product naturally in a refined real-life environment suitable for the detected product type. Possible environments include: vanity, bathroom shelf, stone tray, dressing table, bedside table, minimal beauty corner.
Use the product capacity and estimated dimensions to maintain realistic scale relative to the tray, towel, mirror, furniture, and other objects. Use only a few tasteful props such as folded fabric or towel, ceramic tray, mirror edge, natural stone, clear glass, minimal vase. Keep the scene uncluttered.
The product must remain the visual hero. Do not cover the product label. Use soft natural daylight. Use materials and colors that harmonize with the product's palette and brand mood. Keep the product and surrounding props clean and dry. Do not add condensation or water droplets.
The result should feel calm, aspirational, realistic, and premium.
Output ratio: {{OUTPUT_ASPECT_RATIO}}.` },

  { id: 'flatlay', order: 9, name: '항공샷·플랫레이', file: 'top-down-flatlay', prompt:
`Create a top-down flat-lay composition viewed from a true overhead camera angle. Arrange two or three instances of the exact same product. Maintain the correct physical scale based on the product capacity and estimated dimensions.
{{OUTER_BOX_RULE}}
Include one detachable applicator, cap, dropper, wand, puff, or lid only when appropriate for the actual product. Include one separate controlled formula texture. The formula texture must match the detected product type, color, transparency, opacity, and viscosity. Leave enough empty space around the formula texture. Optionally include one or two small supporting botanical ingredients or minimal props.
Use generous spacing. Do not let the products touch each other. Do not crop important product parts. Do not cover any labels. Keep the layout balanced, intentional, spacious, and editorial. Use a minimal background derived from the product palette. Keep all product surfaces completely clean and dry. Do not add bottle condensation or water droplets. The main product must remain the visual anchor.
Output ratio: {{OUTPUT_ASPECT_RATIO}}.` },
];

/* ============================================================
   용량 파싱 & 제품 크기 추정
   ============================================================ */
function parseCapacity(text) {
  if (!text) return { value: null, unit: null };
  const t = String(text).replace(/㎖/g, 'ml');
  const pats = [
    [/(\d+(?:\.\d+)?)\s*(ml|mL|ML)/, 'ml'],
    [/(\d+(?:\.\d+)?)\s*(g|G)\b/, 'g'],
    [/(\d+(?:\.\d+)?)\s*(fl\.?\s?oz\.?)/i, 'fl_oz'],
    [/(\d+(?:\.\d+)?)\s*(oz|OZ)/, 'oz'],
  ];
  for (const [re, unit] of pats) {
    const m = re.exec(t);
    if (m) return { value: parseFloat(m[1]), unit };
  }
  return { value: null, unit: null };
}

// 제품 종류 + 용량 → 크기 카테고리 & 대략적 mm (스펙 기준 범위)
const SIZE_TABLE = {
  serum: [[15, 'small', 95], [30, 'medium', 115], [50, 'large', 135], [Infinity, 'extra_large', 160]],
  cream: [[30, 'small', 60], [60, 'medium', 75], [100, 'large', 90], [Infinity, 'extra_large', 105]],
  cushion: [[12, 'small', 60], [15, 'medium', 72], [Infinity, 'large', 82]],
  perfume: [[30, 'small', 90], [60, 'medium', 110], [100, 'large', 135], [Infinity, 'extra_large', 160]],
  lip: [[4, 'medium', 75], [Infinity, 'large', 95]],
};
function estimateProductSize(type, capValue, aspectRatioWH) {
  const table = SIZE_TABLE[type] || SIZE_TABLE.serum;
  let cat = 'medium', h = 110;
  if (capValue != null) {
    for (const [max, c, mm] of table) { if (capValue <= max) { cat = c; h = mm; break; } }
  }
  // 용기 가로세로 비율(있으면)로 폭 추정, 없으면 종류별 기본
  const wh = aspectRatioWH && aspectRatioWH > 0 ? aspectRatioWH : (type === 'cushion' ? 1.15 : 0.42);
  const w = Math.round(h * wh);
  return {
    sizeCategory: cat,
    estimatedHeightMm: capValue != null ? h : null,
    estimatedWidthMm: capValue != null ? w : null,
    estimatedDepthMm: capValue != null ? Math.round(w * 0.85) : null,
    confidence: capValue != null ? 0.8 : 0.4,
  };
}

/* ============================================================
   상태
   ============================================================ */
const state = {
  products: [],       // dataURL[] (front + optional extras)
  analysis: null,     // 분석/수기 통합 결과
  selected: new Set(SCENES.map(s => s.id)),
  settings: { productType: 'serum', aspect: '4:5', resolution: '2K', format: 'png', keyIngredients: '', generateOuterBox: false },
  scenes: {},         // id -> { status, finalDataUrl, ext }
};

/* ============================================================
   업로드
   ============================================================ */
function ingestFiles(files, cb) {
  Array.from(files || []).forEach(f => {
    if (!f.type || !f.type.startsWith('image/')) return;
    if (f.size > 15 * 1024 * 1024) { toast('이미지는 15MB 이하만 가능합니다'); return; }
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsDataURL(f);
  });
}
function addProduct(dataUrl) {
  state.products.push(dataUrl);
  renderThumbs();
  if (state.products.length === 1) runAnalysis();
}
function renderThumbs() {
  const wrap = $('#thumbs'); wrap.innerHTML = '';
  state.products.forEach((src, i) => {
    const t = document.createElement('div');
    t.className = 'cs-thumb';
    t.innerHTML = `<img src="${src}"><button class="cs-rm" title="제거">×</button>${i === 0 ? '<span class="cs-badge">정면</span>' : ''}`;
    t.querySelector('.cs-rm').onclick = () => {
      state.products.splice(i, 1);
      if (!state.products.length) { state.analysis = null; $('#analysis').hidden = true; }
      renderThumbs();
    };
    wrap.appendChild(t);
  });
  $('#thumbs').hidden = !state.products.length;
}

/* ============================================================
   분석 (studio-api 재사용) → 화장품 분석으로 매핑
   ============================================================ */
function guessType(a) {
  const s = ((a.category || '') + (a.bottleShape || '') + (a.texture || '')).toLowerCase();
  if (/향수|perfume|eau/.test(s)) return 'perfume';
  if (/쿠션|cushion|compact|콤팩트/.test(s)) return 'cushion';
  if (/립|lip|틴트|글로스|스틱/.test(s)) return 'lip';
  if (/크림|cream|로션|lotion|balm|밤|젤|gel/.test(s)) return 'cream';
  return 'serum';
}
async function runAnalysis() {
  const panel = $('#analysis'); panel.hidden = false; panel.classList.add('loading');
  $('#btnReanalyze').disabled = true;
  $('#analysisBody').innerHTML = `<div class="cs-loading"><span class="spin"></span>제품 이미지를 분석하는 중…</div>`;
  try {
    const a = await StudioAPI.analyzeProduct(state.products);
    const type = guessType(a);
    const cap = parseCapacity(a.size || '');
    const size = estimateProductSize(type, cap.value, null);
    state.settings.productType = type;
    state.analysis = {
      productName: a.productName || '', brandName: '',
      capacityText: a.size || '', capacityValue: cap.value, capacityUnit: cap.unit,
      containerType: a.bottleShape || '', containerMaterial: a.material || '',
      applicatorType: '', formulaColor: a.productColor || '',
      labelPosition: a.labelPosition || '', dominantPalette: a.palette || [],
      brandMood: a.mood || '', toneSummary: a.toneSummary || '',
      estimatedWidthMm: size.estimatedWidthMm, estimatedHeightMm: size.estimatedHeightMm, estimatedDepthMm: size.estimatedDepthMm,
      sizeCategory: size.sizeCategory, confidence: a.demo ? 0.4 : size.confidence, demo: !!a.demo,
    };
    renderAnalysis();
  } catch (e) {
    $('#analysisBody').innerHTML = `<div class="cs-err">분석 실패: ${escapeHtml(e.message)}<br><button class="cs-mini" id="anRetry">다시 시도</button></div>`;
    const rt = $('#anRetry'); if (rt) rt.onclick = runAnalysis;
  } finally {
    panel.classList.remove('loading'); $('#btnReanalyze').disabled = false;
    syncTypeSeg();
  }
}

function renderAnalysis() {
  const a = state.analysis; if (!a) return;
  const inp = (k, f, ph) => `<label class="cs-f"><span>${k}</span><input type="text" data-af="${f}" value="${escapeHtml(a[f])}" placeholder="${ph || ''}"></label>`;
  const num = (k, f) => `<label class="cs-f"><span>${k}</span><input type="number" min="0" data-af="${f}" value="${a[f] == null ? '' : a[f]}" placeholder="mm"></label>`;
  const color = (k, c) => `<div class="cs-f"><span>${k}</span><div class="cs-color"><i style="background:${escapeHtml(c || '#ccc')}"></i>${escapeHtml((c || '—').toUpperCase())}</div></div>`;
  const pal = (a.dominantPalette || []).map(c => `<i style="background:${escapeHtml(c)}" title="${escapeHtml(c)}"></i>`).join('');
  const lowConf = a.confidence < 0.75;
  $('#analysisBody').innerHTML = `
    ${lowConf ? `<div class="cs-warn">제품의 정확한 규격을 확인하기 어렵습니다. 예상 크기를 확인하거나 가로·세로·높이를 직접 입력해주세요.</div>` : ''}
    <div class="cs-sec">📋 제품 정보 <span>틀린 값은 직접 고치면 생성에 그대로 반영됩니다 (수기 우선)</span></div>
    <div class="cs-form">
      ${inp('제품명', 'productName', '예: 카밍 세럼')}
      ${inp('브랜드명', 'brandName', '라벨의 브랜드명')}
      ${inp('용량 표기', 'capacityText', '예: 30ml')}
      ${inp('용기 형태', 'containerType', '예: 슬림 스포이드 병')}
      ${inp('용기 재질', 'containerMaterial', '예: 투명 유리')}
      ${inp('어플리케이터', 'applicatorType', '예: 스포이드 / 펌프')}
    </div>
    <div class="cs-sec">📏 예상 크기 <span>용량 기반 추정 · 손컷/듀얼컷 스케일에 사용 (직접 수정 가능)</span>
      <em class="cs-cat">${sizeCatLabel(a.sizeCategory)}</em>
    </div>
    <div class="cs-form cs-form-3">
      ${num('높이(mm)', 'estimatedHeightMm')}
      ${num('가로(mm)', 'estimatedWidthMm')}
      ${num('깊이(mm)', 'estimatedDepthMm')}
    </div>
    <div class="cs-sec">🎨 컬러 & 무드</div>
    <div class="cs-form">
      ${color('제형/제품 색상', a.formulaColor)}
      ${inp('브랜드 무드', 'brandMood', '예: 미니멀 프리미엄')}
    </div>
    <div class="cs-pal"><span>컬러 팔레트</span><div class="cs-sw">${pal}</div></div>
    ${a.demo ? `<div class="cs-note">데모 분석입니다. 제미나이 키가 연결되면 라벨·용량까지 더 정확히 분석합니다.</div>` : (a.toneSummary ? `<div class="cs-note">${escapeHtml(a.toneSummary)}</div>` : '')}`;
}
function sizeCatLabel(c) {
  return { small: '소형', medium: '일반형', large: '대형', extra_large: '초대형' }[c] || '일반형';
}

/* ============================================================
   제품 종류 / 장면 / 출력 설정 UI
   ============================================================ */
function renderTypeSeg() {
  const wrap = $('#typeSeg'); wrap.innerHTML = '';
  Object.entries(PRODUCT_TYPE_LABELS).forEach(([k, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'seg-btn' + (state.settings.productType === k ? ' on' : '');
    b.dataset.t = k; b.textContent = label;
    b.onclick = () => {
      state.settings.productType = k; syncTypeSeg();
      // 종류 바뀌면 크기 추정 갱신
      if (state.analysis) {
        const s = estimateProductSize(k, state.analysis.capacityValue, null);
        Object.assign(state.analysis, { sizeCategory: s.sizeCategory });
        if (state.analysis.estimatedHeightMm == null || state.analysis.confidence < 0.75) {
          state.analysis.estimatedHeightMm = s.estimatedHeightMm;
          state.analysis.estimatedWidthMm = s.estimatedWidthMm;
          state.analysis.estimatedDepthMm = s.estimatedDepthMm;
        }
        renderAnalysis();
      }
    };
    wrap.appendChild(b);
  });
}
function syncTypeSeg() { $$('#typeSeg .seg-btn').forEach(b => b.classList.toggle('on', b.dataset.t === state.settings.productType)); }

function renderScenes() {
  const wrap = $('#sceneChips'); wrap.innerHTML = '';
  SCENES.forEach(s => {
    const on = state.selected.has(s.id);
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'chip' + (on ? ' on' : '');
    c.innerHTML = `<span class="ck">${on ? '✓' : ''}</span>${String(s.order).padStart(2, '0')}. ${escapeHtml(s.name)}`;
    c.onclick = () => { if (state.selected.has(s.id)) state.selected.delete(s.id); else state.selected.add(s.id); renderScenes(); updateInfo(); };
    wrap.appendChild(c);
  });
}
function renderAspect() {
  const wrap = $('#aspectSeg'); wrap.innerHTML = '';
  ASPECTS.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'seg-btn' + (state.settings.aspect === a.ar ? ' on' : '');
    b.textContent = a.label;
    b.onclick = () => { state.settings.aspect = a.ar; renderAspect(); updateInfo(); };
    wrap.appendChild(b);
  });
}
function renderResFmt() {
  const rs = $('#resSeg'); rs.innerHTML = '';
  ['1080', '2K', '4K'].forEach(r => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'seg-btn' + (state.settings.resolution === r ? ' on' : '');
    b.textContent = r === '1080' ? '1080' : r;
    b.onclick = () => { state.settings.resolution = r; renderResFmt(); updateInfo(); };
    rs.appendChild(b);
  });
  const fs = $('#fmtSeg'); fs.innerHTML = '';
  ['png', 'jpg', 'webp'].forEach(f => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'seg-btn' + (state.settings.format === f ? ' on' : '');
    b.textContent = f.toUpperCase();
    b.onclick = () => { state.settings.format = f; renderResFmt(); };
    fs.appendChild(b);
  });
}
function updateInfo() {
  const [w, h] = RESOLUTION_MAP[state.settings.resolution][state.settings.aspect];
  $('#genInfo').textContent = `${state.selected.size}개 컷 · ${state.settings.aspect} · ${w}×${h}`;
}

/* ============================================================
   프롬프트 조립
   ============================================================ */
function buildScenePrompt(scene) {
  const a = state.analysis || {};
  const st = state.settings;
  const profile = PRODUCT_PROFILES[st.productType] || PRODUCT_PROFILES.serum;
  const boxRule = st.generateOuterBox
    ? 'An outer box image is provided; include the matching outer box beside the products with generous spacing.'
    : 'No outer box image was uploaded; do not invent an outer box.';
  const ingRule = (a.keyIngredients || st.keyIngredients)
    ? `Use only these key ingredients: ${a.keyIngredients || st.keyIngredients}.`
    : 'No ingredient information was entered; use visually appropriate botanical elements inferred from the product mood without making functional or medical claims.';

  let body = `${COMMON_PROMPT}\n\n${scene.prompt}`
    .replaceAll('{{PRODUCT_TYPE}}', profile.typeEn)
    .replaceAll('{{PRODUCT_NAME}}', a.productName || '')
    .replaceAll('{{CAPACITY_TEXT}}', a.capacityText || '')
    .replaceAll('{{ESTIMATED_WIDTH_MM}}', a.estimatedWidthMm || '')
    .replaceAll('{{ESTIMATED_HEIGHT_MM}}', a.estimatedHeightMm || '')
    .replaceAll('{{CONTAINER_TYPE}}', a.containerType || '')
    .replaceAll('{{CONTAINER_MATERIAL}}', a.containerMaterial || '')
    .replaceAll('{{APPLICATOR_TYPE}}', a.applicatorType || profile.applicator)
    .replaceAll('{{FORMULA_DESCRIPTION}}', profile.formulaDescription)
    .replaceAll('{{DOMINANT_PALETTE}}', (a.dominantPalette || []).join(', '))
    .replaceAll('{{BRAND_MOOD}}', a.brandMood || '')
    .replaceAll('{{OUTPUT_ASPECT_RATIO}}', st.aspect)
    .replaceAll('{{OUTER_BOX_RULE}}', boxRule)
    .replaceAll('{{INGREDIENT_RULE}}', ingRule);
  body += `\n\nStrictly avoid: ${NEGATIVE_PROMPT}`;
  return body;
}

/* ============================================================
   생성 · 리사이즈/내보내기
   ============================================================ */
async function resizeExport(srcDataUrl) {
  const st = state.settings;
  const [W, H] = RESOLUTION_MAP[st.resolution][st.aspect];
  const img = await loadImg(srcDataUrl);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // cover 크롭 (비율 정확 보정)
  const r = Math.max(W / img.width, H / img.height);
  const nw = img.width * r, nh = img.height * r;
  ctx.drawImage(img, (W - nw) / 2, (H - nh) / 2, nw, nh);
  const ex = EXPORT[st.format];
  const q = ex.q ? ex.q[st.resolution] : undefined;
  const dataUrl = cv.toDataURL(ex.mime, q);
  return { dataUrl, ext: ex.ext, width: W, height: H };
}

function fileNameFor(scene) {
  const st = state.settings;
  return `${slug(state.analysis && state.analysis.productName)}_${String(scene.order).padStart(2, '0')}_${scene.file}_${st.aspect.replace(':', 'x')}_${st.resolution}.${(state.scenes[scene.id] || {}).ext || EXPORT[st.format].ext}`;
}

async function generateOne(scene, editNote) {
  const card = $(`#card-${scene.id}`); if (!card) return;
  state.scenes[scene.id] = Object.assign(state.scenes[scene.id] || {}, { status: 'generating' });
  setCardStatus(scene, 'generating_background', '배경·제품 생성 중');
  try {
    let prompt = buildScenePrompt(scene);
    let refs = state.products;
    const prev = state.scenes[scene.id] && state.scenes[scene.id].finalDataUrl;
    if (editNote) {
      prompt += `\n\nAdditional user direction for this scene: ${editNote}.`;
      if (prev) {
        refs = [...state.products, prev];
        prompt += ` The LAST reference image is the current generated result — keep its overall composition, product identity and background, and ONLY change what this instruction asks (for example, make a specific element such as the cream swatch smaller).`;
      }
    }
    const raw = await StudioAPI.geminiPhoto(prompt, null, refs, { productOnly: true, aspect: state.settings.aspect });
    setCardStatus(scene, 'upscaling', `${state.settings.resolution} 출력 처리 중`);
    const out = await resizeExport(raw);
    state.scenes[scene.id] = { status: 'completed', finalDataUrl: out.dataUrl, ext: out.ext, w: out.width, h: out.height };
    renderCard(scene);
  } catch (e) {
    state.scenes[scene.id] = { status: 'failed', error: e.message };
    renderCard(scene);
  }
  updateBulkButtons();
}

async function generateSelected(onlyFailed) {
  const list = SCENES.filter(s => state.selected.has(s.id) &&
    (!onlyFailed || (state.scenes[s.id] && state.scenes[s.id].status === 'failed')));
  if (!state.products.length) { toast('제품 이미지를 먼저 올려주세요'); return; }
  if (!list.length) { toast(onlyFailed ? '재생성할 실패 컷이 없습니다' : '생성할 컷을 하나 이상 선택하세요'); return; }
  $('#results').hidden = false;
  // 카드 골격 먼저 렌더
  list.forEach(s => { if (!state.scenes[s.id] || state.scenes[s.id].status !== 'completed' || !onlyFailed) { state.scenes[s.id] = state.scenes[s.id] || { status: 'idle' }; renderCard(s); } });
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  for (const s of list) await generateOne(s);
  toast('생성 완료 🎉');
}

/* ============================================================
   결과 카드
   ============================================================ */
const STATUS_LABEL = {
  idle: '대기', analyzing: '분석 중', generating_background: '배경 생성 중',
  compositing_product: '제품 합성 중', upscaling: '고해상 처리 중', validating: '검증 중',
  completed: '완료', failed: '재생성 필요', generating: '생성 중',
};
function ensureResultsGrid() {
  let grid = $('#resultGrid');
  if (!grid) return;
  SCENES.forEach(s => {
    if (!$(`#card-${s.id}`) && state.scenes[s.id]) {
      const el = document.createElement('div'); el.className = 'cs-card'; el.id = `card-${s.id}`;
      grid.appendChild(el);
    }
  });
}
function renderCard(scene) {
  let grid = $('#resultGrid');
  let el = $(`#card-${scene.id}`);
  if (!el) { el = document.createElement('div'); el.className = 'cs-card'; el.id = `card-${scene.id}`; grid.appendChild(el); }
  const s = state.scenes[scene.id] || { status: 'idle' };
  const head = `<div class="cs-card-h"><b>${String(scene.order).padStart(2, '0')}. ${escapeHtml(scene.name)}</b><span class="cs-st cs-st-${s.status}">${STATUS_LABEL[s.status] || s.status}</span></div>`;
  if (s.status === 'completed') {
    el.innerHTML = `<div class="cs-card-img"><img src="${s.finalDataUrl}" alt="${escapeHtml(scene.name)}"></div>${head}
      <div class="cs-card-meta">${state.settings.aspect} · ${s.w}×${s.h} · ${(s.ext || '').toUpperCase()}</div>
      <div class="cs-card-act">
        <button class="cs-mini" data-a="regen">다시 생성</button>
        <button class="cs-mini" data-a="edit">수정</button>
        <a class="cs-mini cs-dl" data-a="dl">다운로드</a>
      </div>
      <div class="cs-editbox" hidden><input type="text" placeholder="이 이미지에서 바꿀 부분 (예: 크림 스와치 크기 줄여줘, 배경 밝게)"><button class="cs-mini cs-accent" data-a="rerun">수정 적용</button></div>`;
    const dl = el.querySelector('[data-a=dl]');
    dl.onclick = () => download(s.finalDataUrl, fileNameFor(scene));
    el.querySelector('[data-a=regen]').onclick = () => generateOne(scene);
    const box = el.querySelector('.cs-editbox'), input = box.querySelector('input');
    el.querySelector('[data-a=edit]').onclick = () => { box.hidden = !box.hidden; if (!box.hidden) input.focus(); };
    const run = () => generateOne(scene, input.value.trim());
    el.querySelector('[data-a=rerun]').onclick = run;
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); run(); } };
  } else if (s.status === 'failed') {
    el.innerHTML = `<div class="cs-card-fail">⚠<br>${escapeHtml(s.error || '생성 실패')}<br><button class="cs-mini" data-a="retry">다시 생성</button></div>${head}`;
    el.querySelector('[data-a=retry]').onclick = () => generateOne(scene);
  } else {
    const label = STATUS_LABEL[s.status] || '대기';
    el.innerHTML = `<div class="cs-card-load"><span class="spin"></span><span>${label}</span></div>${head}`;
  }
}
function setCardStatus(scene, status, label) {
  state.scenes[scene.id] = Object.assign(state.scenes[scene.id] || {}, { status });
  const el = $(`#card-${scene.id}`); if (!el) return;
  const load = el.querySelector('.cs-card-load');
  if (load) { const sp = load.querySelector('span:last-child'); if (sp) sp.textContent = label || STATUS_LABEL[status]; }
  const st = el.querySelector('.cs-st'); if (st) { st.textContent = STATUS_LABEL[status] || status; st.className = `cs-st cs-st-${status}`; }
}
function updateBulkButtons() {
  const done = SCENES.filter(s => state.scenes[s.id] && state.scenes[s.id].status === 'completed').length;
  const failed = SCENES.filter(s => state.scenes[s.id] && state.scenes[s.id].status === 'failed').length;
  $('#btnFailed').disabled = failed === 0;
  $('#btnZip').disabled = done === 0;
  $('#btnDlAll').disabled = done === 0;
}

/* ============================================================
   ZIP (store 방식, 의존성 없음)
   ============================================================ */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1];
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function buildZip(files) {
  // files: [{name, bytes}]
  const enc = new TextEncoder();
  const chunks = []; const central = []; let offset = 0;
  const u16 = n => new Uint8Array([n & 255, (n >>> 8) & 255]);
  const u32 = n => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
  const push = (list, ...parts) => parts.forEach(p => list.push(p));
  files.forEach(f => {
    const nameB = enc.encode(f.name);
    const crc = crc32(f.bytes);
    const size = f.bytes.length;
    const local = [];
    push(local, u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0), nameB, f.bytes);
    const localBytes = concat(local);
    chunks.push(localBytes);
    const cen = [];
    push(cen, u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameB);
    central.push(concat(cen));
    offset += localBytes.length;
  });
  const centralBytes = concat(central);
  const end = [];
  push(end, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralBytes.length), u32(offset), u16(0));
  const all = concat([...chunks, centralBytes, concat(end)]);
  return new Blob([all], { type: 'application/zip' });
}
function concat(list) {
  let len = 0; list.forEach(a => len += a.length);
  const out = new Uint8Array(len); let o = 0;
  list.forEach(a => { out.set(a, o); o += a.length; });
  return out;
}
function downloadZip() {
  const files = [];
  SCENES.forEach(s => {
    const sc = state.scenes[s.id];
    if (sc && sc.status === 'completed') files.push({ name: fileNameFor(s), bytes: dataUrlToBytes(sc.finalDataUrl) });
  });
  if (!files.length) { toast('완성된 이미지가 없습니다'); return; }
  const blob = buildZip(files);
  const url = URL.createObjectURL(blob);
  download(url, `${slug(state.analysis && state.analysis.productName)}_9cuts_${state.settings.resolution}.zip`);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function downloadAll() {
  SCENES.forEach(s => { const sc = state.scenes[s.id]; if (sc && sc.status === 'completed') download(sc.finalDataUrl, fileNameFor(s)); });
}

/* ============================================================
   업로드 존
   ============================================================ */
function setupDrop() {
  const dz = $('#drop'), fi = $('#file');
  dz.onclick = () => fi.click();
  fi.onchange = () => { ingestFiles(fi.files, addProduct); fi.value = ''; };
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => { if (e.dataTransfer.files.length) ingestFiles(e.dataTransfer.files, addProduct); });
  window.addEventListener('paste', e => {
    const items = (e.clipboardData || {}).items || [];
    for (const it of items) if (it.type && it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) ingestFiles([f], addProduct); }
  });
}

/* ============================================================
   초기화
   ============================================================ */
function init() {
  setupDrop();
  renderTypeSeg();
  renderScenes();
  renderAspect();
  renderResFmt();
  updateInfo();
  renderThumbs();

  // 편집(수기) 반영
  $('#analysisBody').addEventListener('input', e => {
    const el = e.target.closest('[data-af]'); if (!el || !state.analysis) return;
    let v = el.value;
    if (el.type === 'number') v = v === '' ? null : Number(v);
    state.analysis[el.dataset.af] = v;
    if (el.dataset.af === 'capacityText') {
      const cap = parseCapacity(v); state.analysis.capacityValue = cap.value; state.analysis.capacityUnit = cap.unit;
    }
  });
  $('#btnReanalyze').onclick = () => { state.analysis = null; runAnalysis(); };
  $('#optBox').onchange = e => { state.settings.generateOuterBox = e.target.checked; };
  $('#optIng').oninput = e => { state.settings.keyIngredients = e.target.value; };
  $('#sceneAll').onclick = () => { state.selected = new Set(SCENES.map(s => s.id)); renderScenes(); updateInfo(); };
  $('#sceneNone').onclick = () => { state.selected.clear(); renderScenes(); updateInfo(); };

  $('#btnGen').onclick = () => generateSelected(false);
  $('#btnFailed').onclick = () => generateSelected(true);
  $('#btnZip').onclick = downloadZip;
  $('#btnDlAll').onclick = downloadAll;

  // 서버/키 연결 상태
  StudioAPI.init().then(() => {
    const g = StudioAPI.hasGemini();
    const b = $('#connBanner');
    b.className = 'cs-conn ' + (g ? 'ok' : 'demo');
    b.textContent = g ? '● 실연동: 제미나이(사진) 연결됨 — 실제 이미지가 생성됩니다'
      : '● 데모 모드: API 연결 전엔 미리보기 이미지가 생성됩니다 (우측 상단 API 연결)';
  });
  updateBulkButtons();
}
document.addEventListener('DOMContentLoaded', init);
