/**
 * room.js — 방 꾸미기 렌더링 모듈
 * 장착된 가구, 조명, 카펫, 배경 등을 컨테이너에 동적으로 렌더링한다.
 */

import { getItems, getSheep } from './storage.js';
import { SHOP_CATALOG } from './constants.js';
import { getSheepSVG } from './sheep-renderer.js';

/**
 * 방 꾸미기 프리뷰를 특정 컨테이너에 렌더링
 * @param {HTMLElement} container 방을 그릴 부모 요소
 * @param {object} equipped 장착 아이템 Map (기본값은 내 아이템)
 * @param {number} step 양의 성장 단계
 * @param {string} pose 양의 포즈 (기본 idle)
 */
export function renderRoom(container, equipped = null, step = 1, pose = 'idle') {
  if (!container) return;

  if (!equipped) {
    const items = getItems();
    equipped = items.equipped;
  }

  // 양 정보 가져오기
  const sheep = getSheep();
  const currentStep = step ?? sheep.step;

  // 가구/데코 목록
  const activeItems = Object.entries(equipped)
    .filter(([slot, id]) => id !== null)
    .map(([slot, id]) => SHOP_CATALOG.find(i => i.id === id))
    .filter(Boolean);

  // 배경 결정
  const bgItem = activeItems.find(i => i.category === 'background') || { id: 'bg_night_default' };
  let bgGradient = 'linear-gradient(180deg, #1a1040 0%, #0F0C29 100%)';
  if (bgItem.id === 'bg_purple_dream') {
    bgGradient = 'linear-gradient(180deg, #2D1B6E 0%, #1e0b36 100%)';
  } else if (bgItem.id === 'bg_cozy_room') {
    bgGradient = 'linear-gradient(180deg, #32251a 0%, #1b130e 100%)';
  }

  // 벽지 테마에 맞는 보정
  const wpItem = activeItems.find(i => i.category === 'wallpaper');
  let wallpaperStyle = '';
  if (wpItem) {
    if (wpItem.id === 'wall_lavender') {
      wallpaperStyle = 'background: rgba(167, 139, 250, 0.08);';
    } else if (wpItem.id === 'wall_star') {
      wallpaperStyle = 'background: radial-gradient(circle, rgba(253, 230, 138, 0.1) 10%, transparent 60%);';
    }
  }

  // 요소별 아이템 파싱
  const carpet = activeItems.find(i => i.category === 'carpet');
  const cushion = activeItems.find(i => i.category === 'cushion');
  const light = activeItems.find(i => i.category === 'light');
  const window = activeItems.find(i => i.category === 'window');
  const furniture = activeItems.find(i => i.category === 'furniture');

  // 양 장식 아이템
  const ribbon = activeItems.find(i => i.category === 'ribbon');
  const hat = activeItems.find(i => i.category === 'hat');
  const scarf = activeItems.find(i => i.category === 'scarf');

  // HTML 구성
  container.innerHTML = `
<div class="room-viewport" style="width:100%; aspect-ratio:1.2; position:relative; overflow:hidden; border-radius:var(--radius-lg); background:${bgGradient}; box-shadow:var(--shadow-lg);">
  
  <!-- 벽지 효과 -->
  <div style="position:absolute; inset:0; ${wallpaperStyle} pointer-events:none;"></div>

  <!-- 창문 (좌측 상단) -->
  ${window ? `
    <div style="position:absolute; top:20px; left:24px; font-size:3.5rem; filter:drop-shadow(0 2px 8px rgba(255,255,255,0.15)); z-index:1;">
      ${window.icon}
    </div>
  ` : ''}

  <!-- 조명 (우측 상단) -->
  ${light ? `
    <div style="position:absolute; top:12px; right:28px; font-size:2.8rem; filter:drop-shadow(0 0 16px rgba(253, 230, 138, 0.6)); z-index:1; animation: twinkleSlow 3s ease infinite;">
      ${light.icon}
    </div>
  ` : ''}

  <!-- 가구 (우측 중단) -->
  ${furniture ? `
    <div style="position:absolute; bottom:28px; right:20px; font-size:3rem; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3)); z-index:2;">
      ${furniture.icon}
    </div>
  ` : ''}

  <!-- 카페트 (중앙 하단) -->
  ${carpet ? `
    <div style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); font-size:4.5rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15)); z-index:1;">
      ${carpet.icon}
    </div>
  ` : ''}

  <!-- 방석 (중앙 하단 카페트 위) -->
  ${cushion ? `
    <div style="position:absolute; bottom:18px; left:50%; transform:translateX(-50%); font-size:3.2rem; filter:drop-shadow(0 3px 6px rgba(0,0,0,0.2)); z-index:2; animation: sheepFloat 4s ease-in-out infinite;">
      ${cushion.icon}
    </div>
  ` : ''}

  <!-- 양 캐릭터 (중앙) -->
  <div class="room-sheep-wrapper" style="position:absolute; bottom:26px; left:50%; transform:translateX(-50%); width:120px; height:120px; z-index:3; display:flex; justify-content:center; align-items:center;">
    ${getSheepSVG(currentStep, pose)}
    
    <!-- 양 장착 악세사리 오버레이 (간단 뱃지/이모지 형태로 양 주위에 띄움) -->
    ${ribbon ? `<div style="position:absolute; top:22px; left:-8px; font-size:1.5rem; z-index:4; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));">${ribbon.icon}</div>` : ''}
    ${hat ? `<div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); font-size:1.6rem; z-index:4; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25)); animation: sheepFloat 3s ease infinite;">${hat.icon}</div>` : ''}
    ${scarf ? `<div style="position:absolute; bottom:26px; right:-6px; font-size:1.4rem; z-index:4; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));">${scarf.icon}</div>` : ''}
  </div>

</div>`;
}
