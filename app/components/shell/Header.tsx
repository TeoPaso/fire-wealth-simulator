'use client';

import { Flame } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { usePlanActions, useUiPrefs } from '@/lib/store/hooks';
import { SegmentedControl } from '../ui/SegmentedControl';
import { AppMenu } from './AppMenu';
import { PlanSelector } from './PlanSelector';

/**
 * App header. Mobile: row 1 = brand · value mode · language · menu, row 2 = plan selector.
 * ≥768px: a single row.
 */
export function Header() {
  const t = useT();
  const { lang, valueMode } = useUiPrefs();
  const actions = usePlanActions();

  return (
    <header className="glass relative z-20 shrink-0 border-b border-slate-800/80">
      <div className="mx-auto flex max-w-app flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2.5 sm:gap-x-3">
        <div className="order-1 flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-violet-400/20 text-cyan-300 ring-1 ring-inset ring-cyan-300/20"
          >
            <Flame className="h-5 w-5" />
          </span>
          <h1 className="sr-only text-[15px] font-semibold leading-tight tracking-tight text-slate-100 sm:not-sr-only sm:whitespace-nowrap">
            {t('common.app.shortName')}
            <span className="ml-1.5 font-normal text-slate-400">{t('common.app.country')}</span>
          </h1>
        </div>

        <div className="order-3 flex w-full min-w-0 items-center gap-1 md:order-2 md:ml-3 md:w-auto md:max-w-sm md:flex-1">
          <PlanSelector />
        </div>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:order-3">
          <SegmentedControl
            size="sm"
            label={t('common.valueMode.label')}
            value={valueMode}
            onChange={actions.setValueMode}
            options={[
              { value: 'real', label: t('common.valueMode.real'), title: t('common.valueMode.realHelp') },
              { value: 'nominal', label: t('common.valueMode.nominal'), title: t('common.valueMode.nominalHelp') },
            ]}
          />
          <SegmentedControl
            size="sm"
            label={t('common.lang.label')}
            value={lang}
            onChange={actions.setLang}
            options={[
              { value: 'it', label: t('common.lang.it'), ariaLabel: t('common.lang.itName'), title: t('common.lang.itName') },
              { value: 'en', label: t('common.lang.en'), ariaLabel: t('common.lang.enName'), title: t('common.lang.enName') },
            ]}
          />
          <AppMenu />
        </div>
      </div>
    </header>
  );
}
