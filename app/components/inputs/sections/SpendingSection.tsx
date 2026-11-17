'use client';

import { CalendarClock, Plus } from 'lucide-react';
import type { LifeEvent } from '@/lib/engine';
import { useFormat, useT } from '@/lib/i18n';
import { uniqueId } from '@/lib/store';
import { Button, EmptyState } from '../../ui';
import { itemKeys, listOf, numOr, usePlanEditor } from '../editor';
import { FieldGrid, ItemActions, ItemCard, PathIssues, PlanNumber, PlanText, SubHeading } from '../fields';
import { takenIds } from '../model/portfolio';

/** Spese ed eventi: living costs while working and after, one-off or recurring life events. */
export function SpendingSection() {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const spending = plan.spending;
  const events = listOf(spending.events);
  const keys = itemKeys(events);

  const addEvent = () =>
    update((d) => {
      const age = numOr(d.profile.currentAge);
      const event: LifeEvent = {
        id: uniqueId('event', takenIds(d)),
        label: t('inputs.spending.newEventLabel'),
        age: Number.isFinite(age) ? age + 1 : 0,
        amountToday: 0,
        years: 1,
      };
      if (Array.isArray(d.spending.events)) d.spending.events.push(event);
      else d.spending.events = [event];
    });

  return (
    <div>
      <FieldGrid>
        <PlanNumber
          path="spending.monthlyToday"
          label={t('inputs.spending.monthlyToday')}
          help={t('inputs.spending.monthlyTodayHelp')}
          unit={t('common.unit.eurTodayPerMonth')}
          value={numOr(spending.monthlyToday)}
          min={0}
          step={50}
          onChange={(v) =>
            update((d) => {
              d.spending.monthlyToday = v;
            })
          }
        />
        <PlanNumber
          path="spending.retirementPct"
          label={t('inputs.spending.retirementPct')}
          help={t('inputs.spending.retirementPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(spending.retirementPct)}
          min={0}
          step={5}
          onChange={(v) =>
            update((d) => {
              d.spending.retirementPct = v;
            })
          }
        />
      </FieldGrid>

      <SubHeading help={t('inputs.spending.eventsHelp')} label={t('inputs.spending.eventsTitle')}>
        {t('inputs.spending.eventsTitle')}
      </SubHeading>
      <div className="space-y-3">
        <PathIssues path="spending.events" />
        {events.length === 0 ? (
          <EmptyState icon={<CalendarClock />} title={t('inputs.spending.eventsEmptyTitle')} description={t('inputs.spending.eventsEmptyBody')} className="py-6" />
        ) : (
          events.map((_, i) => <EventEditor key={keys[i]} index={i} />)
        )}
        <Button icon={<Plus />} onClick={addEvent}>
          {t('inputs.spending.addEvent')}
        </Button>
      </div>
    </div>
  );
}

function EventEditor({ index }: { index: number }) {
  const t = useT();
  const format = useFormat();
  const { plan, update, issuesFor } = usePlanEditor();
  const raw = plan.spending.events[index];
  const event: Partial<LifeEvent> = raw && typeof raw === 'object' ? raw : {};
  const base = `spending.events[${index}]`;
  const name = event.label?.trim() ? event.label : t('inputs.spending.eventUntitled', { n: index + 1 });
  const amount = numOr(event.amountToday);
  const years = numOr(event.years);

  const set = (mutate: (e: LifeEvent) => void) =>
    update((d) => {
      const e = d.spending.events?.[index];
      if (e && typeof e === 'object') mutate(e);
    });

  const subtitle =
    years === 1
      ? t('inputs.spending.eventOnce', { age: format.num(numOr(event.age)) })
      : t('inputs.spending.eventRepeated', { age: format.num(numOr(event.age)), years: format.num(years) });
  const amountHint =
    amount > 0
      ? t('inputs.spending.amountIsExpense')
      : amount < 0
        ? t('inputs.spending.amountIsInflow')
        : t('inputs.spending.amountSign');

  return (
    <ItemCard
      headingId={`${base}-heading`}
      invalid={issuesFor(base).some((i) => i.level === 'error')}
      title={name}
      subtitle={subtitle}
      actions={
        <ItemActions
          itemName={name ?? ''}
          onRemove={() =>
            update((d) => {
              if (Array.isArray(d.spending.events)) d.spending.events.splice(index, 1);
            })
          }
          removeTitle={t('inputs.spending.removeEventTitle')}
          removeBody={t('inputs.spending.removeEventBody', { name: name ?? '' })}
        />
      }
    >
      <PathIssues path={base} className="mb-3" />
      <FieldGrid>
        <PlanText
          path={`${base}.label`}
          className="sm:col-span-2"
          label={t('inputs.spending.eventLabel')}
          value={typeof event.label === 'string' ? event.label : ''}
          maxLength={60}
          onChange={(v) =>
            set((e) => {
              e.label = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.age`}
          label={t('inputs.spending.eventAge')}
          help={t('inputs.spending.eventAgeHelp')}
          unit={t('common.unit.age')}
          value={numOr(event.age)}
          integer
          min={0}
          step={1}
          onChange={(v) =>
            set((e) => {
              e.age = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.years`}
          label={t('inputs.spending.eventYears')}
          help={t('inputs.spending.eventYearsHelp')}
          unit={t('common.unit.years')}
          value={years}
          integer
          min={1}
          step={1}
          onChange={(v) =>
            set((e) => {
              e.years = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.amountToday`}
          className="sm:col-span-2"
          label={t('inputs.spending.eventAmount')}
          help={t('inputs.spending.eventAmountHelp')}
          description={amountHint}
          unit={t('common.unit.eurToday')}
          value={amount}
          step={100}
          onChange={(v) =>
            set((e) => {
              e.amountToday = v;
            })
          }
        />
      </FieldGrid>
    </ItemCard>
  );
}

export function SpendingSummary() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const events = listOf(plan.spending.events).length;
  return (
    <>
      {t('inputs.spending.summary', {
        monthly: format.eur(numOr(plan.spending.monthlyToday)),
        pct: format.pct(numOr(plan.spending.retirementPct), 0),
        events: format.num(events),
      })}
    </>
  );
}
