/**
 * opening.js — 오프닝 스토리 관리 (처음 시작 시 노출, 스킵 기능, 설정에서 다시보기)
 */

import { getItem, setItem } from './storage.js';

// 파일 경로 접두사 자동 설정 (서브페이지 대응)
const isSubPage = window.location.href.toLowerCase().includes('/pages/') || window.location.href.toLowerCase().includes('\\pages\\');
const pathPrefix = isSubPage ? '../' : '';

const OPENING_IMAGES = Array.from({ length: 14 }, (_, i) => `${pathPrefix}assets/sheep/Opening/opening_${i + 1}.png`);
const STORAGE_KEY_VIEWED = 'ss_opening_viewed';

/**
 * 첫 실행인지 감지하고 오프닝 스토리를 재생
 * @param {HTMLElement} parentContainer 오버레이를 삽입할 부모 엘리먼트
 * @param {Function} onComplete 오프닝이 끝났거나 스킵된 후 실행할 콜백
 */
export function checkAndShowOpening(parentContainer, onComplete = null) {
  const viewed = getItem(STORAGE_KEY_VIEWED);
  if (!viewed) {
    startOpening(parentContainer, false, onComplete);
  } else {
    if (onComplete) onComplete();
  }
}

/**
 * 오프닝 스토리 강제 재생 (다시보기 등)
 * @param {HTMLElement} parentContainer 오버레이를 삽입할 부모 엘리먼트
 * @param {boolean} isReplay 다시보기 모드 여부 (스토리지 저장 여부 결정)
 * @param {Function} onComplete 콜백 함수
 */
export function startOpening(parentContainer, isReplay = false, onComplete = null) {
  if (!parentContainer) return;

  // 기존 오버레이가 있다면 제거
  const existing = parentContainer.querySelector('.opening-overlay');
  if (existing) existing.remove();

  // 오버레이 엘리먼트 생성
  const overlay = document.createElement('div');
  overlay.className = 'opening-overlay';
  overlay.style.opacity = '1';

  // 이미지 1, 2 생성 (크로스페이드용)
  const img1 = document.createElement('img');
  img1.className = 'opening-img active';
  img1.alt = 'Opening Story 1';
  
  const img2 = document.createElement('img');
  img2.className = 'opening-img';
  img2.alt = 'Opening Story 2';

  overlay.appendChild(img1);
  overlay.appendChild(img2);

  // 건너뛰기 버튼 생성
  const skipBtn = document.createElement('button');
  skipBtn.className = 'opening-skip-btn';
  skipBtn.textContent = 'Skip';
  overlay.appendChild(skipBtn);

  // 안내 힌트 문구 생성
  const hint = document.createElement('div');
  hint.className = 'opening-hint';
  hint.textContent = '화면을 터치하면 다음으로 넘어갑니다';
  overlay.appendChild(hint);

  parentContainer.appendChild(overlay);

  let currentIndex = 0;
  let activeImg = img1;
  let inactiveImg = img2;
  let transitioning = false;

  // 첫 이미지 로드
  activeImg.src = OPENING_IMAGES[0];
  preloadNext(0);

  // 다음 이미지 프리로드
  function preloadNext(index) {
    if (index + 1 < OPENING_IMAGES.length) {
      const img = new Image();
      img.src = OPENING_IMAGES[index + 1];
    }
  }

  // 다음 이미지로 진행
  function nextImage() {
    if (transitioning) return;
    
    currentIndex++;
    if (currentIndex >= OPENING_IMAGES.length) {
      closeOpening();
      return;
    }

    transitioning = true;
    
    // 비활성 이미지의 src 교체 및 로드 대기
    inactiveImg.src = OPENING_IMAGES[currentIndex];
    
    inactiveImg.onload = () => {
      // 크로스페이드 트랜지션 작동
      inactiveImg.classList.add('active');
      activeImg.classList.remove('active');
      
      // 다음 이미지 백그라운드 프리로드
      preloadNext(currentIndex);

      // 레퍼런스 스왑
      const temp = activeImg;
      activeImg = inactiveImg;
      inactiveImg = temp;
      
      setTimeout(() => {
        transitioning = false;
      }, 800); // CSS 트랜지션 시간(800ms)과 동일하게 동기화
    };

    inactiveImg.onerror = () => {
      // 이미지 로드 실패 시 강제 인덱스 진행
      transitioning = false;
      nextImage();
    };
  }

  // 닫기 및 초기화 처리
  function closeOpening() {
    overlay.style.transition = 'opacity 0.6s ease';
    overlay.style.opacity = '0';
    
    if (!isReplay) {
      setItem(STORAGE_KEY_VIEWED, true);
    }
    
    setTimeout(() => {
      overlay.remove();
      if (onComplete) onComplete();
    }, 600);
  }

  // 이벤트 바인딩
  overlay.addEventListener('click', (e) => {
    // skip 버튼을 누르지 않은 경우에만 다음 이미지로
    if (e.target !== skipBtn) {
      nextImage();
    }
  });

  skipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeOpening();
  });
}
