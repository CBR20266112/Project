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
  PRIVACY_CONSENT: 'ss_privacy_consent',  ONBOARDING_CONSENT: 'ss_onboarding_consent',});

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
  nameIsCustom: false,
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
  language:          'en', // 'ko' | 'en' | 'zh' | 'ja'
  sleepGoal:         480,  // 분 (8시간)
  wakeAlarm:         '07:00',
  bedAlarm:          '22:30',
  morningCallSimple: false, // true면 상호작용 없이 알람 끄기 버튼만
  morningCallPreset: 'dreamy', // dreamy | gentle | cozy
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
  { id: 'story_7',  days: 7,  titleKey: 'attendance.story_7.title',  title: '7th day, dream opens',      from: 1,  to: 5  },
  { id: 'story_14', days: 14, titleKey: 'attendance.story_14.title', title: '14th day, promise of stars', from: 6,  to: 10 },
  { id: 'story_21', days: 21, titleKey: 'attendance.story_21.title', title: '21st day, eternal night sky', from: 11, to: 14 },
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
  { id: 'ribbon_red',    nameKey: 'shop.item.ribbon_red', category: 'ribbon',    name: '빨간 리본',   price: 30,  icon: '🎀', slot: 'ribbon' },
  { id: 'ribbon_pink',   nameKey: 'shop.item.ribbon_pink', category: 'ribbon',    name: '핑크 리본',   price: 30,  icon: '🩷', slot: 'ribbon' },
  { id: 'ribbon_purple', nameKey: 'shop.item.ribbon_purple', category: 'ribbon',    name: '보라 리본',   price: 40,  icon: '💜', slot: 'ribbon' },
  { id: 'ribbon',        nameKey: 'shop.item.ribbon', category: 'ribbon',    name: '민트 리본',   price: 20,  icon: '🎀', slot: 'ribbon' },
  // 모자
  { id: 'hat_star',      nameKey: 'shop.item.hat_star', category: 'hat',       name: '별 모자',     price: 50,  icon: '⭐', slot: 'hat' },
  { id: 'hat_sleep',     nameKey: 'shop.item.hat_sleep', category: 'hat',       name: '수면 모자',   price: 60,  icon: '🌙', slot: 'hat' },
  { id: 'hat_flower',    nameKey: 'shop.item.hat_flower', category: 'hat',       name: '꽃 머리띠',   price: 45,  icon: '🌸', slot: 'hat' },
  { id: 'pajamaHat',     nameKey: 'shop.item.pajamaHat', category: 'hat',       name: '파자마 모자', price: 45,  icon: '🤠', slot: 'hat' },
  { id: 'headphones_lavender', nameKey: 'shop.item.headphones_lavender', category: 'hat',  name: '라벤더 헤드폰', price: 60, icon: '🎧', slot: 'hat' },
  // 안경
  { id: 'glasses_gold',        nameKey: 'shop.item.glasses_gold', category: 'glasses',  name: '금테 안경',     price: 50, icon: '👓', slot: 'glasses' },
  { id: 'glasses_round_brown', nameKey: 'shop.item.glasses_round_brown', category: 'glasses',  name: '둥근 갈색 안경', price: 40, icon: '👓', slot: 'glasses' },
  // 목도리
  { id: 'scarf_mint',    nameKey: 'shop.item.scarf_mint', category: 'scarf',     name: '민트 목도리', price: 40,  icon: '🟩', slot: 'scarf' },
  { id: 'scarf_red',     nameKey: 'shop.item.scarf_red', category: 'scarf',     name: '빨간 목도리', price: 40,  icon: '🟥', slot: 'scarf' },
  { id: 'scarf_red_knit',nameKey: 'shop.item.scarf_red_knit', category: 'scarf',     name: '빨간 니트 목도리', price: 45, icon: '🧣', slot: 'scarf' },
  // 방석
  { id: 'cushion_moon',  nameKey: 'shop.item.cushion_moon', category: 'cushion',   name: '달 방석',     price: 80,  icon: '🌙', slot: 'cushion' },
  { id: 'cushion_star',  nameKey: 'shop.item.cushion_star', category: 'cushion',   name: '별 방석',     price: 80,  icon: '⭐', slot: 'cushion' },
  { id: 'cushion_cloud', nameKey: 'shop.item.cushion_cloud', category: 'cushion',   name: '구름 방석',   price: 100, icon: '☁️', slot: 'cushion' },
  // 카페트
  { id: 'carpet_purple', nameKey: 'shop.item.carpet_purple', category: 'carpet',    name: '보라 카페트', price: 120, icon: '🟣', slot: 'carpet' },
  { id: 'carpet_pink',   nameKey: 'shop.item.carpet_pink', category: 'carpet',    name: '핑크 카페트', price: 120, icon: '🩷', slot: 'carpet' },
  // 조명
  { id: 'light_moon',    nameKey: 'shop.item.light_moon', category: 'light',     name: '달 조명',     price: 90,  icon: '🌕', slot: 'light' },
  { id: 'light_star',    nameKey: 'shop.item.light_star', category: 'light',     name: '별 조명',     price: 90,  icon: '💫', slot: 'light' },
  // 창문
  { id: 'window_night',  nameKey: 'shop.item.window_night', category: 'window',    name: '밤하늘 창문', price: 150, icon: '🌃', slot: 'window' },
  { id: 'window_moon',   nameKey: 'shop.item.window_moon', category: 'window',    name: '달빛 창문',   price: 160, icon: '🌙', slot: 'window' },
  // 벽지
  { id: 'wall_lavender', nameKey: 'shop.item.wall_lavender', category: 'wallpaper', name: '라벤더 벽지', price: 200, icon: '💜', slot: 'wallpaper' },
  { id: 'wall_star',     nameKey: 'shop.item.wall_star', category: 'wallpaper', name: '별빛 벽지',   price: 220, icon: '✨', slot: 'wallpaper' },
  // 가구
  { id: 'furn_bookshelf',nameKey: 'shop.item.furn_bookshelf', category: 'furniture', name: '책장',        price: 180, icon: '📚', slot: 'furniture' },
  { id: 'furn_plant',    nameKey: 'shop.item.furn_plant', category: 'furniture', name: '식물',        price: 100, icon: '🪴', slot: 'furniture' },
  { id: 'furn_mug',      nameKey: 'shop.item.furn_mug', category: 'furniture', name: '머그컵',      price: 60,  icon: '☕', slot: 'furniture' },
  { id: 'ballOfYarn',    nameKey: 'shop.item.ballOfYarn', category: 'furniture', name: '뜨개질 실타래', price: 30,  icon: '🧶', slot: 'furniture' },
  { id: 'star_yellow',   nameKey: 'shop.item.star_yellow', category: 'furniture', name: '노란 별 장식', price: 30,  icon: '⭐', slot: 'furniture' },
  // 배경
  { id: 'bg_night_default',  nameKey: 'shop.item.bg_night_default', category: 'background', name: '기본 밤하늘', price: 0,   icon: '🌌', slot: 'background' },
  { id: 'bg_purple_dream',   nameKey: 'shop.item.bg_purple_dream', category: 'background', name: '보라빛 꿈',   price: 250, icon: '🔮', slot: 'background' },
  { id: 'bg_cozy_room',      nameKey: 'shop.item.bg_cozy_room', category: 'background', name: '아늑한 방',   price: 300, icon: '🏡', slot: 'background' },
  // UUID 추가 아이템
  { id: '113c0738-c598-46e2-989c-04778c25b149', nameKey: 'shop.item.113c0738-c598-46e2-989c-04778c25b149', category: 'furniture', name: '밤하늘 오르골', price: 90,  icon: '🎵', slot: 'furniture' },
  { id: '45aabd94-d613-4313-994f-80891b8d68ce', nameKey: 'shop.item.45aabd94-d613-4313-994f-80891b8d68ce', category: 'hat',       name: '하트 귀마개',   price: 50,  icon: '🎧', slot: 'hat' },
  { id: '555c3576-6e51-4704-be93-c8bed2f49d8b', nameKey: 'shop.item.555c3576-6e51-4704-be93-c8bed2f49d8b', category: 'light',     name: '은하수 램프',   price: 110, icon: '💡', slot: 'light' },
  { id: '60bd81ff-64f7-4d76-be69-60e4903c0397', nameKey: 'shop.item.60bd81ff-64f7-4d76-be69-60e4903c0397', category: 'furniture', name: '드리미 화분',   price: 80,  icon: '🪴', slot: 'furniture' },
  { id: '75f23173-3ac7-4ee3-89d3-7af518dea47e', nameKey: 'shop.item.75f23173-3ac7-4ee3-89d3-7af518dea47e', category: 'furniture', name: '포근한 흔들의자', price: 170, icon: '🪑', slot: 'furniture' },
  { id: '9630dee1-be39-407a-a664-860ee31715d9', nameKey: 'shop.item.9630dee1-be39-407a-a664-860ee31715d9', category: 'window',    name: '하늘하늘 커튼', price: 140, icon: '🪟', slot: 'window' },
  { id: '9d77bdcc-4661-4686-9407-74ed3134156e', nameKey: 'shop.item.9d77bdcc-4661-4686-9407-74ed3134156e', category: 'carpet',    name: '구름 카펫',     price: 130, icon: '☁️', slot: 'carpet' },
  { id: '9eda2542-5e86-43c7-8355-4ac34a96bdc8', nameKey: 'shop.item.9eda2542-5e86-43c7-8355-4ac34a96bdc8', category: 'wallpaper', name: '새벽안개 벽지', price: 210, icon: '🌫️', slot: 'wallpaper' },
  { id: 'a1477997-f37a-4f62-99a4-107b65794907', nameKey: 'shop.item.a1477997-f37a-4f62-99a4-107b65794907', category: 'ribbon',    name: '리본 머리핀',   price: 35,  icon: '🎀', slot: 'ribbon' },
  { id: 'a599ed4c-f831-4c89-991e-949fe55ddb9e', nameKey: 'shop.item.a599ed4c-f831-4c89-991e-949fe55ddb9e', category: 'light',     name: '별빛 스탠드',   price: 95,  icon: '✨', slot: 'light' },
  { id: 'ab8259db-fc22-45a1-85f4-f73221b852ce', nameKey: 'shop.item.ab8259db-fc22-45a1-85f4-f73221b852ce', category: 'carpet',    name: '보랏빛 양탄자', price: 115, icon: '🟣', slot: 'carpet' },
  { id: 'bf9fd0a0-40d3-48c1-a5d2-b0414161d07a', nameKey: 'shop.item.bf9fd0a0-40d3-48c1-a5d2-b0414161d07a', category: 'furniture', name: '꿈의 방 테이블', price: 150, icon: '🧱', slot: 'furniture' },
  { id: 'd8cb290f-8f7d-41aa-8376-7c72d13bd58d', nameKey: 'shop.item.d8cb290f-8f7d-41aa-8376-7c72d13bd58d', category: 'furniture', name: '코지 침대',     price: 220, icon: '🛏️', slot: 'furniture' },
  { id: 'e1b62159-b949-4647-9107-fdf2659f6e2a', nameKey: 'shop.item.e1b62159-b949-4647-9107-fdf2659f6e2a', category: 'window',    name: '달빛 창가',     price: 145, icon: '🌕', slot: 'window' },
  { id: 'e2f378bc-a702-4e93-b2e3-8744e5054bea', nameKey: 'shop.item.e2f378bc-a702-4e93-b2e3-8744e5054bea', category: 'wallpaper', name: '구름 위 벽지',   price: 230, icon: '☁️', slot: 'wallpaper' },
  { id: 'e310d3fe-b7a7-4b0c-a596-dae928640212', nameKey: 'shop.item.e310d3fe-b7a7-4b0c-a596-dae928640212', category: 'background', name: '꿈의 성운 배경', price: 280, icon: '🌌', slot: 'background' },
  { id: 'eb76945e-c7b0-49f0-b9c5-40eee2b58fae', nameKey: 'shop.item.eb76945e-c7b0-49f0-b9c5-40eee2b58fae', category: 'furniture', name: '무지개 구름 모빌', price: 85,  icon: '🌈', slot: 'furniture' },
];

// ─── 카테고리 목록 ───
export const SHOP_CATEGORIES = [
  { id: 'all',        labelKey: 'shop.category.all', label: '전체',   icon: '✨' },
  { id: 'ribbon',     labelKey: 'shop.category.ribbon', label: '🐑 리본',   icon: '🎀' },
  { id: 'hat',        labelKey: 'shop.category.hat', label: '🐑 모자',   icon: '🎩' },
  { id: 'glasses',    labelKey: 'shop.category.glasses', label: '🐑 안경',   icon: '👓' },
  { id: 'scarf',      labelKey: 'shop.category.scarf', label: '🐑 목도리', icon: '🧣' },
  { id: 'cushion',    labelKey: 'shop.category.cushion', label: '🏡 방석',   icon: '🛋️' },
  { id: 'carpet',     labelKey: 'shop.category.carpet', label: '🏡 카펫',   icon: '🟪' },
  { id: 'light',      labelKey: 'shop.category.light', label: '🏡 조명',   icon: '💡' },
  { id: 'window',     labelKey: 'shop.category.window', label: '🏡 창문',   icon: '🪟' },
  { id: 'wallpaper',  labelKey: 'shop.category.wallpaper', label: '🏡 벽지',   icon: '🖼️' },
  { id: 'furniture',  labelKey: 'shop.category.furniture', label: '🏡 가구',   icon: '🪑' },
  { id: 'background', labelKey: 'shop.category.background', label: '🏡 배경',   icon: '🌌' },
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

const DAILY_QUOTES_EN = [
  'Did you come to rest deeply today?',
  'It’s okay to take a short break.',
  'I’m cheering for your day again.',
  'Meee~ Was today a good day?',
  'Dreamy is always here.',
  'A little rest and you’ll feel better.',
  'How many hours can you sleep today?',
  'It’s okay to take it slow.',
  'Don’t push yourself too hard.',
  'Breathe deeply, slowly.',
  'Sleep is the best medicine.',
  'You worked hard today.',
  'Resting well is also a skill.',
  'Want to play with Dreamy for a bit?',
  'Your wool is growing little by little!',
  'Dreamy is wagging its tail.',
  'Meee! Nice to see you!',
  'What kind of dream will you have today?',
  'Sleep is tomorrow’s experience points.',
  'If you rest enough, your wool will grow too!',
  'Growing a little at a time is enough.',
  'Let’s collect sleep experience!',
  'Dreamy has been waiting for you.',
  'Hope your night is cozy tonight.',
  'I’ll add a star just for you!',
  'Your wool is getting fluffier.',
  'Dreamy looks sleepy too...',
  'When your eyes close, it’s time for sleep.',
  'A quiet night has arrived.',
  'Before you sleep, let go of your worries.',
  'Tomorrow will be a little better than today.',
  'Meee~ let’s be together again today.',
  'When your wool’s full, it’s time for a trim!',
  'Dreamy says it’s ticklish.',
  'It’s becoming a fluffy day.',
  'Rest time is precious time too.',
  'You can go at your own pace.',
  'I hope you have peaceful dreams tonight.',
  'Dreamy is always on your side.',
  'Sleep well and wake up refreshed.',
  'You’re doing a great job just being you.',
  'A gentle night is waiting for you.',
  'Every calm breath helps you relax.',
  'Dreamy loves spending this quiet time with you.',
];

const DAILY_QUOTES_ZH = [
  '今天也来好好休息了吗?',
  '稍作休息也没关系。',
  '我会为你今天的日子加油。',
  '咩~ 今天是愉快的一天吗？',
  'Dreamy一直在这里。',
  '稍微休息一下就会有精神。',
  '今天你能睡几个小时呢？',
  '慢慢来也没关系。',
  '不要太勉强自己。',
  '深呼吸，慢慢来。',
  '睡眠是最好的恢复药。',
  '今天也辛苦了。',
  '好好休息也是一种能力。',
  '要不要和Dreamy玩一会儿？',
  '羊毛正在一点点长大！',
  'Dreamy在摇尾巴。',
  '咩！好高兴见到你！',
  '今天会做什么梦呢？',
  '睡眠是明天的经验值。',
  '休息够了，羊毛也会长得更好！',
  '慢慢成长就好了。',
  '来收集睡眠经验值吧！',
  'Dreamy一直在等你。',
  '希望今晚是个温暖的夜晚。',
  '我为你加一颗星星！',
  '羊毛变得越来越蓬松了。',
  'Dreamy看起来也有点困...',
  '闭上眼睛就是睡觉的时间。',
  '安静的夜晚来了。',
  '睡前先把烦恼放下吧。',
  '明天会比今天好一点。',
  '咩~ 今天也一起吧。',
  '羊毛长满了就要剪了！',
  'Dreamy觉得痒痒。',
  '变成了一个蓬松的一天。',
  '休息的时间也是珍贵的时间。',
  '你可以按自己的节奏走。',
  '希望你今晚梦得安稳。',
  'Dreamy永远在你这边。',
  '好好睡觉，醒来会更舒服。',
  '你只是做你自己就很棒了。',
  '温柔的夜晚在等着你。',
  '每一次平静的呼吸都在帮助你放松。',
  'Dreamy喜欢和你一起静静地待着。',
];

const DAILY_QUOTES_JA = [
  '今日もゆっくり休みに来た？',
  'ちょっと休憩しても大丈夫だよ。',
  '今日もあなたの一日を応援してるよ。',
  'メェ〜今日もいい日だった？',
  'ドリーミーはいつでもここにいるよ。',
  '少し休めばまた元気になるよ。',
  '今日は何時間眠れるかな？',
  'ゆっくりでいいんだよ。',
  '無理しすぎないでね。',
  '深く息を吸って、ゆっくり。',
  '眠りは最高の回復薬だよ。',
  '今日もよくがんばったね。',
  'よく休むことも能力のひとつだよ。',
  'ドリーミーと少し遊ぶ？',
  'ふわふわの毛が少しずつ伸びてるよ！',
  'ドリーミーがしっぽを振ってるよ。',
  'メェ！会えてうれしいよ！',
  '今日はどんな夢を見るかな？',
  '眠りは明日の経験値だよ。',
  '十分休めば毛も育つよ！',
  '少しずつ成長すればいいんだよ。',
  '睡眠経験値を集めよう！',
  'ドリーミーはずっと待ってたよ。',
  '今夜もあたたかい夜になりますように。',
  'あなたのために星をひとつ追加するよ！',
  '毛がふわふわになってきたよ。',
  'ドリーミーも眠そうだね…',
  '目を閉じたら眠る時間だよ。',
  '静かな夜がやってきたよ。',
  '寝る前に心配ごとを少し置いていこう。',
  '明日は今日より少し良くなるよ。',
  'メェ〜今日もいっしょにいようね。',
  '毛が全部伸びたらカットしてね！',
  'ドリーミーがくすぐったいって。',
  'ふわふわな一日になってるよ。',
  '休む時間も大切な時間だよ。',
  'あなたのペースでいいんだよ。',
  '今夜はやさしい夢を見られますように。',
  'ドリーミーはいつでもあなたの味方だよ。',
  'よく眠って、すっきり起きてね。',
  'そのままのあなたで十分すごいよ。',
  'やさしい夜が待ってるよ。',
  '静かな呼吸がゆっくりを助けるよ。',
  'ドリーミーはこの静かな時間が大好きだよ。',
];

const DAILY_QUOTES_BY_LANG = Object.freeze({
  ko: DAILY_QUOTES,
  en: DAILY_QUOTES_EN,
  zh: DAILY_QUOTES_ZH,
  ja: DAILY_QUOTES_JA,
});

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

const RARE_QUOTES_EN = [
  'Meee... I’m actually sleepy too.',
  'My wool has grown so much I can’t see ahead!',
  'Is today a petting bonus day?',
  'Please be gentle with the clippers...',
  'Wool grows back, but sleep debt doesn’t...',
  'Dreamy secretly picked up a star.',
  'Today’s goal: yawn ten times.',
  'Taking care of your wool is important, but so is your rest.',
  'Meee! I’m feeling amazing today!',
  'Sleep can’t be saved and resumed later.',
];

const RARE_QUOTES_ZH = [
  '咩...其实我也有点困。',
  '绒毛长得太多，前面都看不见了！',
  '今天是摸摸奖励日吗？',
  '剃毛的时候...请轻轻来...',
  '绒毛会再长，但睡眠不足不会...',
  'Dreamy悄悄捡到了一颗星。',
  '今天的目标：打哈欠10次。',
  '绒毛护理也重要，你也得休息。',
  '咩！今天心情超好！',
  '睡眠不能存档也不能继续。',
];

const RARE_QUOTES_JA = [
  'メェ…実は私も眠いんだ。',
  '毛が伸びすぎて前が見えないよ！',
  '今日はなでなでボーナスデー？',
  'バリカンだけは…やさしくしてね…',
  '毛はまた伸びるけど、睡眠不足は伸びないよ…',
  'ドリーミーがこっそり星をひとつ拾ったよ。',
  '今日の目標：あくびを10回すること。',
  '毛のお手入れも大事だけど、あなたも休んでね。',
  'メェ！今日は気分最高！',
  '睡眠は保存も続きもできないからね。',
];

const RARE_QUOTES_BY_LANG = Object.freeze({
  ko: RARE_QUOTES,
  en: RARE_QUOTES_EN,
  zh: RARE_QUOTES_ZH,
  ja: RARE_QUOTES_JA,
});

// ─── 이름 짓기 대화 스크립트 ───
export const NAME_DIALOG_SCRIPT = [
  { text: '저기... 혹시 내 이름, 지어줄래?',          type: 'next'   },
  { text: '지금 내 이름은 아주 어린 양들에게\n지어지는 이름이야.', type: 'next'   },
  { text: '괜찮다면.. 부탁할게.',                     type: 'choice' },
];

export function getNameDialogScript(lang = 'en') {
  return NAME_DIALOG_SCRIPT;
}

// ─── 랜덤 멘트 반환 함수 ───
/**
 * 일반 멘트(98~99%)와 희귀 멘트(1~2%) 중 하나를 랜덤 반환
 * @returns {string}
 */
export function getRandomQuote(lang = 'en') {
  const roll = Math.random();
  const dailyQuotes = DAILY_QUOTES_BY_LANG[lang] || DAILY_QUOTES_BY_LANG.en;
  const rareQuotes = RARE_QUOTES_BY_LANG[lang] || RARE_QUOTES_BY_LANG.en;
  if (roll < 0.015) {
    return rareQuotes[Math.floor(Math.random() * rareQuotes.length)];
  }
  return dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)];
}

export function getLocalizedDailyQuote(lang = 'en') {
  const day = new Date().getDate();
  const dailyQuotes = DAILY_QUOTES_BY_LANG[lang] || DAILY_QUOTES_BY_LANG.en;
  return dailyQuotes[day % dailyQuotes.length];
}