'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario } from '@/lib/store/context';
import { formatCurrency, cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

export function YearlyDetailTable() {
  const { t } = useTranslation();
  const { result } = useActiveScenario();
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'net' | 'gross'>('net');

  if (!result || !result.yearlyProjections) return null;

  const data = result.yearlyProjections;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-card rounded-2xl w-full flex flex-col overflow-hidden"
    >
      <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5">
        <div 
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-xl font-semibold text-slate-100">{t('charts.yearlyDetails')}</h3>
          <button className="text-slate-400 hover:text-white transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Net vs Gross View Switch */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('net')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              viewMode === 'net'
                ? "bg-cyan-500 text-white shadow-sm font-bold"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            {t('charts.viewNet', 'Vista Netta (Post-Imposte)')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('gross')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              viewMode === 'gross'
                ? "bg-cyan-500 text-white shadow-sm font-bold"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            {t('charts.viewGross', 'Vista Lorda')}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs uppercase bg-[#0b1120]/95 sticky top-0 z-10 backdrop-blur-md border-b border-slate-700/80">
                  {/* Tier 1: Group Super Headers */}
                  <tr className="border-b border-slate-800/80 text-[11px] font-bold tracking-wider text-slate-400">
                    <th rowSpan={2} className="px-3.5 py-2.5 whitespace-nowrap text-center border-r-2 border-slate-700/80 bg-slate-900/90 text-slate-300">
                      {t('table.year', 'Anno')}
                    </th>
                    <th colSpan={3} className="px-3.5 py-2 text-center border-r-2 border-slate-700/80 bg-blue-950/30 text-blue-400">
                      Flussi Risparmio Personale
                    </th>
                    <th colSpan={1} className="px-3.5 py-2 text-center border-r-2 border-slate-700/80 bg-amber-950/30 text-amber-400">
                      TFR in Azienda
                    </th>
                    <th colSpan={3} className="px-3.5 py-2 text-center border-r-2 border-slate-700/80 bg-purple-950/30 text-purple-400">
                      Fondo Pensione
                    </th>
                    <th colSpan={4} className="px-3.5 py-2 text-center border-r-2 border-slate-700/80 bg-emerald-950/30 text-emerald-400">
                      Portafoglio Investimenti ETF
                    </th>
                    <th colSpan={2} className="px-3.5 py-2 text-center bg-cyan-950/40 text-cyan-300">
                      Patrimonio Complessivo
                    </th>
                  </tr>

                  {/* Tier 2: Specific Column Headers */}
                  <tr className="text-[11px] font-semibold text-slate-400">
                    {/* Risparmio Personale */}
                    <th className="px-3 py-2.5 whitespace-nowrap bg-blue-950/15">{t('table.annualSalarySavings', 'Stipendio (12m)')}</th>
                    <th className="px-3 py-2.5 whitespace-nowrap bg-blue-950/15">{t('table.extra1314', 'Extra 13ª/14ª')}</th>
                    <th className="px-3 py-2.5 whitespace-nowrap bg-blue-950/15 border-r-2 border-slate-700/80">{t('table.bonusInvested', 'Bonus Investito')}</th>
                    
                    {/* TFR in Azienda */}
                    <th className="px-3 py-2.5 whitespace-nowrap bg-amber-950/15 border-r-2 border-slate-700/80 text-amber-300 font-bold">{t('table.tfrCompany', 'Saldo Azienda')}</th>
                    
                    {/* Fondo Pensione */}
                    <th className="px-3 py-2.5 whitespace-nowrap bg-purple-950/15">{t('table.pensionContrib', 'Contributi Versati')}</th>
                    <th className="px-3 py-2.5 whitespace-nowrap bg-purple-950/15 text-cyan-300/90">{t('table.tfrPensionFlow', 'TFR a Fondo')}</th>
                    <th className="px-3 py-2.5 whitespace-nowrap bg-purple-950/15 border-r-2 border-slate-700/80 text-purple-300 font-bold">{t('table.pensionBalance', 'Fondo Pensione')}</th>
                    
                    {/* ETF */}
                    <th className="px-3 py-2.5 whitespace-nowrap bg-emerald-950/15">{t('table.investContrib', 'Versamenti')}</th>
                    <th className="px-3 py-2.5 whitespace-nowrap bg-emerald-950/15 text-emerald-400">{t('table.investGains', 'Rendimento')}</th>
                    <th className="px-3 py-2.5 whitespace-nowrap bg-emerald-950/15 text-rose-400">{t('table.investFees', 'Costi / TER')}</th>
                    <th className="px-3 py-2.5 whitespace-nowrap bg-emerald-950/15 border-r-2 border-slate-700/80 text-emerald-300 font-bold">{t('table.portfolioBalance', 'Portafoglio ETF')}</th>
                    
                    {/* Patrimonio Totale */}
                    <th className="px-3 py-2.5 whitespace-nowrap bg-cyan-950/20 text-cyan-400 font-bold">{t('table.wealthNominal', 'Totale')}</th>
                    <th className="px-3 py-2.5 whitespace-nowrap bg-cyan-950/20 text-blue-400 font-bold">{t('table.wealthReal', 'Reale (Inflaz.)')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {data.map((row, idx) => {
                    const annualRegularSavings = (row.netMonthlySavings || 0) * 12;
                    const extra1314 = (row.savings13thYear || 0) + (row.savings14thYear || 0);
                    const bonusInvested = row.bonusInvestedYear || 0;
                    const tfrPensionFlow = row.tfrPensionFlowYear || 0;
                    const tfrBalance = viewMode === 'net' ? row.tfrCompanyBalanceNet : row.tfrCompanyBalanceGross;
                    const pensionBalance = viewMode === 'net' ? row.pensionFundBalanceNet : row.pensionFundBalanceGross;
                    const portfolioBalance = viewMode === 'net' ? row.investmentPortfolioBalanceNet : row.investmentPortfolioBalanceGross;
                    const totalNominal = viewMode === 'net' ? row.totalWealthNominalNet : row.totalWealthNominalGross;
                    const totalReal = viewMode === 'net' ? row.totalWealthRealNet : row.totalWealthRealGross;

                    return (
                      <tr 
                        key={row.year} 
                        className={cn(
                          "hover:bg-cyan-950/20 transition-colors",
                          idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]"
                        )}
                      >
                        {/* Anno */}
                        <td className="px-3.5 py-2.5 font-sans font-bold text-center text-slate-300 border-r-2 border-slate-700/80 bg-slate-900/40">
                          {row.year}
                        </td>

                        {/* Risparmio Personale */}
                        <td className="px-3 py-2.5 text-slate-400">{formatCurrency(annualRegularSavings)}</td>
                        <td className="px-3 py-2.5 text-slate-400">
                          {extra1314 > 0 ? formatCurrency(extra1314) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 border-r-2 border-slate-700/80">
                          {bonusInvested > 0 ? formatCurrency(bonusInvested) : '—'}
                        </td>

                        {/* TFR in Azienda */}
                        <td className="px-3 py-2.5 text-amber-300 font-medium border-r-2 border-slate-700/80 bg-amber-950/10">
                          {formatCurrency(tfrBalance)}
                        </td>

                        {/* Fondo Pensione */}
                        <td className="px-3 py-2.5 text-slate-400">
                          {formatCurrency(row.pensionContributionEmployee + row.pensionContributionEmployer)}
                        </td>
                        <td className="px-3 py-2.5 text-cyan-300/90 font-medium">
                          {tfrPensionFlow > 0 ? formatCurrency(tfrPensionFlow) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-purple-300 font-semibold border-r-2 border-slate-700/80 bg-purple-950/10">
                          {formatCurrency(pensionBalance)}
                        </td>

                        {/* Portafoglio ETF */}
                        <td className="px-3 py-2.5 text-slate-400">{formatCurrency(row.investmentContributions)}</td>
                        <td className="px-3 py-2.5 text-emerald-400/90 font-medium">{formatCurrency(row.investmentGainsYear)}</td>
                        <td className="px-3 py-2.5 text-rose-400/90 font-medium">-{formatCurrency(row.investmentFeesYear)}</td>
                        <td className="px-3 py-2.5 text-emerald-300 font-semibold border-r-2 border-slate-700/80 bg-emerald-950/10">
                          {formatCurrency(portfolioBalance)}
                        </td>

                        {/* Patrimonio Complessivo */}
                        <td className="px-3.5 py-2.5 text-cyan-400 font-bold bg-cyan-950/20">
                          {formatCurrency(totalNominal)}
                        </td>
                        <td className="px-3.5 py-2.5 text-blue-400 font-bold bg-blue-950/20">
                          {formatCurrency(totalReal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
