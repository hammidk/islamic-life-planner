/** Идёт перетаскивание (dnd-kit): свайпы строк в это время выключены */
let active = false;
/** после перетаскивания клик по строке не срабатывает */
let suppressUntil = 0;

export const isDragActive = () => active;

export function setDragActive(value: boolean): void {
  active = value;
  if (!value) suppressUntil = Date.now() + 400;
}

export const clickSuppressed = () => Date.now() < suppressUntil;
