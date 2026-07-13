/**
 * constants.js — Sleepy Sheep 전역 상수
 * 모든 모듈이 이 파일에서 상수를 import한다.
 */

/** 앱 버전 (설정 화면·배포 기준) */
export const APP_VERSION = '1.96.1';

// ─── localStorage 키 ───
export const STORAGE_KEYS = Object.freeze({
  SHEEP:    'ss_sheep',
  SLEEP:    'ss_sleep',
  SNORE:    'ss_snore',
  ITEMS:    'ss_items',
  FRIENDS:  'ss_friends',
  SETTINGS: 'ss_settings',
  ROOM:     'ss_room',
  WORRIES:  'ss_worries',
  PRIVACY_CONSENT: 'ss_privacy_consent',
});

// ─── 성장 단계 테이블 ───
export const GROWTH_TABLE = Object.freeze([
  null, // index 0 미사용
  { step: 1,  name: '새끼양',   xpRequired: 0,    woolScale: 0.20, woolBubbles: 5  },
  { step: 2,  name: '솜털양',   xpRequired: 100,  woolScale: 0.35, woolBubbles: 7  },
  { step: 3,  name: '통통양',   xpRequired: 250,  woolScale: 0.48, woolBubbles: 9  },
  { step: 4,  name: '포실양',   xpRequired: 450,  woolScale: 0.60, woolBubbles: 11 },
  { step: 5,  name: '뭉실양',   xpRequired: 700,  woolScale: 0.70, woolBubbles: 13 },
  { step: 6,  name: '구름양',   xpRequired: 1000, woolScale: 0.80, woolBubbles: 15 },
  { step: 7,  name: '복슬양',   xpRequired: 1350, woolScale: 0.88, woolBubbles: 17 },
  { step: 8,  name: '솜구름',   xpRequired: 1750, woolScale: 0.93, woolBubbles: 19 },
  { step: 9,  name: '털뭉치',   xpRequired: 2200, woolScale: 0.97, woolBubbles: 21 },
  { step: 10, name: '성체양',   xpRequired: 2700, woolScale: 1.00, woolBubbles: 24 },
]);

// ─── 양 포즈 및 감정 종류 ───
export const SHEEP_POSE = Object.freeze({
  IDLE:        'idle',
  HAPPY:       'happy',
  SLEEP:       'sleep',
  PET:         'pet',
  EAT:         'eat',
  SAD:         'sad',
  SHEAR:       'shear',
  SHEAR_AFTER: 'shear_after',
  
  // 추가된 10가지 감정 표정
  ANGRY:       'angry',
  EXCITED:     'excited',
  SHY:         'shy',
  SLEEPY:      'sleepy',
  SMUG:        'smug',
  SURPRISED:   'surprised',
  WINK:        'wink',
  WORRIED:     'worried',
});

// ─── 미니게임 보상 공식 ───
export const SHEAR_REWARD = Object.freeze({
  FAIL:    { min: 0,   max: 94,  coeff: 3  },
  BASIC:   { min: 95,  max: 97,  coeff: 8  },
  BONUS:   { min: 98,  max: 99,  coeff: 10 },
  PERFECT: { min: 100, max: 100, coeff: 12 },
});

/**
 * 제거율과 성장단계로 보상 양털량 계산
 * @param {number} percent 0~100
 * @param {number} step 1~10
 * @returns {number} 획득 양털
 */
export function calcShearReward(percent, step) {
  const rounded = Math.round(percent);
  let coeff = SHEAR_REWARD.FAIL.coeff;
  if (rounded >= 100)      coeff = SHEAR_REWARD.PERFECT.coeff;
  else if (rounded >= 98)  coeff = SHEAR_REWARD.BONUS.coeff;
  else if (rounded >= 95)  coeff = SHEAR_REWARD.BASIC.coeff;
  return Math.floor(step * coeff);
}

// ─── 경험치 ───
/** 상호작용 보상 (소량) */
export const INTERACTION_XP = Object.freeze({
  PET:  1,
  FEED: 1,
});

// ─── 수면 시간 → XP 환산 ───
/**
 * 기록된 수면 시간(분)에 비례해 XP 지급
 * @param {number} minutes 수면 시간(분)
 * @param {number} goalMinutes 목표 수면(분, 기본 480=8h)
 * @returns {{ xp: number }}
 */
export function calcSleepReward(minutes, goalMinutes = 480) {
  if (!minutes || minutes <= 0) return { xp: 0 };
  const capped = Math.min(minutes, Math.floor(goalMinutes * 1.2));
  const xp = Math.max(1, Math.round((capped / goalMinutes) * 60));
  return { xp };
}

// ─── 양 상태 초기값 ───
export const DEFAULT_SHEEP = Object.freeze({
  name:         '드리미',
  level:        1,
  xp:           0,
  xpToNext:     100,
  step:         1,
  wool:         0,
  woolGrowth:   0,    // 0~3: 행복·포만 MAX 시 한 칸씩, 3이면 양털깎기
  atStatMax:    false,
  lastRegularityBonus: null,
  happiness:    80,
  hunger:       80,   // 포만감 (높을수록 배부름)
  lastPetAt:    null,
  lastFedAt:    null,
  shearedAt:    null,
  canShear:     false,
  totalSleepDays: 0,
  streak:       0,
});

// ─── 앱 설정 초기값 ───
export const DEFAULT_SETTINGS = Object.freeze({
  darkMode:          true,
  notification:      true,
  bgMusic:           false,
  vibration:         true,
  language:          'ko', // 'ko' | 'en' | 'zh' | 'ja'
  sleepGoal:         480,  // 분 (8시간)
  wakeAlarm:         '07:00',
  bedAlarm:          '22:30',
  morningCallSimple: false, // true면 상호작용 없이 알람 끄기 버튼만
  iconMode:          'time', // 'time' | 'daily' — 앱 아이콘 변경 방식
  geminiApiKey:      '',
});

// ─── 출석 보상 ───
/** 7일 주기: 1·2·4·5·6일차 소량 양털, 3일차 단일 일러스트, 7일차 4컷 */
export const ATTENDANCE_CYCLE = Object.freeze({
  WOOL_DAYS: [1, 2, 4, 5, 6],
  /** 미니게임 기본 보상(~30) 대비 출석 소량 양털 */
  WOOL_SMALL: 10,
  SINGLE_DAY: 3,
  STRIP_DAY: 7,
});

/** 이름 짓기 거절 시 행복도 감소 */
export const NAME_REJECT_HAPPINESS_DELTA = 8;

export const ATTENDANCE_SINGLE_COUNT = 45;
export const ATTENDANCE_STRIP_COUNT = 30;

/** @deprecated 주기 소량 양털로 대체 — 호환용 */
export const DAILY_ATTENDANCE_WOOL = ATTENDANCE_CYCLE.WOOL_SMALL;

/** 연속 출석 스토리 해금 (7 / 14 / 21일) — 오프닝 슬라이드 */
export const ATTENDANCE_STORIES = Object.freeze([
  { id: 'story_7',  days: 7,  title: '7일째, 꿈이 열리다',     from: 1,  to: 5  },
  { id: 'story_14', days: 14, title: '14일째, 별의 약속',      from: 6,  to: 10 },
  { id: 'story_21', days: 21, title: '21일째, 영원한 밤하늘',  from: 11, to: 14 },
]);

// ─── 아이템 초기값 ───
export const DEFAULT_ITEMS = Object.freeze({
  owned:    [],
  equipped: {
    ribbon:     null,
    hat:        null,
    glasses:    null,
    scarf:      null,
    cushion:    null,
    carpet:     null,
    light:      null,
    window:     null,
    wallpaper:  null,
    furniture:  null,
    background: 'bg_night_default',
  },
});

// ─── 상점 아이템 카탈로그 ───
export const SHOP_CATALOG = [
  // 리본
  { id: 'ribbon_red',    category: 'ribbon',    name: '빨간 리본',   price: 30,  icon: '🎀', slot: 'ribbon' },
  { id: 'ribbon_pink',   category: 'ribbon',    name: '핑크 리본',   price: 30,  icon: '🩷', slot: 'ribbon' },
  { id: 'ribbon_purple', category: 'ribbon',    name: '보라 리본',   price: 40,  icon: '💜', slot: 'ribbon' },
  { id: 'ribbon',        category: 'ribbon',    name: '민트 리본',   price: 20,  icon: '🎀', slot: 'ribbon' },
  // 모자
  { id: 'hat_star',      category: 'hat',       name: '별 모자',     price: 50,  icon: '⭐', slot: 'hat' },
  { id: 'hat_sleep',     category: 'hat',       name: '수면 모자',   price: 60,  icon: '🌙', slot: 'hat' },
  { id: 'hat_flower',    category: 'hat',       name: '꽃 머리띠',   price: 45,  icon: '🌸', slot: 'hat' },
  { id: 'pajamaHat',     category: 'hat',       name: '파자마 모자', price: 45,  icon: '🤠', slot: 'hat' },
  { id: 'headphones_lavender', category: 'hat',  name: '라벤더 헤드폰', price: 60, icon: '🎧', slot: 'hat' },
  // 안경
  { id: 'glasses_gold',        category: 'glasses',  name: '금테 안경',     price: 50, icon: '👓', slot: 'glasses' },
  { id: 'glasses_round_brown', category: 'glasses',  name: '둥근 갈색 안경', price: 40, icon: '👓', slot: 'glasses' },
  // 목도리
  { id: 'scarf_mint',    category: 'scarf',     name: '민트 목도리', price: 40,  icon: '🟩', slot: 'scarf' },
  { id: 'scarf_red',     category: 'scarf',     name: '빨간 목도리', price: 40,  icon: '🟥', slot: 'scarf' },
  { id: 'scarf_red_knit',category: 'scarf',     name: '빨간 니트 목도리', price: 45, icon: '🧣', slot: 'scarf' },
  // 방석
  { id: 'cushion_moon',  category: 'cushion',   name: '달 방석',     price: 80,  icon: '🌙', slot: 'cushion' },
  { id: 'cushion_star',  category: 'cushion',   name: '별 방석',     price: 80,  icon: '⭐', slot: 'cushion' },
  { id: 'cushion_cloud', category: 'cushion',   name: '구름 방석',   price: 100, icon: '☁️', slot: 'cushion' },
  // 카페트
  { id: 'carpet_purple', category: 'carpet',    name: '보라 카페트', price: 120, icon: '🟣', slot: 'carpet' },
  { id: 'carpet_pink',   category: 'carpet',    name: '핑크 카페트', price: 120, icon: '🩷', slot: 'carpet' },
  // 조명
  { id: 'light_moon',    category: 'light',     name: '달 조명',     price: 90,  icon: '🌕', slot: 'light' },
  { id: 'light_star',    category: 'light',     name: '별 조명',     price: 90,  icon: '💫', slot: 'light' },
  // 창문
  { id: 'window_night',  category: 'window',    name: '밤하늘 창문', price: 150, icon: '🌃', slot: 'window' },
  { id: 'window_moon',   category: 'window',    name: '달빛 창문',   price: 160, icon: '🌙', slot: 'window' },
  // 벽지
  { id: 'wall_lavender', category: 'wallpaper', name: '라벤더 벽지', price: 200, icon: '💜', slot: 'wallpaper' },
  { id: 'wall_star',     category: 'wallpaper', name: '별빛 벽지',   price: 220, icon: '✨', slot: 'wallpaper' },
  // 가구
  { id: 'furn_bookshelf',category: 'furniture', name: '책장',        price: 180, icon: '📚', slot: 'furniture' },
  { id: 'furn_plant',    category: 'furniture', name: '식물',        price: 100, icon: '🪴', slot: 'furniture' },
  { id: 'furn_mug',      category: 'furniture', name: '머그컵',      price: 60,  icon: '☕', slot: 'furniture' },
  { id: 'ballOfYarn',    category: 'furniture', name: '뜨개질 실타래', price: 30,  icon: '🧶', slot: 'furniture' },
  { id: 'star_yellow',   category: 'furniture', name: '노란 별 장식', price: 30,  icon: '⭐', slot: 'furniture' },
  // 배경
  { id: 'bg_night_default',  category: 'background', name: '기본 밤하늘', price: 0,   icon: '🌌', slot: 'background' },
  { id: 'bg_purple_dream',   category: 'background', name: '보라빛 꿈',   price: 250, icon: '🔮', slot: 'background' },
  { id: 'bg_cozy_room',      category: 'background', name: '아늑한 방',   price: 300, icon: '🏡', slot: 'background' },
  // UUID 추가 아이템
  { id: '113c0738-c598-46e2-989c-04778c25b149', category: 'furniture', name: '밤하늘 오르골', price: 90,  icon: '🎵', slot: 'furniture' },
  { id: '45aabd94-d613-4313-994f-80891b8d68ce', category: 'hat',       name: '하트 귀마개',   price: 50,  icon: '🎧', slot: 'hat' },
  { id: '555c3576-6e51-4704-be93-c8bed2f49d8b', category: 'light',     name: '은하수 램프',   price: 110, icon: '💡', slot: 'light' },
  { id: '60bd81ff-64f7-4d76-be69-60e4903c0397', category: 'furniture', name: '드리미 화분',   price: 80,  icon: '🪴', slot: 'furniture' },
  { id: '75f23173-3ac7-4ee3-89d3-7af518dea47e', category: 'furniture', name: '포근한 흔들의자', price: 170, icon: '🪑', slot: 'furniture' },
  { id: '9630dee1-be39-407a-a664-860ee31715d9', category: 'window',    name: '하늘하늘 커튼', price: 140, icon: '🪟', slot: 'window' },
  { id: '9d77bdcc-4661-4686-9407-74ed3134156e', category: 'carpet',    name: '구름 카펫',     price: 130, icon: '☁️', slot: 'carpet' },
  { id: '9eda2542-5e86-43c7-8355-4ac34a96bdc8', category: 'wallpaper', name: '새벽안개 벽지', price: 210, icon: '🌫️', slot: 'wallpaper' },
  { id: 'a1477997-f37a-4f62-99a4-107b65794907', category: 'ribbon',    name: '리본 머리핀',   price: 35,  icon: '🎀', slot: 'ribbon' },
  { id: 'a599ed4c-f831-4c89-991e-949fe55ddb9e', category: 'light',     name: '별빛 스탠드',   price: 95,  icon: '✨', slot: 'light' },
  { id: 'ab8259db-fc22-45a1-85f4-f73221b852ce', category: 'carpet',    name: '보랏빛 양탄자', price: 115, icon: '🟣', slot: 'carpet' },
  { id: 'bf9fd0a0-40d3-48c1-a5d2-b0414161d07a', category: 'furniture', name: '꿈의 방 테이블', price: 150, icon: '🧱', slot: 'furniture' },
  { id: 'd8cb290f-8f7d-41aa-8376-7c72d13bd58d', category: 'furniture', name: '코지 침대',     price: 220, icon: '🛏️', slot: 'furniture' },
  { id: 'e1b62159-b949-4647-9107-fdf2659f6e2a', category: 'window',    name: '달빛 창가',     price: 145, icon: '🌕', slot: 'window' },
  { id: 'e2f378bc-a702-4e93-b2e3-8744e5054bea', category: 'wallpaper', name: '구름 위 벽지',   price: 230, icon: '☁️', slot: 'wallpaper' },
  { id: 'e310d3fe-b7a7-4b0c-a596-dae928640212', category: 'background', name: '꿈의 성운 배경', price: 280, icon: '🌌', slot: 'background' },
  { id: 'eb76945e-c7b0-49f0-b9c5-40eee2b58fae', category: 'furniture', name: '무지개 구름 모빌', price: 85,  icon: '🌈', slot: 'furniture' },
];

// ─── 카테고리 목록 ───
export const SHOP_CATEGORIES = [
  { id: 'all',        label: '전체',   icon: '✨' },
  { id: 'ribbon',     label: '🐑 리본',   icon: '🎀' },
  { id: 'hat',        label: '🐑 모자',   icon: '🎩' },
  { id: 'glasses',    label: '🐑 안경',   icon: '👓' },
  { id: 'scarf',      label: '🐑 목도리', icon: '🧣' },
  { id: 'cushion',    label: '🏡 방석',   icon: '🛋️' },
  { id: 'carpet',     label: '🏡 카펫',   icon: '🟪' },
  { id: 'light',      label: '🏡 조명',   icon: '💡' },
  { id: 'window',     label: '🏡 창문',   icon: '🪟' },
  { id: 'wallpaper',  label: '🏡 벽지',   icon: '🖼️' },
  { id: 'furniture',  label: '🏡 가구',   icon: '🪑' },
  { id: 'background', label: '🏡 배경',   icon: '🌌' },
];

export const FRIEND_DIARIES = {
  friend_ridajol: {
    title: '리다졸 님의\n다이어리',
    imageSrc: '../assets/friends/ridajol_room.jpg',
    popupImageSrc: '../assets/friends/ridazol_diary.png',
    body: '',
    memoRight: '',
    memoLeft: '',
  },
  friend_001: {
    title: '하주니',
    imageSrc: '../assets/friends/68436e83-723e-4caf-81b2-6b04d499f88c.png',
    popupImageSrc: '../assets/friends/68436e83-723e-4caf-81b2-6b04d499f88c.png',
    private: true,
    privateMessage: '이 친구는 일기장을 공개하지 않았어요.',
  },
  friend_002: {
    title: '꿈나래 님의\n다이어리',
    imageSrc: '../assets/friends/3a278dbe-16e9-41fe-96a3-5dd9e58bf8ec.png',
    popupImageSrc: '../assets/friends/ggoomnarae_diary.png',
    body: '',
    memoRight: '',
    memoLeft: '',
  },
  friend_003: {
    title: '수면왕 님의\n다이어리',
    imageSrc: '../assets/friends/49f560ba-45d0-44f5-87d7-11db7eea4b23.png',
    popupImageSrc: '../assets/friends/sumyeonwang_diary.png',
    body: '',
    memoRight: '',
    memoLeft: '',
  },
};

export const DUMMY_FRIENDS = [
  {
    id: 'friend_ridajol',
    name: '리다졸',
    level: 8,
    step: 6,
    isSleeping: true,
    streak: 15,
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    room: {
      background: 'bg_night_default',
      carpet: null,
      ribbon: null,
      light: null,
      cushion: null,
    },
  },
  {
    id: 'friend_001',
    name: '하주니',
    level: 7,
    step: 5,
    isSleeping: true,
    streak: 12,
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    room: {
      background: 'bg_purple_dream',
      carpet: 'carpet_purple',
      ribbon: 'ribbon_purple',
      light: 'light_moon',
      cushion: 'cushion_moon',
    },
  },
  {
    id: 'friend_002',
    name: '꿈나래',
    level: 3,
    step: 2,
    isSleeping: false,
    streak: 4,
    lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    room: {
      background: 'bg_night_default',
      carpet: 'carpet_pink',
      ribbon: 'ribbon_pink',
      light: 'light_star',
      cushion: 'cushion_star',
    },
  },
  {
    id: 'friend_003',
    name: '수면왕',
    level: 10,
    step: 9,
    isSleeping: true,
    streak: 30,
    lastSeen: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    room: {
      background: 'bg_cozy_room',
      carpet: 'carpet_purple',
      ribbon: 'ribbon_red',
      light: 'light_moon',
      cushion: 'cushion_cloud',
    },
  },
];

export const DAILY_QUOTES = [
  '오늘도 푹 쉬러 왔어?',
  '잠깐 쉬어가는 것도 괜찮아.',
  '오늘도 네 하루를 응원할게.',
  '메에~ 좋은 하루였어?',
  '드리미는 항상 여기 있어.',
  '조금만 쉬면 다시 힘이 날 거야.',
  '오늘은 몇 시간 잘 수 있을까?',
  '천천히 해도 괜찮아.',
  '너무 무리하지 마.',
  '깊게 숨 쉬고, 천천히.',
  '잠이 최고의 회복약이래.',
  '오늘도 고생 많았어.',
  '잘 쉬는 것도 능력이야.',
  '드리미랑 잠깐 놀다 갈래?',
  '양털이 조금씩 자라고 있어!',
  '드리미가 꼬리를 흔들고 있어.',
  '메에! 반가워!',
  '오늘은 어떤 꿈을 꾸게 될까?',
  '잠은 내일의 경험치야.',
  '충분히 쉬면 양털도 자라!',
  '조금씩 성장하면 되는 거야.',
  '오늘도 한 걸음 성장했네.',
  '수면 경험치를 모아 보자!',
  '드리미가 널 기다리고 있었어.',
  '오늘도 포근한 밤이 되길.',
  '너를 위한 별 하나 추가!',
  '양털이 복슬복슬해지고 있어.',
  '드리미도 졸려 보여...',
  '눈이 감기면 잠의 시간이야.',
  '조용한 밤이 찾아왔어.',
  '잠들기 전엔 걱정을 잠깐 내려놓자.',
  '내일은 오늘보다 조금 더 괜찮을 거야.',
  '메에~ 오늘도 함께하자.',
  '양털이 다 자라면 깎아줘!',
  '드리미가 간질간질하대.',
  '복슬복슬한 하루가 되고 있어.',
  '쉬는 시간도 소중한 시간이야.',
  '너의 속도대로 가면 돼.',
  '오늘도 편안한 꿈 꾸길 바라.',
  '드리미는 언제나 네 편이야.',
];

// ─── 희귀 멘트 (약 1~2% 확률) ───
export const RARE_QUOTES = [
  '메에... 사실 나도 졸려.',
  '양털 너무 자라서 앞이 안 보여!',
  '오늘은 쓰다듬기 보너스 데이?',
  '바리깡만은... 살살 부탁해...',
  '양털은 다시 자라지만 수면 부족은 안 자라...',
  '드리미가 몰래 별을 하나 주웠어.',
  '오늘의 목표: 하품 10번 하기.',
  '양털 관리도 중요하지만 너도 쉬어야 해.',
  '메에! 오늘은 기분이 최고야!',
  '잠은 저장하고 이어하기가 안 되니까.',
];

// ─── 이름 짓기 대화 스크립트 ───
export const NAME_DIALOG_SCRIPT = [
  { text: '저기... 혹시 내 이름, 지어줄래?',          type: 'next'   },
  { text: '지금 내 이름은 아주 어린 양들에게\n지어지는 이름이야.', type: 'next'   },
  { text: '괜찮다면.. 부탁할게.',                     type: 'choice' },
];

// ─── 랜덤 멘트 반환 함수 ───
/**
 * 일반 멘트(98~99%)와 희귀 멘트(1~2%) 중 하나를 랜덤 반환
 * @returns {string}
 */
export function getRandomQuote() {
  const roll = Math.random();
  if (roll < 0.015) {
    return RARE_QUOTES[Math.floor(Math.random() * RARE_QUOTES.length)];
  }
  return DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
}
