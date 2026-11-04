import { createPortal } from 'react-dom';
import { dismissToast, useToast } from '../../utils/toast';

/** Тост над нижней навигацией: «Дело удалено · Отменить» */
export function ToastHost() {
  const toast = useToast();
  return createPortal(
    toast ?
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto flex max-w-[430px] justify-center px-4">
        <div
        key={toast.id}
        role="status"
        className="pointer-events-auto flex min-h-[44px] max-w-full items-center gap-3 rounded-full bg-ink px-4 text-[14px] text-white shadow-card">

          <span className="min-w-0 truncate py-2.5">{toast.text}</span>
          {toast.action ?
        <button
          type="button"
          onClick={() => {
            toast.action?.run();
            dismissToast();
          }}
          className="-mr-1 flex min-h-[44px] shrink-0 items-center px-1 font-semibold text-[#9FD8B5]">

              {toast.action.label}
            </button> :
        null}
        </div>
      </div> :
    null,
    document.body
  );
}
