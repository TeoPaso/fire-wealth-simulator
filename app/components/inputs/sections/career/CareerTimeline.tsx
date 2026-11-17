'use client';

import { useFormat, useT } from '@/lib/i18n';
import { cn } from '../../../ui';
import { numOr, usePlanEditor } from '../../editor';
import { careerTimeline } from '../../model/career';

/** Phase colours (cycled). Solid fills with dark text keep the labels readable. */
const PHASE_FILLS = ['bg-cyan-400', 'bg-emerald-400', 'bg-violet-400', 'bg-amber-400', 'bg-sky-400', 'bg-rose-400'];

export function phaseFill(index: number): string {
  return PHASE_FILLS[index % PHASE_FILLS.length];
}

/** Horizontal bar of the career phases by age, plus the years after the last phase up to the plan horizon. */
export function CareerTimeline() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const segments = careerTimeline(plan);

  if (!segments) {
    return <p className="rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-400">{t('inputs.career.timelineUnavailable')}</p>;
  }

  const start = segments[0].fromAge;
  const lastEnd = segments[segments.length - 1].toAge;
  const horizon = numOr(plan.profile.lifeExpectancy);
  const end = Number.isFinite(horizon) && horizon > lastEnd ? horizon : lastEnd;
  const span = end - start;
  const pos = (age: number) => ((age - start) / span) * 100;
  const boundaries = [start, ...segments.map((s) => s.toAge), ...(end > lastEnd ? [end] : [])];
  // Age labels under the bar: skip one that would overlap the previous label; the final age always shows.
  const visible: number[] = [];
  boundaries.forEach((age, i) => {
    const prev = visible[visible.length - 1];
    if (prev === undefined || pos(age) - pos(prev) >= 9) {
      visible.push(age);
    } else if (i === boundaries.length - 1) {
      if (visible.length > 1) visible.pop();
      visible.push(age);
    }
  });

  return (
    <div>
      <ol aria-label={t('inputs.career.timelineLabel')} className="flex h-7 w-full overflow-hidden rounded-lg bg-slate-800/60">
        {segments.map((s) => {
          const name = t('inputs.career.phaseName', { n: s.index + 1 });
          const text = t('inputs.career.timelineItem', {
            name: s.label ? `${name} (${s.label})` : name,
            from: format.num(s.fromAge),
            to: format.num(s.toAge),
          });
          return (
            <li
              key={s.index}
              title={text}
              style={{ width: `${pos(s.toAge) - pos(s.fromAge)}%` }}
              className={cn(
                'flex min-w-0 items-center justify-center overflow-hidden border-r border-slate-950/60 px-1 text-xs font-semibold text-slate-950',
                phaseFill(s.index),
              )}
            >
              <span aria-hidden="true" className="truncate">
                {s.label || s.index + 1}
              </span>
              <span className="sr-only">{text}</span>
            </li>
          );
        })}
        {end > lastEnd ? (
          <li
            title={t('inputs.career.timelineAfter', { from: format.num(lastEnd), to: format.num(end) })}
            style={{ width: `${pos(end) - pos(lastEnd)}%` }}
            className="flex min-w-0 items-center justify-center overflow-hidden bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(148,163,184,0.15)_4px,rgba(148,163,184,0.15)_8px)] px-1 text-xs text-slate-400"
          >
            <span aria-hidden="true" className="truncate">
              {t('inputs.career.timelineAfterShort')}
            </span>
            <span className="sr-only">{t('inputs.career.timelineAfter', { from: format.num(lastEnd), to: format.num(end) })}</span>
          </li>
        ) : null}
      </ol>
      <div aria-hidden="true" className="relative mt-1 h-4 text-[11px] tabular text-slate-400">
        {visible.map((age, i) => (
          <span
            key={`${age}-${i}`}
            style={{ left: `${pos(age)}%` }}
            className={cn(
              'absolute top-0 whitespace-nowrap',
              i === 0 ? '' : age === end ? '-translate-x-full' : '-translate-x-1/2',
            )}
          >
            {format.num(age)}
          </span>
        ))}
      </div>
    </div>
  );
}
