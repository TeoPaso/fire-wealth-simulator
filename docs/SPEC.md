# FIRE Planner Italia v2 — Engineering specification

Status: approved design for the rewrite of `fire-wealth-simulator` (v1 = commit 51eee8d).
Audience: the engineers (human or agent) implementing v2. The user-facing language of the app is Italian
(default) and English; code, comments and this spec are in English.

## 1. Why a rewrite

The v1 audit (docs/AUDIT-v1.md) found that v1 is a wealth *accumulation* calculator, not a FIRE planner:
no expenses, no FIRE number, no FI age, no decumulation, no age/pension modelling; locked wealth (pension fund,
company TFR) summed with accessible wealth; nominal/real inputs mixed; deterministic returns only; several engine
bugs (money lost when the fund is disabled, TFR formula, deduction cap ignoring employer contributions, IRR using
gross bonus, dead input fields), outdated 2026 tax rules, a UI cash-flow card with its own inconsistent maths,
and a persistence layer that wipes all scenarios after an intermediate invalid edit. v2 fixes this by design.

## 2. Product questions v2 answers

1. **At what age can I stop working?** (deterministic FI age, plus the age at which the Monte Carlo success
   probability reaches the user's target, default 90%).
2. **How confident is that?** (success probability, percentile fan chart, depletion-age histogram).
3. **What moves it most?** (tornado sensitivity on FI age).
4. **Where does my money go each year?** (gross → INPS → IRPEF → addizionali → net → expenses → savings →
   emergency fund / ETF / pension fund; retirement: pensions, withdrawals, taxes).

## 3. Non-negotiable conventions

- **Inputs in today's euros.** Every money input is in purchasing power of the start year (labelled "€ di oggi").
  Salaries grow by inflation + a *real* raise %. Expenses grow with inflation.
- **Nominal simulation.** One step per calendar year, nominal euros (needed for: non-indexed IRPEF brackets →
  fiscal drag; nominal capital gains; TFR revaluation; fixed nominal deduction cap). Every row has `priceIndex`
  (1 at t=0). UI default view = real (today's €) = nominal / priceIndex; toggle to nominal.
- **Mid-year convention** for flows: a contribution/withdrawal during year t is exposed to `sqrt(growthFactor)`.
- **Expected returns are compound (geometric/median) nominal returns before product costs.** Deterministic path
  uses them as-is; Monte Carlo uses lognormal returns whose median equals them.
- **No silent fixes.** `validatePlan(plan): Issue[]`. Errors block the computation and are shown inline next to
  the field (by `path`) and in a dashboard banner. Warnings/infos are shown but the plan runs.
- **Single source of truth.** The UI never re-implements finance. Every number displayed comes from the engine
  (payroll card included).
- **All legal parameters in `TaxRules`** (`lib/engine/rules/it2026.ts`), with a source per item, editable by
  advanced users, resettable to defaults. Nothing hard-coded elsewhere.
- **Percentages are numbers in percent** (7 = 7%) everywhere in inputs/outputs.
- Engine = pure TypeScript (no React, no DOM), deterministic given the seed, fast enough to run 1000 Monte Carlo
  paths × ~12 candidate retirement ages in < 1.5 s in a Web Worker.

## 4. Module layout

```
lib/engine/
  types.ts            CONTRACT (given; do not change shapes without updating all users)
  rules/it2026.ts     IT_2026: TaxRules (given) + cloneRules()
  defaults.ts         createDefaultPlan(), EXAMPLE_PLANS (given)
  tax/irpef.ts        irpefGross, employeeDeduction, pensionerDeduction, cuneoExtraDeduction,
                      cuneoExemptSum, surcharges (regional bands + municipal), bracket indexing helper
  tax/payroll.ts      computePayroll(input, rules): PayrollBreakdown
  tax/pensionIncome.ts netPensionIncome(grossAnnual, rules, priceIndex)
  tax/tfr.ts          tfrQuota(ral, rules), tfrRevaluationRate(inflationPct, rules), tfrSeparateTaxRatePct(...)
  tax/pensionFund.ts  exitTaxRatePct(membershipYears, rules), yieldTaxRatePct(govBondSharePct, rules)
  random.ts           mulberry32, normal (Box–Muller), cholesky (with jitter fallback)
  paths.ts            deterministicPath(plan, years), createPathGenerator(plan, years, seed) → (runIndex) => MarketPath
  portfolio.ts        buy/sell helpers with cost basis, gross-up for tax, rebalancing (flows | annual)
  simulate.ts         simulate(plan, { retirementAge, path, detail }) → { rows?, success, depletionAge, ... }
  fire.ts             findFiAge(plan, path), runPlan(plan): PlanResult
  montecarlo.ts       runMonteCarlo(plan, opts?): MonteCarloResult
  sensitivity.ts      runSensitivity(plan): SensitivityItem[]
  validate.ts         validatePlan(plan): Issue[]
  migrate-v1.ts       migrateV1State(raw): Plan[]  (best effort, never throws on partial data)
  index.ts            public API re-exports
lib/store/            planner store (external store + persistence + migrations)
lib/i18n/             messages per domain (it/en), provider, formatters
app/                  Next.js App Router UI (client-only app shell loaded with next/dynamic ssr:false)
```

## 5. Engine algorithm (per year t = 0 … T, T = lifeExpectancy − currentAge)

Notation: `age = currentAge + t`, `year = startYear + t`, `P_t` = price index at start of year (P_0 = 1,
P_{t+1} = P_t·(1+π_t)), `π_t` = inflation of year t from the path, `R` = retirement age (work stops at the start of
the year in which age = R; i.e. years with age < R are working years).

### 5.1 Salary & payroll (working years)
- Phase = first phase with `untilAge > age` (else last phase). `k = age − phaseStartAge`.
  `ral = ralToday·(1+g)^k·P_t`, `bonus = bonusGrossToday·(1+g)^k·P_t`.
- Pension contributions (only if `pensionFund.enabled`):
  `employer = employeePensionPct>0 ? ral·employerPct : 0`;
  `employee = ral·employeePct + voluntary`, voluntary = `fillCap`: max(0, room − ral·employeePct) with
  `room = max(0, min(cap − employer, ordinary income after INPS + employerExcess))` (`deductiblePensionRoom`: only
  what can actually be deducted, so a year without salary withholds nothing); `fixed`: fixedToday·P_t (paid even
  when it is not deductible). `cap = rules.pensionFund.deductionCap` (nominal, NOT indexed).
- Bonus regimes: `productivity` → `PayrollInput.productivityBonus` (eligible if prior-year employment income ≤
  limit; amount above cap taxed ordinarily; INPS due; substitute rate = ratePct while year ≤ validUntilYear, else
  afterRatePct/afterCap; the cap is measured on the bonus NET of employee INPS, circ. AdE 28/E/2016); `ordinary` → `ordinaryBonus`; `pensionFund` → goes entirely to the fund, no IRPEF, no
  employee INPS, outside the cap, not taxed at exit (if fund disabled: treated as `productivity` + info issue);
  `welfare` → tax-free benefit counted as income (offsets expenses).
- `computePayroll`:
  1. INPS = employeeRate·min(base, ceiling) + additionalRate·max(0, min(base, ceiling) − additionalThreshold),
     base = ral + ordinaryBonus + productivityBonus. If `indexThresholdsToInflation`, additionalThreshold and ceiling
     are multiplied by `priceIndex` (thresholds are expressed in referenceYear euros; startYear is assumed = referenceYear).
  2. deductibleEmployee = min(employee, room) with room as above (the cap left by the employer, limited by the
     income it is deducted from); nonDeductible = employee − deductibleEmployee; employerExcess = max(0, employer −
     cap) (taxable).
  3. Productivity bonus within cap: taxedBase = bonusWithinCap − its INPS; substituteTax = rate·taxedBase.
     Excess over cap joins ordinary income.
  4. employmentIncome (RLD) = ral + ordinaryBonus + bonusExcess − INPS(on those) − deductibleEmployee + employerExcess.
     taxableIncome = RC = RLD (no other income).
  5. irpefGross by brackets (× indexing factor if `irpef.indexToInflation`); employeeDeduction(RC);
     cuneoExtraDeduction(RC); irpefNet = max(0, gross − deductions).
  6. Surcharges on taxableIncome: regional by bands, municipal flat unless ≤ exemption threshold.
  7. cuneoExemptSum = pct(band)·RLD if RLD ≤ last band upTo (ADDED to net, not taxable).
  8. netIncome = gross − INPS − irpefNet − surcharges − substituteTax − employee + cuneoExemptSum +
     supplementaryTreatment (trattamento integrativo, tax-free).
  9. pensionTaxSaving = (net fiscal burden computed with deductibleEmployee = 0 and employerExcess unchanged) −
     (net fiscal burden actual), where net fiscal burden = irpefNet + surcharges − cuneoExemptSum −
     supplementaryTreatment (so it includes the loss/gain of the tax-free sums). marginalRatePct by finite
     difference (+100 €) on the same burden.
- No "IRPEF rebate" flow exists: payroll contributions are deducted at source, so the benefit is already inside
  `netIncome` (and therefore inside savings). This removes v1's rebate double counting.

### 5.2 TFR
- `quota = ral/divisor − contributionPct%·ral` (≈ 6.91% of RAL). Bonuses excluded.
- `toFund = enabled ? quota·tfrToFundPct% : 0`; `toCompany = quota − toFund`.
- Company TFR: `reval = start·(fixed% + share%·π_t)`; `revalTax = max(0, reval)·17%`;
  `end = start + reval − revalTax + toCompany`. Track `tfrPrincipal` (sum of quotas + initial balance) and
  `tfrYears` (initial companyTfrYears + working years with toCompany > 0).
- Payout at the first retired year (job exit): `rate = tfrSeparateTaxRatePct(principal, years)` = average IRPEF
  rate (brackets only, no deductions) on the reference income `principal/years·12` (if years = 0 use principal);
  `tax = principal·rate` (revaluations already taxed); net → inflow of that year.

### 5.3 Pension fund
- Start balance B, contributions C = employee + employer + toFund + bonusToFund (working years only).
- growth `G = (1+r)(1−cost)`; `endPreTax = B·G + C·sqrt(G)`; `result = endPreTax − B − C`.
  `pfCosts = (B(1+r) + C·sqrt(1+r)) − endPreTax`; `pfReturn = result + pfCosts`.
- Yield tax: `yieldTaxRatePct(govShare) = yieldTaxPct − (yieldTaxPct − govBondYieldTaxPct)·govShare/100`
  (white-list bond income counts at 62.5% → 20% becomes 12.5% on that share).
  Tax only positive results after offsetting carried-forward negative results (`lossCarry`).
- `taxableBasis += deductibleEmployee + min(employer, cap) + toFund` (non-deductible employee money and
  bonus-to-fund are exempt at exit).
- Access depends on `pensionFund.accessMode` (fund position V, taxable share `taxableBasis/V`, exit-tax rate
  `exitTaxRatePct(year − membershipStartYear)` applied to the taxable share of every payment; fund balance → 0 when fully paid):
  - `retirement` (ordinary benefit) at `A = max(accessAge, R)` (accessAge ≥ oldAgeAge expected): lump = V·capitalShare%
    (legal max 50%); annuity on the rest at annuityRatePct (nominal constant), paid yearly until lifeExpectancy.
  - `rita`: accessAge ≥ oldAgeAge − ritaMaxYearsEarly (− ritaMaxYearsEarlyUnemployed if the user declares > 24 months
    of unemployment: warning `ritaRequiresUnemployment`). RITA needs the job to have ended, so it starts at
    `max(accessAge, R)` (info `ritaDelayedToRetirement` when R > accessAge); pay the whole position in yearly
    instalments from that age until oldAgeAge (balance keeps growing; instalment = balance/remainingYears). If that
    start is not before oldAgeAge, the position is paid as an ordinary benefit (info `pfOrdinaryBenefit`, or
    `pfOrdinaryBenefitLateAccess` {age, accessAge, oldAge, ritaAge} when accessAge itself is ≥ oldAgeAge).
  - `redemption` (riscatto totale per inoccupazione, art. 14 c.2 D.Lgs. 252/2005): 100% lump sum at
    `R + redemptionAfterUnemployedYears`, taxed like a benefit; if that age is within `redemptionBlockedYearsBeforeOldAge`
    of oldAgeAge, fall back to RITA from `max(oldAgeAge − redemptionBlockedYearsBeforeOldAge, R)` (info
    `redemptionFallbackRita`); if R ≥ oldAgeAge, ordinary benefit at R (info `pfOrdinaryBenefit`).
  - Locked money is never available before these events. Anticipazioni (23%) are not modelled.
  - Locked wealth: before payment the fund counts at `pensionFundNet` (redeemed at the ordinary exit-tax rate). After
    an ordinary benefit, the annuity counts as `pensionAnnuityValue` = end-of-year value of the remaining net payments
    (mid-year, until lifeExpectancy), discounted at the fund line's expected return net of costs and yield tax
    (floored at 0). `lockedNet = pensionFundNet + companyTfrNet + pensionAnnuityValue`.
- membership < minMembershipYears at access → warning issue; still paid.

### 5.4 State pension (INPS)
- `estimate`: net = monthlyNetToday·installmentsPerYear·P_t from claimAge (indexed with inflation by construction).
- `contributivo`: montante_0 = `assets.inps.montante` or, if 0, estimate `contributionYears·33%·RAL_0·0.85`
  (info issue `montanteEstimated`). Each year: montante ·= (1 + π_t + realGdpGrowth%); then if working
  `+= 33%·min(ral + ordinaryBonus + productivityBonus, ceiling)` (the same base INPS is charged on; welfare and
  bonus-to-fund excluded). contributionYears += 1 per working year with an INPS base > 0 (a career break with RAL 0
  does not count; years are not credited pro rata to the weekly minimum).
  Claim age = max(claimAge, oldAgeAge) if years ≥ oldAgeMinYears else max(fallbackAge, claimAge) if years ≥
  fallbackMinYears else none (warning); never before R (in `estimate` mode too: max(claimAge, R)), since the pension
  requires leaving the job. Gross annual at claim = montante·coefficient[claimAge]%; afterwards indexed by
  `indexationPct%·π_t`. Net via `netPensionIncome` (pensioner deductions + surcharges, IRPEF brackets).

### 5.5 Living costs, events, cash
- Working: `monthlyToday·12·P_t`; retired: × `retirementPct%`. Guardrails: if withdrawal rate (withdrawals /
  start accessible) > swr·1.2 then spending ×(1−cut%) for that year (recorded in `spendingCutPct`).
- Events: amountToday·P_t for each active year (positive → eventsExpense, negative → eventsInflow).
- Cash interest = cash_start·cashRate%·(1 − cashInterestTax%). Stamp duty = portfolio_start·stampDuty% +
  (cash_start > threshold ? cashStampDuty : 0). Both paid this year.

### 5.6 Waterfall
`inflows = netIncome(+welfare) + cashInterestNet + eventsInflow + statePensionNet + pensionAnnuityNet +
 pfLumpSumNet/RITA + tfrPayoutNet`;
`netSavings = inflows − livingExpenses − eventsExpense − stampDuty`.
- netSavings ≥ 0: EF target = emergencyFundMonths × current monthly spending (nominal). Fill cash to target,
  rest → portfolio (`flows`: buy underweight assets first; `annual`: buy at target weights then rebalance at year end).
- netSavings < 0: need = −netSavings. Source order: cash above EF target → portfolio sale (gross-up for tax:
  gross = need / (1 − Σ w_i·gainFrac_i·tax_i), sold from overweight first in `flows` mode, pro-rata in `annual`)
  → remaining cash → shortfall (plan fails; `depletionAge` = first age with shortfall > 0.5 €).
- A shortfall in a WORKING year (life events included) makes every later retirement age fail in that same year:
  post-run warning `shortfallWhileWorking` {age, amount (today's €), event (label of the year's largest expense
  event)} with path `spending.events[i].amountToday` (or `spending.monthlyToday`); the headline names this cash gap
  instead of "FI not reachable". No borrowing is modelled: a financed purchase is a down payment + a multi-year event.
- Locked money is NEVER used before its unlock event.

### 5.7 Portfolio mechanics
Per asset i: `G_i = (1+r_i)(1−ter_i)`; `end_i = V_i·G_i + (buy_i − sell_i)·sqrt(G_i)`; cost basis `+= buy_i`,
`−= basis_i·sell_i/mid_i` on sales, with the gain fraction measured at the mid-year value `mid_i = V_i·sqrt(G_i)`
(when the flows happen), not at the start-of-year value V_i. Annual rebalancing at year end sells
overweight assets realising gains tax (paid from proceeds). Latent tax = Σ max(0, V_i − basis_i)·tax_i
(ETF losses are not offsettable → no negative latent tax).

### 5.8 FI age
`success(R)` = deterministic simulation with retirement at R has no shortfall through lifeExpectancy.
`fiAge` = min R in [currentAge, lifeExpectancy] with success (linear scan; null if none).
Displayed plan: `retirementAge = mode==='fixedAge' ? fixedAge : (fiAge ?? statePension claim age)`.
Classic FIRE number (shown as a reference, not used for fiAge): `monthlyToday·12·retirementPct% / swrPct%`.

### 5.9 Monte Carlo
- Correlated normals via Cholesky over [risky assets…, pension fund] (+ independent inflation).
  Correlations: equity–equity 0.85, bond–bond 0.7, equity–bond = plan.portfolio.equityBondCorrelation,
  other–anything 0.5, cash vol 0 (excluded), fund–equity = pensionFund.equityCorrelation, fund–bond 0.5.
- Log-return of asset i: `N(ln(1+E_i), s_i)` with `s_i = sqrt(ln(1 + σ_i²/(1+E_i)²))`. Inflation:
  `π + σπ·clamp(z, −3, 3)` (z standard normal): the symmetric ±3σ clip keeps the mean and the median at π for every
  valid input (a fixed [−3%, 15%] range biased the mean of high or negative inflation inputs).
- Paths come from seed + run index, identical across candidate retirement ages (common random numbers).
- successByRetirementAge for ages in [max(currentAge, fiAgeDet−3), min(lifeExpectancy, fiAgeDet+10)]
  (or up to claim age if fiAge null); confidentFiAge = min age with success ≥ target.
- Percentiles (today's €) for the displayed retirementAge.

### 5.10 Sensitivity (deterministic fiAge)
returns ±1 pp (all assets + fund), inflation ±1 pp, spending ±10%, salary ±10%, retirementPct ±10 pp,
lifeExpectancy ±5 y, state pension ±20% (estimate amount or transformation coefficient).

### 5.11 Validation codes (non-exhaustive, i18n key `issues.<code>`)
Errors: `ageRange`, `lifeExpectancyRange`, `careerEmpty`, `careerOrder`, `careerFirstPhase`, `negativeAmount`,
`pctRange`, `mensilitaRange`, `allocationSum`, `unknownHoldingAsset`, `fixedAgeRange`, `eventAgeRange`,
`eventYears`, `pfAccessTooEarly`, `swrRange`, `runsRange`.
Warnings: `tfrBackToCompany` (a later phase sends less TFR to the fund than an earlier one: the choice of the fund is irreversible), `returnVeryHigh` (> 8%), `realReturnNonPositive`, `capitalShareAboveLegal`,
`ritaRequiresUnemployment` (accessAge < oldAgeAge − 5), `claimBeforeOldAge`, `singleAssetConcentration`
(> 80% one equity asset), post-run: `negativeSavingsWhileWorking`, `shortfallWhileWorking`, `bonusAboveCap`,
`bonusIneligibleIncome`, `contributionAboveCap`, `noStatePension`, `pfShortMembership`, `pfAccessAfterHorizon`.
Infos: `montanteEstimated`, `bonusToFundDisabled`, `tfrPartialCheckContract` (0 < tfrToFundPct < 100: allowed only if your CCNL/fund sets a minimum share or you enrolled before 29/04/1993), post-run: `redemptionFallbackRita`,
`pfOrdinaryBenefit`, `pfOrdinaryBenefitLateAccess`, `ritaDelayedToRetirement`, `statePensionAfterHorizon`.
The authoritative list is `ISSUE_CODES` in `lib/engine/validate.ts` (a unit test checks that every code has it/en
messages).

## 6. Store & persistence (lib/store)
- `PlannerState { version: 2; plans: Plan[]; activePlanId; compareIds; ui: { lang: 'it'|'en'; valueMode:
  'real'|'nominal' } }`, key `fire-planner:v2`.
- First load: if no v2 key and legacy `fire_wealth_simulator_v1` exists → `migrateV1State` (best effort, legacy key
  left untouched) + banner. Unparseable JSON → copy raw to `fire-planner:backup:<iso>` and start from examples +
  banner. Each plan is deep-merged over `createDefaultPlan()` (forward-compatible), never dropped.
- Invalid plans are persisted as-is (they are editable drafts); the engine just doesn't run them.
- Writes debounced (250 ms) and on `pagehide`; `storage` event → reload (multi-tab). Quota errors → banner.
- Actions: create (from example), duplicate (deep clone, new ids), delete (confirm, keep ≥ 1), rename,
  update(id, recipe), setActive, toggleCompare, export (JSON file), import (validate → add as new plans, never
  replace silently), reset to examples (confirm), setLang, setValueMode.
- The app shell is client-only (`next/dynamic` ssr:false) to avoid hydration mismatch and default-data flash.

## 7. UI
- Header: logo + "FIRE Planner", plan selector, IT/EN, € oggi / nominale toggle, menu (export, import, reset).
- Desktop: inputs column (~440px, scrollable) + results. Mobile (< 1024px): bottom tab bar "Dati" / "Risultati".
- Input sections (accordion, each with an inline summary): Profilo · Lavoro e carriera (phase list + timeline
  bar) · Spese ed eventi · Patrimonio attuale · Investimenti (assets table + allocation sum meter) · Fondo
  pensione e TFR · Pensione INPS · Ritiro e prelievi · Mercato e simulazione · Regole fiscali (avanzate, with
  sources + reset).
- NumberField: label, unit ("€ oggi", "%", "anni"), help tooltip, local draft string (allows "1," while typing,
  commits valid numbers), inline issue messages by path, `aria-invalid`, `aria-describedby`.
- Results tabs: Panoramica · Flussi · Anno per anno · Sensibilità · Confronto · Ipotesi e fonti.
  - Panoramica: headline card (FI age, "tra N anni, nel YYYY", confident FI age @target%, success probability at the
    displayed retirement age, FIRE number, progress bar), wealth stacked area (accessible vs locked, markers at
    retirement / fund access / state pension), Monte Carlo fan chart, success-by-retirement-age chart, insights
    (bridge length, % locked, savings rate, warnings).
  - Flussi: per-year stacked bars (net income, taxes, expenses, savings / withdrawals, pensions) + payroll card for
    a selected year (gross → INPS → IRPEF → deductions → surcharges → net; monthly net by mensilità; pension tax
    saving) — all from `rows[t].payroll`.
  - Anno per anno: grouped table (income, taxes, savings, TFR, fund, portfolio, balances, accessible/locked/net
    worth), real/nominal, CSV export.
  - Sensibilità: tornado chart. Confronto: table + overlay chart of compared plans. Ipotesi e fonti: conventions,
    every TaxRules value with source link, disclaimer ("non è consulenza finanziaria").
- Monte Carlo + sensitivity run in a Web Worker (`new Worker(new URL(..., import.meta.url))`), debounced 400 ms,
  with stale-result indicator; deterministic `runPlan` runs synchronously (memoised).
- Accessibility: `<html lang>` synced, zoom allowed (no maximumScale), text contrast ≥ 4.5:1, focus rings, every
  input labelled, charts have aria-labels and a table alternative. Responsive 360–1920px without horizontal scroll.
- i18n: messages split by domain (`lib/i18n/messages/<domain>.ts` exporting `{ it, en }`), `t(key, params)`,
  locale-aware formatters (`useFormat()`); a unit test asserts identical key sets and that every `t('…')` key used in
  `app/` exists. No user-visible literal strings in components.
- Visual style: dark, calm "fintech" (slate/cyan/emerald accents), glass cards kept subtle, Inter font, light
  motion only (respect `prefers-reduced-motion`).

## 8. PWA
- Manifest: name "FIRE Planner Italia", icons purpose `any` (existing PNGs), lang/dir, start_url `/`.
- SW (`public/sw.js`): cache named after a content hash of the build; precache `/`, manifest, icons and every
  file of the build (list injected into `out/sw.js` by `scripts/sw-precache.mjs`, the `postbuild` step; the page
  also posts the asset URLs it loaded, so one online visit is enough even without the list); old caches and stale
  chunks are deleted on activate. Cache-first for `/_next/static/` (worker scripts answered with a URL-less copy so
  Turbopack's `#params=` worker bootstrap keeps its fragment); only the app page (`/`, `/index.html`, any query
  string) is handled for navigations: network-first, cached shell when offline, on 5xx or after 4 s; redirected
  responses stored without the redirect flag; never cache non-OK responses. Registered in a client effect
  immediately (no `load` listener), skipped in development. Deploy with `npm run build` (not `npx next build`).

## 9. Testing
- Unit (vitest): payroll vs hand-computed 2026 cases (35k/48k/60k RAL, ≤20k cuneo case, >56,224 INPS case,
  pension deduction incl. employer within cap), TFR quota 6.907%, TFR revaluation tax, exit-tax schedule, yield-tax
  with gov share, productivity bonus (1% 2026–27, cap, ineligible > 80k, after 2027), pensioner IRPEF.
- Engine invariants: zero returns/zero inflation/zero taxes conservation (Σ inflows − outflows = Δ balances every
  year); compound-interest acceptance test; disabling the fund never destroys money; seed reproducibility; FI age
  monotonic in spending and savings; shortfall detection; RITA/lump/annuity paths; migration v1 → v2.
- Store: corrupted storage → backup + defaults; invalid plan persisted and reloaded intact; legacy migration.
- i18n key parity + used-keys test.
- E2E smoke (`npm run e2e`, plain Node + preinstalled `playwright`): loads without console errors, FI age visible,
  EN toggle leaves no Italian strings in main UI, 375px and 1440px no horizontal overflow, edit a field → result
  changes, reload → edit persisted, service worker registered in production build, offline reload with the
  analysis still in the Web Worker, offline cold start in a fresh browser after one online visit, headline numbers
  equal to the engine's, no console errors during the whole run.
