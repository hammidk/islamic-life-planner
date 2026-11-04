import { BottomSheet } from '../BottomSheet';
import { useConfirmRequest } from '../../utils/confirm';

/** Лист подтверждения: «Удалить дело и 2 подзадачи?» */
export function ConfirmHost() {
  const request = useConfirmRequest();
  return (
    <BottomSheet open={Boolean(request)} title={request?.title ?? ''} onClose={() => request?.resolve(false)}>
      {request ?
      <div className="flex flex-col gap-2 pb-1">
          <button
          type="button"
          onClick={() => request.resolve(true)}
          className="min-h-[48px] rounded-xl bg-[#D93B30] text-[15px] font-medium text-white">
          
            {request.confirmLabel}
          </button>
          <button
          type="button"
          onClick={() => request.resolve(false)}
          className="min-h-[48px] rounded-xl border border-line text-[15px] text-ink">
          
            Отмена
          </button>
        </div> :
      null}
    </BottomSheet>);

}
