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
 * 이미지 슬라이드쇼 재생 (오프닝·출석 스토리 공통)
 * @param {HTMLElement} parentContainer
 * @param {string[]} images
 * @param {{ onComplete?: Function, onClose?: Function, skipText?: string, hintText?: string }} options
 */
export function startImageSlideshow(parentContainer, images, options = {}) {
  if (!parentContainer || !images?.length) return;

  const {
    onComplete = null,
    onClose = null,
    skipText = 'Skip',
    hintText = '화면을 터치하면 다음으로 넘어갑니다',
  } = options;

  const existing = parentContainer.querySelector('.opening-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'opening-overlay';
  overlay.style.opacity = '1';

  const img1 = document.createElement('img');
  img1.className = 'opening-img active';
  const img2 = document.createElement('img');
  img2.className = 'opening-img';
  overlay.appendChild(img1);
  overlay.appendChild(img2);

  const skipBtn = document.createElement('button');
  skipBtn.className = 'opening-skip-btn';
  skipBtn.textContent = skipText;
  overlay.appendChild(skipBtn);

  const hint = document.createElement('div');
  hint.className = 'opening-hint';
  hint.textContent = hintText;
  overlay.appendChild(hint);

  parentContainer.appendChild(overlay);

  let currentIndex = 0;
  let activeImg = img1;
  let inactiveImg = img2;
  let transitioning = false;

  activeImg.src = images[0];
  preloadNext(0);

  function preloadNext(index) {
    if (index + 1 < images.length) {
      const img = new Image();
      img.src = images[index + 1];
    }
  }

  function closeSlideshow() {
    overlay.style.transition = 'opacity 0.6s ease';
    overlay.style.opacity = '0';
    if (onClose) onClose();
    setTimeout(() => {
      overlay.remove();
      if (onComplete) onComplete();
    }, 600);
  }

  function nextImage() {
    if (transitioning) return;
    currentIndex++;
    if (currentIndex >= images.length) {
      closeSlideshow();
      return;
    }
    transitioning = true;
    inactiveImg.src = images[currentIndex];
    inactiveImg.onload = () => {
      inactiveImg.classList.add('active');
      activeImg.classList.remove('active');
      preloadNext(currentIndex);
      const temp = activeImg;
      activeImg = inactiveImg;
      inactiveImg = temp;
      setTimeout(() => { transitioning = false; }, 800);
    };
    inactiveImg.onerror = () => {
      transitioning = false;
      nextImage();
    };
  }

  overlay.addEventListener('click', (e) => {
    if (e.target !== skipBtn) nextImage();
  });
  skipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSlideshow();
  });
}

/**
 * 오프닝 스토리 강제 재생 (다시보기 등)
 */
export function startOpening(parentContainer, isReplay = false, onComplete = null) {
  if (!parentContainer) return;
  startImageSlideshow(parentContainer, OPENING_IMAGES, {
    onComplete,
    onClose: () => {
      if (!isReplay) setItem(STORAGE_KEY_VIEWED, true);
    },
  });
}
