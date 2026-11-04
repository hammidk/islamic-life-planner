import React from 'react';
import { motion, useTransform } from 'framer-motion';
import { IndentIncreaseIcon, IndentDecreaseIcon, Trash2Icon } from 'lucide-react';
import { useRowGestures } from '../../hooks/useRowGestures';

const ACTION_WIDTH = 76;

interface SwipeRowProps {
  id: string;
  label: string;
  /** непрозрачный фон строки — закрывает слои действий */
  surface: string;
  onDelete: () => void;
  /** удаление спросит подтверждение (у дела есть подзадачи) */
  confirmDelete?: boolean;
  /** свайп вправо — «сделать подзадачей» */
  onIndent?: () => void;
  /** кнопка «Вынести» у подзадачи */
  onOutdent?: () => void;
  onLongPress: () => void;
  disabled?: boolean;
  /** перетаскивание ведёт dnd-kit: долгое нажатие и подъём — его */
  externalLongPress?: boolean;
  /** строку подняло перетаскивание */
  dragging?: boolean;
  children: React.ReactNode;
}

/**
 * Строка дела с жестами (useRowGestures): влево — «Удалить» (и «Вынести» у подзадачи),
 * полный свайп удаляет; вправо — «Подзадача»; долгое нажатие — меню.
 */
export function SwipeRow({
  id,
  label,
  surface,
  onDelete,
  confirmDelete,
  onIndent,
  onOutdent,
  onLongPress,
  disabled,
  externalLongPress,
  dragging = false,
  children
}: SwipeRowProps) {
  const actionsWidth = ACTION_WIDTH * (onOutdent ? 2 : 1);
  const { rootRef, x, isOpen, lifted, close, bind } = useRowGestures({
    id,
    actionsWidth,
    onIndent,
    onDelete,
    confirmDelete,
    onLongPress,
    disabled,
    externalLongPress
  });
  const indentOpacity = useTransform(x, [0, 16, 64], [0, 0.6, 1]);
  const actionsOpacity = useTransform(x, [-24, -4, 0], [1, 0.4, 0]);
  /** «Удалить» растягивается при полном свайпе */
  const deleteWidth = useTransform(x, (v) => Math.max(ACTION_WIDTH, -v - (onOutdent ? ACTION_WIDTH : 0)));
  const up = lifted || dragging;

  return (
    <div ref={rootRef} className="relative overflow-hidden rounded-xl">
      <motion.div
        style={{ opacity: actionsOpacity }}
        className="absolute inset-0 flex justify-end"
        aria-hidden={!isOpen}>

        {onOutdent ?
        <button
          type="button"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => {
            close();
            onOutdent();
          }}
          style={{ width: ACTION_WIDTH }}
          className="flex shrink-0 flex-col items-center justify-center gap-0.5 bg-[#8A938C] text-[12px] font-medium text-white">

            <IndentDecreaseIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Вынести
          </button> :
        null}
        <motion.button
          type="button"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => {
            close();
            onDelete();
          }}
          style={{ width: deleteWidth }}
          className="flex shrink-0 flex-col items-center justify-center gap-0.5 bg-[#D93B30] text-[12px] font-medium text-white">

          <Trash2Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Удалить
        </motion.button>
      </motion.div>

      {onIndent ?
      <motion.div
        style={{ opacity: indentOpacity }}
        className="absolute inset-0 flex items-center justify-start bg-primary pl-5 text-white"
        aria-hidden="true">

          <span className="flex items-center gap-1.5 text-[13px] font-medium">
            <IndentIncreaseIcon className="h-4 w-4" strokeWidth={2} />
            Подзадача
          </span>
        </motion.div> :
      null}

      <motion.div
        {...bind()}
        data-row-id={id}
        aria-label={label}
        animate={{
          scale: up ? 1.02 : 1,
          boxShadow: up ? '0 10px 24px rgba(29, 33, 30, 0.14)' : '0 0 0 rgba(29, 33, 30, 0)'
        }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        style={{ x }}
        className={`row-gesture relative ${surface}`}>

        {children}
      </motion.div>
    </div>);

}
