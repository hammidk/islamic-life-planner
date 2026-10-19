import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { animate, motion, useMotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import { getCurrentWeek } from '../utils/calendar';
import type { WeekDay } from '../utils/calendar';

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 40 };
/** доля ширины, после которой свайп листает неделю */
const SWIPE_SHARE = 0.2;
const SWIPE_VELOCITY = 400;

/** getCurrentWeek ставит сегодня первым — в календаре нужен порядок Пн–Вс */
const weekOf = (offset: number): WeekDay[] =>
[...getCurrentWeek(offset)].sort((a, b) => a.date.localeCompare(b.date));

/** Календарь недели на Главной: 7 колонок, свайп листает недели, тап открывает день */
export function WeekSwiper() {
  const navigate = useNavigate();
  const { tasks } = useApp();
  // подписка на живую дату: после полуночи «сегодня» сдвигается
  const { todayISO } = useLive();
  const [offset, setOffset] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  /** тап сразу после свайпа не должен открывать день */
  const draggedRef = useRef(false);

  useEffect(() => {
    setOffset(0);
  }, [todayISO]);

  const active = tasks.filter((t) => t.date && t.status !== 'cancelled');

  const shift = (dir: 1 | -1) => {
    const width = viewportRef.current?.offsetWidth ?? 0;
    void animate(x, -dir * width, {
      ...SPRING,
      onComplete: () => {
        setOffset((v) => v + dir);
        x.set(0);
      }
    });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
    const width = viewportRef.current?.offsetWidth ?? 0;
    if (info.offset.x < -width * SWIPE_SHARE || info.velocity.x < -SWIPE_VELOCITY) shift(1);else
    if (info.offset.x > width * SWIPE_SHARE || info.velocity.x > SWIPE_VELOCITY) shift(-1);else
    void animate(x, 0, SPRING);
  };

  const renderWeek = (weekOffset: number) =>
  <div key={weekOffset} className="grid w-1/3 shrink-0 grid-cols-7 gap-1 px-0.5 pb-1 pt-0.5">
      {weekOf(weekOffset).map((day) => {
      const dayTasks = active.filter((t) => t.date === day.date);
      const count = dayTasks.length;
      const allDone = count > 0 && dayTasks.every((t) => t.status === 'done');
      return (
        <button
          key={day.date}
          type="button"
          onClick={() => {
            if (!draggedRef.current) navigate(`/day/${day.date}`);
          }}
          aria-label={`${day.weekday}, ${day.label}${count > 0 ? `, дел: ${count}` : ''}`}
          aria-current={day.isToday ? 'date' : undefined}
          className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border py-2 shadow-card transition-colors duration-150 ease-out ${
          day.isToday ? 'border-primary/45 bg-primary-tint' : 'border-line bg-surface hover:border-primary/30'}`
          }>

            <span className={`text-[11px] ${day.isToday ? 'font-medium text-primary' : 'text-ink-soft'}`}>
              {day.weekdayShort}
            </span>
            <span
            className={`text-[17px] font-semibold leading-none tabular-nums ${
            day.isToday ? 'text-primary' : 'text-ink'}`
            }>

              {day.dayNumber}
            </span>
            <span className="text-[10.5px] leading-none text-muted">{day.monthShort}</span>
            <span className="h-[14px] text-[11px] leading-[14px] tabular-nums text-ink-soft">
              {count > 0 ? count : ''}
            </span>
            {allDone ?
          <span className="flex h-[12px] w-[12px] items-center justify-center rounded-full bg-primary">
                <CheckIcon className="h-2 w-2 text-white" strokeWidth={3.2} aria-hidden="true" />
              </span> :

          <span
            className={`m-[3px] h-[6px] w-[6px] rounded-full ${count > 0 ? 'bg-primary/35' : 'bg-line'}`}
            aria-hidden="true" />

          }
          </button>);

    })}
    </div>;


  return (
    <section aria-label="Дни недели" className="mt-7">
      {/* только правые ссылки; фиксированная высота — строка не прыгает при появлении «К сегодня» */}
      <div className="mb-2 flex h-5 items-center justify-end px-1">
        <span className="flex items-center gap-4">
          {offset !== 0 ?
          <button
            type="button"
            onClick={() => setOffset(0)}
            className="text-[13px] font-medium text-primary">

              К сегодня
            </button> :
          null}
          <button
            type="button"
            onClick={() => navigate('/week')}
            className="text-[13px] font-medium text-primary">

            На неделю
          </button>
        </span>
      </div>

      <div ref={viewportRef} className="overflow-hidden">
        <motion.div
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragStart={() => {
            draggedRef.current = true;
          }}
          onDragEnd={onDragEnd}
          style={{ x }}
          className="-ml-[100%] flex w-[300%] touch-pan-y">

          {[offset - 1, offset, offset + 1].map(renderWeek)}
        </motion.div>
      </div>
    </section>);

}
