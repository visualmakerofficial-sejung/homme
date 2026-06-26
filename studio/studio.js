/* ============================================================
   studio.js — 텍스트 애니메이션 → 영상 만들기 스튜디오
   ------------------------------------------------------------
   내용·폰트·색·배경(색/이미지)·위치·애니메이션을 정하고
   "영상으로 내보내기" → MediaRecorder 로 녹화. 전부 브라우저 안에서.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');

  // ---- 상태 ----
  var state = {
    text: '오메가\n3.6.9의 균형',
    font: 'Black Han Sans',
    weight: 400,
    size: 130,
    color: '#2b2b26',
    accent: '#b8924f',   // 하이라이트/박스/밑줄 강조색
    gradient: false,     // 글자 세로 그라데이션 on/off
    gColorTop: '#ff7a3c',   // 위 색
    gColorBot: '#9aa0a6',   // 아래 색
    countEase: 'expo',   // 숫자 속도 곡선: expo(감속) | linear | in(가속)
    lineSpacing: 1.2,    // 줄간격 배수
    ulWeight: 0.05,      // 밑줄 굵기 (글자크기 대비)
    bg: 'cream',
    bgImage: null,
    bgFit: 'cover',
    imgZoom: 1,          // 배경이미지 확대
    imgX: 0,             // 배경이미지 가로 위치(화면폭 대비 -0.5~0.5)
    imgY: 0,             // 배경이미지 세로 위치
    imgAnim: 'none',     // none | zoomIn | forward | kenBurns
    alignH: 'center',
    alignV: 'middle',
    offX: 0,
    offY: 0,
    shadow: false,
    anim: 'highlight',
    duration: 3,
    w: 1080, h: 1080,
  };

  var BG = {
    white:  { type: 'solid', c: '#ffffff' },
    cream:  { type: 'solid', c: '#fdfdf3' },
    black:  { type: 'solid', c: '#111111' },
    olive:  { type: 'grad', stops: [['#f4f6e9', 0], ['#aeb96b', 1]] },
    sunset: { type: 'grad', stops: [['#fff0d4', 0], ['#ff9a76', 1]] },
    night:  { type: 'grad', stops: [['#3a3a5c', 0], ['#0f0f1e', 1]] },
    sky:    { type: 'grad', stops: [['#cfeffd', 0], ['#7db9e8', 1]] },
  };

  var E = {
    outCubic: function (x) { return 1 - Math.pow(1 - x, 3); },
    outBack: function (x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outExpo: function (x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); },
    outBounce: function (x) {
      var n1 = 7.5625, d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
      if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
      x -= 2.625 / d1; return n1 * x * x + 0.984375;
    },
  };
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function commas(s) { return String(s).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function roundRect(c, x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    r = Math.min(r, w / 2, h / 2); if (r < 0) r = 0;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ============================================================
     애니메이션 프리셋
     ============================================================ */
  var ANIMS = {
    // ----- 기본 글자 모션 -----
    slideAcross: {
      label: '좌 → 우 흐르기', loop: true,
      renderLine: function (ctx, line, g) {
        var frac = (g.t % g.state.duration) / g.state.duration;
        var dx = (-line.lineW / 2 + (g.state.w + line.lineW) * frac) - line.cx;
        line.chars.forEach(function (c) { drawChar(c, { dx: dx }); });
      },
    },
    slideInLeft: {
      label: '왼쪽에서 등장', loop: false, cd: 0.28, staggerAuto: true,
      char: function (lp, c, g) { return { dx: -(1 - E.outCubic(lp)) * (c.x + g.state.size * 1.5), alpha: clamp01(lp * 2) }; },
    },
    bounce: {
      label: '한 글자씩 통통 (등장)', loop: false, cd: 0.4, staggerAuto: true,
      char: function (lp, c, g) { return { dy: -(1 - E.outBounce(lp)) * g.state.h * 0.45, alpha: lp > 0 ? 1 : 0 }; },
    },
    bounceLoop: {
      label: '통통 튀기 (반복)', loop: true,
      char: function (lp, c, g) { return { dy: -Math.abs(Math.sin(g.t * 3 + c.gi * 0.5)) * g.state.size * 0.35 }; },
    },
    pop: {
      label: '글자별 팝!', loop: false, cd: 0.35, staggerAuto: true,
      char: function (lp) { return { scale: Math.max(0, E.outBack(lp)), alpha: clamp01(lp * 2) }; },
    },
    typing: {
      label: '타이핑', loop: false,
      renderLine: function (ctx, line, g) {
        var perChar = (g.state.duration * 0.85) / Math.max(1, g.totalChars);
        line.chars.forEach(function (c) { if (g.t >= c.gi * perChar) drawChar(c, { alpha: 1 }); });
        // 커서는 "타이핑 중"에만, 현재 입력 위치 한 곳에만. 다 치면 사라짐.
        var frontier = Math.floor(g.t / perChar);
        if (frontier < g.totalChars && Math.floor(g.t * 2) % 2 === 0) {
          var cur = null;
          for (var i = 0; i < line.chars.length; i++) if (line.chars[i].gi === frontier) { cur = line.chars[i]; break; }
          if (cur) {
            ctx.save();
            ctx.fillStyle = g.state.color; ctx.font = g.fontStr;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText('│', cur.x + cur.w / 2, cur.y);
            ctx.restore();
          }
        }
      },
    },
    fadeUp: {
      label: '떠오르며 페이드', loop: false, cd: 0.4, staggerAuto: true,
      char: function (lp, c, g) { return { dy: (1 - E.outCubic(lp)) * g.state.size * 0.6, alpha: lp }; },
    },
    zoom: {
      label: '확대되며 등장', loop: false, cd: 0.7, stagger: 0,
      char: function (lp) { return { scale: Math.max(0, E.outBack(lp)), alpha: clamp01(lp * 2) }; },
    },
    wave: {
      label: '물결 (반복)', loop: true,
      char: function (lp, c, g) { return { dy: Math.sin(g.t * 4 + c.gi * 0.6) * g.state.size * 0.35 }; },
    },
    swing: {
      label: '흔들흔들 (반복)', loop: true,
      char: function (lp, c, g) { return { rot: Math.sin(g.t * 3 + c.gi * 0.4) * 0.18 }; },
    },

    // ----- 디자인 템플릿 -----
    highlight: {
      label: '🖍 하이라이트 강조', loop: false,
      renderLine: function (ctx, line, g) {
        var D = g.state.duration;
        var gi0 = line.chars.length ? line.chars[0].gi : 0;
        var stagger = (D * 0.4) / Math.max(1, g.totalChars);
        var hp = clamp01((g.t - gi0 * stagger) / (D * 0.35));   // 바가 좌→우로
        var ta = clamp01((g.t - gi0 * stagger - D * 0.04) / (D * 0.2));
        if (line.lineW > 0 && hp > 0) {
          var padX = g.state.size * 0.14, cy = line.chars[0].y;
          var bh = g.state.size * 0.92;
          var bx = line.cx - line.lineW / 2 - padX;
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = g.state.accent;
          roundRect(ctx, bx, cy - bh / 2, (line.lineW + padX * 2) * E.outCubic(hp), bh, g.state.size * 0.08);
          ctx.fill();
          ctx.restore();
        }
        line.chars.forEach(function (c) { drawChar(c, { alpha: ta }); });
      },
    },
    boxExpand: {
      label: '⬜ 박스 확장 등장', loop: false, lineH: 1.95,
      renderLine: function (ctx, line, g) {
        var D = g.state.duration;
        var start = line.idx * (D * 0.55 / Math.max(1, g.totalLines));
        var bp = clamp01((g.t - start) / (D * 0.3));
        if (bp <= 0) return;
        var e = E.outBack(bp);
        var cx = line.cx, cy = line.chars.length ? line.chars[0].y : g.state.h / 2;
        var padX = g.state.size * 0.55, padY = g.state.size * 0.3;
        var fullW = line.lineW + padX * 2, fullH = g.state.size + padY * 2;
        var bw = fullW * Math.max(0, e), bh = fullH * clamp01(e * 1.3);
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.93)';
        roundRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, g.state.size * 0.2); ctx.fill();
        ctx.lineWidth = Math.max(2, g.state.size * 0.035);
        ctx.strokeStyle = g.state.accent; ctx.stroke();
        ctx.restore();
        var ta = clamp01((g.t - start - D * 0.16) / (D * 0.2));
        line.chars.forEach(function (c) { drawChar(c, { alpha: ta }); });
      },
    },
    underlineLines: {
      label: '✌️ 두 줄 + 밑줄 긋기', loop: false,
      renderLine: function (ctx, line, g) {
        var D = g.state.duration;
        var start = line.idx * (D * 0.5 / Math.max(1, g.totalLines));
        var tp = clamp01((g.t - start) / (D * 0.3));
        if (tp <= 0) return;
        var col = (line.idx % 2 === 0) ? g.state.color : g.state.accent;
        var up = (1 - E.outCubic(tp)) * g.state.size * 0.4;
        line.chars.forEach(function (c) { drawChar(c, { alpha: tp, dy: up, color: col }); });
        var ulp = clamp01((g.t - start - D * 0.14) / (D * 0.26));
        if (ulp > 0 && line.lineW > 0) {
          var y = line.chars[0].y + g.state.size * 0.52;   // 글자에 더 붙게
          var x0 = line.cx - line.lineW / 2;
          ctx.save();
          ctx.strokeStyle = col; ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(2, g.state.size * g.state.ulWeight);
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + line.lineW * E.outCubic(ulp), y); ctx.stroke();
          ctx.restore();
        }
      },
    },
    countUp: {
      label: '🔢 숫자 카운트업 (0→입력값)', loop: false, count: true,
    },
  };

  // 입력 텍스트에서 숫자를 찾아 0→목표까지 세는 효과.
  // 주변 글자는 최종 글자 기준으로 고정 배치 → 흔들리지 않고 "숫자만" 카운팅.
  function renderCounter(t) {
    var D = state.duration;
    var raw = state.text;
    var nm = raw.match(/\d[\d,]*\.?\d*/);   // 첫 숫자 (콤마/소수점 허용)

    if (!nm) {   // 숫자 없으면 그냥 텍스트
      var L0 = layout();
      L0.lines.forEach(function (line) { line.chars.forEach(function (c) { drawChar(c, {}); }); });
      return;
    }

    var numStr = nm[0];
    var prefix = raw.slice(0, nm.index);
    var suffix = raw.slice(nm.index + numStr.length);
    var hasComma = numStr.indexOf(',') >= 0;
    var clean = numStr.replace(/,/g, '');
    var dec = clean.indexOf('.') >= 0 ? clean.split('.')[1].length : 0;
    var target = parseFloat(clean) || 0;

    function fmt(v) {
      if (dec > 0) return v.toFixed(dec);
      var n = Math.round(v);
      return (hasComma || target >= 1000) ? commas(n) : String(n);
    }
    var finalNum = fmt(target);

    // 최종 문자열로 레이아웃 → 모든 위치 고정
    var saved = state.text;
    state.text = prefix + finalNum + suffix;
    var L = layout();
    setExtent(L);
    state.text = saved;

    var pLen = Array.from(prefix).length;
    var nLen = Array.from(finalNum).length;
    var numStartGi = pLen, numEndGi = pLen + nLen;

    // 현재 카운트 값 (속도 곡선 적용)
    var p = clamp01(D > 0 ? t / D : 1);
    var eased = state.countEase === 'linear' ? p : state.countEase === 'in' ? p * p * p : E.outExpo(p);
    var curStr = fmt(target * eased);

    // 숫자가 아닌 글자(접두/접미)는 고정 위치에 그대로. 숫자 영역의 범위만 측정.
    var left = Infinity, right = -Infinity, baseY = state.h / 2;
    L.lines.forEach(function (line) {
      line.chars.forEach(function (c) {
        if (c.gi >= numStartGi && c.gi < numEndGi) {
          left = Math.min(left, c.x - c.w / 2);
          right = Math.max(right, c.x + c.w / 2);
          baseY = c.y;
        } else {
          drawChar(c, {});
        }
      });
    });

    // 현재 숫자를 숫자 영역 중앙에 그리기 (주변 글자는 안 움직임)
    if (left <= right) {
      ctx.save();
      if (state.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = state.size * 0.12; ctx.shadowOffsetY = state.size * 0.04; }
      if (state.gradient) {
        var g2 = ctx.createLinearGradient(0, gYtop, 0, gYbot);
        g2.addColorStop(0, state.gColorTop); g2.addColorStop(1, state.gColorBot);
        ctx.fillStyle = g2;
      } else ctx.fillStyle = state.color;
      ctx.font = fontStr();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(curStr, (left + right) / 2, baseY);
      ctx.restore();
    }
  }

  function fontStr() { return state.weight + ' ' + state.size + 'px "' + state.font + '"'; }

  // ---- 글자 배치 ----
  function layout() {
    ctx.font = fontStr();
    var lines = state.text.split('\n');
    var lhFactor = (ANIMS[state.anim] && ANIMS[state.anim].lineH) || state.lineSpacing;
    var lineHeight = state.size * lhFactor;
    var totalH = lines.length * lineHeight;
    var margin = state.size * 0.5;

    var y0;
    if (state.alignV === 'top') y0 = margin + lineHeight / 2;
    else if (state.alignV === 'bottom') y0 = state.h - margin - totalH + lineHeight / 2;
    else y0 = state.h / 2 - totalH / 2 + lineHeight / 2;
    y0 += state.offY;

    var out = [], gi = 0;
    for (var li = 0; li < lines.length; li++) {
      var str = Array.from(lines[li]);
      var widths = str.map(function (ch) { return ctx.measureText(ch).width || state.size * 0.5; });
      var lineW = widths.reduce(function (a, b) { return a + b; }, 0);

      var x;
      if (state.alignH === 'left') x = margin;
      else if (state.alignH === 'right') x = state.w - margin - lineW;
      else x = state.w / 2 - lineW / 2;
      x += state.offX;

      var chars = [], cx = x + lineW / 2;
      for (var i = 0; i < str.length; i++) {
        chars.push({ ch: str[i], x: x + widths[i] / 2, y: y0 + li * lineHeight, w: widths[i], gi: gi++ });
        x += widths[i];
      }
      out.push({ chars: chars, lineW: lineW, cx: cx, idx: li });
    }
    return { lines: out, total: gi };
  }

  // 글자 블록의 세로 범위 (그라데이션용)
  var gYtop = 0, gYbot = 0;
  function setExtent(L) {
    var mn = Infinity, mx = -Infinity;
    L.lines.forEach(function (l) { l.chars.forEach(function (c) { mn = Math.min(mn, c.y); mx = Math.max(mx, c.y); }); });
    if (mn === Infinity) { mn = state.h / 2; mx = state.h / 2; }
    gYtop = mn - state.size * 0.55; gYbot = mx + state.size * 0.55;
  }

  // ---- 글자 1개 그리기 ----
  function drawChar(c, tr) {
    ctx.save();
    ctx.globalAlpha = tr.alpha == null ? 1 : tr.alpha;
    ctx.translate(c.x + (tr.dx || 0), c.y + (tr.dy || 0));
    var fill = tr.color || state.color;
    if (state.gradient) {
      var oy = c.y + (tr.dy || 0);   // 로컬좌표에서 블록 상/하단으로 매핑
      var g = ctx.createLinearGradient(0, gYtop - oy, 0, gYbot - oy);
      g.addColorStop(0, state.gColorTop); g.addColorStop(1, state.gColorBot);
      fill = g;
    }
    if (tr.rot) ctx.rotate(tr.rot);
    if (tr.scale != null) ctx.scale(tr.scale, tr.scale);
    if (state.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = state.size * 0.12; ctx.shadowOffsetY = state.size * 0.04; }
    ctx.fillStyle = fill;
    ctx.font = fontStr();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.ch, 0, 0);
    ctx.restore();
  }

  // ---- 배경 이미지 모션 ----
  function imageTransform(t) {
    var D = state.duration, p = clamp01(D > 0 ? t / D : 0);
    switch (state.imgAnim) {
      case 'zoomIn':  return { scale: 1 + 0.18 * E.outCubic(p), dx: 0, dy: 0, alpha: 1 };
      case 'forward': return { scale: 0.7 + 0.32 * E.outBack(clamp01(t / (D * 0.7))), dx: 0, dy: 0, alpha: clamp01(t / (D * 0.3)) };
      case 'kenBurns':return { scale: 1.12 + 0.04 * Math.sin(t * 0.6), dx: Math.sin(t * 0.4) * state.w * 0.04, dy: Math.cos(t * 0.32) * state.h * 0.035, alpha: 1 };
      default:        return { scale: 1, dx: 0, dy: 0, alpha: 1 };
    }
  }

  // ---- 배경 ----
  function drawBg(t) {
    var b = BG[state.bg] || BG.white;
    if (b.type === 'solid') {
      ctx.fillStyle = b.c;
    } else {
      var g = ctx.createLinearGradient(0, 0, 0, state.h);
      b.stops.forEach(function (s) { g.addColorStop(s[1], s[0]); });
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, state.w, state.h);

    if (state.bgImage) {
      var img = state.bgImage;
      var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      if (iw && ih) {
        var fit = state.bgFit === 'contain' ? Math.min(state.w / iw, state.h / ih) : Math.max(state.w / iw, state.h / ih);
        var s = fit * state.imgZoom;
        var dw = iw * s, dh = ih * s;
        var ox = (state.w - dw) / 2 + state.imgX * state.w;   // 사용자 위치 조절
        var oy = (state.h - dh) / 2 + state.imgY * state.h;
        var tr = imageTransform(t);
        ctx.save();
        ctx.globalAlpha = tr.alpha;
        ctx.translate(state.w / 2 + tr.dx, state.h / 2 + tr.dy);
        ctx.scale(tr.scale, tr.scale);
        ctx.translate(-state.w / 2, -state.h / 2);
        ctx.drawImage(img, ox, oy, dw, dh);
        ctx.restore();
      }
    }
  }

  // ---- 한 프레임 렌더 ----
  function render(t) {
    drawBg(t);
    var anim = ANIMS[state.anim];
    if (anim.count) { renderCounter(t); return; }
    var L = layout();
    setExtent(L);
    var D = state.duration;
    var g = { t: t, state: state, fontStr: fontStr(), totalChars: L.total, totalLines: L.lines.length };

    if (anim.renderLine) {
      L.lines.forEach(function (line) { anim.renderLine(ctx, line, g); });
      return;
    }

    var charDur = anim.loop ? 0 : D * (anim.cd || 0.3);
    var stagger = 0;
    if (!anim.loop) {
      if (anim.staggerAuto && L.total > 1) stagger = Math.max(0, (D * 0.8 - charDur) / (L.total - 1));
      else stagger = anim.stagger || 0;
    }

    L.lines.forEach(function (line) {
      line.chars.forEach(function (c) {
        g.lineW = line.lineW;
        var lp;
        if (anim.loop) lp = t;
        else lp = clamp01(charDur > 0 ? (t - c.gi * stagger) / charDur : (t > c.gi * stagger ? 1 : 0));
        var tr = anim.char ? anim.char(lp, c, g) : { alpha: lp };
        drawChar(c, tr);
      });
    });
  }

  /* ============================================================
     재생 루프 + 녹화
     ============================================================ */
  var startTs = null, recording = false, recorder = null, chunks = [], recExt = 'webm';

  function loop(ts) {
    if (startTs == null) startTs = ts;
    var t = (ts - startTs) / 1000;
    var anim = ANIMS[state.anim];
    var D = state.duration;
    var tt;
    if (anim.loop) tt = t;
    else if (recording) tt = Math.min(t, D);
    else tt = Math.min(t % (D + 0.9), D);

    render(tt);
    if (recording && t >= D) finishRecording();
    requestAnimationFrame(loop);
  }

  function pickMime() {
    var cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=avc1', 'video/mp4'];
    for (var i = 0; i < cands.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(cands[i])) return cands[i];
    }
    return '';
  }

  function ensureFontReady() {
    try {
      return Promise.all([document.fonts.load(fontStr(), state.text || '가나다'), document.fonts.ready])
        .catch(function () {});   // 폰트 로드 실패해도 녹화는 계속 진행
    } catch (e) { return Promise.resolve(); }
  }

  function startRecording() {
    if (recording) return;
    if (!window.MediaRecorder || !canvas.captureStream) { setStatus('이 브라우저는 영상 녹화를 지원하지 않아요 😢 (크롬 권장)'); return; }
    setStatus('폰트 준비 중…');
    ensureFontReady().then(function () {
      var mime = pickMime();
      recExt = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
      var stream = canvas.captureStream(30);
      chunks = [];
      try { recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8000000 } : undefined); }
      catch (e) { setStatus('녹화 시작 실패: ' + e.message); return; }
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = function () {
        var blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        if (!blob.size) { setStatus('녹화된 데이터가 없어요 😢 크롬에서 시도해 주세요.'); document.body.classList.remove('rec'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'text-anim.' + recExt;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        setStatus('완료! ' + recExt.toUpperCase() + ' 영상이 다운로드됐어요 ✅');
        document.body.classList.remove('rec');
      };
      document.body.classList.add('rec');
      setStatus('🔴 녹화 중… (' + state.duration + '초)');
      recording = true; startTs = null;
      recorder.start(100);
    });
  }

  function finishRecording() { if (!recording) return; recording = false; try { recorder.stop(); } catch (e) {} }
  function setStatus(msg) { var el = document.getElementById('status'); if (el) el.textContent = msg; }

  /* ============================================================
     캔버스 크기 / UI
     ============================================================ */
  function setSize(ratio) {
    var map = { '1:1': [1080, 1080], '9:16': [1080, 1920], '16:9': [1920, 1080], '4:5': [1080, 1350] };
    var d = map[ratio] || map['1:1'];
    state.w = canvas.width = d[0];
    state.h = canvas.height = d[1];
  }
  function $(id) { return document.getElementById(id); }

  function buildAnimOptions() {
    var sel = $('anim');
    Object.keys(ANIMS).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k; o.textContent = ANIMS[k].label;
      if (k === state.anim) o.selected = true;
      sel.appendChild(o);
    });
  }

  function bind() {
    $('text').value = state.text;
    $('text').addEventListener('input', function (e) { state.text = e.target.value; });
    $('font').value = state.font;
    $('font').addEventListener('change', function (e) { state.font = e.target.value; ensureFontReady(); });
    $('weight').value = String(state.weight);
    $('weight').addEventListener('change', function (e) { state.weight = +e.target.value; ensureFontReady(); });
    $('size').value = state.size; $('sizeVal').textContent = state.size;
    $('size').addEventListener('input', function (e) { state.size = +e.target.value; $('sizeVal').textContent = state.size; });
    $('color').value = state.color;
    $('color').addEventListener('input', function (e) { state.color = e.target.value; });
    $('accent').value = state.accent;
    $('accent').addEventListener('input', function (e) { state.accent = e.target.value; });
    $('gradient').checked = state.gradient;
    $('gradient').addEventListener('change', function (e) { state.gradient = e.target.checked; });
    $('gColorTop').value = state.gColorTop;
    $('gColorTop').addEventListener('input', function (e) { state.gColorTop = e.target.value; });
    $('gColorBot').value = state.gColorBot;
    $('gColorBot').addEventListener('input', function (e) { state.gColorBot = e.target.value; });
    $('countEase').value = state.countEase;
    $('countEase').addEventListener('change', function (e) { state.countEase = e.target.value; startTs = null; });
    $('lineSpacing').value = state.lineSpacing; $('lineSpacingVal').textContent = state.lineSpacing.toFixed(2);
    $('lineSpacing').addEventListener('input', function (e) { state.lineSpacing = +e.target.value; $('lineSpacingVal').textContent = state.lineSpacing.toFixed(2); });
    $('ulWeight').value = state.ulWeight; $('ulWeightVal').textContent = state.ulWeight.toFixed(2);
    $('ulWeight').addEventListener('input', function (e) { state.ulWeight = +e.target.value; $('ulWeightVal').textContent = state.ulWeight.toFixed(2); });
    $('bg').value = state.bg;
    $('bg').addEventListener('change', function (e) { state.bg = e.target.value; });

    $('bgImg').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var img = new Image();
      img.onload = function () { state.bgImage = img; $('bgImgName').textContent = f.name; };
      img.src = URL.createObjectURL(f);
    });
    $('bgImgClear').addEventListener('click', function () { state.bgImage = null; $('bgImg').value = ''; $('bgImgName').textContent = '없음'; });
    $('bgFit').value = state.bgFit;
    $('bgFit').addEventListener('change', function (e) { state.bgFit = e.target.value; });
    $('imgAnim').value = state.imgAnim;
    $('imgAnim').addEventListener('change', function (e) { state.imgAnim = e.target.value; startTs = null; });
    $('imgZoom').value = state.imgZoom; $('imgZoomVal').textContent = state.imgZoom.toFixed(2);
    $('imgZoom').addEventListener('input', function (e) { state.imgZoom = +e.target.value; $('imgZoomVal').textContent = state.imgZoom.toFixed(2); });
    $('imgX').value = state.imgX;
    $('imgX').addEventListener('input', function (e) { state.imgX = +e.target.value; });
    $('imgY').value = state.imgY;
    $('imgY').addEventListener('input', function (e) { state.imgY = +e.target.value; });

    $('alignH').value = state.alignH;
    $('alignH').addEventListener('change', function (e) { state.alignH = e.target.value; });
    $('alignV').value = state.alignV;
    $('alignV').addEventListener('change', function (e) { state.alignV = e.target.value; });
    $('offX').value = state.offX;
    $('offX').addEventListener('input', function (e) { state.offX = +e.target.value; });
    $('offY').value = state.offY;
    $('offY').addEventListener('input', function (e) { state.offY = +e.target.value; });
    $('shadow').checked = state.shadow;
    $('shadow').addEventListener('change', function (e) { state.shadow = e.target.checked; });

    $('anim').addEventListener('change', function (e) { state.anim = e.target.value; startTs = null; });
    $('dur').value = state.duration; $('durVal').textContent = state.duration + '초';
    $('dur').addEventListener('input', function (e) { state.duration = +e.target.value; $('durVal').textContent = state.duration + '초'; });
    $('ratio').addEventListener('change', function (e) { setSize(e.target.value); });
    $('replay').addEventListener('click', function () { startTs = null; });
    $('export').addEventListener('click', startRecording);
  }

  setSize('1:1');
  buildAnimOptions();
  bind();
  ensureFontReady();
  requestAnimationFrame(loop);
})();
