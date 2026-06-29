// EAU DE SILK 캐릭터 광고 스튜디오 — 프론트엔드 (의존성 0)
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const state = { char: null, project: null, modes: {} };

async function api(path, opts) {
  const r = await fetch(path, opts);
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || ("HTTP " + r.status));
  return j;
}
function overlay(on, text) { $("#ovText").textContent = text || "처리 중…"; $("#overlay").classList.toggle("hidden", !on); }
function goto(step) {
  $$(".panel").forEach(p => p.classList.remove("active"));
  $("#s" + step).classList.add("active");
  $$(".steps li").forEach(li => {
    const n = +li.dataset.step;
    li.classList.toggle("active", n === step);
    li.classList.toggle("done", n < step);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---- 상태 배너 (키 연결 여부)
async function health() {
  try {
    const h = await api("/api/health");
    state.modes = h;
    const c = h.claude ? "<b>Claude 연결</b>" : "Claude 목업";
    const g = h.higgsfield ? "<b>힉스필드 연결</b>" : "힉스필드 목업";
    $("#status").innerHTML = `${c} · ${g}`;
  } catch (e) { $("#status").textContent = "서버 연결 실패"; }
}

// ---- STEP1: 캐릭터
async function loadChars() {
  const { characters } = await api("/api/characters");
  const g = $("#charGrid"); g.innerHTML = "";
  characters.forEach(c => {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<h3>${c.name}</h3><div class="sp">${c.species || ""}</div>
      <div class="ds">${c.personality || ""}<br>${c.look || ""}</div>`;
    d.onclick = () => {
      $$("#charGrid .card").forEach(x => x.classList.remove("sel"));
      d.classList.add("sel"); state.char = c.key;
      setTimeout(() => goto(2), 220);
    };
    g.appendChild(d);
  });
}

// ---- STEP2 → PLAN
async function doPlan() {
  if (!state.char) return alert("캐릭터를 먼저 선택하세요.");
  const product = {
    name: $("#pName").value.trim(),
    info: $("#pInfo").value.trim(),
    subcopy: $("#pSub").value.trim(),
    image_refs: $("#pRefs").value.split(",").map(s => s.trim()).filter(Boolean),
  };
  const concept = $("#concept").value.trim();
  if (!product.name) return alert("제품명을 입력하세요.");
  if (!concept) return alert("한 줄 컨셉을 입력하세요.");
  overlay(true, state.modes.claude ? "Claude가 스토리를 기획 중…" : "스토리보드 생성 중…");
  try {
    const st = await api("/api/plan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character: state.char, product, concept,
        format: { aspect: "9:16", clip_seconds: +$("#clipSec").value || 5 } }),
    });
    state.project = st;
    renderPlan(st); goto(3);
  } catch (e) { alert("기획 실패: " + e.message); }
  finally { overlay(false); }
}

function renderPlan(st) {
  const sb = st.storyboard;
  const planner = st.planner === "claude" ? "Claude 기획" : "목업 기획(키 없음)";
  let warn = "";
  if (st.validation && st.validation.length)
    warn = `<div class="banner">검증 경고: ${st.validation.join(" · ")}</div>`;
  if (st.storyboard._planner_error)
    warn += `<div class="banner">Claude 호출 실패로 목업 사용: ${st.storyboard._planner_error}</div>`;
  $("#planMeta").innerHTML = warn +
    `<b>${sb.project}</b> · ${planner} · 컷 ${sb.shots.length}개<br>
     컨셉: ${sb.concept}<br>로고: ${(sb.ending_logo||[]).filter(Boolean).join(" / ")}`;
  const c = $("#shots"); c.innerHTML = "";
  sb.shots.forEach(s => {
    const d = document.createElement("div"); d.className = "shot";
    const morph = s.morph_from ? `<span class="badge">모핑 ${s.morph_from}→${s.morph_to}</span>` : "";
    d.innerHTML = `<div><span class="t">${s.id}</span><span class="ti">${s.title||""}</span>
      <span class="badge">${s.role}</span><span class="badge">${s.video_model}</span>${morph}</div>
      ${s.image_prompt ? `<div class="p">🖼 ${s.image_prompt}</div>` : ""}
      <div class="p">🎬 ${s.motion_prompt||""}</div>`;
    c.appendChild(d);
  });
  $("#manifest").textContent = JSON.stringify(st.manifest, null, 2);
}

// ---- STEP4: 이미지
async function doImages() {
  overlay(true, state.modes.higgsfield ? "힉스필드 이미지 생성 중…" : "이미지(목업) 생성 중…");
  try {
    const st = await api(`/api/project/${state.project.id}/images`, { method: "POST" });
    state.project = st; renderImages(st); goto(4);
  } catch (e) { alert("이미지 생성 실패: " + e.message); }
  finally { overlay(false); }
}
function renderImages(st) {
  const g = $("#gallery"); g.innerHTML = "";
  if (st.images.some(i => i.mode === "mock"))
    g.insertAdjacentHTML("beforebegin", "");
  st.images.forEach(im => {
    const d = document.createElement("div"); d.className = "card";
    const url = `/media/${st.id}/${im.file}`;
    d.innerHTML = `<img src="${url}" alt="${im.id}" />
      <div class="cap"><b>${im.id}</b> ${im.title||""} ${im.mode==="mock"?"· 목업":""}</div>
      <a class="dl" href="${url}?download=1" download>이미지 받기 ↓</a>`;
    g.appendChild(d);
  });
}

// ---- STEP5: 영상
async function doVideos() {
  overlay(true, state.modes.higgsfield ? "힉스필드 클립 생성 중…" : "클립(목업) 생성 중…");
  try {
    const st = await api(`/api/project/${state.project.id}/videos`, { method: "POST" });
    state.project = st; renderClips(st); goto(5);
  } catch (e) { alert("영상 생성 실패: " + e.message); }
  finally { overlay(false); }
}
function renderClips(st) {
  const g = $("#clips"); g.innerHTML = "";
  st.clips.forEach(cl => {
    const d = document.createElement("div"); d.className = "card";
    const url = `/media/${st.id}/${cl.file}`;
    d.innerHTML = `<video src="${url}" controls muted playsinline></video>
      <div class="cap"><b>${cl.id}</b> ${cl.title||""} · ${cl.model} ${cl.mode==="mock"?"· 목업":""}</div>
      <a class="dl" href="${url}?download=1" download>클립 받기 ↓</a>`;
    g.appendChild(d);
  });
}

// ---- STEP6: 조립
async function doAssemble() {
  overlay(true, "전환·사운드·로고 자동 조립 중…");
  try {
    const st = await api(`/api/project/${state.project.id}/assemble`, { method: "POST" });
    state.project = st; renderFinal(st); goto(6);
  } catch (e) { alert("조립 실패: " + e.message + "\n(클립이 모두 생성됐는지 확인하세요)"); }
  finally { overlay(false); }
}
function renderFinal(st) {
  const url = `/media/${st.id}/${st.output}`;
  $("#finalWrap").innerHTML = `<video src="${url}" controls playsinline></video>
    <a class="dl final-dl" href="${url}?download=1" download>완성본 받기 ↓ (${st.output.split("/").pop()})</a>`;
}

// ---- 이벤트
window.addEventListener("DOMContentLoaded", () => {
  health(); loadChars();
  $("#planBtn").onclick = doPlan;
  $("#imgBtn").onclick = doImages;
  $("#vidBtn").onclick = doVideos;
  $("#asmBtn").onclick = doAssemble;
  $("#newBtn").onclick = () => { state.project = null; goto(1); };
  $$("button.back").forEach(b => b.onclick = () => goto(+b.dataset.goto));
});
