import { registerSW } from 'virtual:pwa-register';

/**
 * Мягкое автообновление PWA.
 *
 * Новая версия скачивается в фоне, но применяется (перезагрузка) только когда это незаметно:
 * - при запуске или возвращении в приложение, пока человек ещё ничего не нажал;
 * - иначе — при следующем возвращении после сворачивания.
 * Никогда — пока открыто окно (лист, «Новое дело») или курсор стоит в поле ввода,
 * чтобы не потерять набираемый текст. Данные при этом не теряются: AppContext сохраняет
 * их при сворачивании, а локальная копия пишется сразу.
 *
 * Проверка обновлений: при каждом возвращении в приложение (ярлык на iPhone часто не перезапускается,
 * а разворачивается из фона) и раз в 30 минут, пока приложение открыто.
 */

const CHECK_EVERY_MS = 30 * 60 * 1000;
/** не чаще раза в минуту — частые разворачивания не дёргают сеть */
const MIN_CHECK_GAP_MS = 60 * 1000;

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | undefined;
let updateReady = false;
/** пользователь что-то нажал с момента запуска или последнего возвращения в приложение */
let touched = false;
let lastCheck = 0;

/** открыт лист или фокус в поле — перезагрузка сейчас может потерять ввод */
function isBusy(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return true;
  return document.querySelector('[role="dialog"]') !== null;
}

function tryApply(): void {
  if (!updateReady || !applyUpdate || isBusy()) return;
  updateReady = false;
  // перезагрузка, как только новая версия возьмёт управление: событие workbox «controlling»
  // приходит не во всех сценариях, стандартное controllerchange — всегда
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  // skipWaiting у новой версии
  void applyUpdate(true);
}

function checkForUpdate(): void {
  if (!registration || !navigator.onLine) return;
  const now = Date.now();
  if (now - lastCheck < MIN_CHECK_GAP_MS) return;
  lastCheck = now;
  registration.update().catch(() => {
    /* нет сети — проверим в следующий раз */
  });
}

export function setupPwaUpdates(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const markTouched = () => {
    touched = true;
  };
  window.addEventListener('pointerdown', markTouched, { capture: true, passive: true });
  window.addEventListener('keydown', markTouched, { capture: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    // вернулись в приложение: экран только что показан, можно незаметно обновиться
    touched = false;
    tryApply();
    checkForUpdate();
  });

  window.setInterval(() => {
    if (document.visibilityState === 'visible') checkForUpdate();
  }, CHECK_EVERY_MS);

  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
      // новая версия скачалась, пока человек ничего не нажимал — применяем сразу
      if (!touched) tryApply();
    },
    onRegisteredSW(_url, reg) {
      registration = reg;
      lastCheck = Date.now();
    }
  });
}
