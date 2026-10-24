import { useParams } from 'react-router-dom';
import { Shell, SubHeader } from '../components/Shell';
import { SectionBlock } from '../components/sphere/SectionBlock';
import { useApp } from '../contexts/AppContext';
import { spheres } from '../data/appData';
import { compareOrder } from '../utils/taskOptions';
import { useInlineCreateHost } from '../contexts/QuickAddContext';
import { InlineCreate } from '../components/task/InlineCreate';
import type { SphereId } from '../types';

/** Один раздел сферы: /sphere/:id/section/:sectionId */
export function SectionDetail() {
  const { id, sectionId } = useParams();
  const { tasks, sections, addTask } = useApp();
  useInlineCreateHost(id && sectionId ? { sphere: id as SphereId, sectionId } : {});

  const sphere = spheres.find((s) => s.id === id);
  const section = sections.find((s) => s.id === sectionId && s.sphere === id);

  if (!sphere || !section) {
    return (
      <Shell>
        <SubHeader title="Раздел не найден" />
      </Shell>);

  }

  const sectionTasks = tasks.
  filter((t) => t.sphere === sphere.id && t.sectionId === section.id && t.status !== 'cancelled').
  sort(
    (a, b) =>
    compareOrder(a, b) ||
    ((a.date ?? '') + (a.time ?? '99')).localeCompare((b.date ?? '') + (b.time ?? '99'))
  );
  const ids = new Set(sectionTasks.map((t) => t.id));
  /** подзадачи показываются под родителем */
  const topLevel = sectionTasks.filter((t) => !t.parentId || !ids.has(t.parentId));
  const subtasksOf = (parentId: string) => sectionTasks.filter((t) => t.parentId === parentId);

  return (
    <Shell nav>
      <SubHeader title={section.title} subtitle={sphere.name} />
      <InlineCreate />
      <SectionBlock
        tasks={topLevel}
        subtasksOf={subtasksOf}
        onMove={null}
        onAdd={(title) => addTask({ title, sphere: sphere.id, sectionId: section.id })} />

    </Shell>);

}
