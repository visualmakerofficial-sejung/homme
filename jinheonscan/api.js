/* =========================================================
   진헌스캔 — 데이터 어댑터
   ---------------------------------------------------------
   화면(app.js)은 이 파일의 JHS_API 만 호출합니다.
   실제 경매 데이터로 바꿀 때는 JHS_API.search / JHS_API.get 내부만
   서버 호출로 교체하면 되고, 화면 코드는 손댈 필요가 없습니다.

   ▸ 실데이터 연동 예시
     search: function (q) {
       return fetch('/api/auctions?' + new URLSearchParams(flatten(q)))
         .then(function (r) { return r.json(); });   // {items,total,stats}
     }
   ========================================================= */
(function (global) {
  'use strict';

  var CONFIG = {
    mode: 'sample',   // 'sample' | 'remote'
    endpoint: '',     // mode='remote' 일 때 사용할 API 주소
    sampleCount: 2400,
    seed: 20260912
  };

  var CACHE = null;

  function db() {
    if (!CACHE) CACHE = global.JHS_DATA.generate(CONFIG.sampleCount, CONFIG.seed);
    return CACHE;
  }

  /* ---------- 필터 ---------- */
  function matches(it, q) {
    if (q.keyword) {
      var k = q.keyword.replace(/\s+/g, '').toLowerCase();
      var hay = (it.address + it.title + it.caseNo + it.court + it.type).replace(/\s+/g, '').toLowerCase();
      if (hay.indexOf(k) === -1) return false;
    }
    if (q.caseNo) {
      var c = q.caseNo.replace(/\s+/g, '');
      if (it.caseNo.replace(/\s+/g, '').indexOf(c) === -1) return false;
    }
    if (q.sido && it.sido !== q.sido) return false;
    if (q.sigungu && q.sigungu.length && q.sigungu.indexOf(it.sigungu) === -1) return false;
    if (q.court && it.court !== q.court) return false;
    if (q.types && q.types.length && q.types.indexOf(it.type) === -1) return false;
    if (q.statuses && q.statuses.length && q.statuses.indexOf(it.status) === -1) return false;

    if (isNum(q.appraisalMin) && it.appraisal < q.appraisalMin) return false;
    if (isNum(q.appraisalMax) && it.appraisal > q.appraisalMax) return false;
    if (isNum(q.minPriceMin) && it.minPrice < q.minPriceMin) return false;
    if (isNum(q.minPriceMax) && it.minPrice > q.minPriceMax) return false;
    if (isNum(q.rateMin) && it.rate < q.rateMin) return false;
    if (isNum(q.rateMax) && it.rate > q.rateMax) return false;
    if (isNum(q.failMin) && it.failCount < q.failMin) return false;
    if (isNum(q.failMax) && it.failCount > q.failMax) return false;

    if (q.dateFrom && it.saleDate < q.dateFrom) return false;
    if (q.dateTo && it.saleDate > q.dateTo) return false;

    if (isNum(q.areaMin) || isNum(q.areaMax)) {
      var a = it.buildingArea > 0 ? it.buildingArea : it.landArea;
      if (isNum(q.areaMin) && a < q.areaMin) return false;
      if (isNum(q.areaMax) && a > q.areaMax) return false;
    }

    if (q.cleanOnly && it.tags.length > 0) return false;
    if (!q.cleanOnly && q.tags && q.tags.length) {
      var hit = false;
      for (var i = 0; i < q.tags.length; i++) {
        if (it.tags.indexOf(q.tags[i]) !== -1) { hit = true; break; }
      }
      if (!hit) return false;
    }

    if (q.favOnly) {
      if (!q.favIds || q.favIds.indexOf(it.id) === -1) return false;
    }
    return true;
  }

  function isNum(v) { return typeof v === 'number' && !isNaN(v); }

  /* 로컬 기준 YYYY-MM-DD (toISOString 은 UTC 기준이라 한국시간에서 하루 밀림) */
  function localYmd(d) {
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
  }

  /* ---------- 정렬 ---------- */
  var SORTS = {
    /* 임박순 — 아직 남은 기일을 가까운 순서로 먼저, 이미 지난 기일은 최근 것부터 뒤에 */
    'date_asc': function (a, b) {
      var t = localYmd(new Date());
      var ap = a.saleDate < t ? 1 : 0, bp = b.saleDate < t ? 1 : 0;
      if (ap !== bp) return ap - bp;
      if (ap) return a.saleDate < b.saleDate ? 1 : a.saleDate > b.saleDate ? -1 : 0;
      return a.saleDate < b.saleDate ? -1 : a.saleDate > b.saleDate ? 1 : 0;
    },
    'date_desc':  function (a, b) { return a.saleDate > b.saleDate ? -1 : a.saleDate < b.saleDate ? 1 : 0; },
    'min_asc':    function (a, b) { return a.minPrice - b.minPrice; },
    'min_desc':   function (a, b) { return b.minPrice - a.minPrice; },
    'appr_desc':  function (a, b) { return b.appraisal - a.appraisal; },
    'appr_asc':   function (a, b) { return a.appraisal - b.appraisal; },
    'rate_asc':   function (a, b) { return a.rate - b.rate; },
    'rate_desc':  function (a, b) { return b.rate - a.rate; },
    'fail_desc':  function (a, b) { return b.failCount - a.failCount || a.rate - b.rate; },
    'area_desc':  function (a, b) { return (b.buildingArea || b.landArea) - (a.buildingArea || a.landArea); }
  };

  /* ---------- 통계 ---------- */
  function summarize(rows) {
    if (!rows.length) return { total: 0, avgRate: 0, avgFail: 0, sumMin: 0, newCount: 0, soon: 0 };
    var sumRate = 0, sumFail = 0, sumMin = 0, newCount = 0, soon = 0;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var limit = new Date(today.getTime() + 7 * 86400000);
    var ls = localYmd(limit);
    var ts = localYmd(today);
    rows.forEach(function (r) {
      sumRate += r.rate; sumFail += r.failCount; sumMin += r.minPrice;
      if (r.failCount === 0) newCount++;
      if (r.saleDate >= ts && r.saleDate <= ls) soon++;
    });
    return {
      total: rows.length,
      avgRate: Math.round((sumRate / rows.length) * 10) / 10,
      avgFail: Math.round((sumFail / rows.length) * 100) / 100,
      sumMin: sumMin,
      newCount: newCount,
      soon: soon
    };
  }

  /* ---------- 공개 API ---------- */
  var JHS_API = {
    config: CONFIG,

    /** 검색 — Promise<{items,total,page,pageSize,stats}> */
    search: function (q) {
      q = q || {};
      if (CONFIG.mode === 'remote' && CONFIG.endpoint) {
        return fetch(CONFIG.endpoint + '/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(q)
        }).then(function (r) { return r.json(); });
      }

      return new Promise(function (resolve) {
        var rows = db().filter(function (it) { return matches(it, q); });
        var sorter = SORTS[q.sort] || SORTS.date_asc;
        rows.sort(sorter);

        var stats = summarize(rows);
        var page = Math.max(1, q.page || 1);
        var size = q.pageSize || 20;
        var start = (page - 1) * size;

        resolve({
          items: rows.slice(start, start + size),
          all: rows,
          total: rows.length,
          page: page,
          pageSize: size,
          stats: stats
        });
      });
    },

    /** 단건 조회 */
    get: function (id) {
      if (CONFIG.mode === 'remote' && CONFIG.endpoint) {
        return fetch(CONFIG.endpoint + '/item/' + encodeURIComponent(id)).then(function (r) { return r.json(); });
      }
      return Promise.resolve(db().filter(function (i) { return i.id === id; })[0] || null);
    },

    /** 전체 건수 (헤더 표시용) */
    count: function () { return db().length; }
  };

  global.JHS_API = JHS_API;
})(window);
