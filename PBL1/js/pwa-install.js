/**
 * pwa-install.js — 앱 바로가기(PWA) 설치 유도
 */

import { t } from './i18n.js';

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
      ${t('pwaInstall.title')}
    </h3>
    <p id="pwa-install-desc" class="text-center text-muted"
      style="font-size: var(--font-size-sm); line-height: 1.65; margin-bottom: var(--space-4);"></p>
    <div id="pwa-install-ios-steps" class="hidden" style="font-size: var(--font-size-sm); line-height: 1.7;
      background: rgba(167,139,250,0.12); border-radius: var(--radius-md); padding: var(--space-3);
      margin-bottom: var(--space-4); text-align: left;">
      <div style="margin-bottom: 6px;">${t('pwaInstall.iosSteps.step1')}</div>
      <div>${t('pwaInstall.iosSteps.step2')}</div>
    </div>
    <div class="flex flex-col gap-2">
      <button class="btn btn-primary" id="btn-pwa-install-confirm">${t('pwaInstall.button.add')}</button>
      <button class="btn btn-secondary" id="btn-pwa-install-later">${t('pwaInstall.button.later')}</button>
    </div>
  `;

  document.body.appendChild(overlayEl);
  document.body.appendChild(modalEl);

  const icon = modalEl.querySelector('#pwa-install-icon');
  if (icon) {
    import('./app-icon.js').then(({ getAppIconRelativePath }) => {
      icon.src = getAppIconRelativePath();
    });
    window.addEventListener('ss-app-icon-changed', (e) => {
      if (icon && e.detail?.href) icon.src = e.detail.href;
    });
  }

  modalEl.querySelector('#btn-pwa-install-later')?.addEventListener('click', dismissLater);
  overlayEl.addEventListener('click', dismissLater);
}

function setInstallMode({ ios = false, manual = false } = {}) {
  const desc = modalEl.querySelector('#pwa-install-desc');
  const iosSteps = modalEl.querySelector('#pwa-install-ios-steps');
  const btnConfirm = modalEl.querySelector('#btn-pwa-install-confirm');

  if (ios) {
    desc.textContent = t('pwaInstall.description.ios');
    iosSteps?.classList.remove('hidden');
    btnConfirm.textContent = t('pwaInstall.button.ok');
  } else if (deferredPrompt) {
    desc.textContent = t('pwaInstall.description.deferred');
    iosSteps?.classList.add('hidden');
    btnConfirm.textContent = t('pwaInstall.button.add');
  } else {
    desc.textContent = manual
      ? t('pwaInstall.description.manual')
      : t('pwaInstall.description.manualUnsupported');
    iosSteps?.classList.add('hidden');
    btnConfirm.textContent = t('pwaInstall.button.ok');
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
    showToast?.(t('pwaInstall.toast.installed'), 'info');
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
      showToast?.(t('pwaInstall.toast.installed'), 'success');
    } else {
      dismissLater();
    }
  } catch (e) {
    console.warn('[pwa-install]', e);
    hideInstallUI();
    showToast?.(t('pwaInstall.toast.installFailed'), 'error');
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
    showToast?.(t('pwaInstall.toast.installed'), 'success');
  });
}
