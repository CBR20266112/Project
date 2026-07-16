/**
 * app.js — 페이지 진입점 라우터 + 공통 유틸리티
 * 각 HTML 페이지에서 import하여 사용한다.
 */

import { initStorage } from './storage.js';
import { initAppIcon } from './app-icon.js';
import { applyTranslations } from './i18n.js';

// ─── 별 Canvas ───

/** 밤하늘 별 생성 및 애니메이션 */
export function initStars() {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  let stars  = [];
  let animId = null;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    generateStars();
  }

  function generateStars() {
    const count = Math.floor((canvas.width * canvas.height) / 6000);
    stars = Array.from({ length: count }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      r:       Math.random() * 1.8 + 0.3,
      alpha:   Math.random(),
      speed:   Math.random() * 0.008 + 0.002,
      phase:   Math.random() * Math.PI * 2,
    }));
  }

  function draw(t = 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
      star.alpha = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 248, 210, ${star.alpha})`;
      ctx.fill();
    });
    animId = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
  };
}

// ─── 토스트 알림 ───

let _toastContainer = null;

export function showToast(msg, type = 'default', duration = 2800) {
  if (!_toastContainer) {
    _toastContainer = document.querySelector('.toast-container');
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.className = 'toast-container';
      document.body.appendChild(_toastContainer);
    }
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type !== 'default' ? `toast-${type}` : ''}`;
  toast.textContent = msg;
  _toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity   = '0';
    toast.style.transform = 'translateY(-8px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── 하단 네비 활성화 ───

/**
 * 현재 페이지 기반으로 네비 아이템 활성화
 */
export function initNav() {
  const path    = window.location.pathname;
  const navItems = document.querySelectorAll('.nav-item');

  const pageMap = {
    'index.html':    0,
    '/':             0,
    'sleep.html':    1,
    'sheep.html':    0,
    'workshop.html': 2,
    'friends.html':  3,
    'gallery.html':  4,
  };

  const filename = path.split('/').pop() || 'index.html';
  const activeIdx = pageMap[filename] ?? -1;

  navItems.forEach((item, i) => {
    item.classList.toggle('active', i === activeIdx);
  });

  // 클릭 → 해당 페이지 이동
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const href = item.dataset.href;
      if (href) window.location.href = href;
    });
  });
}

// ─── 페이지 진입 애니메이션 ───
export function initPageAnimation() {
  document.querySelector('.content')?.classList.add('page-enter');
}

// ─── 하트 파티클 ───
export function spawnHearts(container, count = 5) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'heart-particle';
      el.textContent = ['💕', '🩷', '❤️', '💜', '✨'][Math.floor(Math.random() * 5)];
      el.style.left = `${20 + Math.random() * 60}%`;
      el.style.top  = `${30 + Math.random() * 30}%`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }, i * 120);
  }
}

// ─── 공통 초기화 ───
/**
 * 모든 페이지 공통 초기화
 * 각 HTML 페이지의 DOMContentLoaded에서 호출
 */
export function initCommon() {
  initStorage();
  applyTranslations();
  initAppIcon();
  initStars();
  initNav();
  initPageAnimation();
  initPwaServicesLazy();

  // 멀티페이지 이동 시 사운드 끊김을 보완하는 Handoff 자동 실행 처리
  const handleInteraction = () => {
    import('./sound.js').then(({ resumeAudio, recoverAudioState }) => {
      resumeAudio();
      recoverAudioState();
    }).catch(() => {});
  };
  document.addEventListener('click', handleInteraction, { passive: true });
  document.addEventListener('touchstart', handleInteraction, { passive: true });
}

/** PWA 알람·설치 유도 */
let _pwaBooted = false;
export function initPwaServicesLazy() {
  if (_pwaBooted) return;
  _pwaBooted = true;

  Promise.all([
    import('./pwa-alarm.js'),
    import('./pwa-install.js'),
  ]).then(([{ initPwaAlarm, syncAlarmToServiceWorker }, { initPwaInstallPrompt }]) => {
    initPwaAlarm({
      onMorningCall: () => {
        const isHome = !window.location.pathname.includes('/pages/');
        if (isHome) {
          window.dispatchEvent(new CustomEvent('ss-morningcall-trigger'));
        } else {
          const base = window.location.pathname.includes('/pages/') ? '../' : './';
          window.location.assign(`${base}index.html?morningcall=1`);
        }
      },
    });
    window.ssSyncBackgroundAlarm = syncAlarmToServiceWorker;

    initPwaInstallPrompt({ showToast });
    window.ssPromptAppInstall = () => import('./pwa-install.js').then(m => m.promptInstall({ showToast }));
  }).catch(() => {});
}
