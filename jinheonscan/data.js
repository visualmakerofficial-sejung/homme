/* =========================================================
   진헌스캔 — 마스터 데이터 & 샘플 물건 생성기
   ---------------------------------------------------------
   여기서 만드는 물건 데이터는 전부 "샘플"입니다.
   실제 법원경매 물건이 아니며, 실제 주소·건물과 무관합니다.
   실데이터 연동은 api.js 의 어댑터를 교체해서 붙이세요.
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------- 지역 마스터 ---------- */
  var REGIONS = {
    '서울특별시': ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'],
    '경기도': ['수원시','성남시','고양시','용인시','부천시','안산시','안양시','남양주시','화성시','평택시','의정부시','시흥시','파주시','광명시','김포시','군포시','광주시','이천시','양주시','구리시','하남시','오산시','여주시','포천시'],
    '인천광역시': ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군'],
    '부산광역시': ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'],
    '대구광역시': ['중구','동구','서구','남구','북구','수성구','달서구','달성군'],
    '대전광역시': ['동구','중구','서구','유성구','대덕구'],
    '광주광역시': ['동구','서구','남구','북구','광산구'],
    '울산광역시': ['중구','남구','동구','북구','울주군'],
    '세종특별자치시': ['세종시'],
    '강원특별자치도': ['춘천시','원주시','강릉시','동해시','속초시','삼척시','홍천군','평창군'],
    '충청북도': ['청주시','충주시','제천시','음성군','진천군','옥천군'],
    '충청남도': ['천안시','아산시','서산시','당진시','공주시','논산시','홍성군','예산군'],
    '전북특별자치도': ['전주시','익산시','군산시','정읍시','남원시','완주군'],
    '전라남도': ['목포시','여수시','순천시','광양시','나주시','무안군','해남군'],
    '경상북도': ['포항시','구미시','경주시','경산시','안동시','김천시','영주시','칠곡군'],
    '경상남도': ['창원시','김해시','진주시','양산시','거제시','통영시','사천시','밀양시'],
    '제주특별자치도': ['제주시','서귀포시']
  };

  /* ---------- 관할 법원 매핑 ---------- */
  var COURT_BY_GU = {
    '서울특별시': {
      '강남구':'서울중앙지방법원','서초구':'서울중앙지방법원','관악구':'서울중앙지방법원','동작구':'서울중앙지방법원','종로구':'서울중앙지방법원','중구':'서울중앙지방법원',
      '송파구':'서울동부지방법원','강동구':'서울동부지방법원','성동구':'서울동부지방법원','광진구':'서울동부지방법원',
      '영등포구':'서울남부지방법원','강서구':'서울남부지방법원','양천구':'서울남부지방법원','구로구':'서울남부지방법원','금천구':'서울남부지방법원',
      '도봉구':'서울북부지방법원','노원구':'서울북부지방법원','강북구':'서울북부지방법원','성북구':'서울북부지방법원','동대문구':'서울북부지방법원','중랑구':'서울북부지방법원',
      '마포구':'서울서부지방법원','서대문구':'서울서부지방법원','은평구':'서울서부지방법원','용산구':'서울서부지방법원'
    },
    '경기도': {
      '수원시':'수원지방법원','화성시':'수원지방법원','오산시':'수원지방법원',
      '성남시':'수원지방법원 성남지원','하남시':'수원지방법원 성남지원','광주시':'수원지방법원 성남지원',
      '안양시':'수원지방법원 안양지원','과천시':'수원지방법원 안양지원','군포시':'수원지방법원 안양지원','광명시':'수원지방법원 안양지원',
      '평택시':'수원지방법원 평택지원',
      '여주시':'수원지방법원 여주지원','이천시':'수원지방법원 여주지원',
      '안산시':'수원지방법원 안산지원','시흥시':'수원지방법원 안산지원',
      '부천시':'인천지방법원 부천지원','김포시':'인천지방법원 부천지원',
      '고양시':'의정부지방법원 고양지원','파주시':'의정부지방법원 고양지원',
      '의정부시':'의정부지방법원','남양주시':'의정부지방법원','구리시':'의정부지방법원','양주시':'의정부지방법원','포천시':'의정부지방법원'
    }
  };

  var COURT_BY_SIDO = {
    '서울특별시':'서울중앙지방법원',
    '경기도':'수원지방법원',
    '인천광역시':'인천지방법원',
    '부산광역시':'부산지방법원',
    '대구광역시':'대구지방법원',
    '대전광역시':'대전지방법원',
    '광주광역시':'광주지방법원',
    '울산광역시':'울산지방법원',
    '세종특별자치시':'대전지방법원',
    '강원특별자치도':'춘천지방법원',
    '충청북도':'청주지방법원',
    '충청남도':'대전지방법원 천안지원',
    '전북특별자치도':'전주지방법원',
    '전라남도':'광주지방법원 목포지원',
    '경상북도':'대구지방법원 포항지원',
    '경상남도':'창원지방법원',
    '제주특별자치도':'제주지방법원'
  };

  /* 법원별 저감율(유찰 1회당 최저가 하락폭) — 20% 또는 30% */
  var DISCOUNT_BY_COURT = {
    '인천지방법원': 0.30, '인천지방법원 부천지원': 0.30,
    '수원지방법원': 0.30, '수원지방법원 성남지원': 0.30, '수원지방법원 안양지원': 0.30,
    '수원지방법원 평택지원': 0.30, '수원지방법원 여주지원': 0.30, '수원지방법원 안산지원': 0.30,
    '의정부지방법원': 0.30, '의정부지방법원 고양지원': 0.30,
    '제주지방법원': 0.30
  };

  /* ---------- 물건 종류 ---------- */
  var TYPE_GROUPS = [
    { group: '주거용', items: ['아파트','오피스텔','다세대(빌라)','연립주택','단독주택','다가구주택'] },
    { group: '상업용', items: ['근린상가','사무실','근린시설','숙박시설'] },
    { group: '산업용', items: ['공장','창고'] },
    { group: '토지',   items: ['대지','전','답','임야','과수원','잡종지'] },
    { group: '기타',   items: ['자동차','기계기구'] }
  ];

  var ALL_TYPES = TYPE_GROUPS.reduce(function (a, g) { return a.concat(g.items); }, []);

  /* 종류별 기준 감정가(억) / 면적 범위 */
  var TYPE_SPEC = {
    '아파트':      { base: 4.0,  bArea: [39, 145],  lArea: [20, 70],   resi: true },
    '오피스텔':    { base: 1.8,  bArea: [19, 62],   lArea: [6, 20],    resi: true },
    '다세대(빌라)':{ base: 1.6,  bArea: [28, 84],   lArea: [15, 45],   resi: true },
    '연립주택':    { base: 1.9,  bArea: [40, 95],   lArea: [25, 60],   resi: true },
    '단독주택':    { base: 3.0,  bArea: [55, 210],  lArea: [90, 430],  resi: true },
    '다가구주택':  { base: 4.6,  bArea: [120, 420], lArea: [110, 380], resi: true },
    '근린상가':    { base: 3.4,  bArea: [18, 210],  lArea: [10, 120],  resi: false },
    '사무실':      { base: 2.4,  bArea: [25, 260],  lArea: [12, 90],   resi: false },
    '근린시설':    { base: 5.2,  bArea: [90, 720],  lArea: [80, 500],  resi: false },
    '숙박시설':    { base: 11.5, bArea: [300, 1900],lArea: [200, 1200],resi: false },
    '공장':        { base: 14.0, bArea: [320, 3200],lArea: [500, 6000],resi: false },
    '창고':        { base: 7.5,  bArea: [180, 1800],lArea: [300, 4000],resi: false },
    '대지':        { base: 3.0,  bArea: [0, 0],     lArea: [90, 2400], resi: false },
    '전':          { base: 1.2,  bArea: [0, 0],     lArea: [300, 6000],resi: false },
    '답':          { base: 1.0,  bArea: [0, 0],     lArea: [400, 8000],resi: false },
    '임야':        { base: 0.8,  bArea: [0, 0],     lArea: [900, 42000],resi: false },
    '과수원':      { base: 1.1,  bArea: [0, 0],     lArea: [600, 9000],resi: false },
    '잡종지':      { base: 1.3,  bArea: [0, 0],     lArea: [200, 5200],resi: false },
    '자동차':      { base: 0.16, bArea: [0, 0],     lArea: [0, 0],     resi: false },
    '기계기구':    { base: 0.30, bArea: [0, 0],     lArea: [0, 0],     resi: false }
  };

  /* 지역 가격 배수 */
  var PRICE_MULT = {
    '서울특별시': 2.35, '경기도': 1.42, '인천광역시': 1.18, '세종특별자치시': 1.22,
    '부산광역시': 1.05, '대구광역시': 0.98, '대전광역시': 0.97, '광주광역시': 0.92,
    '울산광역시': 0.95, '제주특별자치도': 1.10, '강원특별자치도': 0.72,
    '충청북도': 0.72, '충청남도': 0.78, '전북특별자치도': 0.66, '전라남도': 0.64,
    '경상북도': 0.68, '경상남도': 0.78
  };

  /* ---------- 특수권리 태그 ---------- */
  var TAGS = ['유치권','법정지상권','분묘기지권','지분매각','선순위임차인','대지권미등기','토지별도등기','위반건축물','맹지','농지취득자격증명','재매각','입찰외','임차권등기','공유자우선매수'];

  var TAG_RULES = {
    '유치권':            { w: 0.06, only: null },
    '법정지상권':        { w: 0.05, only: ['토지'] },
    '분묘기지권':        { w: 0.04, only: ['토지'] },
    '지분매각':          { w: 0.09, only: null },
    '선순위임차인':      { w: 0.10, only: ['주거용','상업용'] },
    '대지권미등기':      { w: 0.05, only: ['주거용'] },
    '토지별도등기':      { w: 0.05, only: ['주거용','상업용'] },
    '위반건축물':        { w: 0.06, only: ['주거용','상업용','산업용'] },
    '맹지':              { w: 0.07, only: ['토지'] },
    '농지취득자격증명':  { w: 0.10, only: ['토지'] },
    '재매각':            { w: 0.05, only: null },
    '입찰외':            { w: 0.05, only: null },
    '임차권등기':        { w: 0.05, only: ['주거용','상업용'] },
    '공유자우선매수':    { w: 0.04, only: null }
  };

  var GROUP_OF_TYPE = (function () {
    var m = {};
    TYPE_GROUPS.forEach(function (g) { g.items.forEach(function (t) { m[t] = g.group; }); });
    return m;
  })();

  /* ---------- 이름 풀 (실제 단지명과 무관한 가상 명칭) ---------- */
  var DONG = ['중앙동','신흥동','대현동','상록동','본동','서부동','동부동','남산동','학산동','송정동','원평동','금호동','성산동','화정동','영산동','청림동','덕진동','한내동','매곡동','양지동'];
  var EUPMYEON = ['대곡면','남면','북면','신평면','옥천면','청산면','하남읍','내서읍','금성면','장안읍'];
  var BLD = ['한빛','그린파크','예승','청솔','무지개','한아름','금빛','대연','새봄','늘푸른','두레','수정','보람','햇살','다온','바른','해오름','가온','벚꽃','미래'];
  var BLD_SUF = ['아파트','타운','빌라','맨션','하이츠','프라자','시티'];
  var CAR = ['승용 세단 2.0','SUV 2.2 디젤','승합 11인승','화물 1톤','승용 하이브리드','수입 세단 3.0','전기 승용','화물 5톤'];

  /* ---------- 유틸 ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function rint(rnd, a, b) { return Math.floor(a + rnd() * (b - a + 1)); }
  function rfloat(rnd, a, b) { return a + rnd() * (b - a); }
  function pad(n, len) { var s = String(n); while (s.length < len) s = '0' + s; return s; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }

  function courtOf(sido, sigungu) {
    if (COURT_BY_GU[sido] && COURT_BY_GU[sido][sigungu]) return COURT_BY_GU[sido][sigungu];
    return COURT_BY_SIDO[sido] || '지방법원';
  }

  /* 유찰 횟수 가중 추출 */
  function drawFailCount(rnd) {
    var r = rnd();
    if (r < 0.34) return 0;
    if (r < 0.62) return 1;
    if (r < 0.82) return 2;
    if (r < 0.93) return 3;
    if (r < 0.98) return 4;
    return 5;
  }

  /* ---------- 물건 1건 생성 ---------- */
  function makeItem(rnd, idx, today) {
    var sidoList = Object.keys(REGIONS);
    // 수도권 비중을 실제와 비슷하게 높임
    var sido;
    var r = rnd();
    if (r < 0.22) sido = '서울특별시';
    else if (r < 0.48) sido = '경기도';
    else if (r < 0.56) sido = '인천광역시';
    else sido = pick(rnd, sidoList);

    var sigungu = pick(rnd, REGIONS[sido]);
    var court = courtOf(sido, sigungu);
    var discount = DISCOUNT_BY_COURT[court] || 0.20;

    var type = pick(rnd, ALL_TYPES);
    // 실제 경매 비중과 비슷하게 아파트·빌라·상가 쪽을 높임
    if (rnd() < 0.34) type = pick(rnd, ['아파트','아파트','다세대(빌라)','다세대(빌라)','오피스텔','근린상가','대지','단독주택']);
    var spec = TYPE_SPEC[type];
    var group = GROUP_OF_TYPE[type];

    var mult = PRICE_MULT[sido] || 0.8;
    var spread = Math.exp(rfloat(rnd, -0.55, 0.75)); // 0.58 ~ 2.1
    var appraisal = Math.round(spec.base * 1e8 * mult * spread / 1e5) * 1e5; // 10만원 단위
    if (appraisal < 3000000) appraisal = 3000000;

    var failCount = drawFailCount(rnd);
    var minPrice = Math.round(appraisal * Math.pow(1 - discount, failCount) / 1e5) * 1e5;

    var bArea = spec.bArea[1] ? Math.round(rfloat(rnd, spec.bArea[0], spec.bArea[1]) * 100) / 100 : 0;
    var lArea = spec.lArea[1] ? Math.round(rfloat(rnd, spec.lArea[0], spec.lArea[1]) * 100) / 100 : 0;

    /* 주소 */
    var address, title;
    if (type === '자동차' || type === '기계기구') {
      address = sido + ' ' + sigungu + ' ' + pick(rnd, DONG) + ' ' + rint(rnd, 1, 400) + '-' + rint(rnd, 1, 60);
      title = type === '자동차' ? pick(rnd, CAR) : '산업용 기계 ' + rint(rnd, 1, 9) + '종';
    } else if (group === '토지') {
      address = sido + ' ' + sigungu + ' ' + pick(rnd, EUPMYEON) + ' ' + rint(rnd, 1, 900) + '-' + rint(rnd, 1, 40);
      title = type + ' ' + Math.round(lArea) + '㎡';
    } else if (spec.resi && (type === '아파트' || type === '오피스텔' || type === '다세대(빌라)' || type === '연립주택')) {
      var name = pick(rnd, BLD) + pick(rnd, BLD_SUF);
      var dong = rint(rnd, 1, 12), ho = rint(rnd, 1, 18) * 100 + rint(rnd, 1, 8);
      address = sido + ' ' + sigungu + ' ' + pick(rnd, DONG) + ' ' + rint(rnd, 1, 900) + '-' + rint(rnd, 1, 40) + ' ' + name + ' ' + dong + '동 ' + ho + '호';
      title = name + ' ' + dong + '동 ' + ho + '호';
    } else {
      address = sido + ' ' + sigungu + ' ' + pick(rnd, DONG) + ' ' + rint(rnd, 1, 900) + '-' + rint(rnd, 1, 40);
      title = type + ' ' + Math.round(bArea || lArea) + '㎡';
    }

    /* 기일 */
    var saleOffset = rint(rnd, -25, 115);
    var saleDate = addDays(today, saleOffset);
    var caseYear = saleDate.getFullYear() - (failCount >= 3 ? 2 : failCount >= 1 ? 1 : 0);
    var caseNo = caseYear + '타경' + pad(rint(rnd, 100, 99999), 5);
    var itemNo = rnd() < 0.78 ? 1 : rint(rnd, 2, 5);

    /* 기일 내역 */
    var history = [];
    var p = appraisal;
    for (var k = 0; k < failCount; k++) {
      var d = addDays(saleDate, -(failCount - k) * rint(rnd, 28, 42));
      history.push({ date: ymd(d), kind: '매각기일', price: p, result: '유찰' });
      p = Math.round(p * (1 - discount) / 1e5) * 1e5;
    }
    var lastResult = saleOffset < 0
      ? (rnd() < 0.55 ? '매각' : (rnd() < 0.6 ? '유찰' : '변경'))
      : '진행';
    history.push({ date: ymd(saleDate), kind: '매각기일', price: minPrice, result: lastResult });

    var status;
    if (saleOffset < 0) {
      status = lastResult === '매각' ? '매각' : (lastResult === '변경' ? '변경' : '유찰');
    } else {
      status = failCount === 0 ? '신건' : '진행';
    }
    if (rnd() < 0.02) status = '취하';
    if (rnd() < 0.015) status = '정지';

    /* 특수권리 */
    var tags = [];
    TAGS.forEach(function (t) {
      var rule = TAG_RULES[t];
      if (rule.only && rule.only.indexOf(group) === -1) return;
      if (rnd() < rule.w) tags.push(t);
    });
    if (failCount >= 3 && tags.length === 0 && rnd() < 0.5) tags.push(pick(rnd, ['유치권','지분매각','선순위임차인']));

    /* 낙찰 정보 */
    var soldPrice = null, bidders = null;
    if (status === '매각') {
      soldPrice = Math.round(minPrice * rfloat(rnd, 1.0, 1.42) / 1e5) * 1e5;
      bidders = rint(rnd, 1, 14);
    }

    return {
      id: 'JHS' + pad(idx, 6),
      caseNo: caseNo,
      itemNo: itemNo,
      court: court,
      discount: discount,
      type: type,
      group: group,
      sido: sido,
      sigungu: sigungu,
      title: title,
      address: address,
      buildingArea: bArea,
      landArea: lArea,
      appraisal: appraisal,
      minPrice: minPrice,
      rate: Math.round((minPrice / appraisal) * 1000) / 10, // 최저가율 %
      failCount: failCount,
      saleDate: ymd(saleDate),
      dueDate: ymd(addDays(saleDate, -rint(rnd, 40, 120))), // 배당요구종기
      status: status,
      tags: tags,
      soldPrice: soldPrice,
      bidders: bidders,
      history: history
    };
  }

  /* ---------- 전체 생성 ---------- */
  function generate(count, seed) {
    var rnd = mulberry32(seed || 20260912);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var out = [];
    for (var i = 1; i <= count; i++) out.push(makeItem(rnd, i, today));
    return out;
  }

  global.JHS_DATA = {
    REGIONS: REGIONS,
    TYPE_GROUPS: TYPE_GROUPS,
    ALL_TYPES: ALL_TYPES,
    TAGS: TAGS,
    STATUSES: ['신건','진행','유찰','변경','매각','취하','정지'],
    courtList: function () {
      var s = {};
      Object.keys(REGIONS).forEach(function (sd) {
        REGIONS[sd].forEach(function (sg) { s[courtOf(sd, sg)] = 1; });
      });
      return Object.keys(s).sort();
    },
    courtOf: courtOf,
    generate: generate
  };
})(window);
