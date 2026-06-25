/* ============================================================
   studio.js — 텍스트 애니메이션 → 영상 만들기 스튜디오
   ------------------------------------------------------------
   1) 내용 입력  2) 폰트/크기/색  3) 배경(색·이미지)  4) 글씨 위치
   5) 애니메이션 선택  6) "영상으로 내보내기" → MediaRecorder 녹화
   전부 브라우저 안에서 동작 (설치/서버 불필요).
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');

  // ---- 상태 ----
  var state = {
    text: '속부터\n맑아지는',
    font: 'Black Han Sans',
    weight: 400,
    size: 150,
    color: '#2b2b26',
    bg: 'cream',
    bgImage: null,     // 업로드된 배경 이미지(Image) 또는 null
    bgFit: 'cover',    // cover | contain
    alignH: 'center',  // left | center | right
    alignV: 'middle',  // top | middle | bottom
    offX: 0,           // 글씨 가로 미세조정(px)
    offY: 0,           // 글씨 세로 미세조정(px)
    shadow: false,     // 글씨 그림자(가독성)
    anim: 'slideAcross',
    duration: 3,       // 초
    w: 1080, h: 1080,  // 캔버스 내부 해상도
  };

  // ---- 배경 색 프리셋 ----
  var BG = {
    white:  { type: 'solid', c: '#ffffff' },
    cream:  { type: 'solid', c: '#fdfdf3' },
    black:  { type: 'solid', c: '#111111' },
    olive:  { type: 'grad', stops: [['#f4f6e9', 0], ['#aeb96b', 1]] },
    sunset: { type: 'grad', stops: [['#fff0d4', 0], ['#ff9a76', 1]] },
    night:  { type: 'grad', stops: [['#3a3a5c', 0], ['#0f0f1e', 1]] },
    sky:    { type: 'grad', stops: [['#cfeffd', 0], ['#7db9e8', 1]] },
  };

  // ---- 이징 ----
  var E = {
    outCubic: function (x) { return 1 - Math.pow(1 - x, 3); },
    outBack: function (x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outBounce: function (x) {
      var n1 = 7.5625, d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
      if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
      x -= 2.625 / d1; return n1 * x * x + 0.984375;
    },
  };
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ============================================================
     애니메이션 프리셋
     ============================================================ */
  var ANIMS = {
    slideAcross: {
      label: '좌 → 우 흐르기', loop: true,
      renderLine: function (ctx, line, g) {
        var frac = (g.t % g.state.duration) / g.state.duration;
        var startC = -line.lineW / 2;
        var endC = g.state.w + line.lineW / 2;
        var dx = (startC + (endC - startC) * frac) - line.cx;
        line.chars.forEach(function (c) { drawChar(c, { dx: dx }); });
      },
    },
    slideInLeft: {
      label: '왼쪽에서 등장', loop: false, cd: 0.28, staggerAuto: true,
      char: function (lp, c, g) {
        var e = E.outCubic(lp);
        return { dx: -(1 - e) * (c.x + g.state.size * 1.5), alpha: clamp01(lp * 2) };
      },
    },
    bounce: {
      label: '한 글자씩 통통 (등장)', loop: false, cd: 0.4, staggerAuto: true,
      char: function (lp, c, g) {
        var e = E.outBounce(lp);
        return { dy: -(1 - e) * g.state.h * 0.45, alpha: lp > 0 ? 1 : 0 };
      },
    },
    bounceLoop: {
      label: '통통 튀기 (반복)', loop: true,
      char: function (lp, c, g) {
        return { dy: -Math.abs(Math.sin(g.t * 3 + c.gi * 0.5)) * g.state.size * 0.35 };
      },
    },
    pop: {
      label: '글자별 팝!', loop: false, cd: 0.35, staggerAuto: true,
      char: function (lp) { return { scale: Math.max(0, E.outBack(lp)), alpha: clamp01(lp * 2) }; },
    },
    typing: {
      label: '타이핑', loop: false,
      renderLine: function (ctx, line, g) {
        var perChar = (g.state.duration * 0.85) / Math.max(1, g.totalChars);
        var last = null;
        line.chars.forEach(function (c) {
          if (g.t >= c.gi * perChar) { drawChar(c, { alpha: 1 }); last = c; }
        });
        if (last && Math.floor(g.t * 2) % 2 === 0) {
          ctx.save();
          ctx.globalAlpha = 1; ctx.fillStyle = g.state.color; ctx.font = g.fontStr;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText('│', last.x + last.w / 2, last.y);
          ctx.restore();
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
  };

  function fontStr() { return state.weight + ' ' + state.size + 'px "' + state.font + '"'; }

  // ---- 글자 배치 (정렬 + 미세조정 지원, 여러 줄) ----
  function layout() {
    ctx.font = fontStr();
    var lines = state.text.split('\n');
    var lineHeight = state.size * 1.32;
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
      out.push({ chars: chars, lineW: lineW, cx: cx });
    }
    return { lines: out, total: gi };
  }

  // ---- 글자 1개 그리기 ----
  function drawChar(c, tr) {
    ctx.save();
    ctx.globalAlpha = tr.alpha == null ? 1 : tr.alpha;
    ctx.translate(c.x + (tr.dx || 0), c.y + (tr.dy || 0));
    if (tr.rot) ctx.rotate(tr.rot);
    if (tr.scale != null) ctx.scale(tr.scale, tr.scale);
    if (state.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = state.size * 0.12;
      ctx.shadowOffsetY = state.size * 0.04;
    }
    ctx.fillStyle = state.color;
    ctx.font = fontStr();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.ch, 0, 0);
    ctx.restore();
  }

  // ---- 배경 (색/그라데이션 + 선택적 이미지) ----
  function drawBg() {
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
        var s = state.bgFit === 'contain'
          ? Math.min(state.w / iw, state.h / ih)
          : Math.max(state.w / iw, state.h / ih);
        var dw = iw * s, dh = ih * s;
        ctx.drawImage(img, (state.w - dw) / 2, (state.h - dh) / 2, dw, dh);
      }
    }
  }

  // ---- 한 프레임 렌더 ----
  function render(t) {
    drawBg();
    var anim = ANIMS[state.anim];
    var L = layout();
    var D = state.duration;
    var g = { t: t, state: state, fontStr: fontStr(), totalChars: L.total };

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
    var cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
      'video/mp4;codecs=avc1', 'video/mp4'];
    for (var i = 0; i < cands.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(cands[i])) return cands[i];
    }
    return '';
  }

  function ensureFontReady() {
    try {
      return Promise.all([
        document.fonts.load(fontStr(), state.text || '가나다'),
        document.fonts.ready,
      ]);
    } catch (e) { return Promise.resolve(); }
  }

  function startRecording() {
    if (recording) return;
    if (!window.MediaRecorder || !canvas.captureStream) {
      setStatus('이 브라우저는 영상 녹화를 지원하지 않아요 😢 (크롬 권장)');
      return;
    }
    setStatus('폰트 준비 중…');
    // 폰트가 완전히 로드된 뒤 녹화 시작 → 글자 겹침/깨짐 방지
    ensureFontReady().then(function () {
      var mime = pickMime();
      recExt = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
      var stream = canvas.captureStream(30);
      chunks = [];
      try {
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8000000 } : undefined);
      } catch (e) { setStatus('녹화 시작 실패: ' + e.message); return; }

      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = function () {
        var blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        if (!blob.size) {
          setStatus('녹화된 데이터가 없어요 😢 크롬에서 시도해 주세요.');
          document.body.classList.remove('rec'); return;
        }
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
      recording = true;
      startTs = null;
      recorder.start(100);
    });
  }

  function finishRecording() {
    if (!recording) return;
    recording = false;
    try { recorder.stop(); } catch (e) {}
  }

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

    $('bg').value = state.bg;
    $('bg').addEventListener('change', function (e) { state.bg = e.target.value; });

    // 배경 이미지
    $('bgImg').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var img = new Image();
      img.onload = function () { state.bgImage = img; $('bgImgName').textContent = f.name; };
      img.src = URL.createObjectURL(f);
    });
    $('bgImgClear').addEventListener('click', function () {
      state.bgImage = null; $('bgImg').value = ''; $('bgImgName').textContent = '없음';
    });
    $('bgFit').value = state.bgFit;
    $('bgFit').addEventListener('change', function (e) { state.bgFit = e.target.value; });

    // 글씨 위치
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

  // ---- 시작 ----
  setSize('1:1');
  buildAnimOptions();
  bind();
  ensureFontReady();
  requestAnimationFrame(loop);
})();
