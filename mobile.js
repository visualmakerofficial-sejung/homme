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
  /* ----- 사전 접수 시트 ----- */
  var RESERVE_KEY = 'modilReservations_v1';
  function loadReservations() {
    try { return JSON.parse(localStorage.getItem(RESERVE_KEY)) || []; } catch(e) { return []; }
  }
  function saveReservations(list) {
    try { localStorage.setItem(RESERVE_KEY, JSON.stringify(list)); } catch(e) {}
  }

  var reserveState = null;
  window.mReserve = function (id) {
    var d = DATA.negoDeals.find(function (x) { return x.id === id; });
    if (!d) return;
    reserveState = { dealId: id, dealName: d.name.replace('\n', ' ') };
    renderReserveSheet();
    $('reserveSheet').classList.add('show');
  };
  window.mCloseReserve = function () { $('reserveSheet').classList.remove('show'); };

  function renderReserveSheet() {
    var d = reserveState;
    $('reserveBody').innerHTML = sheetXTop('mCloseReserve') +
      '<div class="sheet-head" style="margin-bottom:4px">' +
        '<div class="sheet-ic" style="background:#fff8e1">🔔</div>' +
        '<div><div class="sheet-t1">사전 접수 신청</div>' +
        '<div class="sheet-t2" style="font-size:12px;color:#888">' + esc(d.dealName) + '</div></div>' +
      '</div>' +
      '<div class="res-notice">딜이 오픈되면 카카오톡으로 알림을 드려요! 아래 정보를 입력해 주세요.</div>' +
      '<div class="res-form">' +
        '<div class="res-label">이름 *</div>' +
        '<input class="res-input" id="resName" placeholder="홍길동" maxlength="20">' +
        '<div class="res-label">연락처 (카카오톡 연결 번호) *</div>' +
        '<input class="res-input" id="resPhone" placeholder="010-0000-0000" inputmode="tel" maxlength="13" oninput="mFmtPhone(this)">' +
        '<div class="res-label">배송 받을 주소 *</div>' +
        '<input class="res-input" id="resAddr" placeholder="경기도 안산시 단원구 ..." maxlength="60">' +
        '<div class="res-label">상세주소</div>' +
        '<input class="res-input" id="resAddr2" placeholder="아파트 동·호수 등" maxlength="40">' +
        '<div class="res-label">요청사항 (선택)</div>' +
        '<textarea class="res-input res-ta" id="resNote" placeholder="특이사항이 있으면 입력해 주세요" rows="2"></textarea>' +
      '</div>' +
      '<div class="res-agree"><label><input type="checkbox" id="resAgree"> 개인정보 수집·이용에 동의합니다 <span style="color:#888;font-size:11px">(필수)</span></label></div>' +
      '<button class="pay-go" onclick="mDoReserve()" style="margin-top:4px">사전 접수 신청하기 🔔</button>';
  }

  window.mFmtPhone = function (el) {
    var v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 7) v = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7);
    else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
    el.value = v;
  };

  window.mDoReserve = function () {
    var name = ($('resName') ? $('resName').value.trim() : '');
    var phone = ($('resPhone') ? $('resPhone').value.trim() : '');
    var addr = ($('resAddr') ? $('resAddr').value.trim() : '');
    var addr2 = ($('resAddr2') ? $('resAddr2').value.trim() : '');
    var note = ($('resNote') ? $('resNote').value.trim() : '');
    var agreed = $('resAgree') && $('resAgree').checked;
    if (!name) { toast('이름을 입력해 주세요 ⚠️'); return; }
    if (!phone || phone.length < 12) { toast('연락처를 정확히 입력해 주세요 ⚠️'); return; }
    if (!addr) { toast('배송 주소를 입력해 주세요 ⚠️'); return; }
    if (!agreed) { toast('개인정보 수집에 동의해 주세요 ⚠️'); return; }
    var btn = $('reserveBody').querySelector('.pay-go');
    if (btn) { btn.disabled = true; btn.textContent = '신청 중...'; }
    setTimeout(function () {
      var list = loadReservations();
      var entry = {
        id: 'R-' + Date.now(),
        dealId: reserveState.dealId,
        dealName: reserveState.dealName,
        name: name, phone: phone,
        addr: addr + (addr2 ? ' ' + addr2 : ''),
        note: note,
        kakaoSent: false,
        date: today()
      };
      list.push(entry);
      saveReservations(list);
      var d = DATA.negoDeals.find(function (x) { return x.id === reserveState.dealId; });
      if (d) { d.currentCount += 1; saveData(DATA); renderNego(); }
      $('reserveSheet').classList.remove('show');
      showReserveReceipt(entry);
      confetti(60);
    }, 800);
  };

  function showReserveReceipt(entry) {
    var overlay = document.createElement('div');
    overlay.id = 'reserveReceiptOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:24px 24px 0 0;padding:28px 24px 48px;width:100%;max-width:480px;animation:fcardIn .35s ease">' +
        '<div style="text-align:center;font-size:44px;margin-bottom:4px">🔔</div>' +
        '<div style="text-align:center;font-size:19px;font-weight:900;margin-bottom:2px">사전 접수 완료!</div>' +
        '<div style="text-align:center;font-size:12px;color:#888;margin-bottom:20px">딜이 오픈되면 카카오톡으로 알림을 보내드려요</div>' +
        '<div style="background:#fffde7;border:1.5px solid #ffe082;border-radius:14px;padding:16px;font-size:13px;line-height:2">' +
          '<div style="display:flex;justify-content:space-between"><span style="color:#888">딜 이름</span><b>' + esc(entry.dealName) + '</b></div>' +
          '<div style="display:flex;justify-content:space-between"><span style="color:#888">이름</span><span>' + esc(entry.name) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between"><span style="color:#888">연락처</span><span>' + esc(entry.phone) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between"><span style="color:#888">주소</span><span style="text-align:right;max-width:60%">' + esc(entry.addr) + '</span></div>' +
        '</div>' +
        '<div style="font-size:11.5px;color:#888;margin-top:12px;line-height:1.7;text-align:center">딜 오픈 시 등록하신 카카오톡 번호로<br>알림 메시지를 보내드립니다.</div>' +
        '<button onclick="document.getElementById(\'reserveReceiptOverlay\').remove()" ' +
          'style="margin-top:18px;width:100%;padding:16px;background:#FEE500;color:#3C1E1E;border:none;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer">✓ 확인</button>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  /* ----- 관리자: 카카오톡 일괄 발송 ----- */
  window.mOpenKakaoAdmin = function () {
    renderKakaoAdmin();
    $('kakaoSheet').classList.add('show');
  };
  window.mCloseKakao = function () { $('kakaoSheet').classList.remove('show'); };

  function renderKakaoAdmin() {
    var list = loadReservations();
    var deals = {};
    list.forEach(function (r) {
      if (!deals[r.dealId]) deals[r.dealId] = { name: r.dealName, items: [] };
      deals[r.dealId].items.push(r);
    });
    var dealKeys = Object.keys(deals);
    var dealSel = dealKeys.map(function (k) {
      return '<option value="' + k + '">' + deals[k].name + ' (' + deals[k].items.length + '명)</option>';
    }).join('');

    $('kakaoBody').innerHTML = sheetXTop('mCloseKakao') +
      '<div class="sheet-head" style="margin-bottom:4px">' +
        '<div class="sheet-ic" style="background:#fffde7">💬</div>' +
        '<div><div class="sheet-t1">카카오톡 알림 발송</div>' +
        '<div class="sheet-t2">사전 접수자에게 일괄 발송</div></div>' +
      '</div>' +
      '<div class="res-form">' +
        '<div class="res-label">딜 선택</div>' +
        '<select class="res-input" id="kakaoDeaSel" onchange="mKakaoPreview()">' +
          '<option value="">-- 딜을 선택하세요 --</option>' + dealSel +
        '</select>' +
        '<div class="res-label">메시지 내용</div>' +
        '<textarea class="res-input res-ta" id="kakaoMsg" rows="5" placeholder="[모딜] 안녕하세요 {이름}님! \'딜명\'이 오픈되었습니다. 👉 지금 바로 참여하세요!">' +
          '[모딜] 안녕하세요 {이름}님! \'{딜명}\'이 드디어 오픈됐어요 🎉\n지금 바로 모딜 앱에서 참여하세요!\n👉 https://modil.kr</textarea>' +
        '<div id="kakaoPreviewBox"></div>' +
      '</div>' +
      '<div id="kakaoRecipList" style="margin-top:8px"></div>' +
      '<button class="pay-go" id="kakaoBatchBtn" onclick="mDoBatchKakao()" style="margin-top:12px;background:#FEE500;color:#3C1E1E;box-shadow:0 8px 20px rgba(254,229,0,.4)">💬 카카오톡 일괄 발송</button>';

    if (dealKeys.length > 0) {
      $('kakaoDeaSel').value = dealKeys[0];
      mKakaoPreview();
    }
  }

  window.mKakaoPreview = function () {
    var sel = $('kakaoDeaSel') ? $('kakaoDeaSel').value : '';
    var list = loadReservations().filter(function (r) { return r.dealId === sel; });
    var box = $('kakaoPreviewBox');
    var rl = $('kakaoRecipList');
    if (!sel || list.length === 0) {
      if (box) box.innerHTML = '';
      if (rl) rl.innerHTML = '<div style="font-size:12px;color:#aaa;text-align:center;padding:12px 0">접수자가 없습니다</div>';
      return;
    }
    var msg = $('kakaoMsg') ? $('kakaoMsg').value : '';
    var sample = msg.replace('{이름}', list[0].name).replace('{딜명}', list[0].dealName);
    if (box) box.innerHTML = '<div style="background:#fffde7;border:1.5px solid #ffe082;border-radius:12px;padding:12px;margin-top:8px;font-size:12px;line-height:1.8;white-space:pre-wrap;color:#333"><b>미리보기</b>\n' + esc(sample) + '</div>';
    if (rl) rl.innerHTML =
      '<div class="res-label" style="margin-top:8px">수신자 목록 (' + list.length + '명)</div>' +
      '<div style="max-height:150px;overflow-y:auto;border:1px solid var(--line);border-radius:12px;padding:8px">' +
        list.map(function (r, i) {
          return '<div style="display:flex;justify-content:space-between;padding:6px 4px;border-bottom:' + (i < list.length-1 ? '1px solid var(--line)' : 'none') + ';font-size:12px">' +
            '<span style="font-weight:700">' + esc(r.name) + '</span>' +
            '<span style="color:#888">' + esc(r.phone) + '</span>' +
            '<span style="font-size:10px;color:' + (r.kakaoSent ? '#2e7d32' : '#bbb') + '">' + (r.kakaoSent ? '✓발송완료' : '미발송') + '</span>' +
          '</div>';
        }).join('') +
      '</div>';
  };

  window.mDoBatchKakao = function () {
    var sel = $('kakaoDeaSel') ? $('kakaoDeaSel').value : '';
    var msg = $('kakaoMsg') ? $('kakaoMsg').value.trim() : '';
    if (!sel) { toast('딜을 선택해 주세요 ⚠️'); return; }
    if (!msg) { toast('메시지를 입력해 주세요 ⚠️'); return; }
    var list = loadReservations();
    var targets = list.filter(function (r) { return r.dealId === sel && !r.kakaoSent; });
    if (targets.length === 0) { toast('발송할 대상이 없거나 이미 발송 완료됐어요'); return; }
    var btn = $('kakaoBatchBtn');
    if (btn) { btn.disabled = true; btn.textContent = '발송 중 (' + targets.length + '명)...'; }
    setTimeout(function () {
      var updated = list.map(function (r) {
        if (r.dealId === sel) r.kakaoSent = true;
        return r;
      });
      saveReservations(updated);
      if (btn) { btn.disabled = false; btn.textContent = '💬 카카오톡 일괄 발송'; }
      renderKakaoAdmin();
      toast('🎉 카카오톡 ' + targets.length + '명에게 발송 완료!');
      showKakaoResult(targets, msg);
    }, 1500);
  };

  function showKakaoResult(targets, msg) {
    var overlay = document.createElement('div');
    overlay.id = 'kakaoResultOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:24px 24px 0 0;padding:28px 24px 48px;width:100%;max-width:480px;animation:fcardIn .35s ease;overflow-y:auto;max-height:80vh">' +
        '<div style="text-align:center;font-size:44px;margin-bottom:4px">💬</div>' +
        '<div style="text-align:center;font-size:19px;font-weight:900;margin-bottom:2px">카카오톡 발송 완료!</div>' +
        '<div style="text-align:center;font-size:12px;color:#888;margin-bottom:20px">총 <b>' + targets.length + '명</b>에게 메시지를 발송했어요</div>' +
        '<div style="background:#fffde7;border-radius:12px;padding:14px;font-size:12px;line-height:1.8;max-height:120px;overflow-y:auto;white-space:pre-wrap;margin-bottom:14px">' + esc(msg) + '</div>' +
        '<div style="font-size:11px;color:#aaa;margin-bottom:16px;text-align:center">※ 실제 발송은 카카오 비즈메시지 API 연동 시 자동 전송됩니다</div>' +
        '<button onclick="document.getElementById(\'kakaoResultOverlay\').remove()" ' +
          'style="width:100%;padding:16px;background:#FEE500;color:#3C1E1E;border:none;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer">확인</button>' +
      '</div>';
    document.body.appendChild(overlay);
  }

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
    { id: 'p1', ts: Date.now()-7200000, ava: '🦝', nick: '퇴근런너', lvl: 'LV.7', ago: 2, cat: '운동', likes: 142, comments: 7, fresh: false,
      title: '헬스장 끊고 3일 만에 탈퇴한 사람들 모여라 🏋️ <b>PT 양도권 단체공구</b> 50명 모으면 80% 할인!' },
    { id: 'p2', ts: Date.now()-3600000, ava: '🐹', nick: '탕비실요정', lvl: 'LV.12', ago: 6, cat: '간식', likes: 301, comments: 23, fresh: false,
      title: '사장님 몰래 탕비실 간식 <b>셀프 리필 공구</b> 🍪 안산 직장인만 — "열심히 일했으니까"' },
    { id: 'p3', ts: Date.now()-1800000, ava: '🐤', nick: '고잔동붕어', lvl: 'LV.4', ago: 11, cat: '음식', likes: 230, comments: 11, fresh: false,
      title: '새벽 2시 치킨 혼자 먹기 미안한 사람들 <b>🍗 치킨 100마리 단체주문</b> 동네 나눠먹기 프로젝트' },
    { id: 'p4', ts: Date.now()-900000, ava: '🦦', nick: '방구석CEO', lvl: 'LV.9', ago: 18, cat: '리빙', likes: 189, comments: 5, fresh: false,
      title: '재택근무 3년차의 깨달음 — <b>안마의자 공동임대</b> 🛋️ 월 2만원에 사무실 복지 누리기' },
    { id: 'p5', ts: Date.now()-300000, ava: '🐙', nick: '카페인중독자', lvl: 'LV.10', ago: 24, cat: '카페', likes: 177, comments: 9, fresh: false,
      title: '☕ 안산 스타벅스 <b>아메리카노 100잔 선결제</b> 공구 — 1잔당 2,000원 목표!' },
  ];
  var POOL = [
    { ava: '🐲', nick: '층간소음피해자', lvl: 'LV.3', cat: '리빙', title: '윗집 때문에 신경 쓰인다면 — <b>방음 슬리퍼 + 매트 세트 공구</b> 🥿 보복은 조용히' },
    { ava: '🦔', nick: '다이어트0일차', lvl: 'LV.6', cat: '식품', title: '월요일마다 다이어트 선언하는 사람들 <b>닭가슴살 10kg 공구</b> 🍗 "이번엔 다름"' },
    { ava: '🐢', nick: '캠핑은장비', lvl: 'LV.8', cat: '캠핑', title: 'MBTI별 캠핑의자 공구 🏕️ <b>E는 오픈형 / I는 등받이 칸막이형</b> — 내향인 배려 버전 포함' },
    { ava: '🦉', nick: '등골브레이커맘', lvl: 'LV.5', cat: '전자', title: '수능 끝난 자녀에게 <b>노트북 공구</b> 💻 — "등골이 부러질 것 같지만 해줘야지…"' },
    { ava: '🦥', nick: '귀차니즘끝판왕', lvl: 'LV.2', cat: '반려', title: '산책 나가기 귀찮은 집사들 <b>강아지 자동 공놀이 기계 공구</b> 🐶 미안해 대신 사줄게' },
    { ava: '🐳', nick: '식물장의사', lvl: 'LV.7', cat: '리빙', title: '3번 연속 식물 죽인 사람 🌵 <b>진짜 안 죽는 선인장 세트 공구</b> — 이번에도 죽이면 포기' },
    { ava: '🍜', nick: '안산맛집헌터', lvl: 'LV.11', cat: '음식', title: '2시간 줄 서는 그 집 🍜 <b>중앙동 유명 떡볶이 밀키트 공구</b> — 집에서 같은 맛으로!' },
    { ava: '📱', nick: '폰노예탈출', lvl: 'LV.5', cat: '전자', title: '유튜브 알고리즘에 4시간 뺏긴 사람들 🔒 <b>스마트폰 잠금 타이머 박스 공구</b>' },
    { ava: '🚗', nick: '카풀요정', lvl: 'LV.9', cat: '기타', title: '매일 같은 시간 안산↔서울 출근하는 분들 🚗 <b>카풀 정기권 공구</b> — 기름값 + 톨 N분의1' },
    { ava: '🧴', nick: '스킨루틴10단계', lvl: 'LV.6', cat: '뷰티', title: '올리브영 장바구니에만 2년째 있는 화장품들 💄 <b>뷰티 공동구매 카트 합치기</b> 함께 사면 포인트 2배!' },
  ];
  var ME = ['🐴', '🦄', '🐎'];

  var plaza;
  function loadPlaza() {
    var d;
    try { var s = localStorage.getItem(PLZ_KEY); if (s) {
      d = JSON.parse(s);
      var cutoff = Date.now() - 30 * 86400000;
      d.posts = (d.posts || []).filter(function (p) { return !p.ts || p.ts > cutoff; });
    } } catch (e) {}
    if (!d) d = { me: '나(소식이친구)', watching: 1287, expanded: false,
      posts: [], lottery: { entries: 412, myEntries: 0 } };
    // 샘플 딜이 항상 피드에 포함되도록 유지
    var ids = d.posts.map(function(p){ return p.id; });
    SEED_POSTS.forEach(function(sp) {
      if (ids.indexOf(sp.id) === -1) d.posts.push(JSON.parse(JSON.stringify(sp)));
    });
    return d;
  }
  function savePlaza() { try { localStorage.setItem(PLZ_KEY, JSON.stringify(plaza)); } catch (e) {} }

  function isMyPost(p) { var u = currentUser(); return u && u.name === p.nick; }
  function fcardHTML(p) {
    var mine = isMyPost(p);
    return '<div class="fcard' + (p.fresh ? ' fresh' : '') + (p.pinned ? ' pinned' : '') + '" id="fc-' + p.id + '">' +
      '<div class="fc-head"><div class="fc-ava">' + (p.ava || '🙂') + '</div>' +
        '<div><span class="fc-nick">' + esc(p.nick) + '</span><span class="fc-lvl">' + esc(p.lvl || 'LV.1') + '</span>' +
        (mine ? '<span class="fc-mine">내 글</span>' : '') + '</div>' +
        (p.pinned ? '<span class="fc-pin">📌 상단고정</span>' : '') +
        (p.fresh ? '<span class="fc-fresh">방금 ✨</span>' : '<span class="fc-time">' + agoText(p.ago || 0) + '</span>') +
      '</div>' +
      '<div class="fc-cat">#' + esc(p.cat) + (p.mine || mine ? ' · 🎁 성사되면 내가 공짜' : '') + '</div>' +
      '<div class="fc-title" id="fct-' + p.id + '">' + p.title + '</div>' +
      '<div class="fc-foot">' +
        '<button class="fc-btn like ' + (p.liked ? 'on' : '') + '" onclick="mLike(\'' + p.id + '\',this)">👍 <span>' + num(p.likes) + '</span></button>' +
        '<button class="fc-btn comment" onclick="mComment(\'' + p.id + '\')">💬 <span>' + num(p.comments || 0) + '</span></button>' +
        '<button class="fc-btn share" onclick="mSummon(\'' + p.id + '\')">📤 추천</button>' +
        (mine ? '<button class="fc-btn edit" onclick="mEditPost(\'' + p.id + '\')">✏️</button>' +
                '<button class="fc-btn del" onclick="mDeletePost(\'' + p.id + '\')">🗑️</button>' : '') +
      '</div></div>';
  }
  function agoText(m) { if (m < 1) return '방금 전'; if (m < 60) return m + '분 전'; return Math.floor(m / 60) + '시간 전'; }

  function renderFeed() {
    var el = $('feed'); if (!el) return;
    // 항상 SEED_POSTS 포함 보장
    var all = (plaza && plaza.posts) ? plaza.posts.slice() : [];
    var existIds = all.map(function(p){ return p.id; });
    SEED_POSTS.forEach(function(sp) {
      if (existIds.indexOf(sp.id) === -1) all.push(JSON.parse(JSON.stringify(sp)));
    });
    var pinned = all.filter(function (p) { return p.pinned; })
      .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    var unpinned = all.filter(function (p) { return !p.pinned; })
      .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    var show = pinned.concat(unpinned).slice(0, 2);
    if (show.length > 0) el.innerHTML = show.map(fcardHTML).join('');
    // show가 비어도 HTML 하드코딩 카드가 그대로 유지됨
    if ($('plazaWatch')) $('plazaWatch').textContent = num(plaza ? plaza.watching : 1287);
  }
  window.mOpenSucc = function () { var s = $('succSheet'); if (s) s.classList.add('show'); };

  /* ===== 딜 제안하기 시트 ===== */
  window.mOpenPropose = function () {
    var s = $('proposeSheet'); if (s) { s.classList.add('show'); switchProposeTab('consumer'); }
  };
  window.switchProposeTab = function (tab) {
    $('propose-consumer').style.display = tab === 'consumer' ? '' : 'none';
    $('propose-owner').style.display   = tab === 'owner'    ? '' : 'none';
    $('ptab-consumer').classList.toggle('active', tab === 'consumer');
    $('ptab-owner').classList.toggle('active', tab === 'owner');
  };
  // 카테고리 칩 클릭
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('pcat')) {
      var group = e.target.closest('.propose-cats');
      if (group) group.querySelectorAll('.pcat').forEach(function(b){ b.classList.remove('active'); });
      e.target.classList.add('active');
    }
  });
  window.mSubmitConsumer = function (e) {
    e.preventDefault();
    var cat = (document.querySelector('#consumerCats .pcat.active') || {}).dataset;
    var catVal = cat ? cat.val : '기타';
    var item = ($('consumerItem') || {}).value || '';
    var desc = ($('consumerDesc') || {}).value || '';
    var title = (item ? '[' + item + '] ' : '') + desc;
    if (!desc.trim()) { toast('어떤 혜택을 원하는지 적어주세요 🐴'); return; }
    var u = currentUser();
    if (!u) { toast('딜을 올리려면 먼저 가입해 주세요 🙋'); mOpenAuth(); return; }
    var np = { id: 'mine-' + Date.now(), ts: Date.now(), ava: u.av || '🐴', nick: u.name, lvl: 'LV.1',
      ago: 0, cat: catVal, likes: 1, lols: 0, comments: 0, liked: true, mine: true, fresh: true, title: esc(title.trim()) };
    plaza.posts.unshift(np);
    savePlaza(); renderFeed();
    if ($('consumerItem')) $('consumerItem').value = '';
    if ($('consumerDesc')) $('consumerDesc').value = '';
    $('proposeSheet').classList.remove('show');
    confetti(40);
    toast('🎉 딜 요청이 광장에 올라갔어요! 50명 모이면 제안자는 공짜!');
    setTimeout(function(){ np.fresh = false; savePlaza(); renderFeed(); }, 4500);
  };
  window.mSubmitOwner = function (e) {
    e.preventDefault();
    var biz = ($('ownerBiz') || {}).value || '';
    var addr = ($('ownerAddr') || {}).value || '';
    var deal = ($('ownerDeal') || {}).value || '';
    var contact = ($('ownerContact') || {}).value || '';
    if (!biz.trim() || !deal.trim()) { toast('매장명과 딜 내용을 입력해 주세요'); return; }
    toast('📨 사장님 딜 제안을 접수했어요! 모딜 팀이 검토 후 연락드릴게요 🐴');
    ['ownerBiz','ownerAddr','ownerDeal','ownerContact'].forEach(function(id){ if ($(id)) $(id).value=''; });
    $('proposeSheet').classList.remove('show');
    // 광장에도 사장님 딜로 등록
    var u = currentUser();
    if (u) {
      var np = { id: 'owner-' + Date.now(), ts: Date.now(), ava: '🏪', nick: biz, lvl: '사장님',
        ago: 0, cat: '딜제안', likes: 0, lols: 0, comments: 0, fresh: true,
        title: '🏪 <b>' + esc(biz) + '</b> — ' + esc(deal.trim()) };
      plaza.posts.unshift(np);
      savePlaza(); renderFeed();
    }
  };

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
  window.mComment = function (id) {
    var p = findP(id); if (!p) return;
    var foot = document.querySelector('#fc-' + id + ' .fc-foot');
    if (!foot) return;
    var existing = document.getElementById('cmt-box-' + id);
    if (existing) { existing.remove(); return; }
    var box = document.createElement('div');
    box.id = 'cmt-box-' + id;
    box.style.cssText = 'margin-top:8px;display:flex;gap:6px;align-items:center';
    box.innerHTML = '<input id="cmt-in-' + id + '" placeholder="댓글을 입력하세요…" style="flex:1;border:1.5px solid var(--coral-soft);border-radius:100px;padding:7px 12px;font-size:11.5px;outline:none">' +
      '<button onclick="mSubmitComment(\'' + id + '\')" style="background:var(--coral);color:#fff;border:none;border-radius:100px;padding:7px 14px;font-size:12px;font-weight:800;cursor:pointer">등록</button>';
    foot.parentNode.appendChild(box);
    document.getElementById('cmt-in-' + id).focus();
  };
  window.mSubmitComment = function (id) {
    var inp = document.getElementById('cmt-in-' + id);
    if (!inp || !inp.value.trim()) return;
    var p = findP(id); if (!p) return;
    p.comments = (p.comments || 0) + 1;
    savePlaza(); renderFeed();
    toast('💬 댓글이 등록됐어요!');
  };
  window.mSummon = function (id) {
    var p = findP(id); if (!p) return;
    p.likes += 1; savePlaza(); renderFeed();
    var shareUrl = SITE_URL + '#post-' + id;
    var shareTitle = '[' + p.cat + '] ' + p.title;
    var msg = '🐴 모딜에서 같이 딜해요!\n' + shareTitle + '\n' + shareUrl;
    if (navigator.share) {
      navigator.share({ title: shareTitle, text: msg, url: shareUrl })
        .catch(function () {});
    } else {
      var t = document.createElement('textarea');
      t.value = msg; document.body.appendChild(t); t.select();
      document.execCommand('copy'); document.body.removeChild(t);
      toast('📋 게시물 링크가 복사됐어요! 카톡에 붙여넣기 하세요 💬');
    }
  };
  window.mEditPost = function (id) {
    var u = currentUser(); if (!u) return;
    var p = findP(id); if (!p || p.nick !== u.name) { toast('본인 글만 수정할 수 있어요'); return; }
    var rawTitle = p.title.replace(/<[^>]+>/g, '');
    var titleEl = document.getElementById('fct-' + id); if (!titleEl) return;
    titleEl.innerHTML =
      '<textarea id="edt-' + id + '" style="width:100%;border:1.5px solid var(--coral);border-radius:8px;padding:7px 9px;font-size:12px;font-family:inherit;resize:none;line-height:1.5;box-sizing:border-box">' + rawTitle + '</textarea>' +
      '<div style="display:flex;gap:6px;margin-top:5px">' +
        '<button onclick="mSaveEdit(\'' + id + '\')" style="flex:1;padding:7px;background:var(--coral);color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer">저장</button>' +
        '<button onclick="renderFeed()" style="padding:7px 11px;background:var(--bg2);border:none;border-radius:8px;font-size:12px;cursor:pointer">취소</button>' +
      '</div>';
    var ta = document.getElementById('edt-' + id);
    if (ta) { ta.style.height = ta.scrollHeight + 'px'; ta.focus(); }
  };
  window.mSaveEdit = function (id) {
    var ta = document.getElementById('edt-' + id); if (!ta) return;
    var val = ta.value.trim(); if (!val) { toast('내용을 입력해 주세요'); return; }
    var p = findP(id); if (!p) return;
    p.title = esc(val); savePlaza(); renderFeed();
    toast('게시물이 수정됐어요 ✅');
  };
  window.mDeletePost = function (id) {
    var u = currentUser(); if (!u) return;
    var p = findP(id); if (!p || p.nick !== u.name) { toast('본인 글만 삭제할 수 있어요'); return; }
    var card = document.getElementById('fc-' + id); if (!card) return;
    card.style.transition = 'opacity .3s,transform .3s';
    card.style.opacity = '0'; card.style.transform = 'scale(.95)';
    setTimeout(function () {
      plaza.posts = plaza.posts.filter(function (x) { return x.id !== id; });
      savePlaza(); renderFeed();
      toast('게시물이 삭제됐어요 🗑️');
    }, 300);
  };

  window.mPostDeal = function () {
    var ti = $('composerInput');
    var title = (ti ? ti.value || '' : '').trim();
    if (!title) { if (ti) ti.focus(); toast('어떤 딜을 열고 싶은지 적어주세요 🐴'); return; }
    if (!currentUser()) { toast('딜을 올리려면 먼저 가입해 주세요 🙋'); mOpenAuth(); return; }
    var u = currentUser();
    var np = { id: 'mine-' + Date.now(), ts: Date.now(), ava: u.av || ME[Math.floor(Math.random() * 3)], nick: u.name, lvl: 'LV.1',
      ago: 0, cat: '기타', likes: 1, lols: 0, comments: 0, liked: true, mine: true, fresh: true, title: esc(title) };
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
  var REVIEW_KEY = 'modilReviews_v1';
  var REVIEW_AVAS = ['🦊','🐧','🐻','🐰','🐱','🐨','🦝','🐹','🐤','🦦','🐲','🦔','🐢','🦉','🦥'];
  window.mSubmitReview = function () {
    var ta = $('reviewTa');
    var text = ta.value.trim();
    if (!text) { ta.focus(); toast('한 줄 후기를 남겨주세요 ✍️'); return; }
    var u = currentUser();
    var nick = u ? u.name : '익명';
    var ava = u ? (u.ava || REVIEW_AVAS[Math.floor(Math.random()*REVIEW_AVAS.length)]) : '🎭';
    var lvl = u ? (u.lvl || 'LV.1') : '';
    try {
      var list = JSON.parse(localStorage.getItem(REVIEW_KEY) || '[]');
      list.unshift({ id: 'rv-' + Date.now(), nick: nick, ava: ava, lvl: lvl,
        product: '기타', stars: stars, text: text, likes: 0, liked: false,
        winner: false, verified: !!u, ts: Date.now() });
      localStorage.setItem(REVIEW_KEY, JSON.stringify(list));
    } catch(e) {}
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
    kakao:  { label: '💬 카카오', icon: '💬' },
    google: { label: '🔵 구글',   icon: 'G'  },
    naver:  { label: '🟢 네이버', icon: 'N'  },
  };

  /* ---- 소셜 로그인 설정 (키 발급 후 여기에 입력) ---- */
  var SOCIAL_CFG = {
    KAKAO_JS_KEY:   '',   // developers.kakao.com → 내 애플리케이션 → JavaScript 키
    GOOGLE_CLIENT:  '',   // console.cloud.google.com → API 및 서비스 → OAuth 클라이언트 ID
    NAVER_CLIENT:   '',   // developers.naver.com → 애플리케이션 → Client ID
  };
  var SITE_URL = 'https://visualmakerofficial-sejung.github.io/homme/';

  /* ---- 구글 GSI 콜백 (전역 등록) ---- */
  window.handleGoogleCredential = function (response) {
    try {
      var payload = JSON.parse(atob(response.credential.split('.')[1]));
      _finishSocialSignup('google', payload.name || payload.email, payload.picture || '', payload.email);
    } catch (e) { toast('구글 로그인 실패. 다시 시도해 주세요.'); }
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
  var LOCAL_USERS_KEY = 'modilLocalUsers_v1';
  function getLocalUsers() { try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]'); } catch(e) { return []; } }
  function saveLocalUsers(u) { try { localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(u)); } catch(e) {} }

  function renderSignup() {
    var hasKakao  = !!SOCIAL_CFG.KAKAO_JS_KEY;
    var hasGoogle = !!SOCIAL_CFG.GOOGLE_CLIENT;
    var hasNaver  = !!SOCIAL_CFG.NAVER_CLIENT;
    $('authBody').innerHTML = sheetXTop('mCloseAuth') +
      '<div class="auth-sosik"><img src="sosik.png" alt="소식이"></div>' +
      '<div class="auth-h"><div class="auth-t1">모딜 시작하기 🐴</div>' +
      '<div class="auth-t2">간편 로그인 또는 이메일로 시작하세요</div></div>' +
      (pendingPay ? '<div class="auth-note" style="color:var(--coral-dark);font-weight:700;margin:8px 0">🛒 공동구매 참여를 위해 가입이 필요해요</div>' : '') +
      '<div class="auth-btns">' +
        '<button class="auth-btn kakao" onclick="mSocialLogin(\'kakao\')">' +
          '<span class="ai">💬</span>카카오톡으로 시작하기' +
          (!hasKakao ? '<span class="auth-soon">키 미설정</span>' : '') + '</button>' +
        '<button class="auth-btn google" onclick="mSocialLogin(\'google\')">' +
          '<span class="ai" style="font-style:normal;font-weight:900;color:#4285F4">G</span>구글로 시작하기' +
          (!hasGoogle ? '<span class="auth-soon">키 미설정</span>' : '') + '</button>' +
        '<button class="auth-btn naver" onclick="mSocialLogin(\'naver\')">' +
          '<span class="ai">N</span>네이버로 시작하기' +
          (!hasNaver ? '<span class="auth-soon">키 미설정</span>' : '') + '</button>' +
      '</div>' +
      '<div class="auth-divider"><span>또는 이메일로 로그인</span></div>' +
      '<div id="authEmailForm">' +
        '<div class="auth-input-wrap">' +
          '<input id="authEmail" type="email" placeholder="이메일 주소" class="auth-input" oninput="authEmailInput()">' +
        '</div>' +
        '<div class="auth-input-wrap" style="position:relative">' +
          '<input id="authPw" type="password" placeholder="비밀번호" class="auth-input" onkeydown="if(event.key===\'Enter\')mEmailLogin()">' +
          '<button type="button" onclick="authTogglePw()" class="auth-pw-eye">👁</button>' +
        '</div>' +
        '<div id="authNickRow" style="display:none" class="auth-input-wrap">' +
          '<input id="authNick" type="text" placeholder="닉네임 (2~12자)" class="auth-input" maxlength="12">' +
        '</div>' +
        '<div id="authPhoneRow" style="display:none" class="auth-input-wrap">' +
          '<input id="authPhone" type="tel" placeholder="연락처 (선택)" class="auth-input" maxlength="13" oninput="fmtAuthPhone(this)">' +
        '</div>' +
        '<div id="authEmailErr" style="display:none;color:var(--coral);font-size:12px;margin:4px 0 8px;font-weight:700"></div>' +
        '<div style="display:flex;gap:8px;margin-top:4px">' +
          '<button class="auth-email-btn" id="authLoginBtn" onclick="mEmailLogin()">로그인</button>' +
          '<button class="auth-email-btn ghost" id="authSignupBtn" onclick="mEmailSignup()">회원가입</button>' +
        '</div>' +
        '<div style="text-align:center;margin-top:10px"><button style="background:none;border:none;color:var(--ink3);font-size:12px;cursor:pointer" onclick="mForgotPw()">비밀번호를 잊으셨나요?</button></div>' +
      '</div>' +
      '<div class="auth-note" style="margin-top:12px">가입 시 <a href="#">이용약관</a> · <a href="#">개인정보처리방침</a>에 동의합니다</div>';
  }

  window.authEmailInput = function() {
    var email = ($('authEmail')||{}).value||'';
    var existing = getLocalUsers().find(function(u){ return u.email===email; });
    var err = $('authEmailErr');
    if(err) err.style.display='none';
    if(existing) {
      if($('authNickRow')) $('authNickRow').style.display='none';
      if($('authPhoneRow')) $('authPhoneRow').style.display='none';
    }
  };
  window.authTogglePw = function() {
    var inp=$('authPw'); if(!inp)return;
    inp.type = inp.type==='password'?'text':'password';
  };
  window.fmtAuthPhone = function(el) {
    var v=el.value.replace(/\D/g,'').slice(0,11);
    if(v.length>7) v=v.slice(0,3)+'-'+v.slice(3,7)+'-'+v.slice(7);
    else if(v.length>3) v=v.slice(0,3)+'-'+v.slice(3);
    el.value=v;
  };
  function showAuthErr(msg) {
    var el=$('authEmailErr'); if(!el)return;
    el.textContent=msg; el.style.display='block';
  }
  window.mEmailLogin = function() {
    var email=(($('authEmail')||{}).value||'').trim().toLowerCase();
    var pw=(($('authPw')||{}).value||'');
    if(!email){ showAuthErr('이메일을 입력해 주세요'); return; }
    if(!pw){ showAuthErr('비밀번호를 입력해 주세요'); return; }
    var users=getLocalUsers();
    var found=users.find(function(u){ return u.email===email&&u.pw===pw; });
    if(!found){ showAuthErr('이메일 또는 비밀번호가 올바르지 않아요 ❌'); return; }
    _finishSocialSignup('email', found.nick, found.av||AVS[0], email);
  };
  window.mEmailSignup = function() {
    var nickRow=$('authNickRow'), phoneRow=$('authPhoneRow');
    if(nickRow && nickRow.style.display==='none') {
      nickRow.style.display='block'; if(phoneRow) phoneRow.style.display='block';
      $('authSignupBtn').textContent='가입 완료';
      $('authLoginBtn').textContent='취소';
      return;
    }
    if($('authLoginBtn').textContent==='취소') {
      $('authLoginBtn').textContent='로그인';
      $('authSignupBtn').textContent='회원가입';
      if(nickRow) nickRow.style.display='none';
      if(phoneRow) phoneRow.style.display='none';
      return;
    }
    var email=(($('authEmail')||{}).value||'').trim().toLowerCase();
    var pw=(($('authPw')||{}).value||'');
    var nick=(($('authNick')||{}).value||'').trim();
    var phone=(($('authPhone')||{}).value||'').trim();
    if(!email||email.indexOf('@')===-1){ showAuthErr('올바른 이메일을 입력해 주세요'); return; }
    if(pw.length<6){ showAuthErr('비밀번호는 6자 이상이어야 해요'); return; }
    if(nick.length<2){ showAuthErr('닉네임을 2자 이상 입력해 주세요'); return; }
    var users=getLocalUsers();
    if(users.find(function(u){ return u.email===email; })){ showAuthErr('이미 가입된 이메일이에요 👀'); return; }
    var av=AVS[Math.floor(Math.random()*AVS.length)];
    users.push({ email:email, pw:pw, nick:nick, phone:phone, av:av, joined:new Date().toISOString().slice(0,10) });
    saveLocalUsers(users);
    _finishSocialSignup('email', nick, av, email);
    toast('🎉 가입 완료! 환영해요 '+nick+'님!');
  };
  window.mForgotPw = function() {
    var email=(($('authEmail')||{}).value||'').trim().toLowerCase();
    if(!email){ showAuthErr('이메일을 먼저 입력해 주세요'); return; }
    var users=getLocalUsers();
    var found=users.find(function(u){ return u.email===email; });
    if(!found){ showAuthErr('가입된 이메일이 아니에요'); return; }
    showAuthErr('비밀번호: 관리자(hi@modil.kr)에게 문의해 주세요 📧');
  };
  function renderProfile(u) {
    var mm = DATA.members.find(function (m) { return m.name === u.name; });
    var myOrders = DATA.orders.filter(function (o) { return o.member === u.name; });
    var myPosts  = plaza.posts.filter(function (p) { return p.nick === u.name; });
    $('authBody').innerHTML = sheetXTop('mCloseAuth') +
      '<div class="prof-card"><div class="prof-av">' + u.av + '</div>' +
        '<div><div class="prof-nm">' + esc(u.name) + '</div><div class="prof-ch">' + (CH[u.channel] ? CH[u.channel].label : '직접') + ' 가입 · 모딜 회원</div></div></div>' +
      '<div class="prof-stats">' +
        '<div class="prof-stat clickable" onclick="mMyOrders()"><b>' + myOrders.length + '</b><span>구매 내역</span></div>' +
        '<div class="prof-stat clickable" onclick="mMyPosts()"><b>' + myPosts.length + '</b><span>내 게시물</span></div>' +
        '<div class="prof-stat"><b>' + plaza.lottery.myEntries + '</b><span>응모권</span></div>' +
      '</div>' +
      '<button class="prof-menu-btn" onclick="mMyOrders()">📦 내 구매 내역 · 배송 추적</button>' +
      '<button class="prof-menu-btn" onclick="mMyPosts()">✍️ 내가 올린 딜 보기</button>' +
      '<button class="prof-logout" onclick="mLogout()">로그아웃</button>';
  }

  window.mMyOrders = function () {
    var u = currentUser(); if (!u) { mOpenAuth(); return; }
    var orders = DATA.orders.filter(function (o) { return o.member === u.name; });
    var statusStep = { pending_transfer: 0, preparing: 1, pickup_ready: 2, shipped: 2, completed: 3, cancelled: -1 };
    var stepLabel = ['입금확인중', '상품준비중', orders.length && orders[0].pickup === '택배발송' ? '배송중' : '픽업대기', '완료'];
    function orderCard(o) {
      var step = statusStep[o.status] !== undefined ? statusStep[o.status] : 1;
      var cancelled = o.status === 'cancelled';
      var pickIcon = (o.pickup || '').includes('택배') ? '📦' : '📍';
      var vacc = o.vaccount ? o.vaccount : '';
      return '<div class="my-order-card">' +
        '<div class="moc-head">' +
          '<span class="moc-id">' + o.id + '</span>' +
          '<span class="moc-date">' + (o.date || '') + '</span>' +
        '</div>' +
        '<div class="moc-deal">' + esc(o.deal) + '</div>' +
        '<div class="moc-meta">' + pickIcon + ' ' + esc(o.pickup || '') + ' · ' + esc(o.method || '') + ' · <b>' + fmt(o.amount) + '원</b></div>' +
        (vacc && o.payStatus === '입금대기' ? '<div class="moc-vacc">🏦 입금계좌: <b>' + vacc + '</b> (예금주: 주식회사 모딜)</div>' : '') +
        (cancelled ? '<div class="moc-cancelled">❌ 주문 취소됨</div>' :
          '<div class="moc-track">' + (function () {
            var labels = ['입금확인', '준비중', (o.pickup || '').includes('택배') ? '배송중' : '픽업대기', '완료'];
            var html = '';
            for (var si = 0; si < labels.length; si++) {
              html += '<div class="moc-step' + (si < step ? ' done' : si === step ? ' cur' : '') + '">' +
                '<div class="moc-dot"></div><div class="moc-lbl">' + labels[si] + '</div></div>';
              if (si < labels.length - 1) html += '<div class="moc-line' + (si < step ? ' done' : '') + '"></div>';
            }
            return html;
          })() + '</div>') +
      '</div>';
    }
    $('authBody').innerHTML =
      '<div class="sheet-grab"></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">' +
        '<button onclick="renderProfile(currentUser())" style="background:none;border:none;font-size:20px;cursor:pointer;padding:0">←</button>' +
        '<div style="font-size:17px;font-weight:900">📦 내 구매 내역</div></div>' +
      (orders.length === 0
        ? '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:14px">아직 구매 내역이 없어요<br><span style="font-size:24px">🛒</span></div>'
        : orders.map(orderCard).join(''));
  };

  window.mMyPosts = function () {
    var u = currentUser(); if (!u) { mOpenAuth(); return; }
    var posts = plaza.posts.filter(function (p) { return p.nick === u.name; });
    $('authBody').innerHTML =
      '<div class="sheet-grab"></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">' +
        '<button onclick="renderProfile(currentUser())" style="background:none;border:none;font-size:20px;cursor:pointer;padding:0">←</button>' +
        '<div style="font-size:17px;font-weight:900">✍️ 내가 올린 딜</div></div>' +
      (posts.length === 0
        ? '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:14px">올린 글이 없어요<br><span style="font-size:24px">✍️</span></div>'
        : posts.map(function (p) {
            return '<div class="my-post-card">' +
              '<div class="mpc-cat">#' + esc(p.cat) + '</div>' +
              '<div class="mpc-title">' + p.title + '</div>' +
              '<div class="mpc-foot">' +
                '<span>👍 ' + num(p.likes) + '</span><span>😂 ' + num(p.lols) + '</span>' +
                '<button class="mpc-btn edit" onclick="mCloseAuth();mEditPost(\'' + p.id + '\')">✏️ 수정</button>' +
                '<button class="mpc-btn del" onclick="mDeleteFromMyPosts(\'' + p.id + '\')">🗑️ 삭제</button>' +
              '</div></div>';
          }).join(''));
  };
  window.mDeleteFromMyPosts = function (id) {
    plaza.posts = plaza.posts.filter(function (x) { return x.id !== id; });
    savePlaza(); mMyPosts();
    toast('게시물이 삭제됐어요 🗑️');
  };
  function _finishSocialSignup(channel, name, avatar, email) {
    var nick = name || (NICKS[Math.floor(Math.random() * NICKS.length)] + (Math.floor(Math.random() * 90) + 10));
    var exists = DATA.members.find(function (m) { return m.name === nick; });
    if (exists) { nick = nick + (Math.floor(Math.random() * 90) + 10); }
    var av = avatar || AVS[Math.floor(Math.random() * AVS.length)];
    var u = { name: nick, av: av, channel: channel, email: email || '' };
    DATA.members.unshift({ id: 'M-' + Date.now(), name: nick, phone: email || '소셜가입', joinDate: today(),
      status: 'active', deals: 0, channel: channel });
    DATA.stats.totalMembers += 1;
    saveData(DATA);
    setUser(u);
    var chLabel = (CH[channel] && CH[channel].label) ? CH[channel].label : channel;
    toast('🎉 ' + chLabel + '로 가입 완료! 환영해요 ' + nick + '님');
    confetti(40);
    if (pendingPay) {
      var pid = pendingPay; pendingPay = null;
      $('authSheet').classList.remove('show');
      var pd = DATA.activeDeals.find(function (x) { return x.id === pid; });
      if (pd) setTimeout(function () { openPay(pd); }, 350);
    } else {
      renderProfile(u);
    }
  }

  window.mSocialLogin = function (channel) {
    if (channel === 'google') {
      if (SOCIAL_CFG.GOOGLE_CLIENT) {
        google.accounts.id.initialize({ client_id: SOCIAL_CFG.GOOGLE_CLIENT, callback: window.handleGoogleCredential });
        google.accounts.id.prompt();
      } else {
        toast('🔵 구글 로그인 키 미설정 — 아래 닉네임으로 체험해 보세요');
      }
    } else if (channel === 'kakao') {
      if (SOCIAL_CFG.KAKAO_JS_KEY) {
        if (!Kakao.isInitialized()) Kakao.init(SOCIAL_CFG.KAKAO_JS_KEY);
        Kakao.Auth.login({
          success: function (auth) {
            Kakao.API.request({ url: '/v2/user/me',
              success: function (res) {
                var p = res.kakao_account && res.kakao_account.profile;
                var name = p ? p.nickname : '카카오유저';
                var img = p ? (p.profile_image_url || '') : '';
                _finishSocialSignup('kakao', name, img, (res.kakao_account && res.kakao_account.email) || '');
              },
              fail: function () { _finishSocialSignup('kakao', '카카오유저', '', ''); }
            });
          },
          fail: function () { toast('카카오 로그인 취소됨'); }
        });
      } else {
        toast('💬 카카오 앱 키 미설정 — 아래 닉네임으로 체험해 보세요');
      }
    } else if (channel === 'naver') {
      if (SOCIAL_CFG.NAVER_CLIENT) {
        var naverUrl = 'https://nid.naver.com/oauth2.0/authorize?response_type=token' +
          '&client_id=' + encodeURIComponent(SOCIAL_CFG.NAVER_CLIENT) +
          '&redirect_uri=' + encodeURIComponent(SITE_URL) +
          '&state=' + Math.random().toString(36).slice(2);
        var popup = window.open(naverUrl, 'naver_login', 'width=500,height=600');
        var timer = setInterval(function () {
          try {
            if (popup.closed) { clearInterval(timer); return; }
            var hash = popup.location.hash;
            if (hash && hash.indexOf('access_token') !== -1) {
              clearInterval(timer); popup.close();
              _finishSocialSignup('naver', '네이버유저', '', '');
            }
          } catch (e) {}
        }, 500);
      } else {
        toast('🟢 네이버 클라이언트 ID 미설정 — 아래 닉네임으로 체험해 보세요');
      }
    }
  };

  window.mDemoSignup = function () {
    var nickInput = document.getElementById('signupNick');
    var typed = nickInput ? nickInput.value.trim() : '';
    if (!typed) { toast('닉네임을 입력해 주세요 😊'); if (nickInput) nickInput.focus(); return; }
    _finishSocialSignup('demo', typed, AVS[Math.floor(Math.random() * AVS.length)], '');
  };
  window.mLogout = function () {
    try { localStorage.removeItem(USER_KEY); } catch (e) {}
    renderAcct(); window.mCloseAuth();
    toast('로그아웃 했어요. 또 만나요 🐴');
  };

  /* ----- 결제 ----- */
  var payState = null;
  function genVAccount() {
    var ts = String(Date.now()).slice(-9);
    return '신한 3333-' + ts.slice(0, 4) + '-' + ts.slice(4);
  }
  function openPay(d) {
    payState = { deal: d, qty: 1, method: 'vaccount', pickup: '거점' };
    renderPay(); $('paySheet').classList.add('show');
  }
  window.mClosePay = function () { $('paySheet').classList.remove('show'); };
  var PAYM = [
    { k: 'vaccount', i: '🏦', t: '계좌 입금',      on: true },
    { k: 'card',     i: '💳', t: '카드 결제',       on: true },
    { k: 'naverpay', i: 'N',  t: '네이버페이',      on: true },
    { k: 'kakaopay', i: '💬', t: '카카오페이',      on: false },
  ];
  function payMethodDetail() {
    var ps = payState;
    var grand = ps.deal.nowPrice * ps.qty + (ps.pickup === '택배' ? 3000 : 0);
    if (ps.method === 'vaccount') {
      if (!ps.vaccount) ps.vaccount = genVAccount();
      return '<div class="pay-block pay-transfer-info">' +
        '<div class="pay-block-t">🏦 입금 계좌 (이 주문 전용)</div>' +
        '<div class="transfer-acc"><span class="tacc-bank">신한</span><span class="tacc-num">' + ps.vaccount + '</span>' +
        '<button class="tacc-copy" onclick="mCopyAcct()">복사</button></div>' +
        '<div class="transfer-note">예금주: <b>주식회사 모딜</b> · 입금자명을 <b>닉네임</b>과 동일하게 입력해 주세요.<br>입금 확인 후 참여가 처리됩니다.</div>' +
        '</div>' +
        '<div class="pay-total"><span>총 입금금액</span><b>' + fmt(grand) + '원</b></div>' +
        '<button class="pay-go" onclick="mDoPay()">입금 신청하기 🏦</button>';
    }
    if (ps.method === 'card') {
      return '<div class="pay-block">' +
        '<div class="pay-block-t">💳 카드 정보 입력</div>' +
        '<div class="card-form">' +
          '<input class="card-input" id="cardNum" placeholder="카드 번호 (16자리)" maxlength="19" oninput="mFmtCard(this)" inputmode="numeric">' +
          '<div class="card-row">' +
            '<input class="card-input half" id="cardExp" placeholder="MM / YY" maxlength="7" oninput="mFmtExp(this)" inputmode="numeric">' +
            '<input class="card-input half" id="cardCvc" placeholder="CVC" maxlength="3" inputmode="numeric">' +
          '</div>' +
          '<input class="card-input" id="cardName" placeholder="카드 소유자 이름">' +
        '</div>' +
        '</div>' +
        '<div class="pay-total"><span>결제금액</span><b>' + fmt(grand) + '원</b></div>' +
        '<button class="pay-go card" onclick="mDoPay()">카드 결제하기 💳</button>';
    }
    if (ps.method === 'naverpay') {
      return '<div class="pay-block">' +
        '<div class="pay-block-t">N 네이버페이로 결제</div>' +
        '<div class="npay-info">네이버 포인트 적립 최대 5% · 구매 안전 보장</div>' +
        '</div>' +
        '<div class="pay-total"><span>결제금액</span><b>' + fmt(grand) + '원</b></div>' +
        '<button class="pay-go npay" onclick="mDoPay()"><span class="npay-n">N</span> 네이버페이로 결제하기</button>';
    }
    return '';
  }
  function renderPay() {
    var ps = payState, d = ps.deal;
    var disc = Math.round((1 - d.nowPrice / d.origPrice) * 100);
    $('payBody').innerHTML = sheetXTop('mClosePay') +
      '<div class="sheet-head" style="margin-bottom:4px"><div class="sheet-ic" style="background:var(--coral-bg)">💳</div>' +
        '<div><div class="sheet-t1">공동구매 참여 신청</div><div class="sheet-t2">결제 수단을 선택하고 참여를 확정하세요</div></div></div>' +
      '<div class="pay-deal"><div class="pay-thumb">' + (d.icon || '🛍️') + '</div>' +
        '<div><div class="pay-dname">' + esc(d.name) + '</div><div class="pay-dcat">' + esc(d.category) + ' · ' + disc + '% 할인 · ' + fmt(d.nowPrice) + '원</div></div></div>' +
      '<div class="pay-block"><div class="qty-row"><div class="pay-block-t" style="margin:0">수량</div>' +
        '<div class="qty-ctrl"><button class="qty-btn" onclick="mQty(-1)">−</button><span class="qty-n">' + ps.qty + '</span><button class="qty-btn" onclick="mQty(1)">+</button></div></div></div>' +
      '<div class="pay-block"><div class="pay-block-t">수령 방법</div><div class="pay-opts">' +
        pickOpt('거점', '📍', '거점 픽업 (무료)') + pickOpt('택배', '📦', '택배 발송 (+3,000원)') + '</div></div>' +
      '<div class="pay-block"><div class="pay-block-t">결제 수단</div><div class="pay-opts pay-methods">' +
        PAYM.map(function (m) {
          var sel = ps.method === m.k;
          var disabled = !m.on;
          return '<div class="pay-opt' + (sel ? ' on' : '') + (disabled ? ' soon' : '') + '" ' +
            (disabled ? '' : 'onclick="mPayMethod(\'' + m.k + '\')"') + '>' +
            '<span class="pi">' + m.i + '</span>' + m.t +
            (disabled ? '<span class="pay-soon-badge">준비중</span>' : '<span class="pr">' + (sel ? '✓' : '') + '</span>') +
            '</div>';
        }).join('') + '</div></div>' +
      payMethodDetail();
  }
  function pickOpt(key, ic, label) {
    return '<div class="pay-opt' + (payState.pickup === key ? ' on' : '') + '" onclick="mPayPickup(\'' + key + '\')"><span class="pi">' + ic + '</span>' + label + '<span class="pr"></span></div>';
  }
  window.mQty = function (d) { payState.qty = Math.max(1, Math.min(20, payState.qty + d)); renderPay(); };
  window.mPayMethod = function (k) { var m = PAYM.find(function(x){ return x.k === k; }); if (!m || !m.on) return; payState.method = k; renderPay(); };
  window.mPayPickup = function (k) { payState.pickup = k; renderPay(); };

  window.mCopyAcct = function () {
    var ps = payState;
    if (!ps || !ps.vaccount) return;
    try { navigator.clipboard.writeText(ps.vaccount); } catch (e) {}
    toast('계좌번호 복사됨 ✓');
  };
  window.mFmtCard = function (el) {
    var v = el.value.replace(/\D/g, '').slice(0, 16);
    el.value = v.match(/.{1,4}/g) ? v.match(/.{1,4}/g).join(' ') : v;
  };
  window.mFmtExp = function (el) {
    var v = el.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + ' / ' + v.slice(2);
    el.value = v;
  };
  window.mDoPay = function () {
    var ps = payState, d = ps.deal, u = currentUser();
    if (!u) { mClosePay(); mOpenAuth(); return; }
    var grand = d.nowPrice * ps.qty + (ps.pickup === '택배' ? 3000 : 0);
    var pickupLabel = ps.pickup === '택배' ? '택배발송' : '거점 픽업';
    var orderId = 'O-' + Date.now();
    var btn = $('payBody').querySelector('.pay-go');

    if (ps.method === 'card') {
      var num = $('cardNum') ? $('cardNum').value.replace(/\s/g, '') : '';
      var exp = $('cardExp') ? $('cardExp').value : '';
      var cvc = $('cardCvc') ? $('cardCvc').value : '';
      if (num.length < 16 || !exp || cvc.length < 3) {
        toast('카드 정보를 올바르게 입력해 주세요 ⚠️'); return;
      }
    }

    if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }
    var methodLabel = ps.method === 'card' ? '카드결제' : ps.method === 'naverpay' ? '네이버페이' : '계좌입금';
    var statusLabel = ps.method === 'vaccount' ? '입금대기' : '결제완료';
    var orderStatus = ps.method === 'vaccount' ? 'pending_transfer' : 'paid';

    setTimeout(function () {
      var order = { id: orderId, member: u.name, phone: u.email || '',
        deal: d.name + (ps.qty > 1 ? ' ×' + ps.qty : ''), amount: grand,
        status: orderStatus, payStatus: statusLabel,
        pickup: pickupLabel, date: today(), method: methodLabel,
        vaccount: ps.method === 'vaccount' ? ps.vaccount : null, smsStatus: '' };
      DATA.orders.unshift(order);
      d.participants += ps.qty;
      var mm = DATA.members.find(function (m) { return m.name === u.name; });
      if (mm) { mm.deals += 1; if (u.email) mm.phone = u.email; }
      saveData(DATA); renderDeals();
      $('paySheet').classList.remove('show');
      showReceipt(orderId, d, ps, grand);
      confetti(70);
    }, 1000);
  };

  function showReceipt(orderId, d, ps, grand) {
    var isCard = ps.method === 'card';
    var isNpay = ps.method === 'naverpay';
    var isBank = ps.method === 'vaccount';
    var icon = isCard ? '💳' : isNpay ? '🟢' : '🏦';
    var title = isCard ? '카드 결제 완료!' : isNpay ? '네이버페이 결제 완료!' : '입금 신청 완료!';
    var sub = isCard ? '카드 결제가 정상 처리됐어요 🎉' : isNpay ? '네이버페이 결제가 완료됐어요 🎉' : '아래 계좌로 입금하시면 참여가 확정돼요';
    var extra = isBank
      ? '<div style="background:#fffbe6;border:1.5px solid #ffe58f;border-radius:14px;padding:16px;margin-bottom:14px;font-size:13px">' +
          '<div style="font-weight:900;margin-bottom:8px;font-size:14px">🏦 입금 계좌 (이 주문 전용)</div>' +
          '<div style="font-size:18px;font-weight:900;letter-spacing:.5px;color:#1c4ea0">' + (ps.vaccount || '') + '</div>' +
          '<div style="color:#888;font-size:12px;margin-top:4px">예금주: 주식회사 모딜 · 입금자명: <b>' + esc(currentUser() ? currentUser().name : '') + '</b></div>' +
        '</div>'
      : isCard
      ? '<div style="background:#f0f7ff;border:1.5px solid #b3d4ff;border-radius:14px;padding:14px;margin-bottom:14px;font-size:13px;text-align:center;color:#1a4fa0;font-weight:700">카드 승인이 완료됐어요 ✓</div>'
      : '<div style="background:#e8f9ef;border:1.5px solid #82dba4;border-radius:14px;padding:14px;margin-bottom:14px;font-size:13px;text-align:center;color:#0a5c2b;font-weight:700">N 네이버페이 결제가 완료됐어요 ✓</div>';
    var amtLabel = isBank ? '입금금액' : '결제금액';
    var note = isBank
      ? '입금 확인 후 관리자가 안내 문자를 보내드려요.<br>내 계정 → 구매 내역에서 진행상황을 확인할 수 있어요.'
      : '결제가 완료됐어요! 내 계정 → 구매 내역에서 진행상황을 확인할 수 있어요.';
    var overlay = document.createElement('div');
    overlay.id = 'receiptOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:24px 24px 0 0;padding:28px 24px 48px;width:100%;max-width:480px;animation:fcardIn .35s ease;overflow-y:auto;max-height:90vh">' +
        '<div style="text-align:center;font-size:44px;margin-bottom:4px">' + icon + '</div>' +
        '<div style="text-align:center;font-size:19px;font-weight:900;margin-bottom:2px">' + title + '</div>' +
        '<div style="text-align:center;font-size:12px;color:#888;margin-bottom:20px">' + sub + '</div>' +
        extra +
        '<div style="background:#fafafa;border-radius:14px;padding:16px;font-size:13px;line-height:2">' +
          '<div style="display:flex;justify-content:space-between"><span style="color:#888">주문번호</span><b style="font-size:11px">' + orderId + '</b></div>' +
          '<div style="display:flex;justify-content:space-between"><span style="color:#888">상품</span><span>' + esc(d.name) + (ps.qty > 1 ? ' ×' + ps.qty : '') + '</span></div>' +
          '<div style="display:flex;justify-content:space-between"><span style="color:#888">결제수단</span><span>' + (isCard ? '💳 카드결제' : isNpay ? 'N 네이버페이' : '🏦 계좌입금') + '</span></div>' +
          '<div style="display:flex;justify-content:space-between"><span style="color:#888">수령방법</span><span>' + (ps.pickup === '택배' ? '📦 택배' : '📍 거점픽업') + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:10px;border-top:1px solid #eee"><span style="font-weight:800">' + amtLabel + '</span><b style="color:var(--coral-dark);font-size:16px">' + fmt(grand) + '원</b></div>' +
        '</div>' +
        '<div style="font-size:11.5px;color:#888;margin-top:12px;line-height:1.7;text-align:center">' + note + '</div>' +
        '<button onclick="document.getElementById(\'receiptOverlay\').remove()" ' +
          'style="margin-top:18px;width:100%;padding:16px;background:var(--coral);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer">확인</button>' +
      '</div>';
    document.body.appendChild(overlay);
  }

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
