/* ============================================================
   typing.js — 자동 타이핑 효과 엔진
   ------------------------------------------------------------
   사용법: HTML 요소에 data-typing 만 붙이면 끝.
   스크롤해서 화면에 들어오는 순간 자동으로 타이핑됩니다.

   <h1 data-typing>속부터 맑아지는</h1>
   <p  data-typing data-speed="40" data-start-delay="300">트렌드에 따라</p>

   옵션 (전부 선택사항):
     data-typing       타이핑할 글자. 비워두면 요소 안의 기존 텍스트를 사용.
     data-speed        글자 하나당 ms (기본 60). 작을수록 빠름.
     data-start-delay  화면에 들어온 뒤 시작까지 대기 ms (기본 0).
     data-cursor       "false" 면 커서(│) 숨김 (기본 표시).
     data-keep-cursor  "true" 면 다 친 뒤에도 커서 깜빡임 유지.
     data-loop         여러 문구를 돌려가며 타이핑. "안녕|반가워|또 만나요"
                       처럼 | 로 구분. (자동으로 지웠다 다시 침)
     data-loop-pause   문구 다 친 뒤 지우기 전 대기 ms (기본 1400).
     data-once         "false" 면 화면 벗어났다 다시 들어올 때 또 재생.
     data-group        같은 그룹 이름끼리는 순서대로(위→아래) 차례로 타이핑.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function attr(el, name, fallback) {
    var v = el.getAttribute(name);
    return (v === null || v === '') ? fallback : v;
  }
  function num(el, name, fallback) {
    var v = parseFloat(el.getAttribute(name));
    return isNaN(v) ? fallback : v;
  }

  // 요소 1개를 타이핑 가능한 상태로 준비한다.
  function prepare(el) {
    if (el.__typingReady) return;
    el.__typingReady = true;

    // 칠 텍스트 결정: 속성 우선, 없으면 기존 내용.
    var raw = attr(el, 'data-typing', null);
    if (raw === null) raw = el.textContent;
    el.__typingText = raw;

    // 화면 들어오기 전엔 글자가 미리 보이지 않도록 비운다.
    el.textContent = '';
    el.classList.add('typing');

    // 글자가 들어갈 영역 + 커서를 별도 span 으로 분리.
    var textSpan = document.createElement('span');
    textSpan.className = 'typing-text';
    el.appendChild(textSpan);
    el.__typingTextSpan = textSpan;

    if (attr(el, 'data-cursor', 'true') !== 'false') {
      var cursor = document.createElement('span');
      cursor.className = 'typing-cursor';
      cursor.setAttribute('aria-hidden', 'true');
      cursor.textContent = '│'; // │
      el.appendChild(cursor);
      el.__typingCursor = cursor;
    }
  }

  // 한 문구를 한 글자씩 친다 → 끝나면 done() 호출.
  function typePhrase(el, text, speed, done) {
    var span = el.__typingTextSpan;
    var i = 0;
    (function step() {
      span.textContent = text.slice(0, i);
      if (i++ < text.length) {
        setTimeout(step, speed);
      } else if (done) {
        done();
      }
    })();
  }

  // 한 문구를 한 글자씩 지운다 → 끝나면 done() 호출.
  function erasePhrase(el, speed, done) {
    var span = el.__typingTextSpan;
    var text = span.textContent;
    var i = text.length;
    (function step() {
      span.textContent = text.slice(0, i);
      if (i-- > 0) {
        setTimeout(step, speed);
      } else if (done) {
        done();
      }
    })();
  }

  // 실제 재생 시작.
  function run(el) {
    if (el.__typingPlaying) return;
    el.__typingPlaying = true;

    var speed = num(el, 'data-speed', 60);
    var startDelay = num(el, 'data-start-delay', 0);
    var keepCursor = attr(el, 'data-keep-cursor', 'false') === 'true';
    var loopAttr = attr(el, 'data-loop', null);

    function finishCursor() {
      if (el.__typingCursor && !keepCursor && !loopAttr) {
        el.__typingCursor.classList.add('typing-cursor-done');
      }
    }

    setTimeout(function () {
      if (reduceMotion) {
        // 모션 최소화 설정이면 그냥 전체 표시.
        el.__typingTextSpan.textContent = el.__typingText;
        finishCursor();
        el.dispatchEvent(new CustomEvent('typing:done', { bubbles: true }));
        return;
      }

      if (loopAttr) {
        // 여러 문구 루프 모드.
        var phrases = loopAttr.split('|');
        var pause = num(el, 'data-loop-pause', 1400);
        var idx = 0;
        (function cycle() {
          var phrase = phrases[idx % phrases.length];
          typePhrase(el, phrase, speed, function () {
            setTimeout(function () {
              erasePhrase(el, Math.max(20, speed * 0.5), function () {
                idx++;
                cycle();
              });
            }, pause);
          });
        })();
      } else {
        // 단일 문구.
        typePhrase(el, el.__typingText, speed, function () {
          finishCursor();
          el.dispatchEvent(new CustomEvent('typing:done', { bubbles: true }));
        });
      }
    }, startDelay);
  }

  function reset(el) {
    el.__typingPlaying = false;
    el.__typingTextSpan.textContent = '';
    if (el.__typingCursor) el.__typingCursor.classList.remove('typing-cursor-done');
  }

  // ---- 그룹 처리: 같은 data-group 끼리 위에서 아래로 차례대로 ----
  function runGroupMember(el) {
    var group = el.getAttribute('data-group');
    if (!group) { run(el); return; }

    // 그룹의 모든 멤버를 DOM 순서대로 모은다.
    var members = Array.prototype.slice.call(
      document.querySelectorAll('[data-group="' + group + '"]')
    );
    var me = members.indexOf(el);

    // 내 앞 멤버가 아직 안 끝났으면, 그 멤버가 끝날 때 내가 시작.
    if (me > 0) {
      var prev = members[me - 1];
      if (!prev.__typingDone) {
        prev.addEventListener('typing:done', function handler() {
          prev.removeEventListener('typing:done', handler);
          run(el);
        });
        // 앞 멤버가 아직 트리거조차 안 됐을 수 있으니 그건 옵저버가 해결.
        return;
      }
    }
    run(el);
  }

  // ---- 스크롤 진입 감지 ----
  function observe(el) {
    var once = attr(el, 'data-once', 'true') !== 'false';

    if (!('IntersectionObserver' in window)) {
      runGroupMember(el); // 구형 브라우저: 바로 재생.
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runGroupMember(el);
          if (once) io.unobserve(el);
        } else if (!once && el.__typingPlaying) {
          reset(el);
        }
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -10% 0px' });

    io.observe(el);
  }

  // typing:done 플래그 기록 (그룹 순서 판단용).
  document.addEventListener('typing:done', function (e) {
    e.target.__typingDone = true;
  }, true);

  function init(root) {
    (root || document).querySelectorAll('[data-typing], [data-loop]').forEach(function (el) {
      prepare(el);
      observe(el);
    });
  }

  // 외부에서 동적으로 추가한 요소도 처리할 수 있게 노출.
  window.Typing = { init: init, run: run };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
})();
