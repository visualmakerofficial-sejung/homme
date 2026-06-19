/* ============================================================
   모딜 — 모바일 전용 로직
   data.js (loadData/saveData/fmt) 필요
   ============================================================ */
(function () {
  'use strict';

  var DATA = loadData();
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
  var num = function (n) { return Number(n).toLocaleString('ko-KR'); };

  /* ---------- 토스트 ---------- */
  var toastT;
  function toast(msg) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  window.mToast = toast;

  function scrollToId(id) {
    var el = $(id); if (!el) return;
    window.scrollTo({ top: el.offsetTop - 64, behavior: 'smooth' });
  }
  window.mScroll = scrollToId;

  /* ---------- 통계 ---------- */
  function renderStats() {
    if ($('st1')) $('st1').textContent = num(DATA.stats.successDeals);
    if ($('st2')) $('st2').textContent = num(DATA.stats.totalMembers);
    if ($('st3')) $('st3').textContent = DATA.stats.satisfaction + '%';
  }

  /* ---------- 네고 진행중 (가로) ---------- */
  function renderNego() {
    $('negoScroll').innerHTML = DATA.negoDeals.map(function (d) {
      var pct = Math.min(100, Math.round(d.currentCount / d.targetCount * 100));
      var btn = d.reservable
        ? '<button class="nc-cta" onclick="mReserve(\'' + d.id + '\')">사전예약 알림받기 🔔</button>'
        : '<button class="nc-cta soon">곧 오픈 예정</button>';
      return '<div class="nego-c">' +
        '<span class="nc-cat">' + esc(d.category) + '</span>' +
        '<div class="nc-name">' + esc(d.name) + '</div>' +
        '<div class="nc-live"><span class="live-dot"></span>' + esc(d.statusText) + '</div>' +
        '<div class="nc-binfo"><span>모인 사람</span><span><b>' + num(d.currentCount) + '</b> / ' + num(d.targetCount) + '명</span></div>' +
        '<div class="nc-bar"><div class="nc-fill" style="width:' + pct + '%"></div></div>' +
        btn + '</div>';
    }).join('');
  }
  window.mReserve = function (id) {
    var d = DATA.negoDeals.find(function (x) { return x.id === id; });
    if (d) { d.currentCount += 1; saveData(DATA); renderNego(); toast('🔔 ' + d.name.split('\n')[0] + ' 오픈 알림 신청 완료!'); }
  };

  /* ---------- 공동구매 진행중 (가로) ---------- */
  function renderDeals() {
    $('dealScroll').innerHTML = DATA.activeDeals.map(function (d) {
      var disc = Math.round((1 - d.nowPrice / d.origPrice) * 100);
      var badges = (d.badges || []).map(function (b) { return '<span class="dbadge ' + b + '">' + b + '</span>'; }).join('');
      return '<div class="deal-c" onclick="mBuy(\'' + d.id + '\')">' +
        '<div class="dc-thumb">' + (d.icon || '🛍️') + '<div class="dc-badges">' + badges + '</div></div>' +
        '<div class="dc-body">' +
          '<div class="dc-cat">' + esc(d.category) + '</div>' +
          '<div class="dc-name">' + esc(d.name) + '</div>' +
          '<div class="dc-price"><span class="p-orig">' + fmt(d.origPrice) + '</span><span class="p-now">' + fmt(d.nowPrice) + '원</span><span class="p-disc">' + disc + '%</span></div>' +
          '<div class="dc-meta">🛒 ' + num(d.participants) + '명 참여 중</div>' +
        '</div></div>';
    }).join('');
  }
  window.mBuy = function (id) {
    var d = DATA.activeDeals.find(function (x) { return x.id === id; });
    if (!d) return;
    if (!currentUser()) { pendingPay = id; toast('참여하려면 먼저 가입해 주세요 🙋'); mOpenAuth(); return; }
    openPay(d);
  };

  /* ---------- 요청 TOP 3 ---------- */
  function renderReq3() {
    var top = DATA.requests.slice().sort(function (a, b) { return b.count - a.count; }).slice(0, 3);
    $('req3').innerHTML = top.map(function (r, i) {
      return '<div class="req3-c">' +
        '<div class="r3-rank">' + (i + 1) + '</div>' +
        '<div class="r3-ic">' + r.icon + '</div>' +
        '<div class="r3-body"><div class="r3-name">' + esc(r.name) + '</div><div class="r3-meta">' + esc(r.meta) + '</div></div>' +
        '<div class="r3-right"><div class="r3-num">' + num(r.count) + '</div>' +
        '<span class="r3-pill ' + (r.status === 'live' ? 'live' : 'check') + '">' + (r.status === 'live' ? '협상중' : '집계중') + '</span></div>' +
        '</div>';
    }).join('');
    if ($('totalReq')) {
      var total = DATA.requests.reduce(function (s, r) { return s + r.count; }, 0);
      $('totalReq').textContent = num(total);
    }
  }

  /* ---------- 직접 요청 제출 ---------- */
  window.mSubmitReq = function (e) {
    e.preventDefault();
    var cat = $('reqCat').value, name = $('reqName').value, desc = $('reqDesc').value;
    DATA.requests.unshift({ id: 'req-' + Date.now(), icon: '🆕', name: name + ' · ' + cat.replace(/^\S+\s/, ''), meta: cat + ' · 신규', count: 1, status: 'check' });
    saveData(DATA); renderReq3(); e.target.reset();
    toast('🐴 소식이에게 요청을 전달했어요! 많이 모일수록 협상 빨라져요');
  };

  /* ---------- 이미 열린 딜 (가로) ---------- */
  function renderSucc() {
    $('succScroll').innerHTML = DATA.successDeals.map(function (s) {
      var disc = Math.round((1 - s.nowPrice / s.origPrice) * 100);
      return '<div class="succ-c">' +
        '<span class="sc-tag">✅ ' + esc(s.tag) + '</span>' +
        '<div class="sc-name">' + esc(s.name) + '</div>' +
        '<div class="sc-desc">' + esc(s.desc) + '</div>' +
        '<div class="sc-price"><span class="sc-orig">' + fmt(s.origPrice) + '</span><span class="sc-now">' + fmt(s.nowPrice) + '원</span><span class="sc-disc">' + disc + '%↓</span></div>' +
        '<button class="sc-again" onclick="mAgain(\'' + s.id + '\')">🙌 한번 더 딜 요청하기</button>' +
        '</div>';
    }).join('');
  }
  window.mAgain = function (id) {
    var s = DATA.successDeals.find(function (x) { return x.id === id; });
    if (!s) return;
    DATA.requests.unshift({ id: 'again-' + Date.now(), icon: '🔁', name: s.name + ' · 재오픈 요청', meta: s.tag + ' · 앵콜', count: 1, status: 'check' });
    saveData(DATA); renderReq3();
    toast('🐴 "' + s.name + '" 다시 열어달라고 접수했어요!');
  };

  /* ---------- 후기 이벤트 ---------- */
  function renderLotto() {
    if ($('lotEntries')) $('lotEntries').textContent = num(plaza.lottery.entries);
    if ($('lotMine')) $('lotMine').textContent = plaza.lottery.myEntries;
    if ($('lotOdds')) {
      var o = plaza.lottery.myEntries > 0 ? (plaza.lottery.myEntries / plaza.lottery.entries * 100) : 0;
      $('lotOdds').textContent = plaza.lottery.myEntries ? (o < 0.1 ? '0.1' : o.toFixed(1)) + '%' : '–';
    }
  }

  /* ============================================================
     실시간 딜 광장 (컴팩트)
     ============================================================ */
  var PLZ_KEY = 'modilMobilePlaza_v1';
  var SEED_POSTS = [
    { id: 'p1', ava: '🦝', nick: '퇴근런너', lvl: 'LV.7', ago: 2, cat: '운동', likes: 142, lols: 88, fresh: false,
      title: '헬스장 끊고 3일 나간 사람들… <b>PT 양도권 공동구매</b> 가실 분? 😇' },
    { id: 'p2', ava: '🐹', nick: '간식요정', lvl: 'LV.12', ago: 6, cat: '간식', likes: 301, lols: 41, fresh: false,
      title: '회사 탕비실 1년치 간식 <b>대량 공구</b> 🍪 안산 직장인 구함' },
    { id: 'p3', ava: '🐤', nick: '고잔동붕어', lvl: 'LV.4', ago: 11, cat: '음식', likes: 230, lols: 19, fresh: false,
      title: '<b>고잔동 슈크림 붕어빵 200개</b> 단체주문 — 모이면 깎아준대요 🥐' },
    { id: 'p4', ava: '🦦', nick: '집순이대표', lvl: 'LV.9', ago: 18, cat: '리빙', likes: 167, lols: 95, fresh: false,
      title: '퇴근하면 바로 눕는 사람들 <b>라꾸라꾸 침대 공구</b> 🛏️' },
    { id: 'p5', ava: '🐙', nick: '커피수혈', lvl: 'LV.10', ago: 24, cat: '카페', likes: 120, lols: 12, fresh: false,
      title: '하루 4잔 마시는 안산 직장인 <b>원두 5kg 공구</b> ☕ 잠은 죽어서' },
  ];
  var POOL = [
    { ava: '🐲', nick: '층간소음피해자', lvl: 'LV.3', cat: '리빙', title: '<b>두꺼운 슬리퍼 공구</b> 합니다 발소리 줄이기 운동 🥿' },
    { ava: '🦔', nick: '다이어트0일차', lvl: 'LV.6', cat: '식품', title: '<b>닭가슴살 한 박스 공구</b> 🍗 이번엔 진짜… 진짜임' },
    { ava: '🐢', nick: '캠핑은장비', lvl: 'LV.8', cat: '캠핑', title: 'MBTI별 캠핑의자 공구 — <b>E는 접이식 / I는 칸막이형</b> ⛺' },
    { ava: '🦉', nick: '등골브레이커맘', lvl: 'LV.5', cat: '전자', title: '수능 끝난 자녀 <b>노트북 공구</b> + 부모 등골 보호 💻' },
    { ava: '🦥', nick: '귀차니즘끝판', lvl: 'LV.2', cat: '반려', title: '<b>강아지 간식 대용량 공구</b> 🐶 미안해 멍멍아' },
    { ava: '🐳', nick: '플랜테리어', lvl: 'LV.7', cat: '리빙', title: '식물 또 죽인 사람 <b>안 죽는 스투키 공구</b> 🌵' },
    { ava: '🍜', nick: '안산맛집헌터', lvl: 'LV.11', cat: '음식', title: '중앙동 줄서는 그 집 <b>밀키트 공구</b> 🍜' },
  ];
  var ME = ['🐴', '🦄', '🐎'];

  var plaza;
  function loadPlaza() {
    try { var s = localStorage.getItem(PLZ_KEY); if (s) return JSON.parse(s); } catch (e) {}
    return { me: '나(소식이친구)', watching: 1287, expanded: false,
      posts: JSON.parse(JSON.stringify(SEED_POSTS)),
      lottery: { entries: 412, myEntries: 0 } };
  }
  function savePlaza() { try { localStorage.setItem(PLZ_KEY, JSON.stringify(plaza)); } catch (e) {} }

  function fcardHTML(p) {
    return '<div class="fcard' + (p.fresh ? ' fresh' : '') + '" id="fc-' + p.id + '">' +
      '<div class="fc-head"><div class="fc-ava">' + (p.ava || '🙂') + '</div>' +
        '<div><span class="fc-nick">' + esc(p.nick) + '</span><span class="fc-lvl">' + esc(p.lvl || 'LV.1') + '</span></div>' +
        (p.fresh ? '<span class="fc-fresh">방금 ✨</span>' : '<span class="fc-time">' + agoText(p.ago || 0) + '</span>') +
      '</div>' +
      '<div class="fc-cat">#' + esc(p.cat) + (p.mine ? ' · 🎁 성사되면 내가 공짜' : '') + '</div>' +
      '<div class="fc-title">' + p.title + '</div>' +
      '<div class="fc-foot">' +
        '<button class="fc-btn ' + (p.liked ? 'on' : '') + '" onclick="mLike(\'' + p.id + '\',this)">👍 <span>' + num(p.likes) + '</span></button>' +
        '<button class="fc-btn ' + (p.lolled ? 'on' : '') + '" onclick="mLol(\'' + p.id + '\',this)">😂 <span>' + num(p.lols) + '</span></button>' +
        '<button class="fc-btn kakao" onclick="mSummon(\'' + p.id + '\')">💬 친구 소환</button>' +
      '</div></div>';
  }
  function agoText(m) { if (m < 1) return '방금 전'; if (m < 60) return m + '분 전'; return Math.floor(m / 60) + '시간 전'; }

  function renderFeed() {
    var el = $('feed'); if (!el) return;
    var show = plaza.expanded ? plaza.posts : plaza.posts.slice(0, 5);
    el.innerHTML = show.map(fcardHTML).join('');
    if ($('plazaWatch')) $('plazaWatch').textContent = num(plaza.watching);
    var more = $('feedMore');
    if (more) {
      if (plaza.posts.length > 5) {
        more.style.display = 'block';
        more.textContent = plaza.expanded ? '접기 ▲' : '딜 ' + (plaza.posts.length - 5) + '개 더 보기 ▼';
      } else { more.style.display = 'none'; }
    }
  }
  window.mFeedMore = function () { plaza.expanded = !plaza.expanded; savePlaza(); renderFeed(); };

  function findP(id) { return plaza.posts.find(function (p) { return p.id === id; }); }
  window.mLike = function (id, btn) {
    var p = findP(id); if (!p) return;
    p.liked = !p.liked; p.likes += p.liked ? 1 : -1;
    if (p.liked) floatEmoji(btn, '👍');
    savePlaza(); renderFeed();
  };
  window.mLol = function (id, btn) {
    var p = findP(id); if (!p) return;
    p.lolled = !p.lolled; p.lols += p.lolled ? 1 : -1;
    if (p.lolled) floatEmoji(btn, '😂');
    savePlaza(); renderFeed();
  };
  window.mSummon = function (id) {
    var p = findP(id); if (!p) return;
    p.likes += 1; savePlaza(); renderFeed();
    toast('💬 카톡으로 친구를 소환했어요! 모이면 협상 시작 🚀');
  };
  window.mPostDeal = function () {
    var ti = $('composerInput'), ca = $('composerCat');
    var title = (ti.value || '').trim();
    if (!title) { ti.focus(); toast('어떤 딜을 열고 싶은지 적어주세요 🐴'); return; }
    var np = { id: 'mine-' + Date.now(), ava: ME[Math.floor(Math.random() * 3)], nick: plaza.me, lvl: 'LV.1',
      ago: 0, cat: ca.value, likes: 1, lols: 0, liked: true, mine: true, fresh: true, title: esc(title) };
    plaza.posts.unshift(np);
    if (plaza.posts.length > 12) plaza.posts = plaza.posts.slice(0, 12);
    savePlaza(); renderFeed();
    ti.value = '';
    confetti(40);
    setTimeout(function () { np.fresh = false; savePlaza(); renderFeed(); }, 4500);
    toast('🎉 광장에 딜을 올렸어요! 50명 모이면 제안자는 공짜!');
  };

  var poolIdx = 0;
  function injectPost() {
    if (document.hidden) return;
    var s = POOL[poolIdx % POOL.length]; poolIdx++;
    var np = { id: 'auto-' + Date.now(), ava: s.ava, nick: s.nick, lvl: s.lvl, ago: 0, cat: s.cat,
      likes: 3 + Math.floor(Math.random() * 40), lols: Math.floor(Math.random() * 30), fresh: true, title: s.title };
    plaza.posts.unshift(np);
    if (plaza.posts.length > 12) plaza.posts = plaza.posts.slice(0, 12);
    savePlaza(); renderFeed();
    setTimeout(function () { np.fresh = false; savePlaza(); renderFeed(); }, 4500);
  }
  function tickWatch() {
    if (document.hidden) return;
    plaza.watching += Math.floor(Math.random() * 11) - 4;
    if (plaza.watching < 900) plaza.watching = 900 + Math.floor(Math.random() * 60);
    if ($('plazaWatch')) $('plazaWatch').textContent = num(plaza.watching);
  }

  function floatEmoji(btn, emo) {
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    var s = document.createElement('span');
    s.className = 'float-emo'; s.textContent = emo;
    s.style.position = 'fixed'; s.style.left = (r.left + r.width / 2 - 10) + 'px'; s.style.top = (r.top - 6) + 'px';
    document.body.appendChild(s); setTimeout(function () { s.remove(); }, 900);
  }
  function confetti(n) {
    var colors = ['#F86D53', '#E32D21', '#F2A93F', '#38A87A', '#5B4DE6', '#FFD8CC'];
    for (var i = 0; i < (n || 40); i++) {
      var d = document.createElement('div');
      d.className = 'confetti-piece';
      d.style.left = Math.random() * 100 + 'vw';
      d.style.background = colors[Math.floor(Math.random() * colors.length)];
      var dur = 1.6 + Math.random() * 1.4;
      d.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(' + (Math.random() * 160 - 80) + 'px,105vh) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0.9 }],
        { duration: dur * 1000, easing: 'cubic-bezier(.2,.6,.4,1)' });
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, dur * 1000);
    }
  }
  window.mConfetti = confetti;

  /* ============================================================
     거점 지도 (구글 + 동 검색)
     ============================================================ */
  var curDong = '';
  function dongList() {
    var arr = [];
    DATA.pickupSpots.forEach(function (s) { if (s.dong && arr.indexOf(s.dong) === -1) arr.push(s.dong); });
    return arr;
  }
  function renderDongChips() {
    $('dchips').innerHTML = '<button class="dchip' + (curDong === '' ? ' on' : '') + '" onclick="mDong(\'\')">전체</button>' +
      dongList().map(function (d) {
        return '<button class="dchip' + (curDong === d ? ' on' : '') + '" onclick="mDong(\'' + d + '\')">' + d + '</button>';
      }).join('');
  }
  function mapQuery(q) {
    return 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=' + (curDong ? 15 : 12) + '&output=embed';
  }
  function updateMap() {
    var q = curDong ? ('안산시 ' + curDong) : '안산시청';
    $('mapFrame').src = mapQuery(q);
    var spots = curDong ? DATA.pickupSpots.filter(function (s) { return s.dong === curDong; }) : DATA.pickupSpots;
    if (curDong) {
      var names = spots.map(function (s) { return s.name; }).join(', ');
      $('mapWhere').innerHTML = '📍 <b>' + curDong + '</b> 근처 거점 ' + spots.length + '곳 — ' + esc(names || '준비 중');
    } else {
      $('mapWhere').innerHTML = '📍 안산 전역 <b>' + DATA.pickupSpots.length + '개 거점</b> 운영 중 · 동네를 검색하면 가까운 곳을 콕 찍어드려요';
    }
  }
  window.mDong = function (d) {
    curDong = d;
    var inp = $('dongSearch'); if (inp) inp.value = d;
    renderDongChips(); updateMap();
  };
  window.mDongSearch = function () {
    var v = ($('dongSearch').value || '').trim();
    if (!v) { window.mDong(''); return; }
    var hit = dongList().find(function (d) { return d.indexOf(v.replace(/동$/, '')) > -1 || v.indexOf(d.replace(/동$/, '')) > -1; });
    curDong = hit || v;
    renderDongChips();
    var q = '안산시 ' + curDong;
    $('mapFrame').src = mapQuery(q);
    var spots = DATA.pickupSpots.filter(function (s) { return s.dong === hit; });
    $('mapWhere').innerHTML = hit
      ? '📍 <b>' + hit + '</b> 근처 거점 ' + spots.length + '곳 — ' + esc(spots.map(function (s) { return s.name; }).join(', '))
      : '📍 <b>' + esc(v) + '</b> 검색 결과를 지도에 표시했어요';
    toast('🗺️ ' + curDong + ' 지도로 이동했어요');
  };

  /* ---------- 사장님 제휴 시트 ---------- */
  window.mOpenShop = function () { $('shopSheet').classList.add('show'); };
  window.mCloseShop = function () { $('shopSheet').classList.remove('show'); };
  window.mSubmitShop = function (e) {
    e.preventDefault();
    var g = function (id) { return $(id).value; };
    DATA.partners = DATA.partners || [];
    DATA.partners.unshift({ id: 'P-' + Date.now(), store: g('shStore'), owner: g('shOwner'),
      category: g('shCat'), dong: g('shDong'), offer: g('shOffer'), phone: g('shPhone'),
      kakao: g('shKakao'), status: 'review', date: new Date().toISOString().slice(0, 10) });
    saveData(DATA);
    e.target.reset();
    window.mCloseShop();
    confetti(50);
    toast('🏪 제휴 신청 접수! 소식이가 검토 후 카톡으로 연락드려요');
  };
  window.mShopKakao = function () { toast('💬 카카오톡 채널로 연결돼요! (운영 시 채널 연동)'); return false; };

  /* ---------- 후기 시트 ---------- */
  var stars = 5;
  window.mOpenReview = function () {
    stars = 5; paintStars(); $('reviewTa').value = '';
    $('reviewSheet').classList.add('show');
  };
  window.mCloseReview = function () { $('reviewSheet').classList.remove('show'); };
  function paintStars() {
    document.querySelectorAll('#reviewStars .star').forEach(function (s, i) { s.classList.toggle('on', i < stars); });
  }
  window.mSetStar = function (i) { stars = i + 1; paintStars(); };
  window.mSubmitReview = function () {
    var ta = $('reviewTa');
    if (!ta.value.trim()) { ta.focus(); toast('한 줄 후기를 남겨주세요 ✍️'); return; }
    plaza.lottery.entries += 1; plaza.lottery.myEntries += 1;
    savePlaza(); renderLotto(); window.mCloseReview();
    confetti(50);
    toast('🎫 응모 완료! 일요일 밤 9시 추첨 결과를 카톡으로 알려드려요');
  };

  /* ---------- 아코디언 ---------- */
  window.mToggleHowto = function () { $('howto').classList.toggle('open'); };

  /* ============================================================
     회원가입(소셜) · 로그인 · 결제
     ============================================================ */
  var USER_KEY = 'modilUser_v1';
  var pendingPay = null;
  var NICKS = ['알뜰소비러', '동네딜러', '공구마스터', '모딜이웃', '단골친구', '소식이팬', '안산토박이', '실속러'];
  var AVS = ['🦊', '🐧', '🐻', '🐰', '🐱', '🐨', '🦝', '🐹', '🐤', '🦦'];
  var CH = {
    kakao: { label: '💬 카카오', kakao: 'connected' },
    naver: { label: '🟢 네이버', kakao: 'pending' },
    instagram: { label: '📷 인스타그램', kakao: 'pending' },
  };
  function today() { return new Date().toISOString().slice(0, 10); }
  function currentUser() { try { var s = localStorage.getItem(USER_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function setUser(u) { try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) {} renderAcct(); }

  function renderAcct() {
    var btn = $('mAcct'); if (!btn) return;
    var u = currentUser();
    if (u) { btn.classList.add('in'); btn.innerHTML = '<span class="av">' + u.av + '</span><span class="nm">' + esc(u.name) + '</span>'; }
    else { btn.classList.remove('in'); btn.innerHTML = '<span class="av">👤</span><span class="nm">가입</span>'; }
  }

  window.mOpenAuth = function () {
    var u = currentUser();
    if (u) renderProfile(u); else renderSignup();
    $('authSheet').classList.add('show');
  };
  window.mCloseAuth = function () { $('authSheet').classList.remove('show'); pendingPay = null; };

  function sheetXTop(close) {
    return '<div class="sheet-grab"></div><div style="display:flex"><button class="sheet-x" style="margin-left:auto" onclick="' + close + '()">×</button></div>';
  }
  function renderSignup() {
    $('authBody').innerHTML = sheetXTop('mCloseAuth') +
      '<div class="auth-sosik"><img src="sosik.svg" alt="소식이"></div>' +
      '<div class="auth-h"><div class="auth-t1">모딜 시작하기 🐴</div>' +
      '<div class="auth-t2">3초 만에 가입하고, 우리 동네 딜을<br>내 카톡으로 받아보세요</div></div>' +
      (pendingPay ? '<div class="auth-note" style="color:var(--coral-dark);font-weight:700;margin:12px 0 0">🛒 공동구매 참여를 위해 가입이 필요해요</div>' : '') +
      '<div class="auth-btns">' +
        '<button class="auth-btn kakao" onclick="mSignup(\'kakao\')"><span class="ai">💬</span>카카오톡으로 시작하기</button>' +
        '<button class="auth-btn naver" onclick="mSignup(\'naver\')"><span class="ai">N</span>네이버로 시작하기</button>' +
        '<button class="auth-btn insta" onclick="mSignup(\'instagram\')"><span class="ai">📷</span>인스타그램으로 시작하기</button>' +
      '</div>' +
      '<div class="auth-note">가입 시 <a href="#">이용약관</a> · <a href="#">개인정보처리방침</a>에 동의합니다</div>';
  }
  function renderProfile(u) {
    var mm = DATA.members.find(function (m) { return m.name === u.name; });
    var myOrders = DATA.orders.filter(function (o) { return o.member === u.name; }).length;
    $('authBody').innerHTML = sheetXTop('mCloseAuth') +
      '<div class="prof-card"><div class="prof-av">' + u.av + '</div>' +
        '<div><div class="prof-nm">' + esc(u.name) + '</div><div class="prof-ch">' + (CH[u.channel] ? CH[u.channel].label : '직접') + ' 가입 · 모딜 회원</div></div></div>' +
      '<div class="prof-stats">' +
        '<div class="prof-stat"><b>' + (mm ? mm.deals : 0) + '</b><span>참여 딜</span></div>' +
        '<div class="prof-stat"><b>' + myOrders + '</b><span>결제 내역</span></div>' +
        '<div class="prof-stat"><b>' + plaza.lottery.myEntries + '</b><span>응모권</span></div>' +
      '</div>' +
      '<button class="prof-logout" onclick="mLogout()">로그아웃</button>';
  }
  window.mSignup = function (channel) {
    var nick = NICKS[Math.floor(Math.random() * NICKS.length)] + (Math.floor(Math.random() * 90) + 10);
    var av = AVS[Math.floor(Math.random() * AVS.length)];
    var u = { name: nick, av: av, channel: channel };
    DATA.members.unshift({ id: 'M-' + Date.now(), name: nick, phone: '소셜가입', joinDate: today(),
      status: 'active', deals: 0, kakao: CH[channel].kakao, channel: channel });
    DATA.stats.totalMembers += 1;
    saveData(DATA);
    setUser(u);
    toast('🎉 ' + CH[channel].label.split(' ')[1] + '로 가입 완료! 환영해요 ' + nick + '님');
    confetti(40);
    if (pendingPay) {
      var id = pendingPay; pendingPay = null;
      $('authSheet').classList.remove('show');
      var d = DATA.activeDeals.find(function (x) { return x.id === id; });
      if (d) setTimeout(function () { openPay(d); }, 350);
    } else {
      renderProfile(u);
    }
  };
  window.mLogout = function () {
    try { localStorage.removeItem(USER_KEY); } catch (e) {}
    renderAcct(); window.mCloseAuth();
    toast('로그아웃 했어요. 또 만나요 🐴');
  };

  /* ----- 결제 ----- */
  var payState = null;
  function openPay(d) {
    payState = { deal: d, qty: 1, method: 'kakaopay', pickup: '거점' };
    renderPay(); $('paySheet').classList.add('show');
  }
  window.mClosePay = function () { $('paySheet').classList.remove('show'); };
  var PAYM = [
    { k: 'kakaopay', i: '💬', t: '카카오페이' },
    { k: 'naverpay', i: 'N', t: '네이버페이' },
    { k: 'card', i: '💳', t: '신용·체크카드' },
  ];
  function renderPay() {
    var ps = payState, d = ps.deal;
    var total = d.nowPrice * ps.qty;
    var disc = Math.round((1 - d.nowPrice / d.origPrice) * 100);
    var grand = total + (ps.pickup === '택배' ? 3000 : 0);
    $('payBody').innerHTML = sheetXTop('mClosePay') +
      '<div class="sheet-head" style="margin-bottom:4px"><div class="sheet-ic" style="background:var(--coral-bg)">💳</div>' +
        '<div><div class="sheet-t1">공동구매 결제</div><div class="sheet-t2">네고 성공가로 안전하게 참여하세요</div></div></div>' +
      '<div class="pay-deal"><div class="pay-thumb">' + (d.icon || '🛍️') + '</div>' +
        '<div><div class="pay-dname">' + esc(d.name) + '</div><div class="pay-dcat">' + esc(d.category) + ' · ' + disc + '% 할인 · ' + fmt(d.nowPrice) + '원</div></div></div>' +
      '<div class="pay-block"><div class="qty-row"><div class="pay-block-t" style="margin:0">수량</div>' +
        '<div class="qty-ctrl"><button class="qty-btn" onclick="mQty(-1)">−</button><span class="qty-n">' + ps.qty + '</span><button class="qty-btn" onclick="mQty(1)">+</button></div></div></div>' +
      '<div class="pay-block"><div class="pay-block-t">수령 방법</div><div class="pay-opts">' +
        pickOpt('거점', '📍', '거점 픽업 (무료)') + pickOpt('택배', '📦', '택배 발송 (+3,000원)') + '</div></div>' +
      '<div class="pay-block"><div class="pay-block-t">결제 수단</div><div class="pay-opts">' +
        PAYM.map(function (m) {
          return '<div class="pay-opt' + (ps.method === m.k ? ' on' : '') + '" onclick="mPayMethod(\'' + m.k + '\')"><span class="pi">' + m.i + '</span>' + m.t + '<span class="pr"></span></div>';
        }).join('') + '</div></div>' +
      '<div class="pay-total"><span>총 결제금액</span><b>' + fmt(grand) + '원</b></div>' +
      '<button class="pay-go" onclick="mDoPay()">' + fmt(grand) + '원 결제하기</button>';
  }
  function pickOpt(key, ic, label) {
    return '<div class="pay-opt' + (payState.pickup === key ? ' on' : '') + '" onclick="mPayPickup(\'' + key + '\')"><span class="pi">' + ic + '</span>' + label + '<span class="pr"></span></div>';
  }
  window.mQty = function (d) { payState.qty = Math.max(1, Math.min(20, payState.qty + d)); renderPay(); };
  window.mPayMethod = function (k) { payState.method = k; renderPay(); };
  window.mPayPickup = function (k) { payState.pickup = k; renderPay(); };
  window.mDoPay = function () {
    var ps = payState, d = ps.deal, u = currentUser();
    if (!u) { mClosePay(); mOpenAuth(); return; }
    var total = d.nowPrice * ps.qty + (ps.pickup === '택배' ? 3000 : 0);
    var pickupLabel = ps.pickup === '택배' ? '택배발송' : '거점 픽업';
    DATA.orders.unshift({ id: 'O-' + Date.now(), member: u.name,
      deal: d.name + (ps.qty > 1 ? ' ×' + ps.qty : ''), amount: total,
      status: 'preparing', pickup: pickupLabel, date: today(), method: ps.method });
    d.participants += ps.qty;
    var mm = DATA.members.find(function (m) { return m.name === u.name; });
    if (mm) mm.deals += 1;
    saveData(DATA); renderDeals();
    mClosePay(); confetti(70);
    toast('💳 결제 완료! 픽업/배송 안내를 카톡으로 보냈어요 🎉');
  };

  /* ---------- 가로 캐러셀: 드래그 + 화살표 + 터치 ---------- */
  function animScrollTo(el, target, dur) {
    var start = el.scrollLeft;
    var max = el.scrollWidth - el.clientWidth;
    target = Math.max(0, Math.min(max, target));
    var diff = target - start, t0 = null;
    dur = dur || 360;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
      el.scrollLeft = start + diff * e;
      if (p < 1) requestAnimationFrame(step);
      else updateArrows(el);
    }
    requestAnimationFrame(step);
  }
  window.mNudge = function (id, dir) {
    var el = $(id); if (!el) return;
    animScrollTo(el, el.scrollLeft + dir * Math.round(el.clientWidth * 0.78));
  };
  function initCarousels() {
    document.querySelectorAll('.hscroll').forEach(function (el) {
      var down = false, startX = 0, startScroll = 0, moved = false;
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse') return;       // 터치는 네이티브 스크롤
        down = true; moved = false; startX = e.clientX; startScroll = el.scrollLeft;
        el.classList.add('grabbing');
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > 4) moved = true;
        el.scrollLeft = startScroll - dx;
      });
      window.addEventListener('pointerup', function () {
        if (down) { down = false; el.classList.remove('grabbing'); }
      });
      // 드래그 후 클릭(참여 등) 오발동 방지
      el.addEventListener('click', function (e) {
        if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
      }, true);
      // 데스크톱: 세로 휠을 가로 스크롤로
      el.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          el.scrollLeft += e.deltaY; e.preventDefault();
        }
      }, { passive: false });
      updateArrows(el);
      el.addEventListener('scroll', function () { updateArrows(el); }, { passive: true });
    });
  }
  function updateArrows(el) {
    var max = el.scrollWidth - el.clientWidth - 2;
    var wrap = el.closest('.hsec') || document;
    var L = wrap.querySelector('.hs-arrow.l[data-for="' + el.id + '"]');
    var R = wrap.querySelector('.hs-arrow.r[data-for="' + el.id + '"]');
    if (L) L.classList.toggle('off', el.scrollLeft <= 2);
    if (R) R.classList.toggle('off', el.scrollLeft >= max);
  }
  window.mUpdateArrows = function (id) { var el = $(id); if (el) updateArrows(el); };

  /* ---------- 카운트다운 ---------- */
  function nextSun9() {
    var now = new Date(), d = new Date(now), add = (7 - d.getDay()) % 7;
    d.setDate(d.getDate() + add); d.setHours(21, 0, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 7);
    return d;
  }
  var drawT = nextSun9();
  function tickCount() {
    var el = $('lotCount'); if (!el) return;
    var diff = drawT - new Date();
    if (diff <= 0) { drawT = nextSun9(); diff = drawT - new Date(); }
    var dd = Math.floor(diff / 86400000), hh = Math.floor(diff / 3600000) % 24, mm = Math.floor(diff / 60000) % 60, ss = Math.floor(diff / 1000) % 60;
    el.innerHTML = '⏰ <b>' + dd + '일 ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + '</b> 후 추첨';
  }

  /* ---------- init ---------- */
  function init() {
    plaza = loadPlaza();
    renderStats(); renderNego(); renderDeals(); renderReq3(); renderSucc();
    renderFeed(); renderLotto(); renderDongChips(); updateMap();
    initCarousels(); renderAcct();

    ['authSheet', 'paySheet', 'shopSheet', 'reviewSheet'].forEach(function (id) {
      var ov = $(id);
      if (ov) ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('show'); });
    });

    var ci = $('composerInput'); if (ci) ci.addEventListener('keydown', function (e) { if (e.key === 'Enter') window.mPostDeal(); });
    var ds = $('dongSearch'); if (ds) ds.addEventListener('keydown', function (e) { if (e.key === 'Enter') window.mDongSearch(); });

    setInterval(injectPost, 8500);
    setInterval(tickWatch, 3200);
    tickCount(); setInterval(tickCount, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
