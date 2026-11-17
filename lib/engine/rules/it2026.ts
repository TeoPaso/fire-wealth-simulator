import type { TaxRules } from '../types';

/**
 * Italian tax & social-security parameters for an employee of the private sector, reference year 2026.
 * Verified on 2026-11-16/17 (see `sources`). Values marked "approx." in the comments are simplifications
 * the user can override in the "Regole fiscali" panel.
 */
export const IT_2026: TaxRules = {
  id: 'IT-2026',
  label: 'Italia 2026 (Legge di Bilancio 2026, L. 199/2025)',
  referenceYear: 2026,
  irpef: {
    // art. 11 TUIR as amended by L. 199/2025 art. 1 c.3: 23% / 33% / 43%
    brackets: [
      { upTo: 28000, ratePct: 23 },
      { upTo: 50000, ratePct: 33 },
      { upTo: null, ratePct: 43 },
    ],
    indexToInflation: false, // brackets are not indexed in Italy (fiscal drag)
    employeeDeduction: {
      band1Limit: 15000,
      band1Amount: 1955,
      band2Limit: 28000,
      band2Base: 1910,
      band2Extra: 1190,
      band3Limit: 50000,
      bonusFrom: 25000,
      bonusTo: 35000,
      bonusAmount: 65,
    },
    pensionerDeduction: {
      band1Limit: 8500,
      band1Amount: 1955,
      band2Limit: 28000,
      band2Base: 700,
      band2Extra: 1255,
      band3Limit: 50000,
      bonusFrom: 25000,
      bonusTo: 29000,
      bonusAmount: 50,
    },
    cuneo: {
      exemptSumBands: [
        { upTo: 8500, ratePct: 7.1 },
        { upTo: 15000, ratePct: 5.3 },
        { upTo: 20000, ratePct: 4.8 },
      ],
      extraDeductionAmount: 1000,
      extraDeductionFrom: 20000,
      extraDeductionFullUpTo: 32000,
      extraDeductionZeroAt: 40000,
    },
    // Legal minimum regional surcharge (1.23%). Regions apply progressive rates up to ~3.33%: set yours.
    regionalSurchargeBands: [{ upTo: null, ratePct: 1.23 }],
    municipalSurchargePct: 0.8, // most large municipalities apply 0.8% (approx.)
    municipalExemptionThreshold: 0,
  },
  inps: {
    employeeRatePct: 9.19,
    additionalRatePct: 1,
    additionalThreshold: 56224, // prima fascia di retribuzione pensionabile 2026 (circ. INPS 6/2026)
    ceiling: 122295, // massimale contributivo 2026
    indexThresholdsToInflation: true,
    pensionAccrualRatePct: 33, // aliquota di computo FPLD
  },
  productivityBonus: {
    ratePct: 1, // premi erogati nel 2026 e 2027 (L. 199/2025 art. 1 c.8-9)
    cap: 5000,
    priorYearIncomeLimit: 80000,
    validUntilYear: 2027,
    afterRatePct: 10, // regime ordinario L. 208/2015 if not extended (approx.)
    afterCap: 3000,
  },
  tfr: {
    divisor: 13.5, // art. 2120 c.c.
    contributionPct: 0.5, // art. 3 c.15 L. 297/1982: subtracted from the quota → ~6.91% of RAL
    revalFixedPct: 1.5,
    revalInflationSharePct: 75,
    revalTaxPct: 17, // imposta sostitutiva annua sulla rivalutazione
  },
  pensionFund: {
    deductionCap: 5300, // art. 8 c.4 D.Lgs. 252/2005 as amended by L. 199/2025, from tax year 2026
    yieldTaxPct: 20,
    govBondYieldTaxPct: 12.5,
    exitTaxMaxPct: 15,
    exitTaxMinPct: 9,
    exitTaxReductionPerYearPct: 0.3,
    exitTaxReductionAfterYears: 15,
    earlyRedemptionTaxPct: 23,
    maxCapitalSharePct: 50,
    minMembershipYears: 5,
    ritaMaxYearsEarly: 5,
  },
  investments: {
    capitalGainsPct: 26,
    govBondPct: 12.5,
    stampDutyPct: 0.2,
    cashStampDuty: 34.2,
    cashStampDutyThreshold: 5000,
    cashInterestTaxPct: 26,
  },
  statePension: {
    oldAgeAge: 67, // 67 in 2026; +1 month in 2027 and +3 months in 2028 (approx.: whole years)
    oldAgeMinYears: 20,
    fallbackAge: 71,
    fallbackMinYears: 5,
    // Coefficienti di trasformazione valid 1/1/2027–31/12/2028 (D.D. MLPS-MEF 16/10/2026).
    // 57, 58, 59, 64, 67, 68, 70, 71 from published tables; 60–63, 65, 66, 69 interpolated on the divisor (approx.).
    transformationCoefficients: {
      '57': 4.153,
      '58': 4.254,
      '59': 4.361,
      '60': 4.477,
      '61': 4.599,
      '62': 4.728,
      '63': 4.865,
      '64': 5.009,
      '65': 5.167,
      '66': 5.335,
      '67': 5.514,
      '68': 5.707,
      '69': 5.915,
      '70': 6.139,
      '71': 6.382,
    },
    installmentsPerYear: 13,
  },
  sources: [
    { key: 'irpef', label: 'IRPEF 2026: scaglioni 23/33/43% (L. 199/2025)', url: 'https://www.fiscozen.it/news/irpef-2026-come-si-calcola-alla-luce-del-taglio/' },
    { key: 'irpef2', label: 'Legge di Bilancio 2026 — misure fiscali (Confindustria)', url: 'https://public.confindustria.it/repository/2026/03/16160200/documenti-legge-di-bilancio-2026-analisi-Circolare-Legge-di-Bilancio-2026_analisi-delle-misure-fiscali.pdf' },
    { key: 'detrazioni', label: 'Detrazioni lavoro dipendente art. 13 TUIR', url: 'https://www.brocardi.it/testo-unico-imposte-redditi/titolo-i/capo-i/art13.html' },
    { key: 'cuneo', label: 'Cuneo fiscale strutturale (L. 207/2024)', url: 'https://cafinforma.it/detrazioni-lavoro-dipendente-2026/' },
    { key: 'inps', label: 'Contributi INPS 2026: soglia 1% e massimale', url: 'https://www.informazionefiscale.it/contributi-INPS-2026-dipendenti-istruzioni-calcolo-importo' },
    { key: 'addizionali', label: 'Addizionali regionali IRPEF per scaglione', url: 'https://www.pmi.it/card/addizionali-irpef-regionali-per-ogni-scaglione-di-reddito/doc/20' },
    { key: 'premio', label: 'Premi di risultato 2026-2027: 1% fino a 5.000 €', url: 'https://www.fiscal-focus.it/quotidiano/il-quotidiano/articoli-fisco/premi-di-risultato-2026-come-detassare-fino-a-5-000-euro-senza-errori,3,183981' },
    { key: 'tfr', label: 'Calcolo TFR: quota 1/13,5 meno 0,50%', url: 'https://www.pensionioggi.it/dizionario/il-tfr/amp' },
    { key: 'tfrReval', label: 'Rivalutazione TFR e imposta sostitutiva 17%', url: 'https://assolombarda.it/servizi/fisco/documenti/la-rivalutazione-del-tfr' },
    { key: 'tfrTax', label: 'Tassazione separata TFR (art. 19 TUIR)', url: 'https://www.brocardi.it/testo-unico-imposte-redditi/titolo-i/capo-i/art19.html' },
    { key: 'fpCap', label: 'Previdenza complementare: deducibilità 5.300 € dal 2026', url: 'https://www.fiscozen.it/news/previdenza-complementare-cosa-cambia-dal-2026-tra-adesione-automatica-portabilita-del-contributo-datoriale-e-nuovo-limite-di-deducibilita/' },
    { key: 'fpYield', label: 'Fondi pensione: tassazione rendimenti 20% / 12,5%', url: 'https://lavoro.gov.it/previdenza-complementare/educazione-previdenziale/incentivazione-fiscale' },
    { key: 'fpExit', label: 'Prestazioni fondo pensione: 15% → 9%', url: 'https://www.fiscoetasse.com/domande-e-risposte/1715-quali-sono-le-regole-generali-di-tassazione-delle-prestazioni-erogate-dalle-forme-pensionistiche-complementari' },
    { key: 'fpAccess', label: 'RITA, anticipazioni, riscatti', url: 'https://www.cometafondo.it/prestazioni-anticipazioni/panoramica/' },
    { key: 'cg', label: 'ETF: 26% e quota titoli di Stato al 12,5%', url: 'https://fiscoinvestimenti.it/etf-obbligazionari-tassazione-12-5-26/' },
    { key: 'bollo', label: 'Imposta di bollo e IVAFE 2026', url: 'https://quifinanza.it/fisco-tasse/imposta-bollo-ivafe-prodotti-finanziari-2026/1005389/' },
    { key: 'coeff', label: 'Coefficienti di trasformazione dal 2027', url: 'https://www.ecnews.it/lavoro/prestazioni-assistenziali-e-previdenziali/pensioni/pensioni-aggiornati-i-coefficienti-di-trasformazione-del-montante-contributivo-dal-1-gennaio-2027/' },
    { key: 'pensioner', label: 'Detrazioni redditi di pensione 2026', url: 'https://leggeinchiaro.it/detrazioni-pensione-2026-importi/' },
  ],
};

/** Deep copy of the default rules (plans own their copy so users can edit it). */
export function cloneRules(rules: TaxRules = IT_2026): TaxRules {
  return JSON.parse(JSON.stringify(rules)) as TaxRules;
}
