/**
 * Messages for validation issues (`issues.<code>`, docs/SPEC.md §5.11 and ISSUE_CODES in lib/engine/validate.ts).
 * They are shown under the field of the issue's path, so they speak about "this value" and say how to fix it.
 *
 * Convention (tested in tests/inputs/issueMessages.test.ts): every {param} sits inside a parenthetical "( … )".
 * When the engine omits a param, the UI drops that parenthetical (dropUnfilled) and the sentence still reads well.
 * Params as emitted by validatePlan / runPlan: see the comments next to ISSUE_CODES. Numbers arrive already
 * locale-formatted; money params ({cap}, {limit}) are plain numbers, so the unit is written here.
 */
const it = {
  'issues.unknownCode': 'Problema nei dati (codice «{code}»).',

  /* ── Errors: structure and types ── */
  'issues.invalidPlan': 'Il piano non è leggibile. Esportalo per conservarlo e crea un nuovo piano da un esempio.',
  'issues.missingField': 'Dato mancante: inserisci un valore.',
  'issues.invalidType': 'Dato in un formato non valido: inseriscilo di nuovo.',
  'issues.invalidNumber': 'Non è un numero valido.',
  'issues.notInteger': 'Serve un numero intero.',
  'issues.invalidOption': 'Scelta non valida (valore attuale: «{value}»): selezionane una dall’elenco.',
  'issues.negativeAmount': 'L’importo non può essere negativo.',
  'issues.pctRange': 'Percentuale fuori dall’intervallo ammesso (da {min}% a {max}%).',
  'issues.valueRange': 'Valore fuori dall’intervallo ammesso (da {min} a {max}).',

  /* ── Errors: plan rules ── */
  'issues.ageRange': 'Età non valida (ammessa da {min} a {max} anni).',
  'issues.lifeExpectancyRange': 'L’orizzonte del piano deve essere oltre la tua età attuale (da {min} a {max} anni).',
  'issues.startYearRange': 'Anno non valido (ammesso dal {min} al {max}).',
  'issues.careerEmpty': 'Aggiungi almeno una fase di lavoro: senza stipendio il piano non può stimare i risparmi.',
  'issues.careerFirstPhase': 'La prima fase deve finire dopo la tua età attuale (almeno a {min} anni).',
  'issues.careerOrder': 'Ogni fase deve finire dopo la precedente (almeno a {min} anni).',
  'issues.mensilitaRange': 'Numero di mensilità non valido (da {min} a {max}).',
  'issues.allocationSum': 'I pesi degli strumenti devono sommare a 100% (ora sommano a {sum}%).',
  'issues.duplicateAssetId':
    'Due strumenti hanno lo stesso identificativo interno (id «{id}»): elimina uno dei due e aggiungilo di nuovo.',
  'issues.unknownHoldingAsset':
    'Questa posizione è collegata a uno strumento che non è più nel portafoglio (id «{assetId}»): assegnala a uno strumento o eliminala.',
  'issues.membershipYearRange': 'Anno di iscrizione non valido (ammesso dal {min} all’anno di partenza del piano, {max}).',
  'issues.fixedAgeRange': 'L’età di ritiro deve cadere nell’orizzonte del piano (da {min} a {max} anni).',
  'issues.eventAgeRange': 'L’evento deve cadere nell’orizzonte del piano (da {min} a {max} anni).',
  'issues.eventYears': 'Un evento dura almeno un anno: scrivi 1 per una spesa o un’entrata una tantum (minimo {min}).',
  'issues.pfAccessTooEarly': 'Con questa modalità il fondo non è accessibile così presto (età minima {min} anni).',
  'issues.swrRange': 'Tasso di prelievo non valido (ammesso da {min}% a {max}%).',
  'issues.runsRange': 'Numero di simulazioni non valido (ammesso da {min} a {max}).',
  'issues.bandOrder': 'Gli scaglioni devono avere limiti crescenti, e solo l’ultimo può essere senza limite superiore.',
  'issues.coefficientsEmpty': 'Serve almeno un coefficiente di trasformazione valido.',

  /* ── Warnings ── */
  'issues.tfrBackToCompany':
    'Questa fase manda al fondo meno TFR di una fase precedente (che ne mandava il {previousPct}%): la scelta del fondo pensione è irreversibile e il TFR non può tornare in azienda.',
  'issues.returnVeryHigh':
    'Rendimento atteso molto alto (oltre il {max}% l’anno): sul lungo periodo è un’ipotesi ottimistica, valuta un valore più prudente.',
  'issues.realReturnNonPositive':
    'Al netto di costi e inflazione il portafoglio non cresce (rendimento reale atteso {realReturnPct}% l’anno): i risparmi investiti perdono potere d’acquisto.',
  'issues.capitalShareAboveLegal':
    'Quota in capitale oltre il limite di legge (massimo {max}%): è possibile solo se la rendita risultante sarebbe molto piccola.',
  'issues.ritaRequiresUnemployment':
    'Con questa età la RITA è ammessa solo se sei disoccupato da più di 24 mesi (altrimenti si può chiedere da {min} anni).',
  'issues.claimBeforeOldAge':
    'Chiedi la pensione INPS prima dell’età di vecchiaia (di norma {oldAgeAge} anni): è possibile solo con i requisiti per un’uscita anticipata, verifica di averli.',
  'issues.singleAssetConcentration':
    'Quasi tutto il portafoglio è in un solo strumento azionario (oltre il {max}%): va bene se è un ETF globale molto diversificato, altrimenti valuta di diversificare.',
  'issues.negativeSavingsWhileWorking':
    'Mentre lavori le uscite superano le entrate (la prima volta a {age} anni): il piano usa i risparmi già prima del ritiro.',
  'issues.shortfallWhileWorking': 'Mentre lavori ancora, i soldi accessibili non bastano a coprire le spese dell’anno (a {age} anni mancano circa {amount} € di oggi): con questo buco nessuna età di ritiro può funzionare, quindi non è l’obiettivo FI a mancare. Riduci o rinvia la spesa (qui l’evento «{event}»), risparmia di più negli anni prima, oppure inserisci un acquisto finanziato come anticipo più rate (un evento di più anni).',
  'issues.bonusAboveCap':
    'Il premio supera il tetto agevolato (tetto {cap} €, dai {age} anni): la parte in più è tassata come stipendio.',
  'issues.bonusIneligibleIncome':
    'Il reddito dell’anno prima supera il limite per la tassazione agevolata del premio (limite {limit} €, dai {age} anni): il premio è tassato come stipendio.',
  'issues.contributionAboveCap':
    'I contributi al fondo pensione superano il limite deducibile (limite {cap} € l’anno tra te e il datore, dai {age} anni): la parte in più non riduce le tasse, ma all’uscita non è tassata.',
  'issues.noStatePension':
    'Con i contributi previsti non maturi una pensione INPS (servono almeno {minYears} anni di contributi, {oldAgeMinYears} per la pensione di vecchiaia): il piano non ne conta nessuna.',
  'issues.pfShortMembership':
    'All’accesso al fondo avrai meno anni di iscrizione del minimo (iscritto da {years} anni, minimo {min}): verifica con il fondo che la prestazione sia possibile.',
  'issues.pfAccessAfterHorizon':
    'Il fondo pensione non viene pagato entro l’orizzonte del piano (accesso a {age} anni): quei soldi non entrano nel piano.',

  /* ── Infos ── */
  'issues.montanteEstimated':
    'Montante INPS non indicato: il piano lo stima dagli anni di contributi e dallo stipendio attuale. Per un risultato più preciso leggilo dall’estratto conto contributivo INPS.',
  'issues.bonusToFundDisabled':
    'Il premio è destinato al fondo pensione, ma il fondo è disattivato: il piano lo tratta come premio di produttività.',
  'issues.tfrPartialCheckContract':
    'Quota parziale di TFR al fondo: è ammessa se il tuo CCNL o il fondo prevede una quota minima, o se lavori da prima del 29/04/1993. Verifica il tuo contratto.',
  'issues.redemptionFallbackRita':
    'Il riscatto per inoccupazione cadrebbe negli ultimi anni prima della pensione di vecchiaia, quando non è ammesso (a {redemptionAge} anni): il piano usa la RITA (da {age} anni).',
  'issues.pfOrdinaryBenefit':
    'Con questa età di ritiro né la RITA né il riscatto sono possibili: il fondo è pagato come prestazione ordinaria alla pensione (da {age} anni).',
  'issues.pfOrdinaryBenefitLateAccess': 'Hai scelto la RITA, ma l’età di accesso non è prima della pensione di vecchiaia (accesso a {accessAge} anni, vecchiaia a {oldAge} anni): così la RITA non anticipa nulla e il fondo è pagato come prestazione ordinaria. Per anticiparlo abbassa l’età di accesso (dai {ritaAge} anni in su).',
  'issues.ritaDelayedToRetirement':
    'La RITA richiede di aver smesso di lavorare: parte quando lasci il lavoro (a {age} anni) invece che all’età di accesso indicata.',
  'issues.statePensionAfterHorizon':
    'La pensione INPS arriverebbe dopo la fine dell’orizzonte del piano (a {age} anni): non entra nel piano.',
};

const en: Record<keyof typeof it, string> = {
  'issues.unknownCode': 'Problem in the data (code “{code}”).',

  /* ── Errors: structure and types ── */
  'issues.invalidPlan': 'The plan cannot be read. Export it to keep a copy and create a new plan from an example.',
  'issues.missingField': 'Missing value: please enter one.',
  'issues.invalidType': 'Value in an invalid format: please enter it again.',
  'issues.invalidNumber': 'Not a valid number.',
  'issues.notInteger': 'A whole number is required.',
  'issues.invalidOption': 'Invalid choice (current value: “{value}”): pick one from the list.',
  'issues.negativeAmount': 'The amount cannot be negative.',
  'issues.pctRange': 'Percentage outside the allowed range (from {min}% to {max}%).',
  'issues.valueRange': 'Value outside the allowed range (from {min} to {max}).',

  /* ── Errors: plan rules ── */
  'issues.ageRange': 'Invalid age (allowed from {min} to {max}).',
  'issues.lifeExpectancyRange': 'The plan horizon must be above your current age (from {min} to {max}).',
  'issues.startYearRange': 'Invalid year (allowed from {min} to {max}).',
  'issues.careerEmpty': 'Add at least one work phase: without a salary the plan cannot estimate your savings.',
  'issues.careerFirstPhase': 'The first phase must end after your current age (at {min} at the earliest).',
  'issues.careerOrder': 'Each phase must end after the previous one (at {min} at the earliest).',
  'issues.mensilitaRange': 'Invalid number of monthly payments (from {min} to {max}).',
  'issues.allocationSum': 'The instrument weights must add up to 100% (they now add up to {sum}%).',
  'issues.duplicateAssetId': 'Two instruments share the same internal identifier (id “{id}”): delete one of them and add it again.',
  'issues.unknownHoldingAsset':
    'This holding is linked to an instrument that is no longer in the portfolio (id “{assetId}”): assign it to an instrument or delete it.',
  'issues.membershipYearRange': 'Invalid membership year (allowed from {min} to the plan’s start year, {max}).',
  'issues.fixedAgeRange': 'The retirement age must fall within the plan horizon (from {min} to {max}).',
  'issues.eventAgeRange': 'The event must fall within the plan horizon (from {min} to {max}).',
  'issues.eventYears': 'An event lasts at least one year: write 1 for a one-off expense or inflow (minimum {min}).',
  'issues.pfAccessTooEarly': 'With this mode the fund cannot be accessed this early (minimum age {min}).',
  'issues.swrRange': 'Invalid withdrawal rate (allowed from {min}% to {max}%).',
  'issues.runsRange': 'Invalid number of runs (allowed from {min} to {max}).',
  'issues.bandOrder': 'Bands must have increasing limits, and only the last one may have no upper limit.',
  'issues.coefficientsEmpty': 'At least one valid transformation coefficient is required.',

  /* ── Warnings ── */
  'issues.tfrBackToCompany':
    'This phase sends less TFR to the fund than an earlier phase (which sent {previousPct}%): choosing the pension fund cannot be undone and the TFR cannot go back to the company.',
  'issues.returnVeryHigh':
    'Very high expected return (above {max}% a year): over the long run it is an optimistic assumption, consider a more prudent value.',
  'issues.realReturnNonPositive':
    'After costs and inflation the portfolio does not grow (expected real return {realReturnPct}% a year): invested savings lose purchasing power.',
  'issues.capitalShareAboveLegal':
    'Lump-sum share above the legal limit (maximum {max}%): it is only possible if the resulting annuity would be very small.',
  'issues.ritaRequiresUnemployment':
    'At this age RITA is only allowed if you have been unemployed for more than 24 months (otherwise from age {min}).',
  'issues.claimBeforeOldAge':
    'You claim the INPS pension before the old-age pension age (normally {oldAgeAge}): this is only possible if you meet the requirements for early retirement, check that you do.',
  'issues.singleAssetConcentration':
    'Almost all the portfolio is in a single equity instrument (above {max}%): fine if it is a well-diversified global ETF, otherwise consider diversifying.',
  'issues.negativeSavingsWhileWorking':
    'While you work, outflows exceed inflows (first at age {age}): the plan uses savings even before you retire.',
  'issues.shortfallWhileWorking': 'While you are still working, your accessible money does not cover the year’s spending (at age {age} about €{amount} in today’s money is missing): with this gap no retirement age can work, so it is not the FI target that is out of reach. Reduce or postpone the expense (here the event “{event}”), save more in the years before, or enter a financed purchase as a down payment plus instalments (an event lasting several years).',
  'issues.bonusAboveCap': 'The bonus exceeds the reduced-rate cap (cap €{cap}, from age {age}): the excess is taxed like salary.',
  'issues.bonusIneligibleIncome':
    'Last year’s income exceeds the limit for the reduced bonus tax (limit €{limit}, from age {age}): the bonus is taxed like salary.',
  'issues.contributionAboveCap':
    'Pension fund contributions exceed the deductible limit (limit €{cap} a year for you and your employer, from age {age}): the excess does not lower your taxes, but it is not taxed at exit.',
  'issues.noStatePension':
    'With the planned contributions you do not qualify for an INPS pension (at least {minYears} years of contributions are needed, {oldAgeMinYears} for the old-age pension): the plan counts none.',
  'issues.pfShortMembership':
    'At fund access you will have fewer membership years than the minimum (member for {years} years, minimum {min}): check with the fund that the benefit is possible.',
  'issues.pfAccessAfterHorizon':
    'The pension fund is not paid out within the plan horizon (access at {age}): that money does not enter the plan.',

  /* ── Infos ── */
  'issues.montanteEstimated':
    'INPS contribution pot not given: the plan estimates it from contribution years and current salary. For a more accurate result read it from your INPS contribution statement.',
  'issues.bonusToFundDisabled':
    'The bonus is meant for the pension fund, but the fund is turned off: the plan treats it as a productivity bonus.',
  'issues.tfrPartialCheckContract':
    'Partial TFR share to the fund: allowed if your collective agreement (CCNL) or fund sets a minimum share, or if you have worked since before 29/04/1993. Check your contract.',
  'issues.redemptionFallbackRita':
    'The redemption for unemployment would fall in the last years before the old-age pension, when it is not allowed (at age {redemptionAge}): the plan uses RITA (from age {age}).',
  'issues.pfOrdinaryBenefit':
    'With this retirement age neither RITA nor the redemption are possible: the fund is paid as the ordinary benefit at retirement (from age {age}).',
  'issues.pfOrdinaryBenefitLateAccess': 'You chose RITA, but the access age is not before the old-age pension (access at {accessAge}, old-age pension at {oldAge}): RITA then brings nothing forward and the fund is paid as an ordinary benefit. To get it earlier, lower the access age (from {ritaAge}).',
  'issues.ritaDelayedToRetirement':
    'RITA requires that you have stopped working: it starts when you leave work (at age {age}) instead of the access age entered.',
  'issues.statePensionAfterHorizon': 'The INPS pension would start after the end of the plan horizon (at age {age}): it does not enter the plan.',
};

export const issues = { it, en };
