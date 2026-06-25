/* ============================================================
   studio.js — 텍스트 애니메이션 → 영상 만들기 스튜디오
   ------------------------------------------------------------
   1) 내용 입력  2) 폰트/크기/색 설정  3) 애니메이션 선택
   4) "영상으로 내보내기" → 캔버스를 MediaRecorder로 녹화해 파일 저장
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
    anim: 'slideAcross',
    duration: 3,       // 초
    w: 1080, h: 1080,  // 캔버스 내부 해상도
  };

  // ---- 배경 프리셋 ----
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
     - loop:true  → 끝없이 반복 (raw 시간 t 사용)
     - char(lp,c,g) → 글자별 변형 {dx,dy,scale,alpha,rot}
       lp: 글자별 진행도 0..1 / c: 글자정보 / g: {t, state, lineW...}
     - renderLine(ctx,line,g) → 줄 단위 커스텀 렌더 (있으면 우선)
     - cd: charDuration 비율(전체 duration 대비) / staggerAuto: 자동 분산
     ============================================================ */
  var ANIMS = {
    slideAcross: {
      label: '좌 → 우 흐르기', loop: true,
      renderLine: function (ctx, line, g) {
        // 줄 전체가 화면 왼쪽 밖 → 오른쪽 밖으로 이동
        var frac = (g.t % g.state.duration) / g.state.duration;
        var startC = -line.lineW / 2;
        var endC = g.state.w + line.lineW / 2;
        var centerX = startC + (endC - startC) * frac;
        var dx = centerX - g.state.w / 2;
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
        var amp = g.state.size * 0.35;
        return { dy: -Math.abs(Math.sin(g.t * 3 + c.gi * 0.5)) * amp };
      },
    },
    pop: {
      label: '글자별 팝!', loop: false, cd: 0.35, staggerAuto: true,
      char: function (lp) { return { scale: Math.max(0, E.outBack(lp)), alpha: clamp01(lp * 2) }; },
    },
    typing: {
      label: '타이핑', loop: false,
      renderLine: function (ctx, line, g) {
        // 글자별 등장 시점 = gi * 줄당 타이핑 속도(자동 분산)
        var perChar = (g.state.duration * 0.85) / Math.max(1, g.totalChars);
        var shownUpto = -1;
        line.chars.forEach(function (c) {
          var start = c.gi * perChar;
          if (g.t >= start) { drawChar(c, { alpha: 1 }); shownUpto = c; }
        });
        // 깜빡이는 커서
        if (shownUpto && shownUpto.gi != null) {
          var blink = Math.floor(g.t * 2) % 2 === 0;
          if (blink) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.fillStyle = g.state.color;
            ctx.font = g.fontStr;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('│', shownUpto.x + shownUpto.w / 2, shownUpto.y);
            ctx.restore();
          }
        }
      },
    },
    fadeUp: {
      label: '떠오르며 페이드', loop: false, cd: 0.4, staggerAuto: true,
      char: function (lp, c, g) {
        var e = E.outCubic(lp);
        return { dy: (1 - e) * g.state.size * 0.6, alpha: lp };
      },
    },
    zoom: {
      label: '확대되며 등장', loop: false, cd: 0.7, staggerAuto: false, stagger: 0,
      char: function (lp) { return { scale: Math.max(0, E.outBack(lp)), alpha: clamp01(lp * 2) }; },
    },
    wave: {
      label: '물결 (반복)', loop: true,
      char: function (lp, c, g) {
        return { dy: Math.sin(g.t * 4 + c.gi * 0.6) * g.state.size * 0.35 };
      },
    },
    swing: {
      label: '흔들흔들 (반복)', loop: true,
      char: function (lp, c, g) {
        return { rot: Math.sin(g.t * 3 + c.gi * 0.4) * 0.18 };
      },
    },
  };

  // ---- 폰트 문자열 ----
  function fontStr() { return state.weight + ' ' + state.size + 'px "' + state.font + '"'; }

  // ---- 글자 배치 계산 (중앙 정렬, 여러 줄 지원) ----
  function layout() {
    ctx.font = fontStr();
    var lines = state.text.split('\n');
    var lineHeight = state.size * 1.32;
    var totalH = lines.length * lineHeight;
    var y0 = state.h / 2 - totalH / 2 + lineHeight / 2;
    var out = [];
    var gi = 0;
    for (var li = 0; li < lines.length; li++) {
      var str = Array.from(lines[li]);
      var widths = str.map(function (ch) { return ctx.measureText(ch).width || state.size * 0.5; });
      var lineW = widths.reduce(function (a, b) { return a + b; }, 0);
      var x = state.w / 2 - lineW / 2;
      var chars = [];
      for (var i = 0; i < str.length; i++) {
        chars.push({ ch: str[i], x: x + widths[i] / 2, y: y0 + li * lineHeight, w: widths[i], gi: gi++ });
      }
      out.push({ chars: chars, lineW: lineW });
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
    ctx.fillStyle = state.color;
    ctx.font = fontStr();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.ch, 0, 0);
    ctx.restore();
  }

  // ---- 배경 ----
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
  }

  // ---- 한 프레임 렌더 (t: 초) ----
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

    // 글자별 타이밍 계산
    var charDur = anim.loop ? 0 : D * (anim.cd || 0.3);
    var stagger = 0;
    if (!anim.loop) {
      if (anim.staggerAuto && L.total > 1) {
        stagger = Math.max(0, (D * 0.8 - charDur) / (L.total - 1));
      } else {
        stagger = anim.stagger || 0;
      }
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
     재생 루프 (미리보기) + 녹화
     ============================================================ */
  var startTs = null, recording = false, recorder = null, chunks = [], recExt = 'webm';

  function loop(ts) {
    if (startTs == null) startTs = ts;
    var t = (ts - startTs) / 1000;
    var anim = ANIMS[state.anim];
    var D = state.duration;
    var tt;

    if (anim.loop) {
      tt = t;
    } else if (recording) {
      tt = Math.min(t, D);
    } else {
      var cycle = D + 0.9;            // 미리보기는 끝나면 잠깐 멈췄다 반복
      tt = Math.min(t % cycle, D);
    }

    render(tt);

    if (recording && t >= D) finishRecording();
    requestAnimationFrame(loop);
  }

  function pickMime() {
    // webm 우선 (크롬에서 안정적). webm 미지원 브라우저(사파리)만 mp4로.
    var cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
      'video/mp4;codecs=avc1', 'video/mp4'];
    for (var i = 0; i < cands.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(cands[i])) return cands[i];
    }
    return '';
  }

  function startRecording() {
    if (recording) return;
    if (!window.MediaRecorder || !canvas.captureStream) {
      setStatus('이 브라우저는 영상 녹화를 지원하지 않아요 😢 (크롬 권장)');
      return;
    }
    var mime = pickMime();
    recExt = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
    var stream = canvas.captureStream(30);
    chunks = [];
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8000000 } : undefined);
    } catch (e) {
      setStatus('녹화 시작 실패: ' + e.message); return;
    }
    recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = function () {
      var blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      if (!blob.size) {
        setStatus('녹화된 데이터가 없어요 😢 다른 브라우저(크롬 권장)에서 시도해 주세요.');
        document.body.classList.remove('rec');
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'text-anim.' + recExt;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      setStatus('완료! ' + recExt.toUpperCase() + ' 영상이 다운로드됐어요 ✅');
      document.body.classList.remove('rec');
    };
    document.body.classList.add('rec');
    setStatus('🔴 녹화 중… (' + state.duration + '초)');
    recording = true;
    startTs = null;       // 타임라인 0부터
    recorder.start(100);
  }

  function finishRecording() {
    if (!recording) return;
    recording = false;
    try { recorder.stop(); } catch (e) {}
  }

  function setStatus(msg) {
    var el = document.getElementById('status');
    if (el) el.textContent = msg;
  }

  /* ============================================================
     캔버스 크기 / 폰트 로딩
     ============================================================ */
  function setSize(ratio) {
    var map = {
      '1:1': [1080, 1080], '9:16': [1080, 1920],
      '16:9': [1920, 1080], '4:5': [1080, 1350],
    };
    var d = map[ratio] || map['1:1'];
    state.w = canvas.width = d[0];
    state.h = canvas.height = d[1];
  }

  function ensureFont() {
    try { document.fonts.load(fontStr(), state.text || '가나다'); } catch (e) {}
  }

  /* ============================================================
     UI 연결
     ============================================================ */
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
    $('font').addEventListener('change', function (e) { state.font = e.target.value; ensureFont(); });

    $('weight').value = String(state.weight);
    $('weight').addEventListener('change', function (e) { state.weight = +e.target.value; ensureFont(); });

    $('size').value = state.size;
    $('sizeVal').textContent = state.size;
    $('size').addEventListener('input', function (e) {
      state.size = +e.target.value; $('sizeVal').textContent = state.size; ensureFont();
    });

    $('color').value = state.color;
    $('color').addEventListener('input', function (e) { state.color = e.target.value; });

    $('bg').value = state.bg;
    $('bg').addEventListener('change', function (e) { state.bg = e.target.value; });

    $('anim').addEventListener('change', function (e) { state.anim = e.target.value; startTs = null; });

    $('dur').value = state.duration;
    $('durVal').textContent = state.duration + '초';
    $('dur').addEventListener('input', function (e) {
      state.duration = +e.target.value; $('durVal').textContent = state.duration + '초';
    });

    $('ratio').addEventListener('change', function (e) { setSize(e.target.value); });

    $('replay').addEventListener('click', function () { startTs = null; });
    $('export').addEventListener('click', startRecording);
  }

  // ---- 시작 ----
  setSize('1:1');
  buildAnimOptions();
  bind();
  ensureFont();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {});
  requestAnimationFrame(loop);
})();
