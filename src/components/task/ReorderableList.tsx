import React from 'react';
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import type { DragControls } from 'framer-motion';

interface ReorderableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (ids: string[]) => void;
  renderItem: (item: T, controls: DragControls) => React.ReactNode;
  className?: string;
  /** непрозрачный фон перетаскиваемого элемента */
  itemClassName?: string;
}

function ReorderRow({
  id,
  className,
  children




}: {id: string;className?: string;children: (controls: DragControls) => React.ReactNode;}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={id}
      dragListener={false}
      dragControls={controls}
      initial={false}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
      whileDrag={{ scale: 1.02, boxShadow: '0 10px 24px rgba(29, 33, 30, 0.12)', zIndex: 20 }}
      transition={{ type: 'spring', stiffness: 600, damping: 45 }}
      className={`relative overflow-hidden rounded-xl ${className ?? ''}`}>
      
      {children(controls)}
    </Reorder.Item>);

}

/** Список с перетаскиванием за ручку; новый порядок сразу сохраняется */
export function ReorderableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className,
  itemClassName
}: ReorderableListProps<T>) {
  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={items.map(getId)}
      onReorder={onReorder}
      className={className}>
      
      <AnimatePresence initial={false}>
        {items.map((item) =>
        <ReorderRow key={getId(item)} id={getId(item)} className={itemClassName}>
            {(controls) => renderItem(item, controls)}
          </ReorderRow>
        )}
      </AnimatePresence>
    </Reorder.Group>);

}