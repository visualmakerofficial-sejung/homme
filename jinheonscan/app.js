/* =========================================================
   진헌스캔 — 화면 로직
   ========================================================= */
(function () {
  'use strict';

  var PY = 3.305785;                 // 1평 = 3.305785㎡
  var FAV_KEY = 'jhs_favs_v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 검색 조건 기본값 — 초기화(리셋)도 이 값으로 되돌립니다 */
  function defaultState() {
    return {
      keyword: '', caseNo: '',
      sido: '', sigungu: [], court: '',
      types: [], statuses: [], tags: [], clean: false,
      apprMin: null, apprMax: null, minMin: null, minMax: null,
      rateMin: null, rateMax: null, failMin: null, failMax: null,
      dateFrom: '', dateTo: '', areaMin: null, areaMax: null,
      unit: 'm2', sort: 'date_asc', page: 1, pageSize: 20,
      view: 'table', favOnly: false
    };
  }

  var state = defaultState();

  var favs = loadFavs();
  var lastResult = null;

  /* ================= 포맷터 ================= */
  function fmtWon(v) {
    if (v == null) return '-';
    var eok = Math.floor(v / 1e8);
    var man = Math.floor((v % 1e8) / 1e4);
    if (eok > 0) return eok + '억' + (man > 0 ? ' ' + comma(man) + '만' : '');
    if (man > 0) return comma(man) + '만';
    return comma(v);
  }
  function comma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtArea(m2) {
    if (!m2) return '-';
    return m2.toFixed(1) + '㎡ (' + (m2 / PY).toFixed(1) + '평)';
  }
  function fmtDate(s) { return s ? s.slice(2).replace(/-/g, '.') : '-'; }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  /* 로컬 기준 YYYY-MM-DD (toISOString 은 UTC 라 한국시간에서 하루 밀림) */
  function iso(d) {
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
  }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function dday(s) {
    var diff = Math.round((new Date(s + 'T00:00:00') - today()) / 86400000);
    if (diff === 0) return '오늘';
    if (diff > 0) return 'D-' + diff;
    return '종료';
  }
  function rateClass(r) { return r >= 90 ? 'r100' : r >= 70 ? 'r80' : r >= 50 ? 'r60' : 'r40'; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function numOr(v, d) { var n = parseFloat(v); return isNaN(n) ? (d === undefined ? null : d) : n; }

  /* ================= 관심물건 ================= */
  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
    $('#favCount').textContent = favs.length;
  }
  function toggleFav(id) {
    var i = favs.indexOf(id);
    if (i === -1) favs.push(id); else favs.splice(i, 1);
    saveFavs();
  }

  /* ================= 필터 UI 구성 ================= */
  function buildFilters() {
    /* 시/도 */
    var sel = $('#fSido');
    Object.keys(JHS_DATA.REGIONS).forEach(function (sd) {
      var o = document.createElement('option'); o.value = sd; o.textContent = sd; sel.appendChild(o);
    });

    /* 법원 */
    var cs = $('#fCourt');
    JHS_DATA.courtList().forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = c; cs.appendChild(o);
    });

    /* 물건종류 */
    var tw = $('#fTypes');
    JHS_DATA.TYPE_GROUPS.forEach(function (g) {
      var box = document.createElement('div');
      box.className = 'typegroup';
      var html = '<b>' + g.group + '</b>';
      g.items.forEach(function (t) {
        html += '<label class="chk"><input type="checkbox" class="f-type" value="' + esc(t) + '"><span>' + esc(t) + '</span></label>';
      });
      box.innerHTML = html;
      tw.appendChild(box);
    });

    /* 특수권리 */
    var tg = $('#fTags');
    JHS_DATA.TAGS.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'chip'; b.dataset.tag = t; b.textContent = t;
      tg.appendChild(b);
    });

    /* 상태 */
    var st = $('#fStatus');
    JHS_DATA.STATUSES.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'chip'; b.dataset.status = s; b.textContent = s;
      st.appendChild(b);
    });
  }

  function buildSigungu() {
    var wrap = $('#fSigungu');
    wrap.innerHTML = '';
    if (!state.sido) return;
    JHS_DATA.REGIONS[state.sido].forEach(function (g) {
      var b = document.createElement('button');
      b.className = 'chip' + (state.sigungu.indexOf(g) !== -1 ? ' is-on' : '');
      b.dataset.gu = g; b.textContent = g;
      wrap.appendChild(b);
    });
  }

  /* ================= state <-> DOM ================= */
  function readDom() {
    state.keyword = $('#q').value.trim();
    state.caseNo = $('#qCase').value.trim();
    state.sido = $('#fSido').value;
    state.court = $('#fCourt').value;
    state.types = $$('.f-type:checked').map(function (i) { return i.value; });
    state.clean = $('#fClean').checked;
    state.apprMin = numOr($('#fApprMin').value);
    state.apprMax = numOr($('#fApprMax').value);
    state.minMin = numOr($('#fMinMin').value);
    state.minMax = numOr($('#fMinMax').value);
    state.rateMin = numOr($('#fRateMin').value);
    state.rateMax = numOr($('#fRateMax').value);
    state.failMin = numOr($('#fFailMin').value);
    state.failMax = numOr($('#fFailMax').value);
    state.dateFrom = $('#fDateFrom').value;
    state.dateTo = $('#fDateTo').value;
    state.areaMin = numOr($('#fAreaMin').value);
    state.areaMax = numOr($('#fAreaMax').value);
    state.sort = $('#sort').value;
    state.pageSize = parseInt($('#pageSize').value, 10);
  }

  function writeDom() {
    $('#q').value = state.keyword;
    $('#qCase').value = state.caseNo;
    $('#fSido').value = state.sido;
    $('#fCourt').value = state.court;
    $$('.f-type').forEach(function (i) { i.checked = state.types.indexOf(i.value) !== -1; });
    $('#fClean').checked = state.clean;
    $('#fApprMin').value = state.apprMin == null ? '' : state.apprMin;
    $('#fApprMax').value = state.apprMax == null ? '' : state.apprMax;
    $('#fMinMin').value = state.minMin == null ? '' : state.minMin;
    $('#fMinMax').value = state.minMax == null ? '' : state.minMax;
    $('#fRateMin').value = state.rateMin == null ? '' : state.rateMin;
    $('#fRateMax').value = state.rateMax == null ? '' : state.rateMax;
    $('#fFailMin').value = state.failMin == null ? '' : state.failMin;
    $('#fFailMax').value = state.failMax == null ? '' : state.failMax;
    $('#fDateFrom').value = state.dateFrom;
    $('#fDateTo').value = state.dateTo;
    $('#fAreaMin').value = state.areaMin == null ? '' : state.areaMin;
    $('#fAreaMax').value = state.areaMax == null ? '' : state.areaMax;
    $('#sort').value = state.sort;
    $('#pageSize').value = String(state.pageSize);
    $$('#fTags .chip').forEach(function (b) { b.classList.toggle('is-on', state.tags.indexOf(b.dataset.tag) !== -1); });
    $$('#fStatus .chip').forEach(function (b) { b.classList.toggle('is-on', state.statuses.indexOf(b.dataset.status) !== -1); });
    $$('.unit-toggle button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.unit === state.unit); });
    $$('.viewtoggle button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.view === state.view); });
    buildSigungu();
    syncQuickChips();
  }

  /* ================= 쿼리 만들기 ================= */
  function has(v) { return v !== null && v !== undefined && v !== ''; }
  function num(v) { return typeof v === 'number' && !isNaN(v) ? v : null; }

  function toQuery() {
    /* 만원 입력 → 원, 평 입력 → ㎡. 숫자가 아니면 조건 없음(null)으로 취급 */
    var man = function (v) { return typeof v === 'number' && !isNaN(v) ? v * 10000 : null; };
    var area = function (v) {
      if (typeof v !== 'number' || isNaN(v)) return null;
      return state.unit === 'py' ? v * PY : v;
    };
    return {
      keyword: state.keyword, caseNo: state.caseNo,
      sido: state.sido, sigungu: state.sigungu, court: state.court,
      types: state.types, statuses: state.statuses, tags: state.tags, cleanOnly: state.clean,
      appraisalMin: man(state.apprMin), appraisalMax: man(state.apprMax),
      minPriceMin: man(state.minMin), minPriceMax: man(state.minMax),
      rateMin: num(state.rateMin), rateMax: num(state.rateMax),
      failMin: num(state.failMin), failMax: num(state.failMax),
      dateFrom: state.dateFrom, dateTo: state.dateTo,
      areaMin: area(state.areaMin), areaMax: area(state.areaMax),
      favOnly: state.favOnly, favIds: favs,
      sort: state.sort, page: state.page, pageSize: state.pageSize
    };
  }

  /* ================= URL 동기화 ================= */
  var URL_KEYS = ['keyword','caseNo','sido','court','clean','apprMin','apprMax','minMin','minMax',
    'rateMin','rateMax','failMin','failMax','dateFrom','dateTo','areaMin','areaMax','unit','sort','page','pageSize','view','favOnly'];

  function pushUrl() {
    var p = new URLSearchParams();
    URL_KEYS.forEach(function (k) {
      var v = state[k];
      if (v === '' || v === null || v === false) return;
      if (k === 'page' && v === 1) return;
      if (k === 'pageSize' && v === 20) return;
      if (k === 'sort' && v === 'date_asc') return;
      if (k === 'unit' && v === 'm2') return;
      if (k === 'view' && v === 'table') return;
      p.set(k, v);
    });
    if (state.sigungu.length) p.set('gu', state.sigungu.join('|'));
    if (state.types.length) p.set('types', state.types.join('|'));
    if (state.tags.length) p.set('tags', state.tags.join('|'));
    if (state.statuses.length) p.set('st', state.statuses.join('|'));
    var qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  function readUrl() {
    var p = new URLSearchParams(location.search);
    if (!p.toString()) return;
    URL_KEYS.forEach(function (k) {
      if (!p.has(k)) return;
      var v = p.get(k);
      if (['clean','favOnly'].indexOf(k) !== -1) state[k] = v === 'true';
      else if (['apprMin','apprMax','minMin','minMax','rateMin','rateMax','failMin','failMax','areaMin','areaMax'].indexOf(k) !== -1) state[k] = numOr(v);
      else if (['page','pageSize'].indexOf(k) !== -1) state[k] = parseInt(v, 10) || (k === 'page' ? 1 : 20);
      else state[k] = v;
    });
    if (p.has('gu')) state.sigungu = p.get('gu').split('|').filter(Boolean);
    if (p.has('types')) state.types = p.get('types').split('|').filter(Boolean);
    if (p.has('tags')) state.tags = p.get('tags').split('|').filter(Boolean);
    if (p.has('st')) state.statuses = p.get('st').split('|').filter(Boolean);
  }

  /* ================= 검색 실행 ================= */
  function run(resetPage) {
    if (resetPage !== false) state.page = 1;
    pushUrl();
    JHS_API.search(toQuery()).then(function (res) {
      lastResult = res;
      renderStats(res.stats);
      renderActiveChips();
      if (state.view === 'card') renderCards(res.items); else renderTable(res.items);
      renderPager(res);
    });
  }

  function goPage(n) {
    state.page = n;
    pushUrl();
    JHS_API.search(toQuery()).then(function (res) {
      lastResult = res;
      if (state.view === 'card') renderCards(res.items); else renderTable(res.items);
      renderPager(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ================= 렌더 ================= */
  function renderStats(s) {
    $('#stTotal').textContent = comma(s.total);
    $('#stRate').textContent = s.total ? s.avgRate.toFixed(1) : '-';
    $('#stFail').textContent = s.total ? s.avgFail.toFixed(2) : '-';
    $('#stNew').textContent = comma(s.newCount);
    $('#stSoon').textContent = comma(s.soon);
  }

  function renderTable(items) {
    if (!items.length) return renderEmpty();
    var h = '<div class="tablewrap"><table class="rows"><thead><tr>' +
      '<th style="width:34px"></th><th>사건번호</th><th>물건종류</th><th>소재지 / 물건</th>' +
      '<th class="c-num">면적</th><th class="c-num">감정가</th><th class="c-num">최저가</th>' +
      '<th class="c-mid">최저가율</th><th class="c-mid">유찰</th><th class="c-mid">매각기일</th><th class="c-mid">상태</th>' +
      '</tr></thead><tbody>';

    items.forEach(function (it) {
      var area = it.buildingArea > 0 ? it.buildingArea : it.landArea;
      var isFav = favs.indexOf(it.id) !== -1;
      h += '<tr data-id="' + it.id + '">' +
        '<td class="c-mid"><span class="fav' + (isFav ? ' is-on' : '') + '" data-fav="' + it.id + '">' + (isFav ? '★' : '☆') + '</span></td>' +
        '<td class="c-case">' + esc(it.caseNo) + '<small>' + esc(it.court) + '</small></td>' +
        '<td style="white-space:nowrap">' + esc(it.type) + '</td>' +
        '<td class="c-addr"><b>' + esc(it.title) + '</b><span class="addr">' + esc(it.address) + '</span>' + tagsHtml(it.tags) + '</td>' +
        '<td class="c-num">' + (area ? area.toFixed(1) + '㎡<br><small style="color:var(--ink-3)">' + (area / PY).toFixed(1) + '평</small>' : '-') + '</td>' +
        '<td class="c-num">' + fmtWon(it.appraisal) + '</td>' +
        '<td class="c-num"><b class="price-min">' + fmtWon(it.minPrice) + '</b></td>' +
        '<td class="c-mid"><span class="rate ' + rateClass(it.rate) + '">' + it.rate.toFixed(0) + '%</span></td>' +
        '<td class="c-mid">' + (it.failCount ? it.failCount + '회' : '-') + '</td>' +
        '<td class="c-mid">' + fmtDate(it.saleDate) + '<br><small style="color:var(--ink-3)">' + dday(it.saleDate) + '</small></td>' +
        '<td class="c-mid"><span class="st st-' + it.status + '">' + it.status + '</span></td>' +
        '</tr>';
    });
    h += '</tbody></table></div>';
    $('#resultBox').innerHTML = h;
  }

  function renderCards(items) {
    if (!items.length) return renderEmpty();
    var h = '<div class="cards">';
    items.forEach(function (it) {
      var area = it.buildingArea > 0 ? it.buildingArea : it.landArea;
      var isFav = favs.indexOf(it.id) !== -1;
      h += '<div class="card" data-id="' + it.id + '">' +
        '<div class="card-thumb"><span class="st st-' + it.status + '">' + it.status + '</span>' +
        '<span class="fav' + (isFav ? ' is-on' : '') + '" data-fav="' + it.id + '">' + (isFav ? '★' : '☆') + '</span>' +
        '<span style="font-weight:900;color:#6b7c93;letter-spacing:-.5px;font-size:15px">' + esc(it.type) + '</span></div>' +
        '<div class="card-body">' +
        '<div class="card-case">' + esc(it.caseNo) + ' · ' + esc(it.court) + '</div>' +
        '<div class="card-title">' + esc(it.title) + '</div>' +
        '<div class="card-addr">' + esc(it.address) + '</div>' +
        '<div class="card-price"><b>' + fmtWon(it.minPrice) + '</b><s>' + fmtWon(it.appraisal) + '</s>' +
        '<span class="rate ' + rateClass(it.rate) + '">' + it.rate.toFixed(0) + '%</span></div>' +
        tagsHtml(it.tags) +
        '<div class="card-meta"><span>' + (area ? area.toFixed(0) + '㎡' : '면적 -') + '</span>' +
        '<span>유찰 ' + it.failCount + '회</span><span>' + fmtDate(it.saleDate) + ' ' + dday(it.saleDate) + '</span></div>' +
        '</div></div>';
    });
    h += '</div>';
    $('#resultBox').innerHTML = h;
  }

  function tagsHtml(tags) {
    if (!tags || !tags.length) return '';
    return '<span class="tagline">' + tags.map(function (t) {
      var neutral = ['공유자우선매수','임차권등기','재매각'].indexOf(t) !== -1;
      return '<span class="tg' + (neutral ? ' neutral' : '') + '">' + esc(t) + '</span>';
    }).join('') + '</span>';
  }

  function renderEmpty() {
    $('#resultBox').innerHTML = '<div class="empty"><b>조건에 맞는 물건이 없습니다</b>' +
      '조건을 넓히거나 초기화 후 다시 검색해 보세요.</div>';
    $('#pager').innerHTML = '';
  }

  function renderPager(res) {
    var totalPages = Math.max(1, Math.ceil(res.total / res.pageSize));
    var cur = res.page;
    if (res.total === 0) { $('#pager').innerHTML = ''; return; }
    var h = '';
    h += '<button data-p="1" ' + (cur === 1 ? 'disabled' : '') + '>«</button>';
    h += '<button data-p="' + (cur - 1) + '" ' + (cur === 1 ? 'disabled' : '') + '>‹</button>';
    var start = Math.max(1, cur - 3), end = Math.min(totalPages, start + 6);
    start = Math.max(1, Math.min(start, end - 6));
    for (var i = start; i <= end; i++) {
      h += '<button data-p="' + i + '" class="' + (i === cur ? 'is-on' : '') + '">' + i + '</button>';
    }
    h += '<button data-p="' + (cur + 1) + '" ' + (cur === totalPages ? 'disabled' : '') + '>›</button>';
    h += '<button data-p="' + totalPages + '" ' + (cur === totalPages ? 'disabled' : '') + '>»</button>';
    h += '<span class="pinfo">' + comma(res.total) + '건 중 ' + comma((cur - 1) * res.pageSize + 1) + '–' +
      comma(Math.min(cur * res.pageSize, res.total)) + '</span>';
    $('#pager').innerHTML = h;
  }

  function renderActiveChips() {
    var chips = [];
    var add = function (label, key, value) { chips.push({ label: label, key: key, value: value }); };
    if (state.favOnly) add('관심물건만', 'favOnly');
    if (state.keyword) add('키워드: ' + state.keyword, 'keyword');
    if (state.caseNo) add('사건: ' + state.caseNo, 'caseNo');
    if (state.sido) add(state.sido, 'sido');
    state.sigungu.forEach(function (g) { add(g, 'sigungu', g); });
    if (state.court) add(state.court, 'court');
    state.types.forEach(function (t) { add(t, 'types', t); });
    state.statuses.forEach(function (s) { add('상태: ' + s, 'statuses', s); });
    state.tags.forEach(function (t) { add(t, 'tags', t); });
    if (state.clean) add('특수권리 없음', 'clean');
    if (has(state.apprMin) || has(state.apprMax)) add('감정가 ' + (state.apprMin || 0) + '~' + (has(state.apprMax) ? state.apprMax : '') + '만', 'appr');
    if (has(state.minMin) || has(state.minMax)) add('최저가 ' + (state.minMin || 0) + '~' + (has(state.minMax) ? state.minMax : '') + '만', 'min');
    if (has(state.rateMin) || has(state.rateMax)) add('최저가율 ' + (state.rateMin || 0) + '~' + (has(state.rateMax) ? state.rateMax : 100) + '%', 'rate');
    if (has(state.failMin) || has(state.failMax)) add('유찰 ' + (state.failMin || 0) + '~' + (has(state.failMax) ? state.failMax : '') + '회', 'fail');
    if (state.dateFrom || state.dateTo) add('기일 ' + (state.dateFrom || '') + '~' + (state.dateTo || ''), 'date');
    if (has(state.areaMin) || has(state.areaMax)) add('면적 ' + (state.areaMin || 0) + '~' + (has(state.areaMax) ? state.areaMax : '') + (state.unit === 'py' ? '평' : '㎡'), 'area');

    $('#activeChips').innerHTML = chips.length
      ? chips.map(function (c) {
          return '<span class="achip"><b>' + esc(c.label) + '</b><button data-ck="' + c.key + '" data-cv="' + esc(c.value || '') + '">✕</button></span>';
        }).join('')
      : '<span style="color:var(--ink-3);font-size:12.5px">전체 물건을 보고 있습니다</span>';
  }

  function removeChip(key, value) {
    switch (key) {
      case 'favOnly': state.favOnly = false; setTab('search'); break;
      case 'keyword': state.keyword = ''; break;
      case 'caseNo': state.caseNo = ''; break;
      case 'sido': state.sido = ''; state.sigungu = []; break;
      case 'sigungu': state.sigungu = state.sigungu.filter(function (g) { return g !== value; }); break;
      case 'court': state.court = ''; break;
      case 'types': state.types = state.types.filter(function (t) { return t !== value; }); break;
      case 'statuses': state.statuses = state.statuses.filter(function (s) { return s !== value; }); break;
      case 'tags': state.tags = state.tags.filter(function (t) { return t !== value; }); break;
      case 'clean': state.clean = false; break;
      case 'appr': state.apprMin = state.apprMax = null; break;
      case 'min': state.minMin = state.minMax = null; break;
      case 'rate': state.rateMin = state.rateMax = null; break;
      case 'fail': state.failMin = state.failMax = null; break;
      case 'date': state.dateFrom = state.dateTo = ''; break;
      case 'area': state.areaMin = state.areaMax = null; break;
    }
    writeDom(); run();
  }

  /* ================= 빠른 조건 칩 ================= */
  var QUICK = {
    apt:    { on: function () { return state.types.length === 1 && state.types[0] === '아파트'; },
              set: function (v) { state.types = v ? ['아파트'] : []; } },
    fail2:  { on: function () { return state.failMin === 2; },
              set: function (v) { state.failMin = v ? 2 : null; } },
    rate70: { on: function () { return state.rateMax === 70; },
              set: function (v) { state.rateMax = v ? 70 : null; } },
    clean:  { on: function () { return state.clean; },
              set: function (v) { state.clean = v; } },
    week:   { on: function () { return state.dateFrom === iso(today()) && state.dateTo === iso(addDays(today(), 7)); },
              set: function (v) { state.dateFrom = v ? iso(today()) : ''; state.dateTo = v ? iso(addDays(today(), 7)) : ''; } },
    under1: { on: function () { return state.minMax === 10000; },
              set: function (v) { state.minMax = v ? 10000 : null; } },
    seoul:  { on: function () { return state.sido === '서울특별시'; },
              set: function (v) { state.sido = v ? '서울특별시' : ''; state.sigungu = []; } }
  };

  function syncQuickChips() {
    $$('#quickChips button').forEach(function (b) {
      var q = QUICK[b.dataset.quick];
      if (q) b.classList.toggle('is-on', !!q.on());
    });
  }

  /* ================= 상세 모달 ================= */
  function openDetail(id) {
    JHS_API.get(id).then(function (it) {
      if (!it) return;
      var isFav = favs.indexOf(it.id) !== -1;
      var area = it.buildingArea > 0 ? it.buildingArea : it.landArea;
      var mapQ = encodeURIComponent(it.address.split(' ').slice(0, 4).join(' '));

      var h = '';
      h += '<div class="dt-head">' +
        '<div class="row1"><span class="dt-case">' + esc(it.caseNo) + ' (' + it.itemNo + ')</span>' +
        '<span class="dt-court">' + esc(it.court) + '</span>' +
        '<span class="st st-' + it.status + '">' + it.status + '</span>' +
        '<span class="rate ' + rateClass(it.rate) + '">최저가율 ' + it.rate.toFixed(0) + '%</span></div>' +
        '<div class="dt-title">' + esc(it.title) + '</div>' +
        '<div class="dt-addr">' + esc(it.address) + '</div>' +
        tagsHtml(it.tags) +
        '<div class="dt-actions">' +
        '<button id="dtFav" class="' + (isFav ? 'on' : '') + '">' + (isFav ? '★ 관심물건' : '☆ 관심물건 담기') + '</button>' +
        '<a href="https://map.naver.com/p/search/' + mapQ + '" target="_blank" rel="noopener">네이버 지도</a>' +
        '<a href="https://map.kakao.com/?q=' + mapQ + '" target="_blank" rel="noopener">카카오맵</a>' +
        '<a href="https://www.courtauction.go.kr" target="_blank" rel="noopener">법원경매정보</a>' +
        '<button id="dtCopy">주소 복사</button>' +
        '</div></div>';

      h += '<div class="dt-body">';

      /* 왼쪽 — 기본 정보 */
      h += '<div class="dt-sec"><h4>물건 정보</h4><table class="kv">' +
        row('물건종류', esc(it.type) + ' <span style="color:var(--ink-3)">· ' + esc(it.group) + '</span>') +
        row('소재지', esc(it.address)) +
        row('건물면적', it.buildingArea ? fmtArea(it.buildingArea) : '-') +
        row('토지면적', it.landArea ? fmtArea(it.landArea) : '-') +
        row('감정가', '<span class="big">' + fmtWon(it.appraisal) + '</span> <small style="color:var(--ink-3)">' + comma(it.appraisal) + '원</small>') +
        row('최저가', '<span class="big" style="color:var(--red)">' + fmtWon(it.minPrice) + '</span> <small style="color:var(--ink-3)">' + comma(it.minPrice) + '원</small>') +
        row('입찰보증금', fmtWon(Math.round(it.minPrice * 0.1)) + ' <small style="color:var(--ink-3)">(최저가 10%)</small>') +
        row('유찰', it.failCount + '회 · 저감율 ' + Math.round(it.discount * 100) + '%') +
        row('매각기일', fmtDate(it.saleDate) + ' <b style="color:var(--blue)">' + dday(it.saleDate) + '</b>') +
        row('배당요구종기', fmtDate(it.dueDate)) +
        (it.soldPrice ? row('매각가', fmtWon(it.soldPrice) + ' <small style="color:var(--ink-3)">(감정가 대비 ' +
          Math.round(it.soldPrice / it.appraisal * 100) + '%, 응찰 ' + it.bidders + '명)</small>') : '') +
        '</table></div>';

      /* 오른쪽 — 기일내역 + 계산기 */
      h += '<div class="dt-sec"><h4>기일 내역</h4><ul class="timeline">';
      it.history.forEach(function (hh) {
        h += '<li><span class="tl-d">' + fmtDate(hh.date) + '</span>' +
          '<span style="color:var(--ink-3);font-size:11.5px">' + hh.kind + '</span>' +
          '<span class="tl-p">' + fmtWon(hh.price) + '</span>' +
          '<span class="tl-r ' + hh.result + '">' + hh.result + '</span></li>';
      });
      h += '</ul>';

      h += '<h4 style="margin-top:18px">예상 수익 계산기</h4><div class="calc">' +
        calcRow('예상 입찰가', 'cBid', Math.round(it.minPrice / 1e4)) +
        calcRow('예상 시세', 'cMarket', Math.round(it.appraisal / 1e4)) +
        calcRow('수리비', 'cFix', it.group === '토지' ? 0 : 500) +
        calcRow('명도비', 'cMove', it.group === '토지' ? 0 : 300) +
        '<div class="calc-out" id="calcOut"></div>' +
        '<p class="calc-note">취득세는 ' + (it.group === '주거용' ? '주거용 1.1%' : '4.6%') +
        ', 법무·등기비는 입찰가의 0.5%+30만원, 매도 중개수수료는 시세의 0.5%로 단순 가정한 <b>참고용 추정치</b>입니다. ' +
        '다주택·고가주택·농지 등은 세율이 크게 달라집니다.</p>' +
        '</div></div>';

      h += '</div>';

      $('#modalBody').innerHTML = h;
      $('#modal').hidden = false;
      document.body.style.overflow = 'hidden';

      /* 계산기 */
      var rate = it.group === '주거용' ? 0.011 : 0.046;
      function calc() {
        var bid = numOr($('#cBid').value, 0) * 1e4;
        var mkt = numOr($('#cMarket').value, 0) * 1e4;
        var fix = numOr($('#cFix').value, 0) * 1e4;
        var mov = numOr($('#cMove').value, 0) * 1e4;
        var tax = bid * rate;
        var law = bid * 0.005 + 300000;
        var fee = mkt * 0.005;
        var total = bid + tax + law + fix + mov;
        var profit = mkt - fee - total;
        var roi = total > 0 ? (profit / total) * 100 : 0;
        $('#calcOut').innerHTML =
          '<div><span>취득세</span><span>' + fmtWon(tax) + '</span></div>' +
          '<div><span>법무·등기비</span><span>' + fmtWon(law) + '</span></div>' +
          '<div><span>수리 + 명도</span><span>' + fmtWon(fix + mov) + '</span></div>' +
          '<div><span>매도 중개수수료</span><span>' + fmtWon(fee) + '</span></div>' +
          '<div class="tot"><span>총 투입금</span><span>' + fmtWon(total) + '</span></div>' +
          '<div><span>예상 수익</span><span class="profit ' + (profit >= 0 ? 'plus' : 'minus') + '">' +
          (profit >= 0 ? '+' : '-') + fmtWon(Math.abs(profit)) + '</span></div>' +
          '<div><span>예상 수익률</span><span class="profit ' + (profit >= 0 ? 'plus' : 'minus') + '">' +
          roi.toFixed(1) + '%</span></div>';
      }
      ['cBid', 'cMarket', 'cFix', 'cMove'].forEach(function (id) {
        $('#' + id).addEventListener('input', calc);
      });
      calc();

      $('#dtFav').addEventListener('click', function () {
        toggleFav(it.id);
        var on = favs.indexOf(it.id) !== -1;
        this.className = on ? 'on' : '';
        this.textContent = on ? '★ 관심물건' : '☆ 관심물건 담기';
        run(false);
      });
      $('#dtCopy').addEventListener('click', function () {
        var self = this;
        var done = function () { self.textContent = '복사됨'; setTimeout(function () { self.textContent = '주소 복사'; }, 1200); };
        if (navigator.clipboard) navigator.clipboard.writeText(it.address).then(done, done);
        else done();
      });
    });
  }

  function row(k, v) { return '<tr><th>' + k + '</th><td>' + v + '</td></tr>'; }
  function calcRow(label, id, val) {
    return '<div class="calc-row"><label for="' + id + '">' + label + '</label>' +
      '<input type="number" id="' + id + '" value="' + val + '" step="100" min="0"><span>만원</span></div>';
  }

  function closeModal() {
    $('#modal').hidden = true;
    $('#guide').hidden = true;
    document.body.style.overflow = '';
  }

  /* ================= CSV ================= */
  function exportCsv() {
    if (!lastResult || !lastResult.all || !lastResult.all.length) { alert('내보낼 결과가 없습니다.'); return; }
    var rows = lastResult.all.slice(0, 5000);
    var head = ['사건번호','물건번호','법원','물건종류','소재지','건물면적(㎡)','토지면적(㎡)','감정가(원)','최저가(원)','최저가율(%)','유찰','매각기일','상태','특수권리'];
    var lines = [head.join(',')];
    rows.forEach(function (it) {
      lines.push([
        it.caseNo, it.itemNo, it.court, it.type, '"' + it.address.replace(/"/g, '""') + '"',
        it.buildingArea, it.landArea, it.appraisal, it.minPrice, it.rate, it.failCount,
        it.saleDate, it.status, '"' + it.tags.join(' ') + '"'
      ].join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '진헌스캔_검색결과_' + iso(new Date()) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ================= 탭 ================= */
  function setTab(tab) {
    $$('.nav-a').forEach(function (b) { b.classList.toggle('is-on', b.dataset.tab === tab); });
    if (tab === 'fav') state.favOnly = true;
    if (tab === 'search') state.favOnly = false;
  }

  /* ================= 이벤트 ================= */
  function bind() {
    var debounce = null;
    $('#q').addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { readDom(); run(); }, 320);
    });
    $('#qCase').addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { readDom(); run(); }, 320);
    });
    $$('#q, #qCase').forEach(function (el) {
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { readDom(); run(); } });
    });

    $('#btnSearch').addEventListener('click', function () { readDom(); run(); closeDrawer(); });
    $('#btnApply').addEventListener('click', function () { readDom(); run(); closeDrawer(); });
    $('#btnReset').addEventListener('click', function () {
      var d = defaultState();
      d.view = state.view;          /* 보기 방식과 면적 단위는 사용자 취향이라 유지 */
      d.unit = state.unit;
      Object.keys(d).forEach(function (k) { state[k] = d[k]; });
      setTab('search'); writeDom(); run();
    });

    /* 필터 드로어 */
    $('#btnFilterOpen').addEventListener('click', openDrawer);
    $('#btnFilterClose').addEventListener('click', closeDrawer);
    $('#filtersDim').addEventListener('click', closeDrawer);

    /* 시/도 */
    $('#fSido').addEventListener('change', function () {
      state.sido = this.value; state.sigungu = [];
      buildSigungu(); readDom(); run(); syncQuickChips();
    });
    $('#fCourt').addEventListener('change', function () { readDom(); run(); });

    /* 시군구 칩 */
    $('#fSigungu').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      var g = b.dataset.gu, i = state.sigungu.indexOf(g);
      if (i === -1) state.sigungu.push(g); else state.sigungu.splice(i, 1);
      b.classList.toggle('is-on');
      run();
    });

    /* 종류 체크박스 */
    $('#fTypes').addEventListener('change', function () { readDom(); run(); syncQuickChips(); });

    /* 특수권리 / 상태 칩 */
    $('#fTags').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      var t = b.dataset.tag, i = state.tags.indexOf(t);
      if (i === -1) state.tags.push(t); else state.tags.splice(i, 1);
      b.classList.toggle('is-on');
      run();
    });
    $('#fStatus').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      var s = b.dataset.status, i = state.statuses.indexOf(s);
      if (i === -1) state.statuses.push(s); else state.statuses.splice(i, 1);
      b.classList.toggle('is-on');
      run();
    });
    $('#fClean').addEventListener('change', function () { readDom(); run(); syncQuickChips(); });

    /* 숫자/날짜 입력 */
    $$('#filters input[type=number], #filters input[type=date]').forEach(function (el) {
      el.addEventListener('change', function () { readDom(); run(); syncQuickChips(); });
    });

    /* 프리셋 */
    $('#pricePresets').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $('#fMinMin').value = ''; $('#fMinMax').value = b.dataset.max;
      readDom(); run(); syncQuickChips();
    });
    $('#datePresets').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var d = parseInt(b.dataset.days, 10);
      if (!d) { $('#fDateFrom').value = ''; $('#fDateTo').value = ''; }
      else { $('#fDateFrom').value = iso(today()); $('#fDateTo').value = iso(addDays(today(), d)); }
      readDom(); run(); syncQuickChips();
    });

    /* 초기화 미니버튼 */
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-clear]'); if (!b) return;
      if (b.dataset.clear === 'types') { state.types = []; $$('.f-type').forEach(function (i) { i.checked = false; }); }
      if (b.dataset.clear === 'tags') { state.tags = []; $$('#fTags .chip').forEach(function (c) { c.classList.remove('is-on'); }); }
      run(); syncQuickChips();
    });

    /* 면적 단위 */
    $$('.unit-toggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (state.unit === b.dataset.unit) return;
        /* 입력값을 새 단위로 환산 */
        ['#fAreaMin', '#fAreaMax'].forEach(function (sel) {
          var v = numOr($(sel).value);
          if (v == null) return;
          $(sel).value = b.dataset.unit === 'py' ? Math.round(v / PY) : Math.round(v * PY);
        });
        state.unit = b.dataset.unit;
        $$('.unit-toggle button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        readDom(); run();
      });
    });

    /* 빠른 칩 */
    $('#quickChips').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var q = QUICK[b.dataset.quick]; if (!q) return;
      q.set(!q.on());
      writeDom(); run();
    });

    /* 정렬 / 페이지당 / 보기 */
    $('#sort').addEventListener('change', function () { state.sort = this.value; run(); });
    $('#pageSize').addEventListener('change', function () { state.pageSize = parseInt(this.value, 10); run(); });
    $$('.viewtoggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.view = b.dataset.view;
        $$('.viewtoggle button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        run(false);
      });
    });
    $('#btnCsv').addEventListener('click', exportCsv);

    /* 결과 클릭 (상세 / 관심) */
    $('#resultBox').addEventListener('click', function (e) {
      var f = e.target.closest('[data-fav]');
      if (f) {
        e.stopPropagation();
        toggleFav(f.dataset.fav);
        var on = favs.indexOf(f.dataset.fav) !== -1;
        f.classList.toggle('is-on', on);
        f.textContent = on ? '★' : '☆';
        if (state.favOnly) run(false);
        return;
      }
      var r = e.target.closest('[data-id]');
      if (r) openDetail(r.dataset.id);
    });

    /* 페이지네이션 */
    $('#pager').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]'); if (!b || b.disabled) return;
      goPage(parseInt(b.dataset.p, 10));
    });

    /* 활성 칩 제거 */
    $('#activeChips').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-ck]'); if (!b) return;
      removeChip(b.dataset.ck, b.dataset.cv);
    });

    /* 탭 */
    $$('.nav-a').forEach(function (b) {
      b.addEventListener('click', function () {
        var tab = b.dataset.tab;
        if (tab === 'guide') { $('#guide').hidden = false; document.body.style.overflow = 'hidden'; return; }
        setTab(tab);
        run();
      });
    });

    /* 모달 닫기 */
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeModal(); closeDrawer(); }
    });
  }

  function openDrawer() { $('#filters').classList.add('open'); $('#filtersDim').classList.add('open'); }
  function closeDrawer() { $('#filters').classList.remove('open'); $('#filtersDim').classList.remove('open'); }

  /* 헤더·검색바 높이를 실제로 재서 sticky 위치를 맞춘다
     (창 폭에 따라 빠른칩이 줄바꿈되면 검색바 높이가 달라짐) */
  function syncSticky() {
    var h = document.querySelector('.hdr').offsetHeight;
    var s = document.querySelector('.searchbar').offsetHeight;
    var r = document.documentElement.style;
    r.setProperty('--hdr-h', h + 'px');
    r.setProperty('--sticky-top', (h + s + 14) + 'px');
  }

  /* ================= 시작 ================= */
  function init() {
    buildFilters();
    /* 좁은 화면에서는 표 대신 카드가 기본 (URL 에 view 가 있으면 그 값 우선) */
    if (window.innerWidth <= 700 && location.search.indexOf('view=') === -1) state.view = 'card';
    readUrl();
    writeDom();
    saveFavs();
    if (state.favOnly) setTab('fav');
    bind();
    syncSticky();
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(syncSticky, 120); });
    run(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
