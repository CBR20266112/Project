/**
 * pwa-install.js — 앱 바로가기(PWA) 설치 유도
 */

const DISMISS_KEY = 'ss_pwa_install_dismiss';
const SHOW_DELAY_MS = 2800;

let deferredPrompt = null;
let uiBuilt = false;
let overlayEl = null;
let modalEl = null;

function getAssetBase() {
  return window.location.pathname.includes('/pages/') ? '../' : './';
}

/** 이미 홈 화면 앱으로 실행 중인지 */
export function isAppInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

export function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function shouldAutoShow() {
  if (isAppInstalled()) return false;
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (dismissed === 'never') return false;
  if (dismissed) {
    const elapsed = Date.now() - Number(dismissed);
    if (elapsed < 7 * 24 * 60 * 60 * 1000) return false;
  }
  return true;
}

function dismissLater() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
  hideInstallUI();
}

function dismissNever() {
  localStorage.setItem(DISMISS_KEY, 'never');
  hideInstallUI();
}

function buildInstallUI() {
  if (uiBuilt) return;
  uiBuilt = true;

  overlayEl = document.createElement('div');
  overlayEl.className = 'overlay';
  overlayEl.id = 'pwa-install-overlay';

  modalEl = document.createElement('div');
  modalEl.className = 'modal';
  modalEl.id = 'pwa-install-modal';
  modalEl.innerHTML = `
    <div class="modal-handle"></div>
    <div style="text-align:center; margin-bottom: var(--space-3);">
      <img id="pwa-install-icon" src="" alt="" width="72" height="72"
        style="border-radius: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); object-fit: contain;">
    </div>
    <h3 class="text-center font-bold" style="font-size: var(--font-size-lg); margin-bottom: var(--space-2);">
      📲 앱 바로가기를 추가할래?
    </h3>
    <p id="pwa-install-desc" class="text-center text-muted"
      style="font-size: var(--font-size-sm); line-height: 1.65; margin-bottom: var(--space-4);"></p>
    <div id="pwa-install-ios-steps" class="hidden" style="font-size: var(--font-size-sm); line-height: 1.7;
      background: rgba(167,139,250,0.12); border-radius: var(--radius-md); padding: var(--space-3);
      margin-bottom: var(--space-4); text-align: left;">
      <div style="margin-bottom: 6px;">① 하단 <strong>공유</strong> 버튼 <span style="font-size:1.1em;">□↑</span> 탭</div>
      <div>② <strong>홈 화면에 추가</strong> 선택</div>
    </div>
    <div class="flex flex-col gap-2">
      <button class="btn btn-primary" id="btn-pwa-install-confirm">추가하기</button>
      <button class="btn btn-secondary" id="btn-pwa-install-later">나중에</button>
    </div>
  `;

  document.body.appendChild(overlayEl);
  document.body.appendChild(modalEl);

  const icon = modalEl.querySelector('#pwa-install-icon');
  if (icon) icon.src = `${getAssetBase()}assets/sheep/step1/idle.png`;

  modalEl.querySelector('#btn-pwa-install-later')?.addEventListener('click', dismissLater);
  overlayEl.addEventListener('click', dismissLater);
}

function setInstallMode({ ios = false, manual = false } = {}) {
  const desc = modalEl.querySelector('#pwa-install-desc');
  const iosSteps = modalEl.querySelector('#pwa-install-ios-steps');
  const btnConfirm = modalEl.querySelector('#btn-pwa-install-confirm');

  if (ios) {
    desc.textContent = '홈 화면에 추가하면 모닝콜 알림을 더 편하게 받을 수 있어요.';
    iosSteps?.classList.remove('hidden');
    btnConfirm.textContent = '알겠어요';
  } else if (deferredPrompt) {
    desc.textContent = '홈 화면에 추가하면 앱처럼 바로 열고, 모닝콜도 더 안정적으로 받을 수 있어요.';
    iosSteps?.classList.add('hidden');
    btnConfirm.textContent = '추가하기';
  } else {
    desc.textContent = manual
      ? '브라우저 메뉴(⋮)에서 「앱 설치」 또는 「홈 화면에 추가」를 선택해 주세요.'
      : '이 브라우저에서는 자동 설치를 지원하지 않아요. 메뉴에서 홈 화면에 추가해 주세요.';
    iosSteps?.classList.add('hidden');
    btnConfirm.textContent = '알겠어요';
  }
}

export function showInstallUI(options = {}) {
  if (isAppInstalled()) return;
  buildInstallUI();
  setInstallMode(options);
  overlayEl.classList.add('active');
  modalEl.classList.add('active');
}

export function hideInstallUI() {
  overlayEl?.classList.remove('active');
  modalEl?.classList.remove('active');
}

/**
 * 설치 유도 (설정 버튼·배너 공통)
 * @returns {Promise<{ status: string }>}
 */
export async function promptInstall({ showToast } = {}) {
  if (isAppInstalled()) {
    showToast?.('이미 앱 바로가기로 실행 중이에요!', 'info');
    return { status: 'installed' };
  }

  if (deferredPrompt) {
    showInstallUI({ ios: false });
    return { status: 'prompt-shown' };
  }

  if (isIosDevice()) {
    showInstallUI({ ios: true, manual: true });
    return { status: 'ios-guide' };
  }

  showInstallUI({ ios: false, manual: true });
  return { status: 'manual-guide' };
}

async function onConfirmInstall({ showToast } = {}) {
  if (isIosDevice() || !deferredPrompt) {
    hideInstallUI();
    return;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideInstallUI();

    if (outcome === 'accepted') {
      localStorage.setItem(DISMISS_KEY, 'never');
      showToast?.('앱 바로가기가 추가됐어요! 메에~ 🐑', 'success');
    } else {
      dismissLater();
    }
  } catch (e) {
    console.warn('[pwa-install]', e);
    hideInstallUI();
    showToast?.('설치 창을 열지 못했어요. 브라우저 메뉴에서 추가해 주세요.', 'error');
  }
}

/**
 * 자동 설치 배너 초기화
 */
export function initPwaInstallPrompt({ showToast } = {}) {
  if (isAppInstalled()) return;

  buildInstallUI();
  modalEl.querySelector('#btn-pwa-install-confirm')?.addEventListener('click', () => {
    onConfirmInstall({ showToast });
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (shouldAutoShow()) {
      setTimeout(() => showInstallUI({ ios: false }), SHOW_DELAY_MS);
    }
  });

  if (isIosDevice() && shouldAutoShow() && !deferredPrompt) {
    setTimeout(() => showInstallUI({ ios: true }), SHOW_DELAY_MS);
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    localStorage.setItem(DISMISS_KEY, 'never');
    hideInstallUI();
    showToast?.('Sleepy Sheep이 홈 화면에 추가됐어요! 🎉', 'success');
  });
}
