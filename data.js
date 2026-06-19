const DEFAULT_DATA = {
  site: {
    brand: '모딜',
    brandEn: 'MODIL',
    slogan: '모이면 딜이 된다',
    tagline: '소식이와 함께하는 우리 동네 딜 친구',
    mascot: '소식이',
    region: '안산',
    contactEmail: 'hi@modil.kr',
    contactAddress: '안산시 단원구 중앙대로',
    contactHours: '평일 09:00 – 18:00',
  },

  stats: {
    successDeals: 38,
    totalMembers: 1240,
    satisfaction: 94,
    activeNego: 7,
  },

  ticker: [
    { icon: '🐴', text: '<strong>소식이가 알려요!</strong> 갤럭시 S25 공구 요청 142명 달성' },
    { icon: '✅', text: '<strong>CGV 안산점</strong> 영화권 협상 성공 → 7,900원 (43%↓)' },
    { icon: '⏳', text: '<strong>키즈카페 체험권</strong> 마감 임박 · 잔여 8자리' },
    { icon: '📬', text: '<strong>스타벅스 안산중앙점</strong> 딜 요청 증가 중' },
  ],

  negoDeals: [
    {
      id: 'nego-001',
      category: '📱 휴대폰',
      name: '삼성 갤럭시 S25\n안산 실매장 공동구매',
      status: 'live', statusText: '소식이가 협상중',
      currentCount: 142, targetCount: 150, reservable: true,
    },
    {
      id: 'nego-002',
      category: '🎬 엔터테인먼트',
      name: 'CGV 안산점\n주말 영화 할인권',
      status: 'live', statusText: '소식이가 협상중',
      currentCount: 89, targetCount: 100, reservable: true,
    },
    {
      id: 'nego-003',
      category: '👶 키즈/육아',
      name: '안산 트램폴린파크\n체험권 한정 딜',
      status: 'opening', statusText: '오픈 임박 · 잔여 8석',
      currentCount: 100, targetCount: 100, reservable: true,
    },
    {
      id: 'nego-004',
      category: '💆 뷰티/운동',
      name: '안산 필라테스\n체험권 네고중',
      status: 'live', statusText: '소식이가 협상중',
      currentCount: 61, targetCount: 80, reservable: false,
    },
  ],

  activeDeals: [
    {
      id: 'deal-001',
      category: '삼성 · 실매장 수령',
      name: '갤럭시 S24 FE 공동구매',
      icon: '📱',
      origPrice: 899000, nowPrice: 599000,
      participants: 82,
      badges: ['타임세일', '베스트'],
    },
    {
      id: 'deal-002',
      category: '애플 · 상담 후 조건공개',
      name: '아이폰 16 128GB 공구',
      icon: '🍎',
      origPrice: 1250000, nowPrice: 1050000,
      participants: 68,
      badges: ['인기'],
    },
    {
      id: 'deal-003',
      category: '생활가전 · 봄 시즌',
      name: 'LG 공기청정기 공동구매',
      icon: '🏠',
      origPrice: 489000, nowPrice: 329000,
      participants: 91,
      badges: ['베스트'],
    },
    {
      id: 'deal-004',
      category: '카페 · 안산 지역 한정',
      name: '스타벅스 음료 쿠폰팩',
      icon: '☕',
      origPrice: 60000, nowPrice: 39000,
      participants: 74,
      badges: ['타임세일'],
    },
  ],

  requests: [
    { id: 'req-001', icon: '🎬', name: 'CGV 안산점 · 주말 영화 할인권', meta: '엔터테인먼트 · 단원구', count: 89, status: 'live' },
    { id: 'req-002', icon: '☕', name: '스타벅스 안산중앙점 · 쿠폰팩', meta: '카페 · 상록구', count: 74, status: 'live' },
    { id: 'req-003', icon: '💆', name: '안산 필라테스 · 10회 체험권', meta: '뷰티/운동 · 고잔동', count: 61, status: 'check' },
    { id: 'req-004', icon: '🍕', name: '안산 맛집 생일 쿠폰팩', meta: '음식 · 중앙동', count: 48, status: 'check' },
    { id: 'req-005', icon: '🧖', name: '안산 피부관리샵 · 첫방문 딜', meta: '뷰티 · 와동', count: 31, status: 'check' },
    { id: 'req-006', icon: '🏊', name: '안산 스포츠센터 · 월회원권', meta: '운동 · 선부동', count: 19, status: 'check' },
  ],

  successDeals: [
    {
      id: 'succ-001',
      tag: '엔터테인먼트',
      name: 'CGV 안산점 영화 할인권',
      desc: '요청 300명 달성 → 협상 성공. 1차 200장 전량 소진.',
      origPrice: 14000, nowPrice: 7900,
      footer: '300명 참여 · 전량 소진',
    },
    {
      id: 'succ-002',
      tag: '키즈/육아',
      name: '안산 키즈카페 체험권',
      desc: '3곳 동시 협상 성공. 주말 입장료 52% 절감. 150팀 매진.',
      origPrice: 25000, nowPrice: 12000,
      footer: '150팀 · 매진',
    },
    {
      id: 'succ-003',
      tag: '뷰티',
      name: '안산 뷰티샵 첫방문 체험권',
      desc: '요청 90명 → 협상 성공. 80명 참여 후 정원 마감.',
      origPrice: 50000, nowPrice: 23000,
      footer: '80명 · 정원마감',
    },
  ],

  pickupSpots: [
    { id: 'spot-01', name: '모딜 본점', district: '단원구', dong: '중앙동', address: '단원구 중앙대로 123', hours: '평일 09–20', phone: '031-000-0001', x: 42, y: 47 },
    { id: 'spot-02', name: '단원구청 거점', district: '단원구', dong: '고잔동', address: '단원구 화랑로 87', hours: '평일 10–19', phone: '031-000-0002', x: 31, y: 41 },
    { id: 'spot-03', name: '고잔동 거점', district: '단원구', dong: '고잔동', address: '고잔동 메인플라자 2F', hours: '매일 10–21', phone: '031-000-0003', x: 36, y: 53 },
    { id: 'spot-04', name: '원곡동 거점', district: '단원구', dong: '원곡동', address: '원곡동 다문화광장 1F', hours: '평일 10–19', phone: '031-000-0004', x: 24, y: 35 },
    { id: 'spot-05', name: '와동 거점', district: '단원구', dong: '와동', address: '와동 시민회관 옆', hours: '평일 10–20', phone: '031-000-0005', x: 33, y: 27 },
    { id: 'spot-06', name: '상록구청 거점', district: '상록구', dong: '성포동', address: '상록구 광덕로 19', hours: '평일 10–19', phone: '031-000-0006', x: 61, y: 44 },
    { id: 'spot-07', name: '본오동 거점', district: '상록구', dong: '본오동', address: '본오동 중앙플라자', hours: '평일 09–20', phone: '031-000-0007', x: 72, y: 60 },
    { id: 'spot-08', name: '사동 거점', district: '상록구', dong: '사동', address: '사동 한양대 인근', hours: '매일 11–22', phone: '031-000-0008', x: 79, y: 54 },
    { id: 'spot-09', name: '안산대 거점', district: '상록구', dong: '사동', address: '사1동 안산대 정문', hours: '평일 09–18', phone: '031-000-0009', x: 82, y: 47 },
    { id: 'spot-10', name: '월피동 거점', district: '상록구', dong: '월피동', address: '월피동 행정복지센터 옆', hours: '평일 09–18', phone: '031-000-0010', x: 57, y: 31 },
    { id: 'spot-11', name: '부곡동 거점', district: '상록구', dong: '부곡동', address: '부곡동 메디컬타워 1F', hours: '평일 10–19', phone: '031-000-0011', x: 68, y: 29 },
    { id: 'spot-12', name: '중앙동 거점', district: '단원구', dong: '중앙동', address: '중앙동 안산역 부근', hours: '매일 09–22', phone: '031-000-0012', x: 40, y: 56 },
    { id: 'spot-13', name: '초지동 거점', district: '단원구', dong: '초지동', address: '초지동 메가플라자', hours: '평일 10–20', phone: '031-000-0013', x: 46, y: 71 },
    { id: 'spot-14', name: '선부동 거점', district: '단원구', dong: '선부동', address: '선부동 종합복지관', hours: '평일 10–19', phone: '031-000-0014', x: 27, y: 21 },
    { id: 'spot-15', name: '대부동 거점', district: '단원구', dong: '대부동', address: '대부동 어촌센터', hours: '평일 09–18', phone: '031-000-0015', x: 13, y: 84 },
    { id: 'spot-16', name: '수암동 거점', district: '상록구', dong: '수암동', address: '수암동 행정복지센터', hours: '평일 10–19', phone: '031-000-0016', x: 70, y: 19 },
    { id: 'spot-17', name: '청년허브 거점', district: '단원구', dong: '중앙동', address: '단원구 청년광장 B1', hours: '매일 10–22', phone: '031-000-0017', x: 45, y: 41 },
  ],

  partners: [
    { id: 'P-001', store: 'CGV 안산점', owner: '김영화', category: '🎬 엔터테인먼트', dong: '고잔동', offer: '주말 영화 2매 묶음 7,900원 (정가 14,000원)', phone: '010-1111-2222', kakao: '@cgv_ansan', status: 'review', date: '2025-06-02' },
    { id: 'P-002', store: '소소베이커리', owner: '박소소', category: '🍩 베이커리', dong: '본오동', offer: '슈크림 붕어빵 200개 단체주문시 30% 할인', phone: '010-3333-4444', kakao: '@soso_bakery', status: 'live', date: '2025-06-01' },
    { id: 'P-003', store: '안산필라테스', owner: '이건강', category: '💆 운동', dong: '고잔동', offer: '10회 체험권 첫방문 50% 딜', phone: '010-5555-6666', kakao: '@ansan_pilates', status: 'review', date: '2025-05-30' },
  ],

  members: [
    { id: 'M-1001', name: '김안산', phone: '010-1234-5678', joinDate: '2025-01-15', deals: 5, status: 'active', kakao: 'connected' },
    { id: 'M-1002', name: '이상록', phone: '010-2345-6789', joinDate: '2025-01-22', deals: 3, status: 'active', kakao: 'connected' },
    { id: 'M-1003', name: '박단원', phone: '010-3456-7890', joinDate: '2025-02-03', deals: 8, status: 'vip', kakao: 'connected' },
    { id: 'M-1004', name: '최고잔', phone: '010-4567-8901', joinDate: '2025-02-11', deals: 2, status: 'active', kakao: 'pending' },
    { id: 'M-1005', name: '정원곡', phone: '010-5678-9012', joinDate: '2025-02-18', deals: 1, status: 'active', kakao: 'disconnected' },
  ],

  orders: [
    { id: 'O-2025-001', member: '김안산', deal: '갤럭시 S24 FE 공구', amount: 599000, status: 'preparing', pickup: '모딜 본점', date: '2025-06-01' },
    { id: 'O-2025-002', member: '이상록', deal: 'LG 공기청정기 공구', amount: 329000, status: 'shipped', pickup: '택배발송', date: '2025-05-30' },
    { id: 'O-2025-003', member: '박단원', deal: '스타벅스 쿠폰팩', amount: 39000, status: 'completed', pickup: '카톡 즉시발송', date: '2025-05-29' },
    { id: 'O-2025-004', member: '최고잔', deal: 'CGV 영화 할인권', amount: 7900, status: 'pickup_ready', pickup: '고잔동 거점', date: '2025-05-28' },
    { id: 'O-2025-005', member: '정원곡', deal: '키즈카페 체험권', amount: 12000, status: 'completed', pickup: '카톡 발송완료', date: '2025-05-27' },
  ],

  coupons: [
    { id: 'C-001', name: 'CGV 영화 할인권', sent: 198, used: 142, remaining: 56, expiry: '2025-12-31' },
    { id: 'C-002', name: '스타벅스 쿠폰팩', sent: 74, used: 52, remaining: 22, expiry: '2025-09-30' },
    { id: 'C-003', name: '키즈카페 체험권', sent: 150, used: 138, remaining: 12, expiry: '2025-08-31' },
    { id: 'C-004', name: '뷰티샵 첫방문 체험권', sent: 80, used: 73, remaining: 7, expiry: '2025-07-31' },
  ],
};

function loadData() {
  try {
    const saved = localStorage.getItem('modilData_v2');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}
function saveData(data) {
  try { localStorage.setItem('modilData_v2', JSON.stringify(data)); }
  catch(e) { console.error('Save failed:', e); }
}
function resetData() {
  localStorage.removeItem('modilData_v2');
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}
function fmt(n) { return Number(n).toLocaleString('ko-KR'); }
