/**
 * opening.js - opening story and gallery slideshow helpers
 */

import { getItem, setItem, getSheep, saveSheep } from './storage.js';
import { t } from './i18n.js';

const currentHref = typeof window !== 'undefined' ? window.location.href.toLowerCase() : '';
const isSubPage = currentHref.includes('/pages/') || currentHref.includes('\\pages\\');
const pathPrefix = isSubPage ? '../' : '';

const OPENING_IMAGES = Array.from({ length: 14 }, (_, i) => `${pathPrefix}assets/sheep/Opening/opening_${i + 1}.png`);
const STORAGE_KEY_VIEWED = 'ss_opening_viewed';

export function checkAndShowOpening(parentContainer, onComplete = null) {
  const viewed = getItem(STORAGE_KEY_VIEWED);
  if (!viewed) {
    startOpening(parentContainer, false, onComplete);
  } else if (onComplete) {
    onComplete();
  }
}

export function startImageSlideshow(parentContainer, images, options = {}) {
  if (!parentContainer || !images?.length) return;

  const {
    onComplete = null,
    onClose = null,
    skipText = '×',
    hintText = t('opening.hint'),
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

export function startOpening(parentContainer, isReplay = false, onComplete = null) {
  if (!parentContainer) return;
  startImageSlideshow(parentContainer, OPENING_IMAGES, {
    onComplete,
    onClose: () => {
      if (!isReplay) {
        setItem(STORAGE_KEY_VIEWED, true);
        // 최초 실행 보상 지급 (양털 성장 게이지만 3칸 채우기, 행복도/포만감 유지)
        const rewardKey = 'ss_first_wool_reward_given';
        if (!getItem(rewardKey)) {
          setItem(rewardKey, true);
          const sheep = getSheep();
          if (sheep) {
            sheep.woolGrowth = 3;
            sheep.canShear = true;
            saveSheep(sheep);
          }
        }
      }
    },
  });
}
