# Audit della v1 (commit `51eee8d`)

Questo documento elenca **tutti i problemi verificati** della prima versione del simulatore (cartelle `app/`, `lib/`, `tests/` del commit `51eee8d`). I percorsi e i numeri di riga si riferiscono a quel commit: per leggerli usa `git show 51eee8d:<percorso>`.

## Metodo

- Cinque revisori indipendenti hanno analizzato aree diverse: motore di calcolo, fiscalità italiana 2026, metodologia FIRE, coerenza dell'interfaccia, architettura/persistenza/test. Ogni rilievo numerico è stato **riprodotto eseguendo il codice** con script dedicati.
- Ogni rilievo è stato poi passato a un **verificatore avversariale** che ha cercato di confutarlo rileggendo il codice, rifacendo i calcoli e, per le questioni normative, ricontrollando le fonti (Legge di Bilancio 2026, TUIR, D.Lgs. 252/2005, circolari INPS/AdE).
- Un **critico di completezza** ha cercato i problemi sfuggiti alle cinque aree; anche i suoi rilievi sono stati verificati.

Risultato: **106 rilievi**, di cui **105 confermati** (in tutto o in parte) e 1 respinto.

| Gravità | Confermati |
|---|---|
| Critico | 7 |
| Alto | 27 |
| Medio | 52 |
| Basso | 19 |

Scala: *critico* = numeri sbagliati in modo tale da cambiare la decisione di quando smettere di lavorare, oppure perdita di dati; *alto* = numero o logica chiaramente sbagliati, o output fuorviante nell'uso normale; *medio* = errato in casi limite o capacità importante mancante; *basso* = imprecisione minore o problema cosmetico.

## In breve: i problemi che contano di più

1. **Non è un pianificatore FIRE.** Mancano spese, tasso di risparmio, FIRE number, età di indipendenza finanziaria, fase di decumulo, età, aspettativa di vita e pensione INPS. L'app proietta solo l'accumulo e non risponde alla domanda "quando posso smettere di lavorare?" (FIRE-01, FIRE-02, FIRE-09).
2. **Perdita totale dei dati.** Ogni modifica intermedia non valida viene salvata; al ricaricamento tutti gli scenari tornano ai preset e il primo clic sovrascrive il salvataggio (UI-01, ARCH-01, CRIT-02).
3. **Denaro che sparisce dal patrimonio.** Disattivando il fondo pensione, il TFR destinato al fondo esce dal patrimonio (−134.065 € nel preset Base) e, con una quota di risparmi destinata al fondo, si perdono fino a 478.184 € (ENG-01, ENG-02).
4. **Valori nominali e reali mescolati.** RAL e risparmi sono importi nominali fissi per 5–15 anni e l'interfaccia non dice se vanno inseriti in euro di oggi (FIRE-04).
5. **Patrimonio bloccato contato come disponibile.** Il fondo pensione, accessibile di regola alla pensione (salvo RITA, riscatti e anticipazioni), è sommato al patrimonio liquido come se fosse riscattabile ogni anno al 12% (FIRE-03, TAX-08).
6. **Formula del TFR sbagliata** (+6,7% ogni anno) e test che la certificano come corretta (ENG-04, TAX-01, TEST-01).
7. **Deducibilità del fondo pensione errata.** Il tetto non considera il contributo del datore e non è aggiornato ai 5.300 € del 2026 (ENG-07, TAX-04, TAX-11).
8. **Regole fiscali 2026 superate.** IRPEF al 35% invece del 33%, premio di risultato al 5% invece dell'1% e senza contributi INPS, nessuna imposta del 17% sulla rivalutazione del TFR, una sola aliquota marginale per tutta la carriera (TAX-03, TAX-05, TAX-06, TAX-07).
9. **Il cruscotto mostra i risultati di uno scenario diverso** da quello inserito: le allocazioni vengono rinormalizzate in silenzio (ENG-12, ARCH-08, UI-11).
10. **Campi che non fanno nulla.** "Imposta rendimenti interni" del fondo e destinazione TFR globale non hanno effetto sui calcoli (ENG-03, UI-05, UI-06).
11. **Nessuna gestione del rischio.** Rendimenti costanti, nessun Monte Carlo né rischio di sequenza; i risparmi sono scollegati da reddito e spese, quindi si può "risparmiare" più di quanto si guadagna (FIRE-05, FIRE-08).
12. **PWA e accessibilità.** Il service worker non viene mai registrato, il toggle EN lascia 72 testi in italiano, lo zoom è bloccato, Next.js 14 ha vulnerabilità note senza patch nella linea 14.x (UI-10, UI-16, UI-18, ARCH-13).


## Indice per area

- [Motore di calcolo](#motore-di-calcolo) — 22 rilievi
- [Fiscalità e normativa 2026](#fiscalità-e-normativa-2026) — 16 rilievi
- [Metodologia FIRE e ipotesi del piano](#metodologia-fire-e-ipotesi-del-piano) — 13 rilievi
- [Interfaccia e coerenza dei dati](#interfaccia-e-coerenza-dei-dati) — 22 rilievi
- [Architettura, persistenza, PWA e test](#architettura-persistenza-pwa-e-test) — 24 rilievi
- [Critico di completezza](#critico-di-completezza) — 8 rilievi

## Motore di calcolo

### ENG-01 · Critico · Fondo pensione disattivato: il TFR destinato al fondo sparisce

*Dove:* `lib/engine/calculator.ts:413` · *Verifica:* confermato

La quota di TFR da mandare al fondo (tfrPensionFlow) viene calcolata da tfrPensionAllocPct, che legge prima l'override di fase (r. 401-405), senza controllare pensionFund.enabled. Quella quota entra nel fondo solo dentro `if (pensionFund.enabled)` (r. 434-462 e 523-536). Con il fondo spento, tfrCompanyFlow vale 0 e tfrPensionFlow non va da nessuna parte: il TFR esce dal patrimonio. Viene comunque sommato in cumContributions (r. 597) e nei flussi dell'IRR (r. 515). Il caso è molto facile da raggiungere: tutte le fasi dei preset e ogni nuova fase creata dalla UI (SalaryPhasesForm.tsx r. 70, 92, 108) hanno tfrPensionAllocationPercent: 100. Inoltre i chip TFR per fase restano visibili anche a fondo disattivato. Basta quindi spegnere il toggle del fondo per perdere tutto il TFR futuro.

**Evidenza (verifica indipendente):** Script (script di verifica), preset Base con enabled=false. Anno 1: tfrAccrued 2579.63, pensFlow 2579.63, compFlow 0.00, fondo fermo a 3000.00, TFR in azienda 4120.00. TFR maturato in 30 anni 114,609.26 €, ma TFR in azienda all'anno 30 solo 9,709.05 €. Netto finale 1,147,599.27 € (IRR 3.28%) contro 1,281,663.99 € (IRR 3.98%) con TFR in azienda: differenza 134,064.73 €. Nel mondo a rendimento zero il buco tra contributi e patrimonio lordo è 114,609.26 €, esattamente il TFR scomparso.

**Correzione proposta:** Calcolare la quota effettiva: `const effTfrPct = pensionFund.enabled ? tfrPensionAllocPct : 0`, così con il fondo spento tutto il TFR resta in azienda. Nella UI disabilitare o nascondere i chip TFR e risparmio per fase quando il fondo è spento. Aggiungere un test di conservazione: con rendimenti a zero, il patrimonio lordo deve essere uguale al capitale iniziale più tutti i flussi entrati.

### ENG-02 · Critico · Fondo disattivato con savingsToPensionPercent > 0: parte dei risparmi viene distrutta e il costo fiscale gonfiato

*Dove:* `lib/engine/calculator.ts:479` · *Verifica:* confermato

savingsToPensionYear è azzerato quando il fondo è spento (r. 393), quindi savingsToPortfolioYear e actualPersonalPortfolioContributionsYear contano il 100% dei risparmi. I flussi mensili davvero versati nei bucket (baseMonthlyPortfolio, savings13thPortfolio, savings14thPortfolio, bonusInvestedPortfolio, r. 479-482) applicano invece sempre `(1 - pAllocPct/100)`, senza guardare enabled. La quota pAllocPct non entra né nel portafoglio né nel fondo: è persa. Il costo fiscale (r. 509) aumenta comunque dell'intero importo, quindi la plusvalenza latente e la relativa tassa risultano sottostimate. Lo stesso accade con l'override di fase savingsToPensionPercent, che nella UI resta sempre visibile (SalaryPhasesForm.tsx r. 345). Anche il valore globale resta salvato dopo aver spento il fondo.

**Evidenza (verifica indipendente):** v1.ts e v6.ts, preset Base con fondo spento, TFR in azienda e savingsToPension 50. Anno 1: investmentContributions 10,575.00 e gains -4,323.37 (contro +1,065.13 con p=0). Portafoglio lordo all'anno 30: 700,509.44 € contro 1,319,019.32 €. Netto 803,480.21 € contro 1,281,663.99 € (-478,183.79 €), con contributi identici (677,984.26 €) e IRR 0.87% contro 3.98%. Costo fiscale registrato 551,375.00 € contro 283,187.50 € realmente entrati; imposta latente mostrata 46,209.93 €. Override al 100% della sola fase 3: netto 894,640.77 €, anno 16 con contributi 21,500 e rendimento -695.16.

**Correzione proposta:** Calcolare una sola volta `effPensionPct = pensionFund.enabled ? clamp(pAllocPct,0,100) : 0` e usarla per savingsToPensionYear, per tutti i flussi *Portfolio mensili e per il costo fiscale. Meglio ancora, ricavare costBasis dalla somma dei flussi mensili effettivamente aggiunti a ogni bucket e non dall'aggregato annuale.

### ENG-03 · Alto · Il campo UI 'Imposta Rendimenti Interni' del fondo non ha effetto: il motore legge un altro campo non modificabile

*Dove:* `lib/engine/calculator.ts:524` · *Verifica:* confermato

La UI (PensionFundForm.tsx r. 254-256) modifica pensionFund.annualYieldTaxRatePercent, definito in types.ts r. 59 e normalizzato in sanitize (r. 228). Il motore però usa solo taxes.pensionAnnualYieldTaxRate (r. 524), che nessun form permette di modificare (TaxConfigForm non lo espone). L'utente vede il campo, lo cambia, e i numeri restano identici. Ci sono quindi due fonti di verità per lo stesso parametro, e una delle due è morta.

**Evidenza (verifica indipendente):** v1.ts, fondo all'anno 30. Preset Base: 274,840.36 €. Con pensionFund.annualYieldTaxRatePercent=0: 274,840.36 € (nessun effetto). Con taxes.pensionAnnualYieldTaxRate=0: 311,534.38 €.

**Correzione proposta:** Tenere un solo campo. Ad esempio leggere `pensionFund.annualYieldTaxRatePercent ?? taxes.pensionAnnualYieldTaxRate ?? 20`, oppure eliminare uno dei due con una migrazione dello storage. Il default deve essere lo stesso nel motore e in sanitize.

### ENG-04 · Alto · Formula TFR sbagliata: lo 0,50% viene tolto dalla quota TFR invece che dalla retribuzione

*Dove:* `lib/engine/calculator.ts:408` · *Verifica:* confermato

Il motore calcola tfrAccruedYear = RAL·(1−0,5%)/13,5 = 7,37% della RAL. Per legge (art. 2120 c.c. e L. 297/1982) la quota annua è RAL/13,5 (7,41%) meno lo 0,50% della retribuzione imponibile, cioè circa 6,91% della RAL. Il motore sovrastima quindi ogni quota di TFR di circa il 6,7%. Il risultato non rispetta né la legge né il criterio di accettazione 'TFR = RAL/divisore' (ORIGINAL_REQUEST.md r. 61). È anche incoerente con MonthlyDisposableCashflow.tsx r. 133, che usa ral/tfrDivisor. A peggiorare le cose, il default di tfrSubtractedPercentage è 0 nel motore (r. 407) e 0,5 in sanitize (r. 243).

**Evidenza (verifica indipendente):** v2.ts. RAL 35k: motore 2,579.63, legale 2,417.59 (+162.04). RAL 48k: +222.22. RAL 60k: +277.78. RAL 30k: motore 2,211.11, legale 2,072.22, RAL/13.5 = 2,222.22. Preset Base su 30 anni: TFR 114,609.26 contro 107,410.19; fondo all'anno 30 274,840.36 contro 263,936.96; netto +10,039.51 €. Preset Pessimistico, TFR in azienda all'anno 30: 158,501.40 contro 149,178.90. Fonti: pensionioggi.it (6.91%), centrofiscale.com (esempio da 30k).

**Correzione proposta:** `tfrAccruedYear = ral / tfrDivisor - ral * (tfrSubtractedPct/100)`, con default 0,5 sia nel motore sia in sanitize. Correggere l'etichetta UI ('Contributo 0,50% L.297/82 su retribuzione'). Allineare MonthlyDisposableCashflow alla stessa funzione condivisa.

### ENG-05 · Alto · Con autoMaxDeductibility, capitale versato, IRR e rendimento usano una % dipendente vecchia e diversa da quella simulata

*Dove:* `lib/engine/calculator.ts:513` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Con autoMaxDeductibility il motore versa nel fondo, anno per anno, (tetto − contributo datore) (r. 439-446). I flussi dell'IRR (r. 513-515) e cumContributions (r. 595) usano invece ral × pensionFund.employeeContributionPercent, cioè la % che la UI salva una sola volta al momento del toggle, calcolata sulla RAL della prima fase (PensionFundForm r. 154-186, arrotondata a 2 decimali). Quando la RAL cambia, 'Capitale Versato', 'Rendimento Netto' e TIR non corrispondono più ai soldi effettivamente versati. Nel preset Base con autoMax attivo (12.76%), il Capitale Versato è gonfiato di 74,580.90 € e il TIR mostrato è 3.75%, contro 4.20% ricalcolato sui contributi reali. Il patrimonio resta corretto. Se la % rimane a un valore diverso, ad esempio 2%, l'errore va nel verso opposto: contributi sottocontati di 92,737 € e TIR gonfiato al 4.96%.

**Evidenza (verifica indipendente):** v2.ts e v6.ts. Con emp=2%: contributo effettivo 4,464.57 / 4,204.57 / 3,964.57 (anni 1/6/16) contro 700 / 960 / 1,200 contati; mancano 92,737.10 €; mondo a zero 136,080.08 € di 'guadagni', IRR 0.89%. Con 12.76% (valore della UI): patrimonio identico 1,632,320.23 €, Capitale Versato 907,502.26 € con un eccesso di 74,580.90 € (contati 198,418.00 contro 123,837.10 reali), IRR mostrato 3.75% contro 4.20% ricalcolato sui contributi reali.

**Correzione proposta:** Calcolare una volta per anno `employeePayrollContribution` (con la stessa logica autoMax) e riusarla per il fondo, per i flussi IRR, per cumContributions e per la riga della tabella. In generale, derivare tutti gli aggregati da un unico registro di flussi mensili.

### ENG-07 · Alto · Tetto di deducibilità applicato al solo contributo dipendente: rimborso IRPEF e base dell'imposta in uscita sovrastimati

*Dove:* `lib/engine/calculator.ts:452` · *Verifica:* confermato

Il tetto (5,164.57 €, dal 2026 5,300 €) vale per la somma di contributi del dipendente e del datore, escluso il TFR. Il motore usa invece `eligibleDeduction = min(pensionEmp, cap)` senza togliere pensionEr, quindi riconosce un rimborso anche sulla parte di tetto già consumata dal datore. La logica autoMax (r. 440-441) dimostra che il codice conosce la regola, ma qui non la applica. La stessa quota gonfiata entra in currentPensionCostBasis (r. 461), cioè nella base tassata in uscita.

**Evidenza (verifica indipendente):** v2.ts. Ottimistico anno 13: dipendente 2,700, datore 2,700, rimborso 1,161.00 contro 1,059.77 corretto; eccesso totale sui 30 anni 1,822.23 €. Base con savingsToPension 50%, anno 16: dipendente 11,950, datore 1,200, rimborso 1,807.60 contro 1,387.60; eccesso totale 10,885.00 € prima della capitalizzazione. Fonti: ecnews.it e fiscozen.it sulla L. 199/2025.

**Correzione proposta:** `const deductible = Math.min(pensionEmp, Math.max(0, cap - pensionEr)); pensionTaxRebate = deductible * marginal; costBasisTaxable += deductible + pensionEr + tfrPensionFlow`. Aggiornare il default del tetto a 5,300 € per il 2026 e modellare l'eventuale extra-deducibilità come parametro.

### ENG-08 · Alto · L'IRR usa il bonus lordo come esborso: il TIR mostrato è sistematicamente troppo basso

*Dove:* `lib/engine/calculator.ts:517` · *Verifica:* confermato

Nei flussi IRR il mese 12 contiene `savings13thYear + bonusGrossYear`. L'imposta sul bonus (5%, 35% o 43%) non entra mai nel patrimonio, quindi viene contata come perdita di rendimento. cumContributions usa invece il netto (r. 593-594): IRR e capitale versato non sono coerenti. Altri difetti dello stesso calcolo: i flussi negativi vengono scartati (`if (c > 0)`, r. 46 e 59), e se l'NPV non cambia segno il risolutore restituisce l'ultimo valore di Newton invece di segnalare l'errore.

**Evidenza (verifica indipendente):** v3.ts. Mondo semplice (bucket al 5%, nessuna tassa né costo, RAL 0, bonus 10,000 € in ORDINARIA al 35%, 10 anni): IRR del motore -4.57%, IRR con bonus netto 5.0000%. Preset Base 4.10% contro 4.31% con bonus netto; Ottimistico 6.40% contro 6.71%; Pessimistico invariato al 2.22% (nessun bonus). Bonus lordi/netti in 30 anni: Base 142,500/108,375, Ottimistico 228,500/138,225. Perdita totale (1000 → 0): IRR 6.17%. Contributi con patrimonio finale 0: 4.6e9 %.

**Correzione proposta:** Usare bonusNetYear come flusso (la parte trattenuta in cassa è comunque patrimonio). Costruire i flussi IRR dallo stesso registro dei flussi effettivi. Accettare flussi negativi. Restituire null o NaN con un messaggio quando non esiste una radice.

### ENG-06 · Medio · autoMax con contributo datore oltre il tetto azzera anche il contributo del datore

*Dove:* `lib/engine/calculator.ts:448` · *Verifica:* confermato

Se il contributo del datore da solo supera il tetto, remainingCap = 0 e quindi empPct = 0. Se l'utente non versa anche risparmi nel fondo, pensionEmp = 0 e la condizione `if (pensionEmp > 0)` (r. 448) azzera pure pensionEr. Attivare 'Massimizza deducibilità' fa così perdere il contributo aziendale.

**Evidenza (verifica indipendente):** v2.ts, preset Ottimistico con RAL della fase 3 a 180,000. autoMax ON: dipendente 0.00, datore 0.00. autoMax OFF: 5,400 / 5,400. Fondo all'anno 30: 672,157.53 € contro 897,730.53 €.

**Correzione proposta:** Con autoMax, il contributo dipendente deve essere almeno il minimo contrattuale (nuovo parametro employeeMinContributionPercent) e il contributo del datore non deve mai dipendere dalla deducibilità. In più va chiarito che il datore versa solo se il dipendente versa almeno il minimo in busta paga.

### ENG-09 · Medio · Capitale versato, rendimento lordo/netto e 'tasse pagate' classificano male i flussi: rimborsi IRPEF contati come guadagni, tasse del fondo invisibili

*Dove:* `lib/engine/calculator.ts:592` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Il riepilogo KPI non distingue le fonti di patrimonio e non mostra le imposte. (1) I rimborsi IRPEF, reinvestiti o in cassa, non entrano in cumContributions e quindi finiscono interi in 'Rendimento Totale Netto' e nel suo 'Lordo'. Nel preset Base a rendimento zero il 'rendimento' vale 10,885 €, che sono solo rimborsi; con il 25% dei risparmi al fondo sale a 50,413 €. Il beneficio fiscale viene così presentato come rendimento di mercato. (2) Nessun KPI mostra le imposte: totalTaxesPaid (solo bollo, 29,421 € nel Base) non è letto da KPICards, la card 'Commissioni TER Pagate' mostra solo il TER, e l'imposta annua del 20% sui rendimenti del fondo (circa 25,793 € nel Base) e quella sui bonus non sono tracciate da nessuna parte. (3) totalGrossGains, presentato come 'Lordo', non riaggiunge l'imposta del fondo e include i rimborsi.

**Evidenza (verifica indipendente):** v3.ts. Preset Base nel mondo a rendimento zero: totalInvestmentGains = totalGrossGains = 10,885.00 €, pari alla somma dei rimborsi (10,885.00). Con savingsToPension 25%: 50,413.05 €, pari ai rimborsi (50,413.05). Ricostruzione mensile dell'imposta sui rendimenti del fondo: 25,792.75 € in 30 anni (il saldo ricostruito coincide con 274,840.36). totalTaxesPaid = 29,420.84 € (solo bollo), totalFeesPaid = 36,809.39 € (solo TER).

**Correzione proposta:** Introdurre voci separate: contributi personali, contributi del datore e TFR, benefici fiscali (rimborsi), rendimenti di mercato lordi, costi, imposte (bollo, imposta sui rendimenti del fondo, imposta sui bonus, imposte latenti). Il controllo deve chiudere: patrimonio = contributi + benefici + rendimenti − costi − imposte.

### ENG-10 · Medio · Colonna 'Costi / TER' del portafoglio ETF include i costi del fondo pensione; stima dei costi approssimata

*Dove:* `lib/engine/calculator.ts:631` · *Verifica:* confermato

investmentFeesYear = yearInvFees + yearPensionFees (r. 538, 631), ma la tabella lo mostra nel gruppo 'Portafoglio ETF' accanto a Versamenti e Rendimento, che sono solo ETF (YearlyDetailTable.tsx r. 116, 177). Il costo stimato è saldo·TER/12 (r. 505, 531), mentre la detrazione reale è moltiplicativa (1+r)(1−TER), quindi la stima sottostima leggermente. Anche investmentGainsYear è calcolato prima del bollo, contrariamente al commento in types.ts r. 136.

**Evidenza (verifica indipendente):** v3.ts, preset Base. Anno 1: 49.65 € = 35.02 € ETF + 14.63 € fondo. Anno 30: 3,330.26 €, di cui 800.96 € del fondo (TER ETF messo a 0), quindi la colonna ETF è gonfiata di circa il 32%.

**Correzione proposta:** Esporre investmentFeesYear (solo ETF) e pensionFeesYear separati. Calcolare il costo come `startBal*((1+jGross)-(1+jNet))`, che è esattamente la differenza tra il percorso senza costi e quello con costi.

### ENG-11 · Medio · Default diversi tra motore e sanitize: lo stesso scenario dà risultati molto diversi in base a un errore non correlato

*Dove:* `lib/engine/calculator.ts:407` · *Verifica:* confermato

Il motore usa `tfrSubtractedPercentage ?? 0` (r. 407) e `pensionAnnualYieldTaxRate ?? 0` (r. 524), mentre sanitize usa 0,5 e 20 (r. 243, 248). Gli scenari importati da JSON o salvati da versioni precedenti senza questi campi passano la validazione dello store, che non li richiede (scenario-store.ts r. 159-168). Normalmente seguono il percorso diretto con imposta sul fondo allo 0%. Basta però un errore qualsiasi, come un'allocazione a 99.99%, perché context.tsx r. 56-61 ripieghi su sanitize: l'imposta passa al 20% e i risultati saltano.

**Evidenza (verifica indipendente):** v4.ts, che replica il fallback di context.tsx. Preset Base senza i due campi, percorso diretto: TFR anno 1 2,592.59, fondo all'anno 30 312,520.19, netto 1,457,562.45. Con un'allocazione portata a 29.99 (percorso sanitize): TFR 2,579.63, fondo 274,840.36, netto 1,419,982.20, cioè -37,580.25 €. Controllo con i campi presenti: 1,419,982.20 contro 1,419,951.73, appena +30 €.

**Correzione proposta:** Definire un unico oggetto DEFAULTS usato sia dal motore sia da sanitize, e applicare una migrazione dello schema all'import e al caricamento che riempia i campi mancanti.

### ENG-13 · Medio · Buchi di validazione: crash con orizzonte frazionario, NaN propagati, percentuali fuori range accettate

*Dove:* `lib/engine/calculator.ts:648` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

La validazione controlla solo l'intervallo dell'orizzonte e la somma delle allocazioni. (a) Un orizzonte frazionario, ad esempio 10.5 digitato nel NumberInput che usa parseFloat, fa leggere yearlyProjections[9.5] = undefined: TypeError e dashboard vuota a zero (sanitize non arrotonda). (b) Uno scenario importato senza pensionFund.terPercent o expectedReturnPercent, che lo store non valida, produce NaN in patrimonio e KPI, e l'IRR mostra 6.17%. (c) Rendimenti sotto -100% vengono troncati in silenzio a -99%. (d) Override di fase oltre 100, possibili solo via import, generano flussi negativi. (e) TER negativi producono costi negativi. (g) Risparmi mensili negativi (digitabili, lo store dà solo un warning) generano prelievi che l'IRR ignora (`if (c > 0)`) e che riducono il costo fiscale 1:1. Inoltre ogni valore non valido viene salvato comunque, e al ricaricamento la pagina scarta tutti gli scenari dell'utente. Con mensilita 12 la 13ª azzerata non è un problema, perché il form lo mostra ('No 13ª').

**Evidenza (verifica indipendente):** v4.ts. Orizzonte 10.5 → "Cannot read properties of undefined (reading 'totalWealthNominalNet')", risultato vuoto. Rendimento NaN → netto NaN, IRR 6.1678. Tutti i bucket a -150% → portafoglio anno 1 5,173.41. savingsToPension di fase 150 → savingsToPortfolio -5,287.50. TFR di fase 150 → compFlow -1,289.81. TER -1% su tutti i bucket → cumFees -152,017.65. mensilita 12 → 13ª pari a 0, con la UI che mostra 'No 13ª'. Risparmio -500 in tutte le fasi → IRR 1.28% con prelievi ignorati.

**Correzione proposta:** Usare uno schema di validazione unico (ad esempio zod) con interi per anni e orizzonte, Number.isFinite su ogni numero, limiti 0-100 per tutte le percentuali (anche per fase), rendimento > -100% e TER ≥ 0. Restituire errori per campo alla UI invece di correggere in silenzio.

### ENG-14 · Medio · Contributo del datore attivato da versamenti volontari (bonifico) e da qualsiasi importo > 0

*Dove:* `lib/engine/calculator.ts:448` · *Verifica:* confermato

pensionEr scatta se pensionEmp > 0, e pensionEmp include savingsToPensionYear, cioè versamenti volontari extra-busta. Nei CCNL il contributo del datore spetta solo se il lavoratore versa almeno la % minima contrattuale in busta paga. Il motore lo concede anche con contributo dipendente allo 0% e un versamento simbolico.

**Evidenza (verifica indipendente):** v4.ts, preset Base con employeeContributionPercent=0. savingsToPension 0 → datore 0.00. 25% → 700.00. savingsToPension 1e-7% (versamento di 0.0000106 €) → datore 700.00.

**Correzione proposta:** Aggiungere il parametro employeeMinContributionPercent e calcolare `pensionEr = baseEmpFromRal >= ral*min/100 ? ral*erPct/100 : 0`, escludendo i versamenti volontari dalla condizione.

### ENG-15 · Medio · Rimborso IRPEF riconosciuto anche con RAL = 0 (nessuna IRPEF da cui dedurre)

*Dove:* `lib/engine/calculator.ts:456` · *Verifica:* confermato

pensionTaxRebate = min(pensionEmp, cap) × aliquota marginale, senza verificare che esista un reddito imponibile. In una fase con RAL 0 (sabbatico, disoccupazione, FIRE anticipato con versamenti da risparmi) il motore regala comunque il rimborso pieno.

**Evidenza (verifica indipendente):** v4.ts, preset Base con RAL della fase 1 a 0 e savingsToPension 50: savingsToPensionYear 5,287.50 €, rimborso 1,807.60 € (= 5,164.57 × 35%) senza reddito.

**Correzione proposta:** Limitare la deduzione all'imponibile: `deductible = min(pensionEmp, cap - er, ral)` come prima approssimazione. Meglio calcolare il risparmio IRPEF come differenza dell'imposta lorda per scaglioni con e senza deduzione.

### ENG-16 · Medio · Bonus netto sovrastimato: mancano i contributi INPS e i limiti della detassazione (tetto annuo, RAL ≤ 80k); aliquota 2026 superata

*Dove:* `lib/engine/calculator.ts:380` · *Verifica:* confermato

bonusNetYear = lordo × (1 − aliquota). Il premio di risultato sconta però i contributi INPS del dipendente (circa 9.19%) prima dell'imposta. L'aliquota agevolata vale solo fino al tetto annuo (3,000 € fino al 2025, 5,000 € per i premi erogati nel 2026-2027) e per redditi da lavoro dipendente fino a 80,000 €. Il motore applica invece l'aliquota agevolata all'intero bonus a qualunque RAL. Il default al 5% è superato: la L. 199/2025 lo porta all'1% per il 2026-2027.

**Evidenza (verifica indipendente):** v5.ts. Motore: Ottimistico anno 1 3,990.00; Base anno 16 3,900.00; Base anno 1 2,375.00. Ottimistico anno 1 con regole 2025: 3,296.40 (tetto sul lordo) o 3,379.11 (tetto sull'imponibile); con regole 2026 (1%, INPS): 3,775.88. Base anno 16 con INPS al 35%: 3,541.59. Base anno 1: 2,156.74 al 5% o 2,247.55 all'1%. Base, bonus netti in 30 anni: 108,375 € contro 98,415 € con il solo INPS. Fonti: quotidianopiu.it, fiscal-focus.it, informazionefiscale.it.

**Correzione proposta:** Calcolare `imponibile = lordo*(1-inpsEmployeeRate)`, poi la quota agevolata `min(imponibile, cap)` all'aliquota sostitutiva solo se RAL ≤ limite, e l'eccedenza all'aliquota marginale. Tetto, limite di RAL e aliquota INPS vanno resi parametri. Aggiungere l'opzione 'premio convertito in welfare o fondo pensione' (0% di imposta).

### ENG-12 · Basso · sanitize modifica in silenzio lo scenario (allocazioni rinormalizzate, fasi riscritte) e la dashboard mostra numeri di un altro scenario

*Dove:* `lib/engine/calculator.ts:160` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Se calculateProjection lancia un errore, context.tsx (r. 56-61) ripiega su sanitizeScenarioParameters senza avvisare. Il caso raggiungibile dalla UI è un'allocazione dei bucket diversa da 100, ad esempio 70/20 durante la modifica. La dashboard mostra allora KPI e grafici calcolati su 77.78/22.22 (netto 1,453,802 € contro 1,419,952 € dello scenario valido). L'unico avviso è '(Must be 100%)' nel form dei bucket, niente nella dashboard. Le riscritture delle fasi e l'estensione dell'orizzonte fatte da sanitize si attivano solo con dati importati, perché i form applicano già le stesse correzioni in modo visibile. Le tolleranze sono incoerenti (0.01 nello store, 0.001 nel motore), quindi una somma di 99.995 è valida per lo store ma passa da sanitize nel motore.

**Evidenza (verifica indipendente):** v4.ts. Allocazione 70/20: usata 77.78/22.22, netto 1,453,801.61 contro 1,419,951.73 dello scenario valido. Orizzonte 40 con fasi fino a 30 (solo via import): 40 righe, anno 35 con RAL 60,000. Fase 2 che parte dall'anno 8: riscritta 1-5, 6-15, 16-30.

**Correzione proposta:** calculateProjection dovrebbe restituire `{result, warnings[], appliedParameters}`. La UI deve mostrare un banner 'Risultati calcolati con parametri corretti automaticamente: …' oppure bloccare la visualizzazione finché i dati non sono validi. Serve un'unica funzione di validazione condivisa con lo store.

### ENG-17 · Basso · Aliquota di uscita del fondo costante in tutti gli anni: non applica la riduzione 15% → 9% per anzianità

*Dove:* `lib/engine/calculator.ts:565` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Il netto del fondo usa ogni anno lo stesso taxRatePercent. L'aliquota legale (art. 11 c.6 D.Lgs. 252/2005) è il 15%, ridotta di 0.3 punti per ogni anno oltre il 15° di partecipazione, fino al 9% dopo 35 anni. Un'aliquota fissa sovrastima quindi il netto negli anni intermedi quando si imposta un valore basso. Nel preset Ottimistico (9%), partendo da zero anni di adesione, la sovrastima è di 7,801 € all'anno 15 e 8,558 € all'anno 20; all'anno 30 è di 4,658 € oppure nulla, a seconda degli anni di adesione già maturati, un dato che il modello non chiede. L'impatto sul patrimonio totale resta sotto l'1%. È un affinamento rispetto al parametro unico richiesto nelle specifiche: aggiungere 'anni di adesione all'inizio' e calcolare l'aliquota anno per anno.

**Evidenza (verifica indipendente):** v5.ts, Ottimistico al 9%, ricostruendo il costo fiscale. Sovrastima del netto: 636.93 (anno 1), 4,591.89 (anno 10), 7,800.78 (anno 15, su un netto di 902,351), 8,558.08 (anno 20, aliquota legale 13.5%), 4,657.69 (anno 30, 10.5%, su un netto di 3,902,878).

**Correzione proposta:** Aggiungere il parametro yearsOfParticipationAtStart e calcolare per ogni anno `rate = max(9, 15 - 0.3*max(0, years-15))`, lasciando il parametro attuale solo come override esplicito.

### ENG-18 · Basso · Ordine sbagliato tra TER e imposta del fondo: l'imposta del 20% si applica al rendimento lordo prima dei costi

*Dove:* `lib/engine/calculator.ts:526` · *Verifica:* confermato

netPenAnnual = (1 + g(1−t))(1−TER) − 1. Nei fondi pensione l'imposta del 20% colpisce il risultato netto di gestione, cioè dopo i costi: la formula corretta è ((1+g)(1−TER) − 1)(1 − t). Il motore toglie i costi senza lo sconto fiscale e quindi sottostima il rendimento netto.

**Evidenza (verifica indipendente):** v5.ts. Base: 2.8904% contro 2.9504%, fondo all'anno 30 274,840.36 contro 277,410.41. Pessimistico: 1.1840% contro 1.3440%, 28,567.16 contro 29,335.52.

**Correzione proposta:** `const netPenAnnual = ((1 + g) * (1 - ter) - 1) * (1 - yieldTax)`. Il caso di rendimento negativo, che genera risparmio d'imposta, resta coperto dalla stessa formula.

### ENG-19 · Basso · Il bollo riduce il saldo ma non il costo fiscale: crea uno scudo fiscale fittizio pari al 26% del bollo cumulato

*Dove:* `lib/engine/calculator.ts:551` · *Verifica:* confermato

Il bollo viene sottratto da state.balance mentre costBasis resta invariato. Il bollo non è deducibile dalle plusvalenze: se si paga vendendo quote, il costo fiscale si riduce in proporzione e le quote vendute realizzano una plusvalenza tassata. Se si paga dal conto, il saldo dell'ETF non cambia. Il motore mescola i due casi e sottostima l'imposta latente.

**Evidenza (verifica indipendente):** v5.ts: 100k € iniziali, 7%, TER 0, imposta 26%, bollo 0.2%, 30 anni. Bollo cumulato 19,452.75 €, netto del motore 556,470.56 €. Con modello proporzionale e imposta realizzata pagata vendendo quote: netto 549,890.80 €, sovrastima 6,579.76 €. Il valore del finder (5,057.71 €, pari al 26% del bollo) è il limite inferiore, senza capitalizzazione dell'imposta realizzata.

**Correzione proposta:** Pagando con la vendita di quote: `costBasis -= costBasis * (wealthTax/balance)` e tassare la plusvalenza realizzata. Pagando dal conto: non toccare il saldo e sottrarre il bollo dalla cassa o dai contributi.

### ENG-20 · Basso · TFR in azienda: rivalutazione non tassata al 17% ogni anno e tassata al 23% in uscita

*Dove:* `lib/engine/calculator.ts:421` · *Verifica:* confermato

La rivalutazione (1.5% + 75% dell'inflazione) sconta ogni anno un'imposta sostitutiva del 17% ed è esclusa dalla tassazione separata finale. Il motore la capitalizza al lordo e poi applica il 23% all'intero saldo. Il netto finale esce quasi giusto solo perché i due errori si compensano, mentre il saldo lordo mostrato in tabella e nei grafici di composizione è sovrastimato.

**Evidenza (verifica indipendente):** v5.ts, Pessimistico all'anno 30. Lordo del motore 158,501.40 contro 140,881.21 corretti (+17,620). Netto 122,046.08 contro 121,883.21 (+162.87).

**Correzione proposta:** Tenere separati la quota capitale (tassata al tfrCompanyTaxRate in uscita) e la rivalutazione netta (al netto del 17% ogni anno). Aggiungere il parametro tfrRevaluationSubstituteTax = 17.

### ENG-21 · Basso · Fondo disattivato: il saldo iniziale del fondo resta congelato senza rendimento

*Dove:* `lib/engine/calculator.ts:523` · *Verifica:* confermato

Quando enabled=false il compounding del fondo viene saltato, ma currentPensionBalance (saldo iniziale) resta nel patrimonio, fermo per tutto l'orizzonte. Una posizione già aperta continua invece a rendere anche se si smette di versare.

**Evidenza (verifica indipendente):** v5.ts, Base con fondo spento. Lordo all'anno 30 3,000.00, netto 2,640.00, contro circa 7,052.89 capitalizzando al 2.8904% annuo.

**Correzione proposta:** Separare 'versamenti attivi' da 'fondo esistente': continuare il compounding del saldo anche senza nuovi versamenti, oppure chiedere esplicitamente cosa fare del saldo.

### ENG-22 · Basso · Tempi dei flussi: risparmi verso il fondo da 13ª, 14ª e bonus spalmati da gennaio; rimborso IRPEF accreditato un anno prima

*Dove:* `lib/engine/calculator.ts:460` · *Verifica:* confermato

savingsToPensionYear, compresa la quota di 13ª, 14ª e bonus che arriva a giugno o dicembre, viene versato nel fondo in 12 rate da gennaio (monthlyPensionFlow = annuo/12), cioè prima che il denaro esista. Il rimborso IRPEF sui versamenti volontari arriva col 730 a luglio dell'anno successivo, ma viene reinvestito a dicembre dello stesso anno (r. 501). La 14ª è collocata a giugno (m=6), mentre la maggior parte dei CCNL la paga a luglio.

**Evidenza (verifica indipendente):** v5.ts: RAL 0, solo bonus netto da 2,375 € destinato al 100% al fondo. Saldo a fine anno 1 = 2,406.30 € invece di 2,375.00 €.

**Correzione proposta:** Instradare verso il fondo ogni flusso nel mese in cui nasce (stessa logica dei bucket) e accreditare il rimborso dei versamenti volontari a luglio dell'anno t+1 (parametro rebateMonth).

## Fiscalità e normativa 2026

### TAX-01 · Alto · Quota TFR annua calcolata male: lo 0,50% viene tolto dal TFR invece che dalla retribuzione

*Dove:* `lib/engine/calculator.ts:408` · *Verifica:* confermato

L'engine calcola tfrAccruedYear = ral*(1-0,5/100)/tfrDivisor, cioè il 7,37% della RAL. Per legge (art. 2120 c.c. e art. 3 c.15 L. 297/1982) la quota è retribuzione utile/13,5 (7,41%) MENO il contributo aggiuntivo dello 0,50% calcolato sulla retribuzione imponibile, non sul TFR. Il risultato è circa il 6,91% della RAL, il valore che i fondi negoziali indicano come '100% del TFR'. Nel codice convivono tre formule diverse e nessuna è corretta. L'engine usa RAL*0,995/13,5. La UI (MonthlyDisposableCashflow.tsx:133) usa RAL/13,5 e mostra 'TFR Maturato (7,4%)'. L'oracolo di test (tests/harness/financial-math.ts:60) usa anche lui RAL/13,5. Anche i testi sono sbagliati: 'Detrazione Fondo Garanzia INPS… sottratta al TFR annuo' (translations.ts:117-118, TaxConfigForm.tsx:91-98, README.md:19). Lo 0,50% non è il contributo al Fondo di garanzia, che è un contributo datoriale distinto dello 0,20% (art. 2 L. 297/82), e non si applica al TFR ma alla retribuzione.

**Evidenza (verifica indipendente):** (script di verifica) Ho simulato la quota legale con tfrDivisor=14,4048, che dà 2.417,59 € all'anno 1. Quota engine e quota legale: 35k 2.579,63 contro 2.417,59 (+162,04); 48k 3.537,78 contro 3.315,56; 60k 4.422,22 contro 4.144,44. UI: 2.592,59. Preset Base, anno 30: fondo lordo 274.840,36 contro 263.936,96 (+10.903,40); patrimonio netto nominale +10.039,51. Preset Pessimistic: TFR in azienda lordo 158.501,40 contro 149.178,90 (+9.322,50), patrimonio netto +7.178,32.

**Impatto:** Il TFR risulta gonfiato del 6,7% in ogni scenario, sia nel fondo pensione sia in azienda: sul preset Base sono circa 10.000 € di patrimonio finale in più. I test bloccano il bug.

**Correzione proposta:** Usare tfrQuota = retribuzioneUtile/divisore − retribuzioneImponibile × 0,50%, con il parametro rinominato 'Contributo aggiuntivo IVS 0,50% (art. 3 c.15 L. 297/82)' e applicato alla RAL. Usare la stessa funzione nell'engine, nella UI e nell'harness. Correggere label, tooltip, README e test, che devono attendersi 6,9074% della RAL.

### TAX-02 · Alto · Card 'Sconto Fiscale IRPEF su Fondo' sbagliata: mostra 2×contributo − risparmio invece del risparmio

*Dove:* `app/components/charts/MonthlyDisposableCashflow.tsx:78` · *Verifica:* confermato

taxSavingsAnnual = (standardNetAnnual − netAnnual) + pensionEmpContribEuro. Poiché standardNet − net = contributo − risparmio IRPEF, la formula restituisce 2×contributo − risparmio. La card 'Sconto Fiscale IRPEF su Fondo' (righe 431-446) sovrastima il beneficio di 3,5-3,7 volte. La card 2 (riga 243) calcola employeePfMonthlyEuro − monthlyTaxSavings, che diventa negativo, e lo stampa preceduto da '-': il risultato visualizzato è '--28 €' invece di un costo netto positivo.

**Evidenza (verifica indipendente):** (script di verifica), con una mia reimplementazione dello stimatore. RAL 35k e contributo 700 €: la UI mostra 1.094,23 €/anno (78,16 €/mese); il risparmio reale è 305,77 € con il modello dell'app, 291,77 € con le regole 2026 e 309,41 € con le addizionali Lombardia e Milano. RAL 48k: UI 1.500,65 contro 400,15. RAL 60k: UI 1.884,00 contro 516,00. Card 2: 50 − 78,16 = −28,16, reso come '--28 €' (48k '--39 €', 60k '--49 €'). Costo netto reale 29,16 €/mese a 35k.

**Impatto:** L'utente vede un vantaggio fiscale del fondo pensione 3-4 volte più alto del reale e una trattenuta con il doppio segno. Le scelte su fondo pensione o ETF ne risultano falsate.

**Correzione proposta:** taxSavingsAnnual = (irpefNetta + addizionali senza contributo) − (irpefNetta + addizionali con contributo), oppure netAnnualWith − netAnnualWithout + contributo. Mostrare il costo netto = contributo − risparmio. Aggiungere un test unitario: 35k e 700 € devono dare circa 292 €.

### TAX-04 · Alto · Plafond di deducibilità: l'engine non conta il contributo datoriale nel tetto

*Dove:* `lib/engine/calculator.ts:452` · *Verifica:* confermato

Per l'art. 8 c.4 del D.Lgs. 252/2005 il limite di deducibilità vale per la somma dei contributi del lavoratore e del datore, TFR escluso. L'engine calcola invece eligibleDeduction = min(pensionEmp, cap) senza sottrarre pensionEr: solo il ramo autoMaxDeductibility (righe 439-443) lo fa. Con contributi superiori al plafond, o con 'savingsToPension', il rimborso IRPEF e la costBasis sono gonfiati. L'oracolo dei test usa un terzo modello, anch'esso errato: calcola il rimborso su (dipendente + datore) entro il cap, come se il contributo datoriale generasse un rimborso IRPEF. Il contributo datoriale non fa parte della RAL e non produce rimborso.

**Evidenza (verifica indipendente):** v1.ts. Preset Optimistic anno 13 (RAL 90k, dipendente 2.700 + datore 2.700): rimborso engine 1.161,00 contro 1.059,77 legale (+101,23); +1.822 € nominali in 30 anni. Preset Base con savingsToPension 50%: rimborso engine 1.807,60 contro 1.562,60 / 1.471,60 / 1.387,60 (+245 / +336 / +420 €/anno), cioè 10.885 € nominali e circa 24.500 € capitalizzati all'anno 30 (v3.ts). Harness (3000, 3000, 5164,57, 35): 1.807,60 contro 757,60 legale.

**Impatto:** Rimborsi IRPEF e patrimonio sovrastimati proprio negli scenari che saturano il plafond, cioè quelli che l'app incoraggia con 'Massimizza Tetto' e 'Allocazione Risparmio al FP'.

**Correzione proposta:** deducibileDip = clamp(emp, 0, max(0, cap − er)). La parte datoriale oltre il cap va trattata come reddito imponibile del dipendente. costBasis = deducibileDip + min(er, cap) + TFR. Correggere l'harness e aggiungere test con il datore.

### TAX-05 · Alto · Aliquota marginale IRPEF unica per tutte le fasi; i preset usano aliquote inesistenti nel 2026 (35%, 28%)

*Dove:* `lib/engine/calculator.ts:456` · *Verifica:* confermato

Il rimborso del fondo pensione (e anche il bonus 'ORDINARIA_IRPEF', riga 376) usa un solo marginalIRPEFTaxRate globale per fasi con RAL molto diverse. I preset usano il 35%, che dal 2026 non esiste più (ora 33%), e il 28% (Pessimistic), che non è mai esistito. Il beneficio reale di un contributo trattenuto in busta paga (art. 51 c.2 lett. h TUIR) riduce anche il reddito complessivo e quindi aumenta detrazioni e cuneo. L'aliquota effettiva comprende quindi il phase-out della detrazione da lavoro (1.910/22.000 = 8,68 pp tra 28k e 50k) e dell'ulteriore detrazione cuneo (12,5 pp tra 32k e 40k), più le addizionali. Al contrario, i versamenti con bonifico dedotti nel 730 (savingsToPension) riducono solo l'imponibile e non aumentano le detrazioni. Manca anche il limite di capienza: il rimborso può superare l'IRPEF netta dovuta.

**Evidenza (verifica indipendente):** v2.ts, risparmio effettivo su 1.000 € in busta paga nel 2026 (senza e con addizionali): RAL 30k 32,15/34,53%; 32k e 35k 41,68/44,20%; 40-42k 54,18/56,70%; 48k e 55k 41,68%; 60k e 90k 43,00/45,53%. Somma dei rimborsi in 30 anni nel preset Base: engine 10.885 contro 13.200,32 corretti (13.985,84 con addizionali), circa 5.000 € capitalizzati. Pessimistic: 3.024 contro 5.451,64; anno 1 al 41,68%. Bonifico nel 730 per 4.464,57 € su RC 31.783,5: risparmio 1.405,20 €.

**Impatto:** La convenienza del fondo pensione è sistematicamente sottostimata per i redditi 28-50k, nei casi di trattenuta in busta paga, e sovrastimata per i versamenti con bonifico. Il confronto fondo pensione contro ETF, decisione centrale dell'app, ne risulta falsato.

**Correzione proposta:** Calcolare il rimborso anno per anno come differenza di imposta completa (IRPEF, detrazioni, cuneo, addizionali) con e senza contributo, partendo dalla RAL della fase e distinguendo busta paga e 730. Limitare il rimborso all'imposta netta. Eliminare l'aliquota globale o renderla un override per fase.

### TAX-06 · Alto · Premio di risultato: INPS ignorato, 5% superato (2026-27: 1% fino a 5.000 €), nessun tetto né requisito, IRPEF ordinaria al 35%

*Dove:* `lib/engine/calculator.ts:380` · *Verifica:* confermato

bonusNet = lordo × (1 − aliquota). I problemi sono questi. (1) Non sottrae i contributi INPS del 9,19% (+1% oltre i 56.224 €), dovuti anche sul premio con imposta sostitutiva. (2) L'aliquota di default è il 5%: la L. 199/2025 (art. 1 c.8-9) l'ha ridotta all'1% per i premi erogati nel 2026 e 2027 e ha alzato il tetto da 3.000 a 5.000 €. Dal 2028, salvo proroghe, torna il 10% ordinario (L. 208/2015 c.182). (3) Non c'è tetto: tutto il bonus prende l'aliquota agevolata. Non c'è nemmeno il requisito del reddito di lavoro dipendente ≤ 80.000 € nell'anno precedente. (4) 'ORDINARIA_IRPEF' usa l'aliquota globale del 35% anche a RAL 60k, dove il marginale è 43% più addizionali. Etichette '5% (Agevolata)' in SalaryPhasesForm.tsx:271 e preset presets.ts:102 e :60.

**Evidenza (verifica indipendente):** v2.ts e v3.ts. Preset Base: fase 1 (2.500 €) engine 2.375,00 contro 2.247,55 legale; fase 2 (4.000 €) 3.800,00 contro 3.596,08; fase 3 (6.000 € ORDINARIA a 60k) 3.900,00 contro 3.071,50 (2.935,17 con addizionali). Dal 2028 al 10%: 2.043,23 / 3.269,16. Bonus di 8.000 € a 60k: engine 7.600 contro 6.195,34 (tetto applicato dopo INPS). Simulando i netti legali con aliquote CUSTOM equivalenti, il patrimonio netto del preset Base all'anno 30 scende di 24.714,91 €.

**Impatto:** Il netto dei bonus è sovrastimato fino a circa 1.000-1.400 €/anno. L'aliquota del 2026-27 è sbagliata e per una proiezione di 30 anni manca la regola successiva al 2027.

**Correzione proposta:** Formula: netto = lordo × (1 − INPS) − min(lordo dopo INPS, tetto) × sostitutiva − eccedenza × (marginale effettivo + addizionali). Parametri versionati per anno (2026-27: 1% e 5.000 €; dal 2028: 10% e 3.000 €). Controllare il requisito degli 80k. Calcolare l'IRPEF ordinaria con il modulo fiscale per fase.

### TAX-07 · Alto · TFR in azienda: manca l'imposta sostitutiva del 17% sulla rivalutazione e la tassazione separata è un 23% fisso su tutto

*Dove:* `lib/engine/calculator.ts:421` · *Verifica:* confermato

La rivalutazione annua (1,5% + 75% FOI, art. 2120 c.c.) è soggetta ogni anno a un'imposta sostitutiva del 17% trattenuta dal datore (art. 11 c.3 D.Lgs. 47/2000, aliquota del 17% dal 2015 per L. 190/2014 c.623). L'engine invece capitalizza la rivalutazione lorda. All'uscita la tassazione separata (art. 19 TUIR) si applica al solo TFR al netto delle rivalutazioni già tassate. L'aliquota è quella del 'reddito di riferimento' (TFR/anni × 12) secondo gli scaglioni, poi riliquidata dall'Agenzia sull'aliquota media dei 5 anni precedenti. L'engine applica invece un 23% fisso a tutto il saldo (capitale + rivalutazioni) per qualunque reddito. Il tooltip translations.ts:112 ('~23%') rafforza l'errore.

**Evidenza (verifica indipendente):** v3.ts (ipotesi: 2 anni pregressi per il TFR iniziale). Pessimistic con accrual dell'engine: saldo engine 158.501,40 contro 140.881,21 legale (+12,51%), 17% cumulato 11.937,11, netto +956,20. Con accrual legale: 149.178,90 contro 132.549,24 (+16.629,66), 17% cumulato 11.254,66, netto engine 114.867,76 contro 114.407,91 (aliquota 23,38%). Optimistic con TFR in azienda e accrual legale: netto 188.913,91 contro 178.650,16 (aliquota 30,30% su 61.437,85) (+10.263,75). Base con TFR in azienda: +2.597,13.

**Impatto:** Il saldo 'TFR in Azienda' lordo in tabella e nei grafici è gonfiato di circa il 12% su 30 anni. Il netto è sbagliato in modo dipendente dal reddito: per i redditi medio-alti supera i 10.000 €. Lo scenario 'TFR in azienda' è molto diffuso.

**Correzione proposta:** Tenere separati capitale e rivalutazioni. Ogni anno: rivalutazione netta = saldo × tasso × (1 − 17%). All'uscita: imposta = capitale × aliquotaMedia(capitale/anni × 12) con gli scaglioni vigenti. Rimuovere il 23% fisso, o lasciarlo solo come override.

### TAX-03 · Medio · Stimatore del netto in busta paga fermo alle regole 2025, senza addizionali e incompleto

*Dove:* `app/components/charts/MonthlyDisposableCashflow.tsx:42` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

estimateItalianNetSalary (MonthlyDisposableCashflow.tsx:26-88) applica le regole 2025 ed è incompleto. (a) Usa il 35% per lo scaglione 28-50k: dal 2026 è il 33% (L. 199/2025 art. 1 c.3). (b) Omette le addizionali regionali e comunali. (c) Omette la maggiorazione di 65 € della detrazione da lavoro per RC tra 25k e 35k (art. 13 c.1.1 TUIR). (d) Omette l'1% INPS oltre i 56.224 € (circ. INPS 6/2026). (e) Riconosce i 1.000 € di 'ulteriore detrazione' anche con RC fino a 20.000 €, dove spetta invece la somma esente del 7,1/5,3/4,8%. Questa somma esente è un importo aggiuntivo in busta paga, non tassato, e non una riduzione dell'imponibile. Con le addizionali di Lombardia e Milano il netto è sovrastimato di circa 300-570 €/anno tra 20k e 35k, 695 € a 48k, 862 € a 60k e 1.715 € a 90k. Senza addizionali è sottostimato tra 35k e 60k per effetto del 35%. Nell'ipotesi senza addizionali, a 20k la sovrastima è di 128 € e non di 720 €. Il valore alimenta solo la card 'Netto Spendibile Rimanente', non la proiezione.

**Evidenza (verifica indipendente):** v2.ts, modello 2026 con somma esente aggiunta al netto. RAL 20k: app 17.795,30, corretto 17.667,07 senza addizionali (+128,22) e 17.432,61 con addizionali (+362,68); somma esente 871,78. RAL 25k: nessuna differenza senza addizionali, +306,20 con addizionali. RAL 35k: app 26.600,80, corretto 26.741,47 / 26.032,22 (−140,67 / +568,57). RAL 48k: 32.249,33 contro 32.561,10 / 31.554,37. RAL 60k: 38.417,02 contro 38.835,50 / 37.554,66. RAL 90k: +1.715,02 con addizionali. INPS 1% omesso: 37,76 € a 60k e 337,76 € a 90k.

**Impatto:** Con le addizionali il netto mensile disponibile risulta sovrastimato di 40-62 €/mese per RAL 35-60k e fino a 122 €/mese a 90k. Senza addizionali è invece sottostimato a causa del 35% non più in vigore.

**Correzione proposta:** Creare un modulo fiscale versionato per anno (scaglioni, detrazioni art. 13 con +65 €, cuneo con somma esente o ulteriore detrazione, soglia INPS 1%, addizionali per regione e comune con un input o un default di circa il 2%) e condividerlo tra engine e UI. Aggiungere test contro casi noti.

### TAX-08 · Medio · Fondo pensione contato come patrimonio netto liquidabile ogni anno al 12%, ignorando le regole di accesso (critico per il FIRE)

*Dove:* `lib/engine/calculator.ts:568` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Il patrimonio netto (totalWealthNominalNet, calculator.ts:581-585) include ogni anno il fondo pensione al netto dell'aliquota di uscita scelta (es. 12%), come se fosse riscattabile in qualunque momento a quell'aliquota. Il fondo è invece vincolato. La prestazione spetta al pensionamento obbligatorio con almeno 5 anni di partecipazione, con capitale al massimo al 50%: il 60% della L. 199/2025 è stato annullato dall'art. 16-ter della L. 112/2026. Prima di allora le strade sono poche: RITA (15-9%), riscatto totale dopo più di 48 mesi di inoccupazione (15-9%), anticipazioni o riscatto per cause diverse (23%). L'app non ha KPI FIRE dedicati, ma per un simulatore FIRE manca la separazione tra patrimonio accessibile e vincolato e la modellazione delle vie di uscita. Nel preset Base all'anno 30 il fondo vale 274.840 € lordi, il 16,8% del patrimonio lordo. Riscattato al 23% costerebbe 19.779 € in più rispetto al 12% usato dall'engine.

**Evidenza (verifica indipendente):** v1.ts, preset Base anno 30: fondo lordo 274.840,36 €, pari al 16,82% del patrimonio lordo totale e al 19,4% di quello netto. Base imponibile 179.809,26. Imposta al 12% 21.577,11; al 23% 41.356,13 (+19.779). grep: nessun KPI FIRE, SWR o età di pensionamento in app/ e lib/.

**Impatto:** Un utente FIRE vede come disponibile un patrimonio che resta vincolato fino all'età pensionabile, accessibile al più tramite la RITA, oppure che si incassa solo pagando il 23%. La sostenibilità del ritiro anticipato risulta sovrastimata.

**Correzione proposta:** Separare il patrimonio accessibile da quello vincolato. Introdurre un input per l'età pensionabile e la data di uscita dal lavoro. Modellare le strade di accesso (riscatto dopo 48 mesi, RITA, prestazione, riscatto al 23%) e il vincolo del 50% in capitale. Calcolare i KPI FIRE solo sul patrimonio accessibile.

### TAX-09 · Medio · Aliquota di uscita del fondo pensione fissa, non legata agli anni di adesione

*Dove:* `lib/engine/calculator.ts:565` · *Verifica:* confermato

Per l'art. 11 c.6 del D.Lgs. 252/2005 l'aliquota parte dal 15% e scende di 0,30 punti per ogni anno di partecipazione oltre il 15°, fino a un minimo del 9%, raggiunto con circa 35 anni. Contano tutti i periodi di iscrizione (Ris. AdE 29/E/2025). L'engine usa invece un taxRatePercent fisso scelto dall'utente, uguale per ogni anno t. Il preset Optimistic usa il 9% su un orizzonte di 30 anni: è il valore massimo di riduzione e richiede almeno 35 anni di adesione. Il tooltip spiega la regola ma il calcolo non la applica.

**Evidenza (verifica indipendente):** v1.ts, preset Base anno 30, base imponibile 179.809,26: 12% = 21.577,11; 15% = 26.971,39; 10,5% = 18.879,97; 9% = 16.182,83. Preset: presets.ts:73 (12), :163 (15), :275 (9).

**Impatto:** Il netto del fondo è troppo ottimistico nei primi anni e troppo pessimistico negli ultimi. Il preset Optimistic usa un'aliquota non ancora raggiungibile.

**Correzione proposta:** Aggiungere l'input 'anno di prima iscrizione a forma pensionistica complementare' e calcolare l'aliquota anno per anno con max(9, 15 − 0,3 × max(0, anni − 15)). Il campo fisso resta solo come override.

### TAX-10 · Medio · Il campo 'Imposta Rendimenti Interni' del fondo pensione non ha alcun effetto; quello reale non è esposto; l'imposta è calcolata prima dei costi

*Dove:* `app/components/forms/PensionFundForm.tsx:255` · *Verifica:* confermato

Il form modifica pensionFund.annualYieldTaxRatePercent, ma l'engine legge taxes.pensionAnnualYieldTaxRate (calculator.ts:524), che nessun form espone (TaxConfigForm non lo include). L'utente non può quindi modellare un comparto obbligazionario o garantito, dove la quota in titoli di Stato e white-list è tassata al 12,5% (base imponibile al 62,5%, art. 17 D.Lgs. 252/2005 e L. 190/2014) e l'aliquota effettiva è di circa 15-17%. Inoltre l'imposta si applica al risultato di gestione al netto dei costi, mentre l'engine tassa il rendimento lordo prima del TER. Anche il tooltip '20% per legge' (translations.ts:97) è incompleto.

**Evidenza (verifica indipendente):** v1.ts, preset Base, fondo lordo all'anno 30: pf.annualYieldTaxRatePercent=0 → 274.840,36; =20 → 274.840,36 (nessun effetto); taxes.pensionAnnualYieldTaxRate=0 → 311.534,38. Rendimento 4% con TER 0,3%: engine 2,89% contro 2,95% applicando l'imposta dopo i costi. Il test calculator-features-2026.test.ts:44 imposta il campo che non ha effetto.

**Impatto:** Un controllo della UI che non fa nulla. Non si possono simulare i comparti prudenti, che hanno un'imposta più bassa.

**Correzione proposta:** Usare un unico campo. Esporlo nel form del fondo. Calcolare l'aliquota effettiva come 20% − 7,5% × quota titoli pubblici e white-list. Applicarla al rendimento al netto del TER.

### TAX-11 · Medio · Tetto di deducibilità non aggiornato (5.300 € dal 2026) e manca l'extradeducibilità per i lavoratori di prima occupazione

*Dove:* `lib/store/presets.ts:96` · *Verifica:* confermato

La L. 199/2025 (art. 1 c.201) ha portato il limite dell'art. 8 c.4 del D.Lgs. 252/2005 da 5.164,57 a 5.300 € dal periodo d'imposta 2026. L'extradeducibilità per chi ha iniziato a lavorare dopo il 1/1/2007 consente, nei 20 anni successivi al 5° di partecipazione, di recuperare il plafond non usato nei primi 5 anni, fino a 2.650 €/anno in più (7.950 € totali). L'app ha 5.164,57 come default ovunque (calculator.ts:241, :437; PensionFundForm.tsx:158; MonthlyDisposableCashflow.tsx:119; translations.ts:110; README.md:20) e non modella l'extradeducibilità, molto rilevante per i giovani a cui l'app è destinata.

**Evidenza (verifica indipendente):** v1.ts, preset Base con autoMax: rimborso anno 1 di 1.562,60 € con cap 5.164,57 e 1.610,00 € con 5.300; patrimonio netto all'anno 30 +8.983,13 €.

**Impatto:** Il beneficio fiscale è sottostimato per chi satura il plafond. Manca un'opzione ad alto valore per i giovani lavoratori.

**Correzione proposta:** Usare 5.300 come default, con parametri versionati per anno. Aggiungere 'prima occupazione dopo il 2007' e lo storico dei versamenti dei primi 5 anni, con il calcolo del plafond extra (fino a 2.650 €/anno per 20 anni).

### TAX-12 · Medio · ETF obbligazionari 'aggregate' tassati al 12,5% piatto; VAGF etichettato come governativo

*Dove:* `lib/store/presets.ts:91` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

I proventi degli ETF obbligazionari sono redditi di capitale tassati al 26%. Solo la quota riferibile a titoli di Stato italiani, white-list e sovranazionali gode del 12,5%, applicato pro-quota (base ridotta al 48,08%) in base alla percentuale comunicata dall'emittente. AGGH e VAGF sono ETF 'Global Aggregate': VAGF è il Vanguard Global Aggregate Bond EUR Hedged Acc, non un ETF di soli governativi come indica presets.ts:289. Entrambi contengono corporate e cartolarizzazioni, quindi l'aliquota effettiva è di circa il 18-20%, non il 12,5% dei preset. I guadagni su ETF, essendo redditi di capitale, non compensano minusvalenze pregresse, mentre le perdite su ETF sono redditi diversi. L'engine non gestisce le minusvalenze. Anche README.md:21 e types.ts:41 suggeriscono il 12,5% per qualunque ETF obbligazionario. Con una quota white-list del 55% il portafoglio netto all'anno 30 scende di 5.984 € nel preset Base e di 10.943 € nell'Optimistic.

**Evidenza (verifica indipendente):** v1.ts, aliquota effettiva 26 − 13,5 × 0,55 = 18,57%. Portafoglio netto all'anno 30: Base 1.154.212,51 contro 1.148.228,39 (−5.984,12); Optimistic −10.943,38. Ticker VAGF verificato (justETF, Deutsche Börse).

**Impatto:** Il patrimonio netto è sovrastimato di 6.000-11.000 € nei preset. L'utente impara una regola fiscale sbagliata.

**Correzione proposta:** Aggiungere al bucket il campo 'quota titoli di Stato white-list (%)', con aliquota = 26% − 13,5% × quota. Correggere nome e aliquota dei preset (es. 18-20% per gli aggregate, 12,5% solo per ETF di soli governativi white-list) e il README.

### TAX-13 · Medio · La card del cashflow usa aliquote bonus fisse nel codice (5% e 35%), incoerenti con l'engine e con i parametri

*Dove:* `app/components/charts/MonthlyDisposableCashflow.tsx:108` · *Verifica:* confermato

Nel codice la detassazione è fissata a 0,05 e l'IRPEF ordinaria a 0,35: la card ignora taxes.bonusSubstituteTaxRate e taxes.marginalIRPEFTaxRate, che l'engine invece usa. Anche con le stesse impostazioni, card e proiezione mostrano netti diversi per lo stesso bonus.

**Evidenza (verifica indipendente):** v1.ts. Optimistic anno 6, bonus 6.500 € ORDINARIA: engine 3.705,00 (43%), card 4.225,00 (35%). Preset Base con bonusSubstituteTaxRate=1: engine 2.475,00, card 2.375,00.

**Impatto:** Due numeri diversi per la stessa grandezza: l'utente non sa quale sia giusto.

**Correzione proposta:** Usare un'unica funzione computeBonusNet(phase, taxes, year) condivisa da engine e UI. Correggerla secondo TAX-06.

### TAX-15 · Medio · Manca la conversione del premio di risultato in contributi al fondo pensione o in welfare (esente, fuori plafond)

*Dove:* `lib/engine/types.ts:26` · *Verifica:* confermato

Per i commi 184 e 184-bis della L. 208/2015, il premio di risultato convertito in contributi alla previdenza complementare non è tassato né al versamento né in uscita (non entra nella parte imponibile della prestazione) e non conta nel plafond di deducibilità (risposta AdE 154/2024). Il welfare ex art. 51 TUIR non sconta né IRPEF né contributi del dipendente. L'app permette solo di incassare il bonus e investirlo, quindi tralascia una delle leve più convenienti per chi ha un premio di risultato.

**Evidenza (verifica indipendente):** Preset Base, fase 2, premio 4.000 €: netto investito in ETF secondo l'engine 3.800,00, secondo la legge 2026 3.596,08 (INPS + 1%) (v2.ts). Convertito al fondo entrerebbero 4.000 € fuori dal plafond e non tassati in uscita. Fonti: Risposta AdE 154/2024, dottrinalavoro, partitaiva.

**Impatto:** L'app non mostra un'ottimizzazione che vale centinaia di euro all'anno, proprio nel caso d'uso che dichiara di coprire.

**Correzione proposta:** Aggiungere bonusDestination: 'CASH' | 'WELFARE' | 'FONDO_PENSIONE' con percentuale di conversione. Il flusso convertito al fondo va al lordo, fuori dal cap, ed è esente in uscita (non entra nella costBasis tassabile).

### TAX-16 · Basso · Testi normativi in tooltip, label e README errati o superati

*Dove:* `lib/i18n/translations.ts:120` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Diversi testi riportano regole superate o imprecise. (1) bonusTaxRateTooltip (translations.ts:120), detassazione5 (r.50), l'opzione '5% (Agevolata)' (SalaryPhasesForm.tsx:271) e README.md:18: per i premi erogati nel 2026-27 l'imposta sostitutiva è dell'1% fino a 5.000 € (L. 199/2025), con reddito di lavoro dipendente dell'anno precedente ≤ 80.000 €; dal 2028, salvo proroghe, si torna al 10% fino a 3.000 €. (2) pensionCapTooltip (r.110): il default di 5.164,57 € è superato, dal 2026 il limite è 5.300 € (il riferimento all'art. 10 TUIR è accettabile, la norma di riferimento è l'art. 8 c.4 del D.Lgs. 252/2005). (3) tfrInpsGuarantee e il tooltip (r.117-118): lo 0,5% non è il Fondo di garanzia ma il contributo aggiuntivo IVS dell'art. 3 c.15 L. 297/82, pari allo 0,50% della retribuzione e detratto dalla quota TFR. (4) tfrCompanyTaxRateTooltip (r.112) '~23%': non cita l'imposta del 17% sulla rivalutazione e l'aliquota legata al reddito di riferimento. (5) pfYieldTaxTooltip (r.97) '20% per legge': omette il 12,5% sui titoli pubblici. (6) Il tooltip sul bollo è approssimativo: non distingue il conto corrente (34,20 € fissi oltre 5.000 € di giacenza) né l'IVAFE per i broker esteri. (7) README.md:19-21 ripete gli errori sullo 0,5%, sul plafond e sul 12,5%.

**Evidenza (verifica indipendente):** Righe verificate: translations.ts:50 (detassazione5), :97 (pfYieldTax), :106 (wealthTax), :110 (pensionCap 'art. 10 TUIR … €5.164,57'), :112 (~23%), :117-118 ('Fondo Garanzia', '0,5%'), :120 ('fino a 3.000 € (5% …)'); SalaryPhasesForm.tsx:271; README.md:18-21. Fonti 2026: premio all'1% fino a 5.000 € (Andersen, fiscal-focus), plafond 5.300 (mysolution, fiscozen).

**Impatto:** L'app 'insegna' regole superate a un pubblico che la condividerà con colleghi.

**Correzione proposta:** Riscrivere i testi a partire da una tabella di parametri versionata per anno, con riferimento normativo e data di aggiornamento visibile ('regole fiscali aggiornate al …').

### TAX-17 · Basso · Imposta di bollo e tassazione della liquidità semplificate (conto corrente, conto deposito, IVAFE)

*Dove:* `lib/engine/calculator.ts:549` · *Verifica:* confermato

La liquidità (currentCash) non subisce né il bollo fisso di 34,20 €/anno sul conto corrente oltre 5.000 € di giacenza media né lo 0,20% sul conto deposito. Il bucket 'Cash / Liquidity Reserves' del preset Pessimistic (presets.ts:184-190) ha la tassazione del 26% differita come un ETF, mentre gli interessi di conti deposito e conti correnti sono tassati al 26% ogni anno. Non c'è distinzione per i broker esteri (IVAFE 0,20% e regime dichiarativo) né per i titoli di Stato detenuti direttamente.

**Evidenza (verifica indipendente):** Lettura del codice calculator.ts:469-470 e 545-560: la liquidità cresce solo con rimborsi e bonus, senza bollo; nei preset è di 5.000-10.000 €. Bollo fisso sul conto corrente: 34,20 €/anno.

**Impatto:** Imprecisione minore sul netto.

**Correzione proposta:** Aggiungere per la liquidità il tipo di conto (conto corrente: 34,20 € se la giacenza supera 5.000 €; conto deposito: 0,20% + 26% annuo sugli interessi) e un flag broker estero o regime dichiarativo.

## Metodologia FIRE e ipotesi del piano

### FIRE-02 · Critico · Nessuna fase di decumulo né verifica di sopravvivenza del portafoglio; emularla con un risparmio negativo produce saldi negativi e imposte assurde

*Dove:* `lib/engine/calculator.ts:509` · *Verifica:* confermato

Il motore modella solo l'accumulo. Non esistono prelievi, ordine dei prelievi, tassazione al momento della vendita, anno di esaurimento del capitale o probabilità di successo. L'unico modo per simulare la pensione anticipata è inserire RAL 0 e un risparmio mensile negativo: SalaryPhasesForm.tsx:203-209 non ha un min e calculateProjection non valida il segno (sanitize interviene solo in fallback dopo un'eccezione, context.tsx:55-62). Con flussi negativi i bucket possono andare sotto zero senza alcun floor. Inoltre costBasis viene ridotto 1:1 dal prelievo (calculator.ts:509) invece che pro quota, per cui l'imposta latente può superare il saldo stesso.

**Evidenza (verifica indipendente):** Script (script di verifica) Portafoglio ETF lordo: 347.276 € (anno 16), 142.158 € (anno 30), 29.635 € (anno 35), -113.977 € (anno 40), -536.787 € (anno 50). All'anno 30 il netto è 53.607 €: imposta latente di 88.551 €, il 62% del saldo. All'anno 35 netto -69.837 € con lordo +29.635 € (imposta latente pari al 336% del saldo). Patrimonio totale netto finale -355.789 €, IRR 0. Intanto il fondo pensione continua a crescere fino a 251.156 € e non viene mai usato. Prova di salvataggio e ricaricamento con uno storage finto: dopo il reload restano solo ['Base Case','Pessimistic Case','Optimistic Case'] e lo scenario 'Mio FIRE' sparisce.

**Impatto:** Chi prova a verificare se il capitale regge dopo il FIRE ottiene numeri privi di senso (saldi negativi, imposte maggiori del capitale), oppure non può farlo affatto. È il punto decisivo di un piano FIRE.

**Correzione proposta:** Separare il motore in due fasi, accumulo e decumulo. In decumulo: prelievo annuo indicizzato all'inflazione (oppure a percentuale del portafoglio o con guardrail tipo Guyton-Klinger); imposta sul capital gain calcolata sulla quota di plusvalenza di ogni vendita con il metodo del costo medio (26%, 12,5% sulla quota di titoli di Stato white list); floor a zero e segnalazione dell'anno di esaurimento. Ordine dei prelievi: liquidità, poi ETF, poi TFR liquidato all'uscita, poi fondo pensione all'età consentita, poi INPS. Validare i risparmi come valori ≥ 0.

### FIRE-04 · Critico · Mescolanza nominale/reale: RAL e risparmi sono importi nominali fissi per 5-15 anni, senza indicazione se vadano inseriti in euro di oggi o futuri

*Dove:* `lib/engine/calculator.ts:365` · *Verifica:* confermato

RAL, risparmio mensile, 13ª/14ª e bonus restano nominali costanti per tutta la fase (calculator.ts:365-386); l'unica cosa indicizzata è il TFR in azienda (419-422). La linea 'reale' divide poi tutto per (1+π)^t (calculator.ts:587-589). Etichette e tooltip non dicono se gli importi vadano inseriti in euro di oggi o futuri, né se i rendimenti siano nominali o reali: 'RAL Lorda Fissa', 'Risparmio Netto Mensile', 'Rendimento Atteso' (translations.ts:39-40, 70); il tooltip dell'inflazione dice solo 'per calcolare il patrimonio reale' (translations.ts:20). Ne segue che: (a) se l'utente inserisce euro di oggi, cosa naturale, la linea reale deflaziona due volte; (b) se inserisce euro futuri, il piano implica tagli reali di stipendio e di spesa irrealistici. In entrambi i casi la conversione in reale è poco significativa.

**Evidenza (verifica indipendente):** Script (script di verifica) e a.ts. RAL reale del Base: 31.701 € (anno 5), 35.665 € (anno 15), 43.707 € (anno 16), 33.124 € (anno 30); 1.300 €/mese di risparmio all'anno 30 valgono 718 € di oggi. Con input indicizzati al 2% (30 fasi annuali, fattore (1+π)^(t-1)) il patrimonio reale finale diventa: Base 1.013.878 € contro 783.914 € (+29,3%), Pessimistic 239.333 € contro 150.942 € (+58,6%), Optimistic 2.822.297 € contro 2.285.344 € (+23,5%). Anno di FI del Base: da 23 a 21 con SWR 4%, da 26 a 22 con SWR 3,5%. Inflazione allo 0%, 2% e 3%: nominale 1.417.290 €, 1.419.952 € e 1.421.770 €; reale 1.417.290 €, 783.914 € e 585.750 € (-25,3% passando dal 2% al 3%).

**Impatto:** Il patrimonio reale e quindi l'anno di FI possono essere sbagliati del 23-59% a seconda di come l'utente ha interpretato gli input, e l'app non lo avverte.

**Correzione proposta:** Lavorare internamente in euro di oggi (reali) e dichiararlo in ogni etichetta. Per ogni fase: RAL in euro di oggi più crescita reale annua (%) e risparmio come % del netto o in euro di oggi indicizzati. Rendimenti inseriti esplicitamente come nominali, con conversione via Fisher, oppure come reali. Mostrare i valori nominali solo come vista secondaria. Aggiungere test sul fatto che inflazione e salari indicizzati non cambino il risultato reale.

### FIRE-01 · Alto · Un'app chiamata FIRE che non calcola nessuna grandezza FIRE: spese, tasso di risparmio, FIRE number, anno ed età di indipendenza finanziaria

*Dove:* `lib/engine/types.ts:90` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

ScenarioParameters (types.ts:90-103) non ha età attuale, spesa annua, safe withdrawal rate (SWR), età di pensionamento né aspettativa di vita. KPISummary (types.ts:155-166) contiene solo patrimonio all'anno N, IRR, versamenti e costi. Il campo `age?` di YearlyProjectionRow (types.ts:110) non viene mai valorizzato da calculator.ts. Il tasso di risparmio viene calcolato in MonthlyDisposableCashflow.tsx:153 (`monthlySavingsRatePercent`) ma non viene mai mostrato. Una ricerca di retire/withdraw/swr/prelievo/età in app/ e lib/ non trova nulla. L'app quindi non sa rispondere alla domanda centrale del FIRE: "quando posso smettere di lavorare?".

**Evidenza (verifica indipendente):** Script (script di verifica), con un mio stimatore del netto (INPS 9,19%, IRPEF 23/35/43, detrazioni e cuneo come nell'app). Base: netto fase 1 26.207 €, bonus netto 2.375 €, risparmi 10.575 €, spesa 18.007 €/anno (1.501 €/mese), cioè 17.654 € di oggi. Tasso di risparmio 38,5%, 46,8% e 53,0% nelle tre fasi. FIRE number 441.338 € (SWR 4%), 504.386 € (3,5%), 588.450 € (3%). Anno di FI sul patrimonio accessibile (ETF netti + liquidità + TFR netto, reale): 23, 26 e 29; includendo il fondo pensione: 20, 22 e 25. Optimistic: anno 12, 13 e 14. Pessimistic: mai entro 30 anni (patrimonio reale finale 150.942 €). grep su app/ e lib/: 'retirement' compare solo in commenti e tooltip (types.ts:58, translations.ts:275); nessuna funzione FIRE.

**Impatto:** Chi usa l'app vede 1.419.952 € all'anno 30 e non ha alcun modo di sapere se e quando è finanziariamente indipendente. Nel Base la risposta corretta va dall'anno 20 al 29 a seconda di SWR e del patrimonio considerato, una forbice di 9 anni di lavoro.

**Correzione proposta:** Aggiungere come input: età attuale, spesa annua desiderata (in euro di oggi), SWR (default 3-3,5% per orizzonti di 40-50 anni), età di accesso al fondo pensione e alla pensione INPS, aspettativa di vita. Calcolare per ogni anno il FIRE number (spesa/SWR, tenendo conto dell'INPS dopo i 67 anni), il tasso di risparmio, l'anno e l'età di FI e il Coast-FIRE. Rendere 'Età di indipendenza finanziaria' il KPI principale.

### FIRE-05 · Alto · Rendimenti deterministici costanti: nessuna volatilità, Monte Carlo, percentile, stress test o rischio di sequenza

*Dove:* `lib/engine/calculator.ts:489` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Il motore è deterministico: ogni bucket e il fondo crescono a un tasso costante (calculator.ts:489-491 e 526-527). Mancano volatilità, correlazioni, Monte Carlo o bootstrap storico, percentili e stress test, e l'etichetta 'Rendimento Atteso' non dice se il valore sia una media aritmetica o un rendimento composto. Monte Carlo indipendente (10.000 percorsi lognormali, σ azioni 16,8%, σ obbligazioni 5,5%, ρ 0,2, TER e bollo del preset, flussi ETF dell'engine Base): portafoglio ETF reale finale P10 397.854 €, P50 653.339 €, P90 1.219.506 €, contro 742.108 € del modello deterministico. Il 61% dei percorsi finisce sotto la linea se il 7% è aritmetico, il 47% se è composto. Anno di FI sul patrimonio accessibile al netto delle imposte latenti, con SWR 3,5% (deterministico: 26): P10 19-20, P50 25-27, e nel 18-28% dei casi nessuna FI entro 30 anni. Decumulo 70/30 con prelievo indicizzato e imposta sulla quota di plusvalenza: al 3,5% per 40 anni il percorso deterministico lascia 104 su 100, ma la probabilità di esaurimento è del 32-48%; al 4% per 50 anni è del 61-76%. Il rischio di sequenza è forte: a parità di rendimento geometrico, un crollo di -30%/-10%/0% all'inizio porta il capitale a esaurirsi o quasi, mentre a fine decennio lascia oltre 130 su 100 (i valori esatti dipendono dalla costruzione dell'esempio).

**Evidenza (verifica indipendente):** Script (script di verifica) e mc4.ts, seed fisso, 10.000 percorsi. Ipotesi aritmetica: P10 397.854 €, P50 653.339 €, P90 1.219.506 €, 61,2% dei percorsi sotto il deterministico (742.108 €). Ipotesi composta: P10 449.674 €, P50 771.056 €, P90 1.493.699 €, 47,1% sotto. Anno di FI netto con SWR 3,5%: P10 20, P50 27, nessuna FI nel 28,3% dei casi (aritmetica); P10 19, P50 25, nessuna FI nel 17,9% (composta). Con SWR 4%: P50 24 e 23, nessuna FI nel 15,7% e nell'8,3%. Probabilità di esaurimento nel decumulo: 3,5% per 40 anni 47,7% e 32,0%; 4% per 50 anni 75,9% e 60,7%. Residuo deterministico al 3,5% dopo 40 anni: 104,3.

**Impatto:** Una sola linea liscia nasconde un'incertezza sull'anno di FI di circa ±6 anni e probabilità di fallimento del 30-60% in casi che il modello deterministico dà per sicuri.

**Correzione proposta:** Aggiungere volatilità per bucket e una matrice di correlazione. Simulazione Monte Carlo (≥ 5.000 percorsi, con seed) o bootstrap storico, grafico a ventaglio P10/P50/P90, probabilità di successo del piano e distribuzione dell'età di FI. Stress test predefiniti (-40% nell'anno del FIRE, decennio perduto, inflazione al 5% per 5 anni). Precisare nell'interfaccia che il rendimento inserito è composto atteso.

### FIRE-08 · Alto · Risparmi scollegati da reddito e spese: si può risparmiare più del netto, e i preset implicano tassi di risparmio del 53-75% con spese reali in calo

*Dove:* `app/components/forms/SalaryPhasesForm.tsx:203` · *Verifica:* confermato

Il risparmio mensile è un numero libero (SalaryPhasesForm.tsx:203-209: nessun min o max, nessun legame con il netto). L'engine non stima il netto né le spese e non controlla nulla. L'unico posto dove il netto viene stimato è il riquadro del flusso di cassa, che maschera l'incoerenza con Math.max(0, netMonthlySalary - monthlyEtfSavings) (MonthlyDisposableCashflow.tsx:145). Lo stesso componente usa il 35% fisso per il bonus tassato a IRPEF ordinaria (riga 109), mentre l'engine usa marginalIRPEFTaxRate (43% nell'Optimistic). Poiché la spesa non è mai un input, i preset possono contenere piani irrealistici.

**Evidenza (verifica indipendente):** Script (script di verifica) e b.ts. RAL 25.000 € su 13 mensilità con fondo pensione al 2%: netto 20.537 €/anno; risparmi 32.000 €/anno, cioè il 156% del netto. validateScenarioParameters non segnala errori, l'engine proietta 2.331.734 € nominali (1.287.282 € reali) e il riquadro mostra 0 € invece di -920 €/mese. Preset: tasso di risparmio Base 38,5/46,8/53,0%, Optimistic 55,3/65,1/75,4%, Pessimistic 21,1/23,6%. Optimistic fase 3: spesa di 1.234 €/mese nominali con RAL 90k, pari a 8.670 €/anno di oggi (723 €/mese) all'anno 30.

**Impatto:** Si possono ottenere proiezioni di milioni da piani impossibili, e i preset di riferimento presuppongono uno stile di vita che si contrae in termini reali mentre il reddito cresce. È l'opposto dell'inflazione dello stile di vita reale.

**Correzione proposta:** Rendere la spesa annua (in euro di oggi) un input primario e derivare il risparmio come netto stimato meno la spesa, oppure validare che il risparmio non superi il netto stimato, con errore bloccante o avviso. Mostrare il tasso di risparmio per fase. Unificare il calcolo del netto in lib/engine (con addizionali regionali e comunali) e usarlo sia nell'engine sia nell'interfaccia.

### FIRE-09 · Alto · Mancano età, aspettativa di vita e pensione INPS: impossibile dimensionare il ponte FIRE fino ai 67 anni

*Dove:* `lib/engine/types.ts:94` · *Verifica:* confermato

L'orizzonte è solo un numero di anni da 1 a 50 (types.ts:94), senza data di nascita. Non esistono età di pensione, aspettativa di vita né pensione pubblica. Per un dipendente italiano nel sistema contributivo la pensione INPS dai 67 anni (montante dei contributi al 33% della RAL, rivalutato e moltiplicato per il coefficiente di trasformazione) copre gran parte delle spese. Il portafoglio FIRE deve quindi finanziare soprattutto il ponte dall'età di FI ai 67 anni (o ai circa 57 con RITA per il fondo), non una rendita perpetua. Smettere prima riduce però il montante INPS, e questo trade-off è proprio la decisione FIRE.

**Evidenza (verifica indipendente):** Calcolo manuale: (5×35.000 + 10×48.000 + 15×60.000) × 33% = 513.150 €, che al 5,608% dà 28.777 €/anno. Smettendo all'anno 26: 433.950 € e 24.336 €/anno; all'anno 20: 315.150 € e 17.674 €/anno. Fonti: coefficienti 2025-2026, 67 anni al 5,608%, decreto n. 436 del 21/11/2024 (altroconsumo.it, leggioggi.it, pensionioggi.it); revisione dal 1/1/2027 con D.D. del 16/10/2026, cali dell'1,21-1,97% e circa 5,514% a 67 anni secondo una fonte (ecnews.it, mysolution.it, dottrinalavoro.it, ilnordest.it); LdB 2026: vecchiaia a 67 anni e 1 mese dal 2027.

**Impatto:** Senza INPS ed età il FIRE number è sbagliato in entrambe le direzioni: troppo alto se si ignora che dai 67 anni l'INPS copre le spese, troppo ottimistico se non si considera che smettere prima riduce la pensione. L'errore sull'età di stop può essere di diversi anni.

**Correzione proposta:** Aggiungere età attuale, età di pensione di vecchiaia (con adeguamento alla speranza di vita), anni di contribuzione pregressi e stima del montante INPS: contributi 33% della RAL, rivalutazione al PIL nominale medio quinquennale e coefficiente di trasformazione modificabile. Calcolare la pensione al netto dell'IRPEF dall'età di pensione e sottrarla dalle spese nella fase di decumulo. Mostrare il grafico per età con le fasi lavoro, ponte e pensione.

### FIRE-03 · Medio · Il patrimonio bloccato (fondo pensione) è sommato a quello accessibile; tassazione di uscita al 12% anche in caso di accesso anticipato

*Dove:* `lib/engine/calculator.ts:575` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

totalWealthNominalGross/Net (calculator.ts:575-585) sommano senza distinzione ETF, fondo pensione, TFR in azienda e liquidità. Il valore netto del fondo applica sempre l'aliquota configurata (12% nel Base, calculator.ts:565-568), come se tutto il montante fosse liquidabile subito in capitale. In realtà il fondo resta illiquido finché si lavora, e tempi e tassazione dell'uscita dipendono dal percorso:
(a) chi smette di lavorare può chiedere il riscatto parziale del 50% dopo 12-48 mesi di inoccupazione e il riscatto totale dopo oltre 48 mesi (art. 14, c. 2, lett. b-c, D.Lgs. 252/2005), con ritenuta del 15% ridotta fino al 9%; non è esercitabile nei 5 anni precedenti i requisiti pensionistici;
(b) RITA da circa 57 anni con oltre 24 mesi di inoccupazione;
(c) riscatto per cause diverse o anticipazione per ulteriori esigenze (30% dopo 8 anni), tassati al 23%;
(d) alla pensione al massimo il 50% in capitale (l'aumento al 60% della LdB 2026 risulta annullato dalla L. 112/2026) e il resto in rendita vitalizia, a durata definita o con prelievi.
Nel Base il fondo vale il 19,7% del patrimonio netto all'anno 20, il 18,6% all'anno 26 e il 17,8% all'anno 30 (253.263 € su 1.419.952 €). Il patrimonio reale finale è di 783.914 €, di cui 644.095 € accessibili subito. Escludendo del tutto il fondo, l'anno di FI con SWR 3,5% passa da 22 a 26: è un limite superiore. Con un ponte di circa 4 anni coperto dagli ETF il fondo diventa riscattabile al 15-9%, e l'anno di FI torna vicino al 22. Il 23% (fondo netto all'anno 26 da 201.171 € a 184.394 €, -16.777 €) è solo il caso peggiore. Il difetto reale è che l'app non modella tempi e modalità di accesso né il ponte di liquidità necessario.

**Evidenza (verifica indipendente):** Script (script di verifica) e e.ts. Fondo netto sul totale netto: anno 20 19,7% (134.012 €), anno 26 18,6% (201.171 €), anno 30 17,8% (253.263 €). Flussi cumulati: 176.809 € nel fondo contro 547.260 € negli ETF (24,4%). ETF netti + liquidità + TFR netto in termini reali: 644.095 €. Aliquota al 23%: fondo all'anno 26 da 201.171 € a 184.394 € (-16.777 €). Anno di FI con SWR 3,5%: 22 includendo il fondo, 26 escludendolo (b.ts). Fonti web: art. 14, c. 5, al 23% solo per cause diverse; c. 2-4 al 15-9% per inoccupazione e invalidità (ricerca: fiscoinvestimenti.it, money.it 'riscatto anticipato del fondo pensione', fondotelemaco.it schema tassazione). Limite del 50% in capitale e annullamento del 60% da art. 16-ter L. 112/2026; rendita a durata definita e prelievi dal 1/7/2026 (delibera COVIP del 25/6/2026; pmi.it, edotto.com, milanofinanza.it).

**Impatto:** La quota bloccata (circa 18-20% nel Base) fa sembrare raggiungibile il FIRE 3-4 anni prima del vero, e il patrimonio netto è sopravvalutato se si pensa di riscattare il fondo prima dei 67 anni.

**Correzione proposta:** Aggiungere a ogni riga i campi accessibleWealth e lockedWealth con le date di sblocco (accesso al fondo all'età pensionabile o RITA a età - 10 anni; TFR all'anno di uscita dal lavoro). Mostrare nel grafico l'area 'bloccato fino a X anni'. Calcolare l'FI ponte (bridge): il capitale accessibile deve coprire le spese dall'età FI fino all'accesso al fondo e all'INPS. Nella vista FIRE tassare il riscatto anticipato al 23%.

### FIRE-06 · Medio · Ipotesi di rendimento dei preset ottimistiche rispetto alle stime 2026 (Base al limite superiore, Optimistic fuori scala); Pessimistic ha un rendimento reale negativo non segnalato

*Dove:* `lib/store/presets.ts:283` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Base: VWCE al 7% nominale in EUR (presets.ts:81) e AGGH al 3,5%. È in linea con l'edizione più recente di J.P. Morgan (LTCMA 2027, ottobre 2026: azionario globale e large cap USA al 7,5% in USD, 60/40 al 7,0%), considerando che un investitore EUR non coperto dovrebbe attendersi meno per il deprezzamento atteso del dollaro. È invece sopra Vanguard (VEMO 2026: azionario USA 4-5% annuo a 10 anni). Non è quindi fuori scala, ma va dichiarato come ipotesi medio-alta.
Optimistic: 80% su S&P 500/tecnologia (VUAA/QDVE, in USD non coperti) al 9,5% (presets.ts:281-283). Supera di circa 2 punti la stima J.P. Morgan più recente e di 4,5-5,5 punti quella Vanguard, prima ancora del rischio di cambio. Con l'azionario al 7,5% il patrimonio reale finale scende da 2.285.344 € a 1.821.307 € (-20,3%), al 6,7% a 1.680.653 € (-26,5%), al 5% a 1.444.499 € (-36,8%).
Pessimistic: rendimento ponderato del 3,55% lordo e del 3,07% al netto del TER, contro un'inflazione del 3,5%. Il rendimento reale al netto di bollo e imposte è negativo (circa -1%/anno su un capitale iniziale; IRR reale -1,23%) e nessun avviso lo segnala, mentre la descrizione parla di 'lower growth (4.0%)'.
Il fondo pensione al 4% lordo (circa 2,9% netto) è coerente con i dati COVIP 2015-2025 (linee bilanciate 1,9-2,9%, azionarie 4,8-5,1% netti). Trattandosi di preset dichiaratamente 'ottimista' e 'pessimista', la severità è media.

**Evidenza (verifica indipendente):** Script (script di verifica), e2.ts ed e3.ts. Optimistic con S&P/tech al 7,5%: 1.821.307 € (-20,3%); al 7,0%: 1.730.875 €; al 6,7%: 1.680.653 € (-26,5%); al 5,0%: 1.444.499 € (-36,8%); bucket e fondo del Base: 1.571.051 € (-31,3%). Base con azionario al 5,5%: 686.545 € (-12,4%). Pessimistic, capitale iniziale di 100 su 30 anni al netto di TER, bollo e 26%: 2,41% nominale, -1,05% reale. Fonti: J.P. Morgan 2027 LTCMA (press release su am.jpmorgan.com; fundssociety.com: '7.0% for 60/40'; wealthbriefing.com: US large cap +80bp a 7,5%); LTCMA 2026 US large cap 6,7% (chase.com, jpmorgan.com); Vanguard VEMO 2026 'US equities 4-5%' (corporate.vanguard.com, advisors.vanguard.com); COVIP 2025, linee azionarie 4,8-5,1% e TFR 2,5% a 10 anni (teleborsa.it, borsaitaliana.it). am.jpmorgan.com non è raggiungibile dalla sandbox con WebFetch, quindi il dato ACWI 2026 al 7,1% non è verificato direttamente.

**Impatto:** Lo scenario 'Optimistic' sovrastima il patrimonio reale finale del 27-37% rispetto alle stime di mercato e anticipa il FIRE di anni. Il 'Base' è già al limite superiore delle stime. Il 'Pessimistic' mostra un piano che distrugge valore reale senza dirlo.

**Correzione proposta:** Per un investitore EUR usare default prudenti, cioè rendimenti composti nominali: azionario globale 5,5-6,5%, obbligazionario aggregate coperto in EUR circa 3%, fondo pensione bilanciato 3,5-4,5% lordo. Indicare la fonte e la data di ogni default. Mostrare un avviso quando un rendimento supera, per esempio, il 7,5% nominale, e quando il rendimento reale netto del portafoglio è ≤ 0. Correggere le descrizioni dei preset.

### FIRE-07 · Medio · Rischio di concentrazione e di cambio non segnalato; nessun ribilanciamento: l'allocazione deriva verso più azionario mentre il grafico ad anello mostra quella iniziale

*Dove:* `lib/engine/calculator.ts:485` · *Verifica:* confermato

Ogni bucket cresce separatamente e i nuovi versamenti seguono sempre i pesi iniziali (calculator.ts:485-510): il motore non ribilancia mai. Il grafico ad anello (AllocationDonutChart.tsx:16-19) mostra allocationPercent statico, cioè la ripartizione dei versamenti e non quella reale. Il preset Optimistic concentra l'80% su S&P 500 o tecnologia (QDVE è il settore IT dell'S&P 500, dominato da pochi titoli) in USD non coperti: nessun campo di rischio, valuta o concentrazione lo segnala, e il confronto con il Base attribuisce a 'ottimismo' ciò che in realtà è una scommessa più rischiosa.

**Evidenza (verifica indipendente):** Script (script di verifica) Pesi del Base: 73,5/26,5 (anno 10), 76,7/23,3 (anno 20), 80,1/19,9 (anno 30); totale 1.344.225 €, uguale all'engine. Optimistic: 83,8/16,2, 86,9/13,1 e 90,2/9,8. Pessimistic: 52,3/38,8/8,8, 54,3/37,7/8,0 e 56,5/36,4/7,1. Replica mensile identica all'engine: Base 1.344.225 € senza ribilanciamento contro 1.298.001 € con ribilanciamento annuo (+3,6%); Optimistic 4.084.174 € contro 3.864.892 € (+5,7%); Pessimistic +1,4%.

**Impatto:** Il rischio cresce proprio avvicinandosi al FIRE, che è il momento di massima esposizione al rischio di sequenza, mentre il grafico continua a mostrare 70/30.

**Correzione proposta:** Aggiungere un ribilanciamento annuo configurabile e un glide path (per esempio riduzione dell'azionario negli ultimi 5 anni prima del FIRE e bucket di liquidità per 2-3 anni di spese). Il grafico ad anello deve mostrare l'allocazione effettiva dell'anno selezionato. Aggiungere i campi valuta e volatilità per bucket, con un avviso su concentrazione settoriale e valutaria (>50% su un solo paese o settore, USD non coperto).

### FIRE-10 · Medio · KPI principali non pertinenti per il FIRE: patrimonio netto nominale di liquidazione all'anno N e un IRR nominale per giunta sottostimato

*Dove:* `app/components/charts/KPICards.tsx:36` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Il primo KPI è il patrimonio netto nominale all'anno N (KPICards.tsx:36-38): un valore di liquidazione a una data arbitraria che include il fondo pensione e il TFR. L'etichetta italiana 'Patrimonio Finale Netto' (translations.ts:151) non dice 'nominale', a differenza di quella inglese, anche se accanto compare il KPI 'Patrimonio Finale Reale Netto'.
Il KPI IRR (KPICards.tsx:52-54) è nominale. Include la liquidità iniziale e il bonus non investito, entrambi a rendimento zero, e conta come versamento il bonus lordo invece del netto (calculator.ts:517: `mOutflow += savings13thYear + bonusGrossYear`), quindi risulta sottostimato: Base 4,10% contro 4,31% ricalcolato con il bonus netto, Optimistic 6,40% contro 6,71%. In termini reali il Base vale circa 2,06% e il Pessimistic -1,23%, senza alcun avviso.
Nel Base l'headline è di 1.419.952 € nominali, contro 644.095 € reali immediatamente accessibili (-55%), che con SWR 3,5% sostengono 22.543 €/anno di oggi (1.879 €/mese).
Per decidere quando smettere di lavorare servono invece età e anno di FI, FIRE number, reddito reale sostenibile e probabilità di successo.

**Evidenza (verifica indipendente):** Script (script di verifica), con IRR ricalcolato tramite calculateAnnualizedIRR e bonusNetYear al posto di bonusGrossYear. Base: 4,10% contro 4,31% (reale 2,06%). Pessimistic: 2,22% contro 2,22% (nessun bonus; reale -1,23%). Optimistic: 6,40% contro 6,71%. KPICards.tsx:34-56 e translations.ts:151-153 riletti. Il valore accessibile reale di 644.095 € (ETF netti + liquidità + TFR netto, deflazionati) è confermato da a.ts.

**Impatto:** Il numero in evidenza (1,42 M€) suggerisce un'abbondanza che, in termini reali e accessibili, si riduce a meno della metà. L'IRR non orienta nessuna decisione FIRE.

**Correzione proposta:** KPI principali: età e anno di FI, FIRE number, patrimonio accessibile reale, reddito mensile sostenibile reale, probabilità di successo e anni di copertura. Spostare l'IRR in una sezione avanzata, etichettato 'nominale' e calcolato sul bonus netto e sul solo capitale personale. Indicare 'nominale' anche nell'etichetta italiana.

### FIRE-11 · Medio · Nessuna analisi di sensitività; i tre preset non sono varianti dello stesso piano ma tre vite diverse

*Dove:* `lib/store/presets.ts:8` · *Verifica:* confermato

L'unica forma di sensitività è duplicare uno scenario a mano. I preset Pessimistic/Base/Optimistic cambiano tutto insieme: RAL (32k contro 90k), risparmi (400 contro 2.800 €/mese), mensilità, rendimenti, inflazione, allocazione e destinazione del TFR. Il grafico di confronto viene però letto come la forbice di incertezza del proprio piano. Non c'è un grafico a tornado né un'analisi 'cosa succede se'.

**Evidenza (verifica indipendente):** Script (script di verifica) Patrimonio reale finale del Base 783.914 €. Azionario -1 punto: 715.883 € (-8,7%); -2 punti: 659.920 € (-15,8%). Tutti i rendimenti, fondo compreso, -1 punto: 680.445 € (-13,2%); -2 punti: 594.533 € (-24,2%). Solo ETF -1 punto: -11,0%. Inflazione +1 punto: 585.750 € (-25,3%). Risparmi -20%: 690.480 € (-11,9%). Patrimonio reale finale dei preset: 150.942 €, 783.914 € e 2.285.344 €.

**Impatto:** L'utente non sa quale leva (risparmiare di più, costi, allocazione, rendimenti) sposta di più la sua data di FIRE e scambia scenari di vita diversi per una misura di rischio.

**Correzione proposta:** Grafico a tornado su anno di FI e reddito sostenibile (±1 punto di rendimento, ±1 punto di inflazione, ±10/20% di risparmio, ±0,5 punti di SWR, ±10% di spesa). Preset 'mercato' (rendimenti P10/P50/P90) applicabili allo stesso piano personale. Confronto degli scenari per età di FI e non solo per patrimonio.

### FIRE-12 · Medio · Liquidità a rendimento zero e mai usata; nessun fondo emergenza né eventi di vita (casa, figli, auto, spese straordinarie)

*Dove:* `lib/engine/calculator.ts:470` · *Verifica:* confermato

La liquidità (initialWealth.cashLiquidity, più bonusCashYear e il rimborso IRPEF non reinvestito) si accumula a rendimento 0% (calculator.ts:470) e non viene mai spesa. Non c'è un obiettivo di fondo emergenza in mesi di spesa, perché la spesa non esiste. Non si possono inserire uscite una tantum (acconto casa, mutuo, figli, auto) né entrate una tantum (eredità, vendita immobile). Il risparmio negativo viene gestito male (vedi FIRE-02).

**Evidenza (verifica indipendente):** Script (script di verifica) Base: liquidità di 5.000 € per 30 anni, pari a 2.760 € reali. Optimistic: 10.000 €, pari a 5.856 € reali. 5.000 € divisi per 1.501 €/mese di spesa implicita in fase 1 fanno circa 3,3 mesi.

**Impatto:** Gli eventi che più spesso spostano la data del FIRE (acquisto casa, figli) non sono modellabili. La liquidità è modellata in modo irrealistico: niente conto deposito o BOT, niente utilizzo.

**Correzione proposta:** Aggiungere un rendimento della liquidità (per esempio un conto deposito al netto del 26%), un obiettivo di fondo emergenza in mesi di spesa con riempimento prioritario e una lista di eventi una tantum o ricorrenti con anno, importo in euro di oggi e durata (mutuo, figli). Nel decumulo usare la liquidità come cuscinetto di 1-3 anni.

### FIRE-13 · Basso · Descrizioni dei preset incoerenti con i parametri

*Dove:* `lib/store/presets.ts:11` · *Verifica:* confermato

Base: la descrizione dice 'standard scenario: €37.5k salary' (presets.ts:5 e 11), ma la fase 1 ha RAL 35.000 € (presets.ts:26). Pessimistic: la descrizione dice 'lower growth (4.0%)' (presets.ts:115), ma il rendimento lordo ponderato dei bucket è 3,55% (0,5×4,5 + 0,4×3,0 + 0,1×1,0), 3,07% al netto del TER.

**Evidenza (verifica indipendente):** Script (script di verifica) 'Pess weighted gross 3.55 net TER 3.07'. Base ponderato 0,7×7 + 0,3×3,5 = 5,95%; Optimistic 0,8×9,5 + 0,2×4,5 = 8,5%.

**Impatto:** Minore, ma mina la fiducia nel piano di riferimento e nelle etichette mostrate agli amici con cui si condivide l'app.

**Correzione proposta:** Generare le descrizioni dai parametri (RAL iniziale, rendimento medio ponderato, inflazione) oppure correggerle a mano.

## Interfaccia e coerenza dei dati

### UI-01 · Critico · Ogni modifica intermedia non valida viene salvata e al ricaricamento TUTTI gli scenari dell'utente vengono cancellati

*Dove:* `app/components/forms/InvestmentBucketsForm.tsx:45` · *Verifica:* confermato

I form scrivono nello store a ogni battitura senza bloccare i valori non validi. updateScenario si limita a un console.warn e salva comunque in localStorage (lib/store/scenario-store.ts L468-471). Al ricaricamento, loadStoreFromLocalStorage passa tutto lo schema a validateStorageSchema: basta UN solo scenario non valido e l'intero stato viene sostituito con i 3 preset di default (scenario-store.ts L251-255). Al primo click successivo i default sovrascrivono localStorage e i dati sono persi per sempre. Le azioni normali della UI che producono uno stato non valido sono molte: eliminare un asset con il cestino (70/30 diventa 70, InvestmentBucketsForm L45-49), digitare un'allocazione (60/30), ridurre l'orizzonte temporale sotto l'inizio dell'ultima fase (GlobalParamsForm L205-214 imposta endYear=10 su una fase che inizia all'anno 16), svuotare il nome di un asset per riscriverlo, digitare un numero negativo (NumberInput non applica min/max: L28-31).

**Evidenza (verifica indipendente):** Script (script di verifica) con ScenarioStore e una MemStorage. Stato di partenza: 'Mio Piano' + 'Variante 2026'. Dopo [elimina bucket bond], [allocazione 60/30], [orizzonte 30->10, salaryPhases[2].endYear<startYear], [nome bucket vuoto], [monthlyNetSavings=-100] e reload, il risultato è sempre ["Base Case","Pessimistic Case","Optimistic Case"] e dopo 1 click lo storage contiene solo i default. Il warn registrato è 'LocalStorage contained invalid schema structure. Falling back to defaults.'. Nei controlli (aggiunta bucket 0%, RAL 36000) i dati restano preservati.

**Impatto:** Perdita totale e silenziosa di tutti i piani e scenari personali. Basta eliminare un asset del portafoglio e chiudere il browser. Non esiste un export per fare backup (vedi UI-17).

**Correzione proposta:** Separare lo stato bozza (draft) del form dallo stato salvato: salvare solo scenari validi oppure salvarli con un flag `invalid` che non blocca il caricamento. In fase di load validare scenario per scenario, mettere in quarantena solo quelli rotti e aggiungere una migrazione/sanitize, MAI un fallback globale ai default. Prima di qualsiasi reset tenere una copia in una chiave di backup. Nei form: in NumberInput applicare min/max e conservare la stringa grezza durante la digitazione (commit su blur); quando si elimina un asset ridistribuire la sua quota; quando si riduce l'orizzonte troncare o eliminare le fasi oltre l'orizzonte.

### UI-02 · Alto · Il 'Sconto Fiscale IRPEF su Fondo' è calcolato con una formula sbagliata: circa 4 volte il valore reale, e la card mostra '--28 €/m'

*Dove:* `app/components/charts/MonthlyDisposableCashflow.tsx:78` · *Verifica:* confermato

La formula è taxSavingsAnnual = (standardNetAnnual - netAnnual) + pensionEmpContribEuro. Dato che netAnnual sottrae già il contributo, il risultato è 2*contributo - risparmio_IRPEF_reale invece del risparmio IRPEF. La cifra entra nella riga 'Sconto Fiscale IRPEF su Fondo' (L431-446). Nella card 2 compare 'Fondo Pensione: -{employeePfMonthlyEuro - monthlyTaxSavings}' (L243): il valore è negativo e il testo diventa '--28 €/m'. Il valore inoltre non coincide con quello dell'engine (pensionTaxRebate = min(contributo, tetto) * aliquota marginale).

**Evidenza (verifica indipendente):** Script (script di verifica) Base fase 1 (RAL 35k, C=700): UI 1.094,23, S reale 305,77, engine pensionTaxRebate 245,00, card 'Fondo Pensione: --28 €/m'. Base fase 3: UI 1.884 contro S 516 ed engine 420. Optimistic fase 3: UI 4.239 contro 1.161. Pessimistic fase 2: UI 546,51 contro S 213,49 (2,56x).

**Impatto:** L'utente vede un vantaggio fiscale del fondo pensione gonfiato di 3,5-4,5 volte, proprio sul numero che orienta la scelta di versare volontariamente al fondo. In più ci sono una cifra negativa con doppio segno e un dato incoerente con le proiezioni.

**Correzione proposta:** Eliminare il calcolo locale e mostrare row.pensionTaxRebate dall'engine (anno di inizio della fase selezionata). Se si vuole il calcolo per scaglioni, spostarlo nell'engine come funzione pura testata: taxSaving = irpefNetta(senza deduzione) - irpefNetta(con deduzione).

### UI-03 · Alto · La card 'Flusso di Cassa' ricalcola bonus, TFR, contributi e RAL con costanti proprie che contraddicono l'engine e i parametri dell'utente

*Dove:* `app/components/charts/MonthlyDisposableCashflow.tsx:100` · *Verifica:* confermato

Il componente non usa i risultati dell'engine e ignora molti parametri dello scenario:
- bonus con tassazione ordinaria fissato a 0.35 invece di taxes.marginalIRPEFTaxRate (L109);
- detassazione fissata a 0.05 invece di taxes.bonusSubstituteTaxRate (L108);
- CUSTOM con `|| 5`, quindi lo 0% diventa 5% (L110);
- TFR = ral/tfrDivisor senza la sottrazione tfrSubtractedPercentage (L133);
- contributo datoriale mostrato anche quando quello del dipendente è 0, mentre l'engine lo azzera (L128);
- savingsToPensionPercent ignorato: la card dice 'Risparmio Personale ETF' anche quando metà del risparmio va al fondo;
- fallback `annualGrossRAL || 37500` (L100), `mensilita || 14` (L101, l'engine usa 13), `tfrDivisor || 13.5` (L132) e la costante '6.9' (L416). Questo viola il requisito 'nessun numero hardcoded'.

**Evidenza (verifica indipendente):** v2_cashflow.ts. Optimistic fase 2, bonus: UI 4.225 contro engine 3.705. Fase 3: 5.850 contro 5.130. Con bonusSubstituteTaxRate=1: engine 2.475, UI 2.375. CUSTOM 0%: engine 2.500, UI 2.375. TFR a RAL 35k: UI 2.592,59, engine 2.579,63. Fase con RAL 0: engine ral 0, tfr 0, er 0; UI mostra RAL 37.500, TFR 2.777,78 e contributo datoriale 750. Con contributo dipendente 0%: datoriale engine 0, UI 700. savingsToPension 50%: engine 5.287,5 a portafoglio, la card mostra 600 €/m (7.200/anno) come 'Risparmio Personale ETF'.

**Impatto:** La sezione che risponde a 'quanto mi resta in tasca' mostra numeri diversi da quelli usati nelle proiezioni. Per una fase senza stipendio inventa uno stipendio da 37.500 €.

**Correzione proposta:** Esporre dall'engine, per ogni anno, un breakdown della busta paga (lordo, INPS, IRPEF, netto, TFR maturato, contributi FP, bonus netto, rebate) e far solo leggere quei valori al componente. Eliminare tutti i fallback numerici: se RAL=0 mostrare 0 o 'nessuno stipendio'.

### UI-05 · Alto · Il campo 'Imposta Rendimenti Interni' del Fondo Pensione non ha alcun effetto: scrive un campo che l'engine non legge

*Dove:* `app/components/forms/PensionFundForm.tsx:256` · *Verifica:* confermato

PensionFundForm modifica pensionFund.annualYieldTaxRatePercent, ma l'engine applica la tassazione annua dei rendimenti leggendo taxes.pensionAnnualYieldTaxRate (calculator.ts L524). Quest'ultimo non è modificabile da nessun form: TaxConfigForm non lo espone. L'utente modifica un input e i risultati non cambiano.

**Evidenza (verifica indipendente):** Script (script di verifica) Saldo FP anno 30 del Base: pf.annualYieldTaxRatePercent=20 dà 274.840, =0 dà 274.840 (identico). taxes.pensionAnnualYieldTaxRate=0 dà 311.534.

**Impatto:** Un controllo che non funziona su un parametro fiscale chiave del fondo pensione. Gli scenari di sensitività su questa imposta sono impossibili e l'utente crede di averli fatti.

**Correzione proposta:** Usare un solo campo (consigliato taxes.pensionAnnualYieldTaxRate o pensionFund.annualYieldTaxRatePercent, non entrambi), migrare i dati salvati e collegare il form a quel campo. Aggiungere un test che verifica che ogni input del form cambi l'output dell'engine.

### UI-06 · Alto · La 'Destinazione TFR' globale non ha effetto in tutti e 3 i preset perché ogni fase la sovrascrive

*Dove:* `app/components/forms/PensionFundForm.tsx:91` · *Verifica:* confermato

Il pannello Fondo Pensione mostra 'Predefinito: X% a Fondo' e i chip 0/25/50/75/100%. Però tutte le fasi dei preset hanno tfrPensionAllocationPercent esplicito (100,100,100 in Base e Optimistic, 0,0 in Pessimistic), e questo valore ha la precedenza nell'engine (calculator.ts L401-402). Cambiare il valore globale non produce alcun effetto e la UI non lo segnala. L'unica traccia è un badge 'Override Fase' dentro un'altra sezione (SalaryPhasesForm L295).

**Evidenza (verifica indipendente):** v3_engine.ts, patrimonio netto finale con globale 0 e globale 100: Base 1.419.952/1.419.952, Pess 423.662/423.662, Opt 3.902.878/3.902.878. Senza override di fase: Base 1.394.187 contro 1.419.952, Pess 423.662 contro 392.227, Opt 3.800.200 contro 3.902.878.

**Impatto:** La scelta 'TFR in azienda o nel fondo' è una delle decisioni principali che l'app dovrebbe aiutare a prendere. L'utente confronta e conclude in modo sbagliato che non cambia nulla.

**Correzione proposta:** Nei preset lasciare undefined l'override di fase. Quando esistono override, disabilitare o annotare il controllo globale ('ignorato in N fasi') e offrire 'applica a tutte le fasi'. In alternativa tenere un solo livello di configurazione.

### UI-07 · Alto · Modificare 'Anno Inizio' di una fase viene ignorato oppure riordina le fasi; digitare 'Anno Fine' comprime le fasi successive

*Dove:* `app/components/forms/SalaryPhasesForm.tsx:35` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

In handleUpdatePhase (SalaryPhasesForm.tsx L30-51) le fasi vengono ordinate per startYear e poi si forza startYear[i] = endYear[i-1]+1. Di conseguenza:
- una modifica a 'Anno Inizio' viene sempre scartata (fase 2 a 8 resta 6-15);
- se il nuovo inizio supera quello della fase successiva, le fasi si scambiano. Con fase 2 a 20 si ottiene 1-5 a 35k | 6-30 a 60k | 31-31 a 48k, fuori orizzonte, e il netto finale passa da 1.419.952 a 1.583.674.
Ogni battitura viene applicata subito. Quando un valore intermedio di 'Anno Fine' supera la fine della fase successiva, la durata originale di quella fase va persa in modo irreversibile: digitando 20 e poi tornando a 5 resta 1-5|6-21|22-30. Il codice inoltre muta gli oggetti phase dello store (newPhases[i].startYear = ...), e lo stesso avviene in handleAddPhase (last.endYear) e in handleRemovePhase.

**Evidenza (verifica indipendente):** Script (script di verifica) 'start p2=8' resta 1-5|6-15|16-30. 'start p2=20' dà 1-5 RAL35000 | 6-30 RAL60000 | 31-31 RAL48000, con netto finale 1.583.674 contro 1.419.952. 'p1 end' 0→2→20→0→5 dà 1-5|6-21|22-30. Mutazione in place: con p2=20 lo store originale diventa '6-30' per la fase 3 (mutated=true); con p1 end=8 la fase 2 dello store diventa 9-15.

**Impatto:** Il piano di carriera cambia da solo senza avvisi e le proiezioni finali si spostano di oltre 160k €. Gli input 'Anno Inizio' sembrano modificabili ma non funzionano.

**Correzione proposta:** Rendere startYear di sola lettura (derivato) e modificare solo la durata o l'anno di fine, con commit su blur. Validare sovrapposizioni e buchi con un messaggio, invece di riordinare. Non mutare mai gli oggetti dello store (copiare ogni fase prima di modificarla).

### UI-08 · Alto · La tabella anno per anno non ha le colonne richieste RAL, TFR maturato e liquidità; il totale non è la somma delle colonne

*Dove:* `app/components/charts/YearlyDetailTable.tsx:101` · *Verifica:* confermato

I criteri di accettazione chiedono 'year, RAL, net monthly savings, TFR accrued, pension fund balance, investment portfolio balance, total wealth nominal/real'. Nella tabella mancano:
- RAL: non si possono verificare i cambi di fase;
- TFR maturato annuo: c'è solo 'TFR a Fondo', che nel Pessimistic (0% a fondo) vale '—' per tutti i 30 anni, quindi il criterio 'TFR = RAL/divisore verificabile in tabella' non è verificabile;
- liquidità (cashBalance) e rimborso IRPEF.
Il 'risparmio mensile netto' è mostrato come importo annuo ×12.

**Evidenza (verifica indipendente):** Script (script di verifica) Base anno 30: TFR+FP+ETF netti = 1.414.952 contro totale 1.419.952 (liquidità 5.000). RAL agli anni 1/6/16 = 35000/48000/60000 e tfrAccrued anno 1 = 2.579,63, entrambi assenti. Pessimistic: anni con tfrPensionFlow>0 = 0.

**Impatto:** Mancano i criteri di accettazione. L'utente non può controllare i numeri chiave e vede un totale che non quadra.

**Correzione proposta:** Aggiungere le colonne RAL, Risparmio mensile, TFR maturato (con la quota azienda/fondo), Liquidità e Rimborso IRPEF. Rendere le colonne configurabili e aggiungere una riga di riconciliazione.

### UI-10 · Alto · Il Service Worker non viene mai registrato: l'app non è installabile né utilizzabile offline

*Dove:* `app/components/ServiceWorkerRegistration.tsx:8` · *Verifica:* confermato

La registrazione avviene dentro un listener 'load' aggiunto in useEffect. useEffect gira dopo l'hydration, quando l'evento load è già scattato, quindi il callback non parte mai. Il requisito R4 (PWA installabile e offline) non è soddisfatto.

**Evidenza (verifica indipendente):** Script (script di verifica) a 375 e a 1440 px 'load fired t=196', poi 'load listener added rs=complete t=261', regs=0. pwB.js: fast4G 'load fired t=2146' poi listener a t=2401, regs=0; slow3G 'load fired t=7723' poi listener a t=7993, regs=0.

**Impatto:** Niente installazione PWA e niente offline, nonostante manifest e sw.js siano presenti.

**Correzione proposta:** Registrare subito nell'effect: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`. Se si vuole aspettare il load, usare `document.readyState === 'complete' ? register() : addEventListener('load', register, {once:true})`. Aggiungere un test e2e che verifica la registrazione.

### UI-04 · Medio · Lo stimatore del netto in busta paga usa tabelle IRPEF/INPS hardcoded, non parametriche e superate per il 2026; mancano le addizionali

*Dove:* `app/components/charts/MonthlyDisposableCashflow.tsx:36` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

estimateItalianNetSalary (MonthlyDisposableCashflow.tsx L26-88) usa tabelle fisse nel codice e non configurabili, contro il requisito R1:
- INPS al 9,19% senza la maggiorazione dell'1% sulla quota di retribuzione oltre la prima fascia pensionabile (circa 55-56k €);
- scaglioni 23/35/43, mentre dal 2026 la L. 199/2025 porta il secondo al 33%;
- detrazioni art. 13 TUIR senza la maggiorazione di 65 € tra 25 e 35k;
- cuneo 2025 applicato come 1.000 € anche sotto i 20k, dove invece è una somma esente in percentuale;
- nessuna addizionale regionale o comunale.
Gli effetti vanno in direzioni opposte: le addizionali omesse (esempio 1,73% + 0,8%) gonfiano il netto di 804/1.103/1.377 €/anno a 35/48/60k, mentre il 35% al posto del 33% lo riduce di 76/312/440 €. Il saldo netto è una sovrastima del 'Netto Spendibile' di circa 47 €/m a 35k, 57 €/m a 48k e 69 €/m a 60k (su 14 mensilità), variabile secondo regione e comune.

**Evidenza (verifica indipendente):** Script (script di verifica) (funzione UI verbatim contro stima 2026). RAL 35k: UI 26.601 contro 25.937, sovrastima 663 €/anno = 47 €/m. 48k: 791 €/anno = 57 €/m. 60k: 963 €/anno = 69 €/m. Effetto scaglione 33%: +76/+312/+440. Addizionali: 804/1.103/1.377. INPS +1%: 46 € a 60k. Fonti: edotto.com/articolo/nuova-irpef-e-detassazione-le-novita-della-legge-di-bilancio-2026 ; fiscozen.it/news/irpef-2026-come-si-calcola-alla-luce-del-taglio/.

**Impatto:** Il 'Netto Spendibile Rimanente' è sovrastimato di circa 50-100 €/mese. L'utente può pianificare un risparmio mensile che in realtà non riesce a sostenere.

**Correzione proposta:** Spostare il calcolo del netto nell'engine con una TaxConfig estesa (scaglioni, detrazioni, cuneo, aliquote INPS e massimale, addizionale regionale e comunale come input) e valori di default 2026 documentati. Mostrare in UI che si tratta di una stima e indicare l'anno fiscale delle tabelle.

### UI-09 · Medio · La colonna 'Costi / TER' sotto ETF include il TER del fondo pensione e le righe ETF non si riconciliano (il bollo non è mostrato)

*Dove:* `app/components/charts/YearlyDetailTable.tsx:177` · *Verifica:* confermato

row.investmentFeesYear è la somma del TER ETF e del TER del fondo pensione (calculator.ts L538), ma la tabella lo colloca nel gruppo 'Portafoglio Investimenti ETF'. 'Rendimento ETF' è già al netto del TER ma al lordo del bollo. Mostrare accanto '-Costi' induce a sottrarlo una seconda volta. Il bollo non compare in nessuna colonna, quindi 'saldo precedente + versamenti + rendimento' non dà il saldo. In vista 'Netta' lo scarto è ancora maggiore, perché il saldo è al netto delle imposte latenti e i flussi no.

**Evidenza (verifica indipendente):** v5_table.ts, ricalcolato con TER fondo=0 per isolare le fee ETF. Anno 1: 50 totali, 35 ETF, 15 FP (29,5%). Anno 10: 508/345/162 (32,0%). Anno 30: 3.330/2.529/801 (24,1%). Riconciliazione ETF lorda: anno 1 26.885 contro 26.831 (scarto 54), anno 30 1.346.919 contro 1.344.225 (scarto 2.694). Vista netta anno 30: 1.174.973 contro 1.154.213.

**Impatto:** Costi ETF sovrastimati di circa il 25-30% e una tabella che non torna. Chi analizza i costi trae conclusioni sbagliate su ETF e fondo.

**Correzione proposta:** Fare restituire all'engine etfFeesYear, pensionFeesYear e wealthTaxYear separati. Mostrare il TER del fondo nel gruppo Fondo Pensione e aggiungere una colonna Bollo. Dichiarare in intestazione se il rendimento è al netto del TER.

### UI-11 · Medio · Allocazione ≠ 100%: la UI mostra solo un testo rosso, mentre la dashboard normalizza in silenzio e la ciambella mostra percentuali sbagliate con un '100%' fisso

*Dove:* `app/components/charts/AllocationDonutChart.tsx:51` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Con un'allocazione diversa da 100% (es. 70+20=90) il form mostra un testo rosso '90.0% (Must be 100%)' (in inglese anche in italiano), ma nulla blocca il valore. L'engine lancia un errore, useActiveScenario lo intercetta e ricalcola con sanitizeScenarioParameters, che riscala i pesi a 77,78/22,22. La dashboard mostra quindi un netto finale di 1.453.802 € senza alcun banner che segnali la normalizzazione. Il donut (AllocationDonutChart L51) mostra '100%' hardcoded al centro e tooltip 70% e 20%, mentre le fette sono disegnate in proporzione. Sanitize ripara in silenzio anche buchi e sovrapposizioni tra le fasi. È un problema da stato non valido. Unito a UI-01 porta comunque alla perdita dei dati.

**Evidenza (verifica indipendente):** v3_engine.ts: 'Bucket allocation percentage must sum to 100%'. Pesi sanitizzati ['77.78','22.22'], netto finale 1.453.802 contro 1.419.952 del Base valido.

**Impatto:** L'utente crede che il 10% resti in liquidità, ma l'app investe tutto. I risultati mostrati non corrispondono all'input e a questo si aggiunge il rischio di perdita dati di UI-01.

**Correzione proposta:** Mostrare un banner bloccante sulla dashboard ('Configurazione non valida: allocazione 90%') invece del ricalcolo silenzioso, oppure normalizzare in modo esplicito con un bottone 'Normalizza'. Nel donut calcolare la percentuale reale e il totale. Elencare in UI le correzioni fatte da sanitize.

### UI-12 · Medio · Il donut 'Allocazione Portafoglio' mostra l'allocazione target iniziale, non quella reale che deriva nel tempo

*Dove:* `app/components/charts/AllocationDonutChart.tsx:16` · *Verifica:* confermato

Il requisito R3 chiede la 'current asset allocation across investment buckets'. L'engine non ribilancia: ogni bucket capitalizza al proprio rendimento. Il donut però mostra sempre bucket.allocationPercent, senza indicare l'anno né la deriva.

**Evidenza (verifica indipendente):** v3_engine.ts. Base: totale 1.344.225 = somma delle parti 1.344.225; quote all'anno 30 80,1/19,9 contro target 70/30; all'anno 10 73,5/26,5. Optimistic: anno 30 90,2/9,8 contro 80/20; anno 10 83,8/16,2.

**Impatto:** A fine orizzonte l'utente sottostima di circa 10 punti la quota azionaria, e quindi il rischio, del suo portafoglio.

**Correzione proposta:** Esporre nell'engine i saldi per bucket per anno. Nel donut mostrare l'allocazione all'anno selezionato, con il target come anello esterno. In alternativa aggiungere un'opzione di ribilanciamento annuale nell'engine.

### UI-13 · Medio · Le KPI nascondono bollo e imposte latenti, mescolano il TER di fondo ed ETF e non rendono i tooltip che spiegano le definizioni

*Dove:* `app/components/charts/KPICards.tsx:76` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

La card costi mostra solo totalFeesPaid (36.809 € nel Base, TER ETF + TER fondo pensione insieme). Il bollo (totalTaxesPaid = 29.421 €) non viene mai letto né mostrato, anche se esiste la chiave i18n kpi.totalTaxes. Le imposte latenti all'uscita (213.823 €) non sono esplicitate. Sono solo ricavabili confrontando 'Patrimonio Netto' con la riga 'Lordo: 1.633.775 €'. I tooltip kpi.irrTooltip, totalContributionsTooltip e totalGainsTooltip sono definiti ma mai mostrati, quindi l'utente non sa che 'Versamenti Totali' (740.184 €) include 27.000 € di patrimonio iniziale, TFR e contributi datoriali, né che il rendimento netto include il rimborso IRPEF reinvestito. Le etichette di fallback nel codice ('Costi TER & Imposte', 'Rendimento Netto') divergono dalle traduzioni, e 'Lordo:' è hardcoded (L38, L71).

**Evidenza (verifica indipendente):** v3_engine.ts, Base: TER 36.809, bollo 29.421, lordo 1.633.775, netto 1.419.952, latenti 213.823, versamenti 740.184 (27.000 di patrimonio iniziale = 15.000+5.000+3.000+4.000). grep in app/: totalTaxesPaid 0, irrTooltip 0, totalContributionsTooltip 0, totalGainsTooltip 0, kpi.totalTaxes 0.

**Impatto:** I costi fiscali sono invisibili: circa 243k € tra bollo e imposte latenti contro i 37k € di TER mostrati. Le KPI sono ambigue proprio dove servono a decidere.

**Correzione proposta:** Aggiungere le card 'Bollo pagato' e 'Imposte latenti all'uscita' (oppure 'Costi & imposte totali' con il dettaglio), separare TER ETF e TER fondo e rendere i tooltip con InfoTooltip. Eliminare i fallback divergenti.

### UI-14 · Medio · 'Massimizza Tetto Deducibilità' calcola la % solo sulla RAL della fase 1 e la scrive nel campo globale, falsando Versamenti e IRR

*Dove:* `app/components/forms/PensionFundForm.tsx:157` · *Verifica:* confermato

Il badge e l'attivazione usano salaryPhases[0].annualGrossRAL (con fallback 37500) e salvano employeeContributionPercent = 12,76% per tutta la carriera. L'engine ricalcola correttamente i flussi per ogni anno, ma per Versamenti e IRR usa il campo grezzo (calculator.ts L513). Il valore scritto dalla UI cambia così le KPI anche a parità di flussi reali. Il badge mostra 12,76% anche nelle fasi in cui la % reale è 8,76% o 6,61%.

**Evidenza (verifica indipendente):** v3_engine.ts, Base con autoMax: opt% 12,76. Con empPct=2: versamenti 740.184, IRR 4,96%, gain 892.136, netto 1.632.320, contributo dipendente anno 16 3.964,57. Con empPct=12,76: versamenti 907.502, IRR 3,75%, gain 724.818, netto 1.632.320, anno 16 3.964,57. % reale per RAL 35k/48k/60k: 12,76/8,76/6,61.

**Impatto:** IRR e rendimento netto cambiano di oltre 1 punto e di circa 167k € solo per aver attivato un toggle.

**Correzione proposta:** Non scrivere employeeContributionPercent quando si attiva autoMax. Mostrare la % per ogni fase. Nell'engine usare l'empPct effettivo dell'anno anche per Versamenti e IRR (correzione da coordinare con la dimensione engine).

### UI-15 · Medio · Bonus 'Personalizzata' senza campo aliquota; l'etichetta '5% (Agevolata)' è hardcoded e non segue il parametro (2026: 1%)

*Dove:* `app/components/forms/SalaryPhasesForm.tsx:271` · *Verifica:* confermato

La select propone 'Personalizzata', ma nessun input permette di impostare bonusTaxRatePercent. L'engine usa quindi `?? 5.0` e il risultato è identico a quello agevolato. L'etichetta '5% (Agevolata)' e il tooltip bonusTaxRateTooltip ('fino a 3.000 €, 5%') sono fissi, mentre l'aliquota effettiva è taxes.bonusSubstituteTaxRate, modificabile in TaxConfigForm. Per il 2026-2027 la L. 199/2025 porta l'imposta all'1% con un tetto di 5.000 €. Allo stesso modo l'etichetta 'Imposta di Bollo (0,20%)' in translations.ts L105 non cambia se l'utente modifica il valore. Le chiavi i18n detassazione5, ordinariaIrpef e customTax esistono ma non sono usate.

**Evidenza (verifica indipendente):** v3_engine.ts: CUSTOM senza aliquota dà bonusNet 2.375 (=5%). v2_cashflow.ts: con bonusSubstituteTaxRate=1 engine 2.475 e UI 2.375. grep in app/: detassazione5 0, ordinariaIrpef 0, customTax 0. Fonte: edotto.com/articolo/nuova-irpef-e-detassazione-le-novita-della-legge-di-bilancio-2026.

**Impatto:** Un'opzione che non fa nulla ed etichette che contraddicono il valore usato. I default fiscali 2026 non sono aggiornati.

**Correzione proposta:** Quando si sceglie CUSTOM mostrare un NumberInput per bonusTaxRatePercent. Generare le etichette dal parametro (`${taxes.bonusSubstituteTaxRate}% agevolata`). Aggiornare i default 2026 (1%, tetto 5.000 €) e modellare il tetto.

### UI-16 · Medio · Il toggle EN è incompleto: 72 testi visibili restano in italiano, circa 95 stringhe hardcoded fuori da t() e numeri sempre in formato italiano

*Dove:* `app/components/charts/MonthlyDisposableCashflow.tsx:173` · *Verifica:* confermato

Il criterio 'Language toggle switches all visible UI text' non è soddisfatto:
- MonthlyDisposableCashflow contiene 52 stringhe e non chiama mai t();
- intestazioni di gruppo della tabella (5), voci della barra laterale (page.tsx L118-124), ConfigPanel ('Pannello di controllo...', 'Riduci'), chip di SalaryPhasesForm e PensionFundForm ('Eredita Globale', 'Override Fase', 'Predefinito', '0% Azienda'), TaxConfigForm;
- la traduzione EN di charts.nominal e charts.real è rimasta 'Nominale' e 'Reale' (translations.ts L315-316);
- al contrario ci sono stringhe inglesi anche in modalità IT: 'PHASE', 'Global', 'Use setting', '(Must be 100%)', 'New Asset N', 'Custom Scenario N', '(Copy)', i nomi dei preset;
- le 57 chiamate a formatCurrency e formatPercent non passano mai lang, quindi in EN compare '1.419.952 €';
- 20 chiavi di traduzione non sono usate.

**Evidenza (verifica indipendente):** Script (script di verifica) su `next start`. In EN restano tra gli altri 'Flusso di Cassa & Disponibilità Mensile Netta', 'Nominale', 'Reale', 'Pannello di controllo parametri e scenari', 'Riduci', 'Use setting', le voci della sidebar ('Parametri Globali'...) e 'Lordo: 1.633.775 €'. Le valute in EN sono formattate '1.419.952 €'. grep: 57 chiamate format*() in app/, 0 con lang.

**Impatto:** Fallisce un criterio di accettazione. Gli utenti non italiani (colleghi e amici a cui l'app è destinata) vedono un'interfaccia mista.

**Correzione proposta:** Spostare tutte le stringhe in translations.ts con chiavi tipizzate (`keyof`), così una chiave mancante diventa un errore di compilazione. Aggiungere una regola lint (react/jsx-no-literals) e un test che confronta le chiavi IT/EN. Leggere lang dal context in useFormat() e passarlo a tutti i formatter.

### UI-17 · Medio · Mancano export, import e reset in UI (lo store li supporta) e la dashboard non mostra quale scenario si sta guardando

*Dove:* `app/components/scenario/ScenarioManager.tsx:47` · *Verifica:* confermato

ScenarioStore espone exportJson, importJson e resetToDefaults (scenario-store.ts L644-656), ma nessun componente li usa. Senza export l'utente non può fare backup né condividere scenari tra dispositivi, il che rende irrimediabile la perdita dati di UI-01. Inoltre la dashboard (Dashboard.tsx, header in page.tsx L199-201) non mostra mai il nome dello scenario attivo: per sapere a quale scenario si riferiscono KPI e grafici bisogna aprire il drawer.

**Evidenza (verifica indipendente):** grep: le uniche occorrenze sono in lib/store/scenario-store.ts:639,644,648. Lettura di page.tsx L141-162 e di Dashboard.tsx L13-76.

**Impatto:** Nessun backup e confusione tra scenari durante i confronti.

**Correzione proposta:** Aggiungere al ScenarioManager i comandi Esporta JSON (download), Importa (file input con anteprima degli errori) e Ripristina default (con conferma e backup). Mostrare nell'header il nome dello scenario attivo con un selettore rapido.

### UI-18 · Medio · Accessibilità: zoom bloccato (maximumScale=1), lang fisso 'it', contrasti insufficienti, controlli senza nome o non raggiungibili da tastiera

*Dove:* `app/layout.tsx:30` · *Verifica:* confermato

- viewport maximumScale=1 blocca il pinch-zoom: fallisce l'audit Lighthouse 'meta-viewport' e viola WCAG 1.4.4.
- <html lang="it"> fisso (L39), non aggiornato quando si passa a EN; anche manifest.json ha lang 'it'.
- Contrasti: testo slate-500 a 10-11px sulle glass-card 3,89:1 (sotto 4,5:1, 13 occorrenze); placeholder slate-600 2,65:1; icone rinomina/duplica/elimina con opacity-40 2,17:1 (sotto 3:1).
- Il bottone di espansione di YearlyDetailTable (L32) non ha nome accessibile.
- La selezione dello scenario è un <div onClick> (ScenarioManager L90), non raggiungibile da tastiera; i bottoni conferma/annulla rinomina sono solo icone senza nome.
- Target touch 18-20px (sotto i 24px di WCAG 2.5.8).
- ToggleSwitch contiene lo sr-only 'Use setting' in inglese.

**Evidenza (verifica indipendente):** pwA.js e pwC.js: vp 'width=device-width, initial-scale=1, maximum-scale=1', lang it/en = 'it'/'it'. Calcolo Python dei contrasti: 3,88 / 2,64 / 2,15.

**Impatto:** Mette a rischio il requisito Lighthouse accessibilità ≥ 80 e rende l'app difficile da usare su mobile per chi ha bisogno di ingrandire.

**Correzione proposta:** Rimuovere maximumScale. Impostare document.documentElement.lang nel LanguageProvider. Usare slate-400 o più chiaro per il testo piccolo e opacità ≥ 70% per le icone. Aggiungere aria-label e aria-expanded al bottone di espansione e usare <button> per la selezione dello scenario. Portare i target a 24px o più.

### UI-19 · Medio · Il grafico 'Composizione' divide per contenitore e non per fonte; i grafici di confronto e crescita non hanno le viste richieste

*Dove:* `app/components/charts/CompositionBarChart.tsx:17` · *Verifica:* confermato

R3 chiede la composizione 'by source (savings, investment gains, pension fund, TFR)'. Il grafico impila invece liquidità, TFR, fondo e portafoglio: non distingue mai quanto viene dai versamenti e quanto dai rendimenti, che è la domanda centrale in ottica FIRE. WealthLineChart non ha il toggle nominale/reale richiesto (mostra sempre le due linee nette e mai la lorda). ScenarioComparisonChart distingue gli scenari solo per colore (tutti tratto pieno 3px), cosa critica per i daltonici, e le sue etichette restano in italiano in EN.

**Evidenza (verifica indipendente):** Lettura di CompositionBarChart (chiavi cash/portfolio/pension/tfr), WealthLineChart (due <Line> fisse, nessun toggle) e ScenarioComparisonChart L82-94 (solo stroke=SCENARIO_COLORS, strokeWidth 3, nessuno strokeDasharray). translations.ts L315-316: 'Nominale' e 'Reale' anche in EN.

**Impatto:** La visualizzazione più utile per capire l'effetto dell'interesse composto manca, e il confronto tra scenari è poco leggibile.

**Correzione proposta:** Fare restituire all'engine i contributi cumulati per contenitore e mostrare 'versato' e 'rendimento' impilati, con l'opzione per contenitore. Aggiungere il toggle nominale/reale e netto/lordo e usare stili di tratteggio diversi per ogni scenario.

### UI-20 · Basso · La card cashflow mostra la fase sbagliata dopo l'eliminazione di una fase o il cambio di scenario (indice fuori range)

*Dove:* `app/components/charts/MonthlyDisposableCashflow.tsx:98` · *Verifica:* confermato

selectedPhaseIndex è uno useState locale che non si resetta mai. Se l'utente è sulla 'Fase 3' ed elimina una fase, o passa a uno scenario con meno fasi, phases[2] è undefined e il fallback `|| phases[0]` mostra la fase 1 con nessun bottone evidenziato. Se invece la fase eliminata precede quella selezionata, l'indice punta a una fase diversa senza avviso.

**Evidenza (verifica indipendente):** Analisi del codice di SalaryPhasesForm.handleRemovePhase L116-131 e MonthlyDisposableCashflow L93-98 e L188-199. Con v4_phases.ts ho verificato la stessa logica di riallineamento delle fasi.

**Impatto:** Dati di busta paga riferiti a una fase diversa da quella che l'utente crede di vedere.

**Correzione proposta:** Salvare l'id della fase invece dell'indice, oppure fare clamp e reset dell'indice in un effect quando cambiano phases.length o scenario.id.

### UI-21 · Basso · 6 errori in console a ogni caricamento dall'animazione AnimatedFlame (path d e circle cx/cy 'undefined')

*Dove:* `app/components/ui/AnimatedFlame.tsx:49` · *Verifica:* confermato

Framer-motion anima l'attributo `d` e cx/cy con keyframes. Al primo frame produce valori undefined, e il browser registra errori SVG. Il problema è solo cosmetico, ma sporca la console e penalizza Lighthouse Best Practices ('Browser errors were logged').

**Evidenza (verifica indipendente):** pwA.js: 375 e 1440 px, 'console errors: 6': 2× "<path> attribute d: Expected moveto path command ('M' or 'm'), \"undefined\".", 2× cy e 2× cx "Expected length, \"undefined\"".

**Impatto:** Rumore in console, punteggio Lighthouse più basso e maggiore difficoltà nel debug.

**Correzione proposta:** Usare `initial` con gli stessi valori del primo keyframe (initial={{ d: path0, cx: 10, cy: 11 }}), oppure animare solo transform e opacity.

### UI-22 · Basso · All'avvio compaiono per un istante dati di default e lingua italiana prima della reidratazione

*Dove:* `lib/store/context.tsx:17` · *Verifica:* confermato

StoreProvider crea lo store con i preset di default e legge localStorage solo in useEffect. Allo stesso modo LanguageProvider parte in 'it' e cambia lingua dopo il mount. Il primo render, con le animazioni di ingresso di KPI e grafici, usa quindi i preset e l'italiano, poi tutto salta ai dati dell'utente o in inglese.

**Evidenza (verifica indipendente):** Lettura del codice: scenario-store.ts L563-570 (costruttore senza customStorage → default), context.tsx L17-19 (useEffect rehydrate), i18n/context.tsx useState('it') + useEffect.

**Impatto:** Per un attimo compaiono numeri che non sono quelli dell'utente (flash) e le animazioni girano su dati sbagliati.

**Correzione proposta:** Rimandare il render della dashboard finché `hydrated` non è true (skeleton), oppure leggere localStorage in modo sincrono nell'inizializzatore di useState lato client (con suppressHydrationWarning o rendering client-only).

## Architettura, persistenza, PWA e test

### ARCH-01 · Critico · Perdita totale degli scenari utente: lo stato invalido viene salvato, al reload tutto torna ai default e il primo click sovrascrive i dati

*Dove:* `lib/store/scenario-store.ts:252` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

updateScenario salva qualsiasi stato anche quando validateScenarioParameters fallisce: emette solo un console.warn (righe 468-471), e notify() scrive sempre su localStorage. All'avvio loadStoreFromLocalStorage valida l'intero payload. Basta un errore in UNO qualsiasi degli scenari perché restituisca i preset di default (251-255), senza conservare il JSON originale. Alla prima azione dell'utente notify() sovrascrive la chiave e tutti gli scenari personali vanno persi. Trigger raggiungibili dalla UI, verificati: 1) ridurre l'orizzonte sotto l'anno di inizio dell'ultima fase (su una copia del Base, orizzonte ≤15). GlobalParamsForm imposta endYear < startYear e il motore lo accetta senza errori: lo stato invalido è persistente e silenzioso. 2) Ribilanciare i bucket con la somma diversa da 100% anche solo per un momento (es. 70→60 prima di correggere l'altro bucket). 3) Svuotare il nome di un bucket. 4) Inserire un risparmio mensile negativo, oppure un TER o un'aliquota negativi, che non hanno clamp in UI. NON sono trigger la mensilità vuota (la UI la porta a 12) né la liquidità negativa (la UI la porta a 0).

**Evidenza (verifica indipendente):** vite-node (script di verifica) Copia del Base con orizzonte 30→15 (emulando l'handler di GlobalParamsForm): il motore gira (424.375 €), persistedValid=false ('salaryPhases[2].endYear must be >= startYear'). Dopo il reload la memoria contiene solo 'Base | Pess | Opt', lo storage è ancora intatto, e dopo il primo selectActiveScenario lo storage diventa 'Base Case | Pessimistic Case | Optimistic Case': 'Piano personale' e la copia sono persi. Con orizzonte 16 lo stato resta valido. Stesso esito di perdita con: allocazione 70→60, nome bucket '', monthlyNetSavings −200, TER −0,1. Nessuna perdita con mensilità vuota (clamp a 12, valido) né con cash negativo (clamp a 0, valido).

**Impatto:** L'utente perde in silenzio tutti i suoi scenari e i parametri personali per un'azione banale. Il bug non lascia traccia (solo console.warn) e la UI non offre alcun modo di recuperare i dati.

**Correzione proposta:** Separare lo stato 'bozza' del form (che può essere invalido) dallo scenario confermato. Usare un unico schema (es. zod) con default e coercizione per campo, condiviso da UI, store e motore. Al caricamento validare per singolo scenario: mettere in quarantena solo quello non valido e non scartare mai l'intero stato. Prima di qualsiasi riscrittura salvare il raw in una chiave di backup (es. fire_wealth_simulator_backup_<timestamp>) e mostrare un banner di recupero. Non scrivere mai i default sopra dati esistenti. Aggiungere test di regressione per il ciclo modifica → reload → click.

### ARCH-02 · Critico · Disattivando il Fondo Pensione, il TFR destinato al fondo sparisce: −134.065 € sul preset Base

*Dove:* `lib/engine/calculator.ts:397` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

La precedenza per la destinazione del TFR (calculator.ts:397-405) non considera pensionFund.enabled. Con il fondo disattivato tfrPensionFlow viene calcolato ma accreditato solo se enabled (434-462), mentre tfrCompanyFlow vale 0: il TFR non finisce da nessuna parte, eppure resta contato in totalContributions (592-597). Anche il saldo iniziale del fondo resta congelato, senza rendimento. Il selettore globale TFR di PensionFundForm viene nascosto quando il fondo è disattivato. I chip per fase in SalaryPhasesForm restano visibili e permetterebbero di correggere, ma nulla avvisa l'utente che il TFR sta sparendo. Tutti i preset hanno inoltre un override del 100% (Base e Optimistic) su ogni fase. Numeri sul Base: −134.065 € di patrimonio finale (1.147.599 contro 1.281.664).

**Evidenza (verifica indipendente):** vite-node (script di verifica) Base con enabled=false: patrimonio finale 1.147.599,27 €, TFR verso il fondo in 30 anni 114.609,26 €, TFR verso l'azienda 0, saldo del fondo all'anno 30 3.000 € (netto 2.640), contributi 677.984,26. Con fondo disattivato e TFR 0% su ogni fase: 1.281.663,99 € (delta +134.064,73 €) e TFR in azienda lordo 183.819,08 €. Anche senza override di fase (globale 100%) il TFR si perde: 1.147.599,27 €.

**Impatto:** Il confronto 'con o senza fondo pensione', che è una decisione centrale, è falsato di circa 134k € a favore del fondo.

**Correzione proposta:** Se !enabled, forzare la quota TFR al fondo a 0 (TFR in azienda) e mostrare il saldo iniziale del fondo con il suo rendimento. Un'unica funzione pura resolveTfrAllocation(phase, pf), testata. Eliminare routeTfr e tfrDestination tramite migrazione. Aggiungere un test di invariante di conservazione: i flussi in entrata devono coincidere con le variazioni dei saldi più tasse e costi.

### ARCH-03 · Alto · Il Service Worker non viene mai registrato: nessuna capacità offline (requisito R4 non soddisfatto)

*Dove:* `app/components/ServiceWorkerRegistration.tsx:8` · *Verifica:* confermato

La registrazione è agganciata all'evento window 'load' dentro un useEffect. In Next 14 con App Router l'effetto gira dopo l'idratazione, quando 'load' è già scattato: il listener non viene mai eseguito e il SW non viene mai registrato. Il README (riga 46: 'supporto offline e Service Worker') e il requisito R4 risultano quindi falsi.

**Evidenza (verifica indipendente):** Build di produzione (copia identica al repo: diff -rq di app, lib, public e config) con next start sulla porta 4077, Chrome headless, script (script di verifica) e pw_sw_throttle.mjs. Tre caricamenti a freddo: load a 201-268 ms, register() chiamato 0 volte e 0 registrazioni. Altri 8 caricamenti con Fast 3G, Slow 4G e CPU 4x + Fast 3G: 0 chiamate (load a 175-2111 ms). Solo ritardando artificialmente png/woff2 di 1,5 s si ottiene 1 registrazione.

**Impatto:** L'app installata da home screen, aperta senza rete, mostra la pagina di errore del browser. Lo storage non viene marcato come appartenente a un'app installata.

**Correzione proposta:** `const reg = () => navigator.serviceWorker.register('/sw.js'); if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg, { once: true });`. Meglio ancora adottare Serwist (@serwist/next) con precache generato in build. Aggiungere un test e2e Playwright che verifichi registrazione e avvio offline.

### ARCH-05 · Alto · Più schede aperte: chi salva per ultimo vince e cancella le modifiche dell'altra scheda

*Dove:* `lib/store/scenario-store.ts:600` · *Verifica:* confermato

Ogni scheda tiene in memoria l'intero stato e a ogni modifica riscrive tutta la chiave localStorage. Non c'è nessun listener sull'evento 'storage' né un BroadcastChannel, e non esistono revisioni né rilevamento dei conflitti.

**Evidenza (verifica indipendente):** v1_store.ts (blocco multi-tab). Le istanze A e B vengono create sullo stesso MemStorage. A.createScenario('Creato in tab A') porta lo storage a 'Base | Pess | Opt | Creato in tab A'. B.updateScenario('preset-base', inflazione 2,5) lo riporta a 'Base Case | Pessimistic Case | Optimistic Case': lo scenario creato in A è perso. grep "addEventListener('storage'|BroadcastChannel" in app/ e lib/: 0 risultati.

**Impatto:** Chi ha l'app aperta in due schede, o come PWA più browser, perde in silenzio scenari interi.

**Correzione proposta:** Ascoltare 'storage' o BroadcastChannel e ricaricare lo stato. In alternativa salvare per scenario (chiave o record IndexedDB per id) con updatedAt e revisione, fare merge per scenario e avvisare in caso di conflitto.

### ARCH-06 · Alto · Il campo UI 'Imposta Rendimenti Interni' del Fondo Pensione non ha alcun effetto: scrive un campo che il motore non legge

*Dove:* `app/components/forms/PensionFundForm.tsx:255` · *Verifica:* confermato

Il form modifica pensionFund.annualYieldTaxRatePercent (campo legacy, types.ts:59). Il motore invece legge taxes.pensionAnnualYieldTaxRate (calculator.ts:524), che non ha nessun controllo in UI (TaxConfigForm non lo espone). L'utente vede il valore cambiare ma le proiezioni restano identiche. I preset valorizzano entrambi i campi (presets.ts:74 e 103).

**Evidenza (verifica indipendente):** v2_engine.ts sul Base. annualYieldTaxRatePercent=0: patrimonio finale 1.419.951,73 → 1.419.951,73 (delta 0), saldo del fondo all'anno 30 274.840,36 invariato. taxes.pensionAnnualYieldTaxRate=0: 1.456.645,75 (+36.694,02), saldo del fondo all'anno 30 311.534,38.

**Impatto:** È un parametro fiscale presentato come modificabile ma inerte: l'output è fuorviante e viola il requisito 'tutto parametrico'.

**Correzione proposta:** Un solo campo, collocato in taxes, collegato alla UI. Rimuovere annualYieldTaxRatePercent con una migrazione. Aggiungere un test che, per ogni campo editabile della UI, verifichi che cambiarne il valore modifichi almeno una riga del risultato.

### TEST-01 · Alto · I test certificano una formula TFR legalmente errata: lo 0,5% viene applicato alla RAL invece di essere sottratto dalla quota

*Dove:* `tests/tier1/f2_tfr_accrual.test.ts:28` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Il motore calcola RAL×(1−0,5%)/13,5 (calculator.ts:408-411) e 7 asserzioni bloccano questa formula: T1-F2-1/2, T1-F5-4/5, T2-F1-5, E19 ×2. La quota corretta è RAL/13,5 − 0,50%×RAL, cioè circa il 6,91% della RAL. Lo 0,50% è il contributo aggiuntivo IVS (art. 3, ultimo comma, L. 297/1982), che il datore recupera riducendo la quota TFR: non è il contributo al Fondo di garanzia, che è un contributo datoriale distinto (art. 2). Anche l'etichetta UI 'Quota Fondo Garanzia INPS' è imprecisa. Esistono tre formule diverse: motore e test, criterio di accettazione (RAL/divisore), funzione dell'harness calculateTfrAccrual (RAL/divisore, mai confrontata con il motore). E20 e T1-F5-4 verificano la rivalutazione lorda, mentre per legge è soggetta all'imposta sostitutiva annua del 17% (il motore applica invece il 23% all'uscita su tutto il saldo).

**Evidenza (verifica indipendente):** v2_engine.ts. RAL 40.000: motore 2.948,15 contro legale 2.762,96 (+185,19, +6,7%); RAL 60.000: 4.422,22 contro 4.144,44; RAL 35.000: 2.579,63 contro 2.417,59. Base: TFR in 30 anni 114.609,26 contro 107.410,19; saldo del fondo all'anno 30 274.840,36 contro 263.936,96; patrimonio finale 1.419.951,73 contro 1.409.912,22 (+10.039,51). Fonti web: Mefop/INPS indicano lo 0,50% come previsto dall'art. 3 ult. comma L. 297/1982, e la quota netta del 6,91% è confermata. Inoltre financial-math.ts:60-63 usa RAL/divisore e il criterio di accettazione di ORIGINAL_REQUEST dice 'RAL / divisor'.

**Impatto:** Il TFR è sovrastimato del 6,7% ogni anno e la suite impedisce di correggerlo: chi sistema la formula vede 7 test fallire.

**Correzione proposta:** Formula: quota = RAL/divisore − (contributoFondoGaranzia% × RAL). Il TFR in azienda va rivalutato con 1,5% + 75% dell'ISTAT, al netto dell'imposta sostitutiva del 17%. Riscrivere i test con valori attesi calcolati indipendentemente (es. 40.000 → 2.762,96) e far usare all'harness la stessa formula legale.

### ARCH-04 · Medio · Nessun backup, esportazione o importazione nella UI; importJson sostituirebbe tutto senza conferma

*Dove:* `lib/store/scenario-store.ts:648` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

exportJson, importJson e resetToDefaults esistono nello store, ma nessun componente della UI li usa. L'unica copia dei dati è il localStorage di un solo browser e profilo. Cancellazione dei dati del sito, cambio dispositivo, navigazione privata, eviction del browser (es. ITP di Safari dopo 7 giorni senza interazione, per i siti non installati) o i bug ARCH-01 e ARCH-05 eliminano tutto senza possibilità di recupero. Se venisse collegato, importScenariosFromJson (493-553) sostituirebbe l'intero stato senza conferma né merge, senza deduplicare gli id e accettando comparisonScenarioIds inesistenti. Il requisito originale chiede solo la persistenza locale, quindi è una capacità mancante importante (non un bug di calcolo).

**Evidenza (verifica indipendente):** grep 'importJson|exportJson|resetToDefaults' in app/ e lib/ (esclusi i test): solo le definizioni in scenario-store.ts:639-656. grep 'Blob|FileReader|download|navigator.storage|persist()' in app/ e lib/: 0 risultati. Codice di importScenariosFromJson (493-553): nessun controllo su duplicati né sull'esistenza degli id di confronto.

**Impatto:** I piani costruiti dall'utente sono fragili, non trasferibili e non recuperabili.

**Correzione proposta:** Aggiungere: Esporta (download .json con versione dello schema); Importa (file picker, anteprima, scelta tra 'unisci' e 'sostituisci', rigenerazione degli id in conflitto, conferma); Reset con conferma. Tenere un backup automatico rotante delle ultime N versioni in IndexedDB e chiamare navigator.storage.persist().

### ARCH-07 · Medio · Il selettore globale 'Destinazione TFR' non ha effetto sui preset (override di fase nascosti) e le regole legacy creano precedenze confuse

*Dove:* `lib/store/presets.ts:34` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Tutti i preset impostano tfrPensionAllocationPercent su ogni fase (Base e Optimistic 100, Pessimistic 0). Il motore dà precedenza all'override di fase (calculator.ts:401-405), quindi il selettore 'Destinazione TFR' del PensionFundForm, etichettato 'Predefinito', non produce alcun effetto sui preset e sui loro duplicati, e il form non segnala in alcun modo che esistono override. Gli override sono visibili solo nella sezione Fasi (badge 'Override Fase: X%'). Gli scenari creati con createScenario non hanno override, quindi lì il selettore globale funziona: comportamento incoerente. Inoltre phase.tfrDestination (legacy) viene ignorato se c'è una percentuale, e routeTfr viene derivato a mano in PensionFundForm:50 e in sanitize (calculator.ts:221).

**Evidenza (verifica indipendente):** v2_engine.ts. Base con globale 100→0: delta del patrimonio finale 0, TFR verso l'azienda 0. Pessimistic con globale 0→100: delta 0 (TFR in azienda 79.600). Optimistic con globale 100→0: delta 0. Con phase.tfrDestination='COMPANY_RETAINED' e percentuale di fase 100: flusso verso l'azienda all'anno 1 = 0.

**Impatto:** La scelta 'TFR in azienda o nel fondo', decisione chiave, sembra non contare nulla quando l'utente usa il controllo principale.

**Correzione proposta:** Togliere gli override di fase dai preset (undefined = eredita). Nel form globale mostrare 'N fasi hanno un override' con un'azione 'applica a tutte'. Eliminare tfrDestination e routeTfr con una migrazione e centralizzare la logica in resolveTfrAllocation().

### ARCH-08 · Medio · Il dashboard mostra in silenzio i risultati di uno scenario 'sanitizzato' diverso da quello inserito; ci sono 4 livelli di validazione con regole e default divergenti

*Dove:* `lib/store/context.tsx:55` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Quando calculateProjection lancia un'eccezione, useActiveScenario e useComparisonResults ricalcolano su sanitizeScenarioParameters senza avvisare nel dashboard: KPI e grafici si riferiscono a uno scenario diverso (es. allocazione 60/30 rinormalizzata a 66,67/33,33, quindi 1.405.445 € invece dei 1.376.430 € dell'intenzione 60/40). Solo il form dei bucket mostra 'Must be 100%'. Le regole sono sparse e divergenti. Tolleranza sull'allocazione: 0,01 nello store e nel form, 0,001 nel motore, per cui 70,005/30 viene mostrato come valido ma il motore lancia l'eccezione. Default: tfrSubtractedPercentage `?? 0` nel motore contro `?? 0,5` in sanitize e nella UI; pensionAnnualYieldTaxRate `?? 0` nel motore contro `?? 20` in sanitize. Per uno scenario privo dei campi opzionali (es. importato) questo produce salti di −37.598 € nel passaggio dal calcolo normale a quello sanitizzato. sanitizeScenarioParameters non ha test. Ogni istanza degli hook ricalcola la proiezione per conto suo.

**Evidenza (verifica indipendente):** v2_engine.ts. Base con bucket 60/30: il motore lancia un'eccezione, la versione sanitizzata dà 1.405.444,65 € con 66,67/33,33, contro 1.376.430,47 € dell'intenzione 60/40. Base senza i campi fiscali opzionali: valido = 1.457.562,45 € con TFR all'anno 1 di 2.592,59. Con allocazione 70,01 la versione sanitizzata dà 1.419.964,79 € con TFR 2.579,63 (delta −37.597,66). Con 70,005/30 il motore lancia l'eccezione, mentre store e form lo accettano (|Δ| < 0,01). grep sanitizeScenarioParameters in tests/: 0 risultati.

**Impatto:** Durante l'editing l'utente legge numeri che non corrispondono ai suoi input e prende decisioni su di essi.

**Correzione proposta:** Un unico schema di dominio con i default in un solo posto. Il motore non lancia eccezioni sull'input utente: restituisce { result, issues[] }. La UI mostra un banner, ad esempio 'Risultati non aggiornati: allocazione 90% ≠ 100%', e mantiene l'ultimo risultato valido marcato come obsoleto. Calcolare una sola volta nel provider (selector memoizzato per scenario).

### ARCH-09 · Medio · Logica fiscale duplicata nella UI e divergente dal motore (flusso di cassa mensile, auto-max deducibilità)

*Dove:* `app/components/charts/MonthlyDisposableCashflow.tsx:109` · *Verifica:* confermato

Il componente reimplementa per conto suo le tasse sul bonus, il TFR, l'auto-max e l'IRPEF netta con valori hardcoded: bonus 'ORDINARIA_IRPEF' fisso al 35% invece di taxes.marginalIRPEFTaxRate; detassazione al 5% fisso invece di taxes.bonusSubstituteTaxRate; TFR = RAL/divisore senza la sottrazione usata dal motore; se la RAL è 0 usa 37.500 come fallback (riga 100); scaglioni, detrazioni e INPS al 9,19% sono hardcoded (righe 29, 36-63), violando il requisito 'nessun parametro hardcoded'. PensionFundForm:157 calcola la percentuale auto-max sulla sola RAL di fase 1 e la salva in employeeContributionPercent; il motore la ricalcola per ogni fase, ma il flusso IRR (calculator.ts:513) usa il valore salvato e ormai obsoleto.

**Evidenza (verifica indipendente):** v2_engine.ts. Optimistic, anno 21, bonus 9.000: netto del motore 5.130 € (43%) contro netto della card 5.850 € (35%). TFR della card 2.592,59 contro 2.579,63 del motore, ed entrambi diversi dal valore legale 2.417,59. Auto-max: percentuale salvata 12,76%, contributo reale all'anno 20 3.964,57 € contro 7.656 € nel flusso IRR. Ricerca web: L. 199/2025 art. 1 c. 3 porta il secondo scaglione IRPEF (28-50k) dal 35% al 33% dal 1/1/2026.

**Impatto:** Due numeri diversi per la stessa grandezza nella stessa pagina; i parametri fiscali modificati dall'utente vengono ignorati in parte della UI.

**Correzione proposta:** Un solo modulo di dominio (es. lib/domain/tax.ts) usato sia dal motore sia dalla UI. La card legge le righe prodotte dal motore (aggiungere netSalary, irpef e inps a YearlyProjectionRow). Aliquote e scaglioni vanno in TaxConfig. Salvare solo 'autoMax: true' e non la percentuale derivata.

### ARCH-10 · Medio · Versionamento dello schema senza migrazioni e con un campo legacy obbligatorio: ogni evoluzione cancellerà i dati di tutti

*Dove:* `lib/store/scenario-store.ts:187` · *Verifica:* confermato

validateStorageSchema accetta solo version === 1 e non esiste nessuna pipeline di migrazione. Con il fallback di ARCH-01, qualsiasi incremento di versione o qualsiasi nuovo campo reso obbligatorio farà ripartire dai default i dati di ogni utente al primo avvio. La validazione richiede persino il campo legacy pensionFund.routeTfr come booleano obbligatorio (riga 149, types.ts:49): rimuoverlo nel refactoring invaliderebbe tutti gli storage. Un payload esportato da una versione più nuova verrebbe rifiutato.

**Evidenza (verifica indipendente):** Codice di scenario-store.ts:149, 187-189 e 251-254. Il test S5 (scenario-store.test.ts:171-175) con version 99 ritorna ai default. grep 'migrat' nel repo: nessuna pipeline di migrazione.

**Impatto:** La prossima release che tocca lo schema provocherà una perdita di dati di massa.

**Correzione proposta:** Una mappa di migrazioni pure {1→2, 2→3…} applicate in sequenza, con backup del raw prima di migrare. Schema con .default() per campo e campi legacy opzionali. Test di migrazione su fixture reali delle versioni precedenti.

### ARCH-12 · Medio · Strategia di cache di sw.js difettosa: risposte di errore in cache, cache mai versionata né ripulita, offline fallisce con query string

*Dove:* `public/sw.js:33` · *Verifica:* confermato

Anche una volta registrato, il SW ha diversi problemi. Le navigazioni mettono in cache qualsiasi risposta, compresi 404 e 500 (riga 33). Le risorse statiche sono cache-first senza scadenza (44-49). CACHE_NAME è costante (riga 1) e sw.js resta identico a ogni deploy, quindi il browser non installa mai un nuovo SW, la pulizia in activate non scatta mai, i chunk dei vecchi deploy si accumulano e le icone restano servite dalla cache per sempre. caches.match viene chiamato senza ignoreSearch e respondWith(undefined) produce un errore di rete per URL con parametri, come i link condivisi via WhatsApp. Viene pre-cachata solo '/'.

**Evidenza (verifica indipendente):** pw_sw_cache.mjs, con SW registrato a mano sulla build di produzione. Dopo una navigazione online a /non-existent-route (status 404), la cache contiene '/:200, /non-existent-route:404'. Offline '/' risponde 200, mentre '/?utm_source=whatsapp' dà net::ERR_FAILED.

**Impatto:** Pagine di errore possono restare in cache per sempre, gli aggiornamenti dell'app non arrivano agli utenti e i link condivisi non si aprono offline.

**Correzione proposta:** Usare Serwist/Workbox con un precache manifest generato in build e versionato, una NavigationRoute con fallback '/' e ignoreSearch, cache solo di response.ok, cache con nome versionato, pulizia e ExpirationPlugin, e un prompt 'nuova versione disponibile'.

### ARCH-13 · Medio · Next.js 14.2.35 con vulnerabilità note (npm audit: 1 critica, 2 alte) e nessuna patch nella linea 14.x

*Dove:* `package.json:19` · *Verifica:* confermato

La versione installata è next 14.2.35. npm audit la segnala nel range vulnerabile 9.3.4-canary.0 – 16.3.0-preview.10 con 25 advisory: tra questi RCE nell'Image Optimization API (GHSA-2xp9-vwfh-vxw4, GHSA-2464-fhr4-w9xw), request smuggling nei rewrites (GHSA-ggv3-7p47-pfv8), cache poisoning (GHSA-3g8h-86w9-wvmq, GHSA-wfc6-r584-vfw7) e vari DoS. Sono vulnerabili anche postcss ≤8.5.22 (high, dipendenza di next) e source-map-js 1.0.0–1.2.1 (high). Molti advisory riguardano funzioni server che l'app non usa, ma con `next start` l'endpoint /_next/image resta esposto per default.

**Evidenza (verifica indipendente):** `npm audit --omit=dev`: '3 vulnerabilities (2 high, 1 critical)'; JSON: next critical, 25 advisory. curl /_next/image?url=/icons/icon-192x192.png&w=64 su next start: HTTP 200.

**Impatto:** Superficie d'attacco inutile se l'app è self-hosted con next start.

**Correzione proposta:** Impostare output: 'export' in next.config.mjs e servire i file statici (rimuove tutta la superficie server), aggiornare Next a una release corretta secondo npm audit (≥16.4.6), eseguire npm audit fix per source-map-js e aggiungere Dependabot o Renovate.

### ARCH-14 · Medio · Accessibilità nel layout: zoom disabilitato e attributo lang fisso a 'it' anche con la UI in inglese

*Dove:* `app/layout.tsx:30` · *Verifica:* confermato

viewport.maximumScale: 1 genera `maximum-scale=1`, che blocca il pinch-zoom su mobile. L'audit Lighthouse 'meta-viewport' fallisce e il criterio di accettazione chiede un'accessibilità ≥ 80. <html lang="it"> (riga 39) non viene mai aggiornato: LanguageProvider (lib/i18n/context.tsx:17-39) cambia lingua senza impostare document.documentElement.lang, quindi gli screen reader leggono il testo inglese con la voce italiana. Anche il manifest ha "lang": "it" fisso.

**Evidenza (verifica indipendente):** pw_check.mjs. L'HTML contiene <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>. Con contesto in locale en-US, document.documentElement.lang resta 'it' dopo l'idratazione. grep 'documentElement' in app/ e lib/: 0 risultati.

**Impatto:** Utenti ipovedenti non possono ingrandire tabelle e numeri densi; la lettura vocale in inglese risulta errata.

**Correzione proposta:** Rimuovere maximumScale. Nell'effect di LanguageProvider impostare document.documentElement.lang = lang. Valutare route per lingua (/it, /en).

### TEST-02 · Medio · Il test T1-F3-4 certifica una deduzione che ignora i contributi datoriali nel tetto di 5.164,57 €; l'harness codifica una terza regola diversa

*Dove:* `tests/tier1/f3_pension_fund.test.ts:77` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Il motore calcola il deducibile come min(contributo dipendente, tetto) (calculator.ts:452-457). Per legge il tetto di 5.164,57 € comprende anche i contributi del datore (art. 8 c.4 D.Lgs. 252/2005), quindi il deducibile vale min(emp, max(0, tetto − er)). Il test T1-F3-4 (tests/tier1/f3_pension_fund.test.ts:64-78, RAL 200k, emp 10.000, er 3.000) certifica 1.807,60 € invece di 757,60 € (sovrastima di 1.050 €/anno). Il motore è incoerente con sé stesso: l'auto-max (439-443) sottrae il contributo datoriale. Anche sul preset Optimistic (fase 3) la sovrastima è di circa 101 €/anno. L'harness calculatePensionTaxRebate (financial-math.ts:70-79) applica il rimborso su emp+er e viene verificata solo contro sé stessa (harness-verify.test.ts:53).

**Evidenza (verifica indipendente):** v2_engine.ts. Rimborso del motore 1.807,60 contro quello legale min(10.000; 5.164,57−3.000) × 35% = 757,60 (−1.050 €/anno). Optimistic, anno 20: emp 2.700 ed er 2.700; rimborso del motore 1.161,00 contro 1.059,77 legale (+101 €/anno). Ricerca web: le fonti AdE ed ecnews confermano che il limite di 5.164,57 € vale per i contributi sia del lavoratore sia del datore.

**Impatto:** Il beneficio fiscale del fondo è sovrastimato per chi versa vicino al tetto, cioè proprio chi sta valutando di 'massimizzare la deducibilità'.

**Correzione proposta:** Nel motore: deducibile = min(emp, max(0, cap − er)). Allineare il test (757,60) ed eliminare o correggere la funzione dell'harness.

### TEST-03 · Medio · I test di persistenza certificano il comportamento che causa la perdita dati; mancano i test sui percorsi critici

*Dove:* `lib/store/__tests__/scenario-store.test.ts:255` · *Verifica:* confermato

O7 verifica che un'allocazione del 50% venga persistita ('updates store without crashing UI') e S5 verifica il fallback ai default su payload invalido: entrambi trattano come requisito il meccanismo di ARCH-01. Non esiste nessun test che verifichi che i dati restino integri dopo un reload seguito a una modifica invalida. Non sono testati: la reidratazione (righe 572-576 mai eseguite), le schede multiple, gli errori di quota, il cambio di orizzonte, la mappatura tra campi UI e campi del motore (avrebbe scoperto ARCH-06), il fondo disattivato con TFR (ARCH-02), le precedenze dei preset (ARCH-07).

**Evidenza (verifica indipendente):** npx vitest run --coverage con include lib/store/**, report in (script di verifica) scenario-store.ts ha 85,84% statement e 57,02% branch; righe non coperte, tra le altre: 280-282, 573-576, 585, 590-591. context.tsx 0%.

**Impatto:** La suite (116 test verdi) dà una falsa sicurezza proprio sui rischi più gravi.

**Correzione proposta:** Aggiungere test: modifica invalida → reload → i dati dell'utente sono intatti o in quarantena con backup; due store sullo stesso storage → nessuna perdita; setItem che lancia eccezione → errore visibile; per ogni campo della UI, effetto sul risultato; invariante di conservazione del denaro.

### TEST-05 · Medio · La copertura misura solo lib/engine; sanitize, context, UI, store e service worker restano scoperti

*Dove:* `vitest.config.ts:10` · *Verifica:* confermato

coverage.include è limitato a lib/engine/**; l'ambiente è 'node', senza jsdom né React Testing Library, quindi i componenti non sono testabili; non esistono test e2e. Il codice che decide cosa vede l'utente (sanitize, context.tsx, form) non ha nessun test.

**Evidenza (verifica indipendente):** npx vitest run --coverage: 11 file e 116 test passati; calculator.ts 76,54% statement, 84,8% branch, 85,71% funzioni. Con include lib/** e app/**: totale 23,97% statement (il finder riporta 23,73%, probabilmente perché include anche sw.js); app/** 0%, context.tsx 0%, scenario-store.ts 85,84% statement e 57,02% branch. sanitizeScenarioParameters non è usato in nessun test.

**Impatto:** I bug di ARCH-01, -03, -06, -07 e -08 non potevano essere intercettati dalla suite.

**Correzione proposta:** Includere lib/** e app/** nella copertura con soglie minime. Aggiungere jsdom e @testing-library/react per i form (mappatura dei campi), e Playwright per persistenza, reload, offline e installabilità.

### TEST-06 · Medio · Il test di accettazione 'interesse composto' evita la RAL (impostata a 0) e i test sull'IRR non coprono casi reali

*Dove:* `lib/engine/__tests__/calculator.test.ts:73` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Il criterio di accettazione ('RAL fissa, inflazione, costi e tasse a 0 → interesse composto ±0,01%') è testato con annualGrossRAL: 0 (calculator.test.ts:73). Con una RAL reale e i campi fiscali opzionali assenti, il motore applica un 23% di default sul TFR in azienda (6.382 € su 10 anni con RAL 35k). I test sull'IRR coprono solo lo 0% banale e un lump sum. Nessun test rileva che l'IRR usa il bonus LORDO come flusso in uscita (calculator.ts:517): con rendimento 0% e bonus tassato al 5% l'IRR risulta negativo (−0,41% nello scenario di verifica) invece di 0%. Nessun test rileva neppure che con auto-max l'IRR usa la percentuale salvata e obsoleta (7.656 € contro i 3.965 € reali all'anno 20 del Base).

**Evidenza (verifica indipendente):** v2_engine.ts. Scenario con rendimento 0%, costi 0, 500 €/mese e bonus 5.000 tassato al 5%: IRR −0,407%; lo stesso senza bonus dà 0,0000%. Benchmark con RAL 35.000 e campi opzionali assenti: TFR lordo 27.747,80 contro netto 21.365,80 (23% nascosto = 6.381,99 €). Auto-max sul Base: percentuale salvata 12,76%; all'anno 20 (RAL 60k) contributo reale 3.964,57 € contro 7.656 € nel flusso IRR; IRR 3,750%.

**Impatto:** Il KPI 'rendimento medio' (IRR) è distorto verso il basso e i test non lo rilevano.

**Correzione proposta:** Test di accettazione con RAL > 0 e TUTTI i parametri esplicitati. Test IRR su scenari con bonus, rimborso IRPEF e auto-max, con valori calcolati indipendentemente (es. XIRR in un foglio di calcolo).

### ARCH-11 · Basso · All'avvio compaiono per un istante i dati di default (Base Case) prima dei dati dell'utente

*Dove:* `lib/store/context.tsx:17` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Lo store nasce con i preset e si reidrata da localStorage in un useEffect del provider, cioè dopo il primo paint. L'HTML pre-renderizzato e il primo render client mostrano quindi i KPI del Base Case (1.419.952 €) finché non avviene l'idratazione: da qualche centinaio di ms fino a circa 2 s su dispositivi lenti. Poi compaiono i dati dell'utente, con un salto visibile. LanguageProvider fa lo stesso con la lingua. Oggi nessun componente scrive nello store all'avvio, ma il design è fragile: gli effect dei figli girano prima di quello del provider.

**Evidenza (verifica indipendente):** pw_check.mjs: l'HTML servito da next start contiene '1.419.952' (KPI del Base: 1.419.951,73, verificato con v2_engine.ts). Con locale en-US, document.documentElement.lang resta 'it'. grep useEffect in app/: nessun effect scrive nello store.

**Impatto:** Valori errati mostrati all'apertura, possibili screenshot o decisioni su dati sbagliati, effetto di 'salto' poco professionale.

**Correzione proposta:** Mostrare uno skeleton finché lo stato non è idratato (flag hydrated), oppure inizializzare lo store in modo lazy da localStorage sul client con getServerSnapshot che restituisce 'loading'. Valutare output: 'export' con rendering solo client.

### ARCH-15 · Basso · Icone del manifest: due file identici da 1024×1024 dichiarati 192 e 512, con purpose 'any maskable' combinato

*Dove:* `public/manifest.json:15` · *Verifica:* confermato

icon-192x192.png e icon-512x512.png sono lo stesso file, 1024×1024 RGB da 411.866 byte, ma vengono dichiarati 192×192 e 512×512. Il purpose combinato 'any maskable' è sconsigliato da Chrome. L'immagine contiene già una tessera arrotondata con margine scuro: con la maschera adattiva appare una tessera ritagliata, mentre come 'any' risulta piccola. Anche l'apple-touch-icon (layout.tsx:41) è dichiarata 192 ma il file è 1024.

**Evidenza (verifica indipendente):** cmp: i due file sono IDENTICI (411.866 byte). `file` riporta 'JPEG image data, JFIF ... 1024x1024, components 3' per entrambi. Il browser decodifica 1024×1024 per entrambe le URL (pw_check.mjs). curl -I risponde Content-Type: image/png. manifest.json dichiara 192x192 e 512x512 con purpose 'any maskable'.

**Impatto:** Icone poco curate al momento dell'installazione e 800 KB scaricati inutilmente.

**Correzione proposta:** Generare icone a 192 e 512 con purpose 'any', una icona 512 dedicata con purpose 'maskable' (contenuto nella safe zone dell'80%) e un apple-touch-icon da 180×180. Aggiungere id e scope al manifest.

### ARCH-16 · Basso · Il fallimento del salvataggio (quota, navigazione privata, storage disabilitato) è silenzioso

*Dove:* `lib/store/scenario-store.ts:601` · *Verifica:* confermato

saveStoreToLocalStorage intercetta l'eccezione e restituisce false (righe 279-282), ma notify() ignora il valore di ritorno: la UI si aggiorna come se il dato fosse stato salvato.

**Evidenza (verifica indipendente):** v1_store.ts con setItem che lancia eccezione: listener notificati 1 volta, nome in memoria 'Modifica non salvata', storage vuoto, nessun errore propagato.

**Impatto:** L'utente crede di aver salvato e perde le modifiche alla chiusura.

**Correzione proposta:** Esporre lo stato di salvataggio (ok/errore) nello store, mostrare un toast con la proposta di esportare, usare IndexedDB come fallback.

### ARCH-17 · Basso · SalaryPhasesForm modifica in place gli oggetti dello stato dello store

*Dove:* `app/components/forms/SalaryPhasesForm.tsx:79` · *Verifica:* confermato

handleAddPhase (77-79), handleUpdatePhase (37-41) e handleRemovePhase (119-124) copiano solo l'array e poi modificano startYear ed endYear degli oggetti fase, che sono gli stessi riferimenti presenti nello snapshot corrente dello store. Questo viola l'immutabilità su cui si basano useSyncExternalStore e useMemo e rende impossibile un undo affidabile.

**Evidenza (verifica indipendente):** v3_mutation.ts, che replica handleAddPhase sullo stato reale dello store: endYear della fase 3 nello snapshot passa da 30 a 23 prima di qualsiasi updateScenario (stesso oggetto: true). Replicando handleRemovePhase, startYear della fase 2 nello snapshot diventa 1.

**Impatto:** Possibili render incoerenti e bug difficili da riprodurre; la logica di normalizzazione delle fasi è anche duplicata in sanitizeScenarioParameters.

**Correzione proposta:** Usare aggiornamenti immutabili (map con oggetti nuovi) e una funzione di dominio normalizePhases(phases, horizon), unica e testata, usata da UI, store e sanitize.

### ARCH-18 · Basso · Le descrizioni dei preset non corrispondono ai parametri e i preset contengono campi legacy duplicati

*Dove:* `lib/store/presets.ts:11` · *Verifica:* confermato

Il commento e la descrizione del Base Case (righe 5 e 11) indicano '€37.5k salary', ma la fase 1 ha RAL 35.000 (e il test P2 verifica 35.000). Il Pessimistic dichiara 'lower growth (4.0%)', ma il rendimento lordo pesato è 3,55%. Tutti i preset contengono sia routeTfr sia tfrPensionAllocationPercent, e sia annualYieldTaxRatePercent (inerte, vedi ARCH-06) sia pensionAnnualYieldTaxRate.

**Evidenza (verifica indipendente):** v2_engine.ts, rendimento lordo pesato: base 5,950%, pess 3,550%, opt 8,500%. presets.ts:11 contro :26 (35000).

**Impatto:** Il piano di riferimento del proprietario è descritto in modo incoerente.

**Correzione proposta:** Generare le descrizioni dai parametri (o allinearle a mano) e ripulire i campi legacy tramite migrazione.

### TEST-04 · Basso · Test tautologici o deboli, harness matematico mai usato contro il motore e tipi dell'harness obsoleti

*Dove:* `lib/engine/__tests__/calculator-features-2026.test.ts:252` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Alcuni test sono tautologici o deboli: la riconciliazione lordo/netto risomma gli stessi campi del motore; 'KPI identity' è vero per definizione; E25 ed E26 verificano solo '> 0'. Le funzioni indipendenti di tests/harness/financial-math.ts (tranne discountForInflation) non vengono mai confrontate con il motore. tests/harness/types.ts è una copia obsoleta dei tipi: StorageSchemaV1 vi richiede un campo 'language' che lo store non ha. assertCsvStructure verifica un export CSV inesistente. Sono problemi di qualità della suite: non producono numeri errati, ma riducono la capacità dei test di intercettare bug reali.

**Evidenza (verifica indipendente):** Lettura di calculator-features-2026.test.ts:224-257 e calculator.test.ts:414-433. grep delle funzioni dell'harness: calculateTfrAccrual, calculatePensionTaxRebate, calculateSimpleZeroFeeProjection e getSalaryPhaseForYear compaiono solo in harness-verify.test.ts. grep 'csv' in app/ e lib/: 0 risultati.

**Impatto:** Molti test non possono fallire per bug reali, e gli strumenti di verifica indipendente esistono ma non vengono usati.

**Correzione proposta:** Sostituire con: valori 'golden' calcolati in modo indipendente (closed-form o foglio di calcolo documentato), test property-based (fast-check) su invarianti come monotonia rispetto al rendimento, conservazione dei flussi e idempotenza di sanitize. Eliminare i tipi duplicati dell'harness e importare quelli reali.

## Critico di completezza

### CRIT-02 · Alto · Ridurre l'orizzonte temporale crea fasi invalide (es. 16-12): il cruscotto funziona, ma al ricaricamento tutti gli scenari tornano ai default

*Dove:* `app/components/forms/GlobalParamsForm.tsx:31` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Al cambio di orizzonte GlobalParamsForm (righe 31-41) imposta solo endYear dell'ultima fase e non elimina né accorcia le fasi che iniziano dopo il nuovo orizzonte. Con il preset Base e orizzonte 12 si ottiene '16-12': il motore lo accetta, ma lo stato salvato è invalido e al reload tutti gli scenari tornano ai default (alla prima modifica successiva i dati sono persi in modo definitivo). È un caso particolare del problema già segnalato in UI-01, di cui qui si individua la causa precisa nel form. Novità collegata: handleAddPhase (SalaryPhasesForm.tsx:95-111), quando l'ultima fase non si può più dividere, crea fasi oltre l'orizzonte (31-35, 36-40) che restano modificabili in UI ma non vengono mai simulate.

**Evidenza (verifica indipendente):** v2.ts con ScenarioStore e una storage in memoria: dopo il rename 'Mio piano' e RAL 41.000, orizzonte 12 → fasi '1-5, 6-15, 16-12'; calculateProjection OK (12 anni); validate → false 'salaryPhases[2].endYear must be >= startYear'; reload → 'Base Case:30:35000 | Pessimistic...' (default). Playwright su next-server (sorgenti identici al repo): dopo aver digitato 12 nell'orizzonte localStorage contiene '1-5, 6-15, 16-12'; dopo il reload il campo orizzonte mostra 30, e dopo una modifica innocua localStorage diventa 'Base Case:30 | Pessimistic Case:30 | Optimistic Case:30'. handleAddPhase ripetuto 5 volte: '1-5, 6-15, 16-23, 24-27, 28-29, 30-30, 31-35, 36-40'; il motore simula comunque 30 anni.

**Impatto:** Un'azione comune come accorciare l'orizzonte cancella in silenzio, al reload successivo, tutti gli scenari personalizzati. Le fasi fantasma oltre l'orizzonte confondono l'utente.

**Correzione proposta:** Al cambio di orizzonte: tagliare le fasi che superano il nuovo orizzonte (rimuovere quelle con startYear > orizzonte e fissare endYear = orizzonte sull'ultima rimasta), oppure chiedere conferma. Usare un'unica funzione normalizePhases(phases, horizon) condivisa da form, sanitize e validazione. In handleAddPhase non creare mai fasi oltre l'orizzonte: dividere una fase esistente oppure disabilitare il pulsante. Aggiungere al motore il controllo startYear ≤ endYear per ogni fase.

### CRIT-01 · Medio · Il contributo dipendente in % della RAL viene trattato come denaro in più: alzarlo o attivare 'Massimizza Tetto Deducibilità' gonfia il patrimonio finale di oltre 200.000 €

*Dove:* `lib/engine/calculator.ts:445` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

Il motore tratta il risparmio mensile netto come un dato fisso e il contributo dipendente da RAL (o la % di autoMaxDeductibility) come risparmio aggiuntivo (calculator.ts:445-446; il risparmio verso gli ETF a riga 394 non cambia). Alzare il contributo o attivare 'Massimizza Tetto Deducibilità' significa quindi risparmiare di più e consumare di meno. Il costo compare solo in 'Capitale Versato' e nella card 'Netto Spendibile', non in un confronto a parità di consumi. Il cruscotto mostra +255.826 € (10% invece di 2%) e +212.368 € (autoMax) sul patrimonio finale, mentre a parità di esborso netto il vantaggio del fondo sugli ETF nel preset Base è circa +1.500 €. Al contrario i chip 'Allocazione Risparmio' confrontano fondo ed ETF a parità di risparmio. Le due leve rispondono a domande diverse ma la UI non lo spiega, e chi usa autoMax per decidere 'fondo o ETF?' vede un vantaggio enormemente sovrastimato. Il problema deriva dalla mancanza di un vincolo reddito − spese = risparmio (vedi FIRE-08).

**Evidenza (verifica indipendente):** Esecuzione propria con vite-node (verify-crit/v1.ts, v1b.ts) sul preset Base. Base: netto finale 1.419.952 €, versamenti 740.184 €, IRR 4,100%, risparmio ETF anno 1 10.575 €. Contributo dipendente al 10%: 1.675.778 € (+255.826 €), versamenti 864.584 € (+124.400 €), IRR 4,208%, risparmio ETF anno 1 sempre 10.575 €. autoMax: 1.632.320 € (+212.368 €). A parità di consumi (ETF ridotti dell'8% della RAL, rimborso reinvestito dal motore): 1.421.444 € (+1.493 €). Chip savingsToPension 25%: +1.891 €; 50%: −52.022 €. In più, con autoMax attivato dalla UI (employeeContributionPercent=12,76%) i versamenti contati sono 198.418 € contro 123.837 € realmente versati: è il problema già noto ENG-05/UI-14.

**Impatto:** Chi usa l'app per decidere se massimizzare il fondo pensione vede un vantaggio circa 170 volte più grande di quello reale (+256k contro +1,5k nel preset Base). Questo può spingere a vincolare nel fondo capitale che servirebbe liquido per il FIRE.

**Correzione proposta:** Modellare il contributo da RAL come uscita che riduce il netto disponibile. Opzione A: scalarlo (meno il beneficio fiscale) dal risparmio verso gli ETF. Opzione B: tenere un bilancio reddito netto, spese e risparmio, così le spese restano fisse e il risparmio si sposta. In ogni caso mostrare accanto al toggle autoMax e al campo % il costo annuo in busta paga e il guadagno 'a parità di esborso', e far confrontare gli scenari a parità di consumi.

### CRIT-03 · Medio · Il solver dell'IRR restituisce valori assurdi (fino a +14 miliardi di %) quando il patrimonio finale è molto sotto i versamenti, e 0% con patrimonio negativo

*Dove:* `lib/engine/calculator.ts:100` · *Verifica:* confermato

calculateAnnualizedIRR prova prima Newton. Se Newton esce dall'intervallo (nextR ≤ -0,99) passa alla bisezione su [-0,95; 2,0], ma con orizzonti lunghi npv(-0,95) vale NaN: 0,05^360 va in underflow e si ottiene Infinity - Infinity. La condizione fLow*fHigh <= 0 è quindi falsa, la bisezione viene saltata e la funzione restituisce l'ultima iterata di Newton, non convergente. In più i flussi negativi (prelievi) vengono ignorati (riga 46, `if (c > 0)`) e con patrimonio finale negativo la funzione restituisce 0% (riga 35). Il KPI 'Rendimento TIR / IRR' mostra quindi rendimenti enormemente positivi proprio negli scenari di perdita, cioè negli stress test che un utente prudente prova a mano, e anche nel percorso del bug già noto 'fondo disattivato'.

**Evidenza (verifica indipendente):** v3.ts sul preset Base con tutti i rendimenti a: −3% → −3,644%; −6% → −6,490%; −7% → +569.552.219,451%; −8% → +745.339,966%; −10% → +23.945,219%; −20% → +13.659.412.768,712%. Chiamata diretta calculateAnnualizedIRR(0, 360×100, 10000) = 509.008.802,764% contro il mio riferimento −11,040%. Fondo disattivato con savingsToPension 100 → +6.533.256,483%. Risparmio fase 3 −3000 → +32.854%; −6000 (netto −442.271 €) → 0,000%. Orizzonte 5/10/15 anni con −20% → −16,9/−17,6/−17,8% (corretti).

**Impatto:** In uno stress test con rendimenti molto negativi il KPI principale di rendimento mostra cifre come '569.552.219,45 %': l'output perde credibilità e uno scenario di perdita appare come un guadagno.

**Correzione proposta:** Calcolare l'NPV in forma stabile, ad esempio in log-space oppure attualizzando al mese finale (moltiplicando per (1+r)^(M-m) invece di dividere), e cercare l'intervallo di bisezione partendo da r vicino a 0 ed espandendo verso -1 e verso valori positivi. Usare il segno con segno di tutti i flussi, senza filtrare c > 0. Se non esiste soluzione o il patrimonio è ≤ 0, restituire null e mostrare 'n.d.'. Controllare sempre che |NPV(r)| sia sotto una tolleranza prima di restituire r. Aggiungere test con rendimenti negativi e orizzonti di 30-50 anni.

### CRIT-04 · Medio · Destinazione TFR: l'app permette quote (25%, 75%) e un ritorno dal fondo all'azienda che la normativa non consente; ignora l'adesione automatica 2026

*Dove:* `app/components/forms/SalaryPhasesForm.tsx:14` · *Verifica:* confermato in parte (descrizione corretta dal verificatore)

I chip TFR (globali e per fase, 0/25/50/75/100%) e l'override di fase senza vincoli (calculator.ts:401-405) permettono di simulare il ritorno del TFR dal fondo all'azienda tra una fase e l'altra (es. fase 2 al 100% fondo, fase 3 allo 0%). Secondo COVIP la destinazione del TFR maturando al fondo è irrevocabile, mentre la scelta di lasciarlo in azienda si può sempre cambiare. Questa è la parte nuova del finding. Restano validi, ma già segnalati in TAX-14, i rilievi sulla quota parziale (ammessa in pratica solo agli iscritti ante 29/04/1993, almeno il 50% salvo CCNL) e sull'adesione automatica dei neoassunti privati dal 1/7/2026 con 60 giorni per scegliere (L. 199/2025).

**Evidenza (verifica indipendente):** v4.ts: Base con fase 3 a 0% → anno 15 fondo 3.538 €, azienda 0; anno 16 fondo 0, azienda 4.422 €; netto finale 1.408.577 € (contro 1.419.952 €). Tutte le fasi al 25% → anno 1 fondo 645 €, azienda 1.935 €. translations.ts:80 dice solo '(per CCNL e Legge 252/05 i nuovi iscritti versano il 100%)'. Fonti da ricerca web: ipsoa.it 2015 'COVIP: TFR irrevocabile se conferito al fondo pensione'; federconsumatori.it 11_adesione.pdf; lawinsider/previmoda testo D.Lgs. 252/2005 art. 8; pensionioggi.it, pmi.it, leyton.com su adesione automatica 1/7/2026 e 60 giorni; money.it 'rivoluzione in due tappe' (portabilità rinviata al 31/10).

**Impatto:** L'utente può costruire un piano basato su scelte non realizzabili, per esempio lasciare il TFR nel fondo nei primi anni e riportarlo in azienda più avanti per averlo liquido al momento del FIRE.

**Correzione proposta:** Aggiungere un campo 'iscritto alla previdenza obbligatoria prima del 29/04/1993' (sì/no) e 'quota prevista dal CCNL'. Limitare le opzioni: integrale per i nuovi, almeno 50% o quota CCNL per i vecchi iscritti. Impedire, o almeno segnalare con un avviso, il passaggio fondo → azienda tra fasi, salvo una nuova fase marcata 'cambio datore di lavoro'. Spiegare in un tooltip l'adesione automatica dal 01/07/2026.

### CRIT-05 · Medio · Capitale iniziale senza prezzo di carico: plusvalenze latenti già presenti ignorate e saldo iniziale del fondo tassato per intero all'uscita

*Dove:* `lib/engine/calculator.ts:324` · *Verifica:* confermato

Per il portafoglio iniziale il motore imposta costBasis = investedCapital (righe 324-328): assume che il capitale già investito non abbia plusvalenze latenti. Chi investe da anni (il caso tipico di chi pianifica il FIRE) ha spesso un prezzo medio di carico molto più basso del valore attuale, e il patrimonio netto risulta sovrastimato del 26% di quella plusvalenza per tutti gli anni. Al contrario, per il fondo pensione currentPensionCostBasis = pensionBalance (riga 322): tutto il saldo iniziale finisce nella base imponibile di uscita, compresi i rendimenti già tassati al 20% e i contributi non dedotti, che per legge non vanno tassati di nuovo. InitialWealth (types.ts:80-85) non offre campi per indicare queste basi.

**Evidenza (verifica indipendente):** v5.ts: orizzonte 1 anno, RAL 0, rendimenti/TER/bollo a 0, capitale investito 100.000 €, fondo 20.000 € → investmentPortfolioBalanceNet 100.000 (nessuna imposta latente); fondo lordo 20.000, netto 17.600, imposta d'uscita 2.400 (12% sull'intero saldo). Preset Base con saldo fondo 20.000 € e rendimento 0: imposta d'uscita anno 1 2.869,70 € (coincide con i 2.870 € del finding).

**Impatto:** Per chi parte da un portafoglio con forti plusvalenze latenti il patrimonio netto e il confronto tra scenari sono sistematicamente gonfiati (circa 10k € ogni 40k € di plusvalenza). Il saldo iniziale del fondo è invece leggermente penalizzato.

**Correzione proposta:** Aggiungere a InitialWealth i campi investedCapitalCostBasis (prezzo di carico complessivo, con default pari al valore) e pensionTaxableBasis (contributi dedotti più TFR, esclusi rendimenti e contributi non dedotti). Usarli per inizializzare costBasis per bucket (in proporzione) e currentPensionCostBasis.

### CRIT-06 · Medio · Il configuratore è un overlay modale che copre o oscura la dashboard: non si vedono gli effetti delle modifiche mentre si modificano i parametri

*Dove:* `app/page.tsx:111` · *Verifica:* confermato

Il pannello dei parametri si apre come drawer sopra un backdrop a tutto schermo, nero al 50% e sfocato, e un clic sul backdrop chiude il pannello. Su mobile (<640px) il drawer è largo il 100%, su desktop il 50% dello schermo; il resto della dashboard resta oscurato, sfocato e tagliato (il layout è pensato per la larghezza piena). Il pannello non mostra nessun KPI o anteprima. In un simulatore il ciclo principale è 'cambio un parametro → vedo l'effetto', e qui richiede di aprire e chiudere il drawer a ogni modifica. Il ricalcolo immediato richiesto dai criteri di accettazione avviene, ma l'utente non lo vede.

**Evidenza (verifica indipendente):** Playwright su next-server con gli stessi sorgenti del repo: screenshot verify-crit/shots/desk_open.png (1440×900): drawer di 720px, a destra KPI 'Versamenti Totali 740.184 €' e '679.767 €' appena leggibili sotto il velo nero e la sfocatura, KPI del patrimonio coperti. Dopo il tasto Escape il pannello resta visibile (isVisible=true). grep su ConfigPanel.tsx: nessun riferimento a result/kpiSummary.

**Impatto:** L'esplorazione 'what-if', che è la funzione principale dell'app, diventa lenta e cieca: chi modifica i parametri non vede in tempo reale come cambiano i risultati.

**Correzione proposta:** Su desktop usare un layout affiancato non modale (configuratore a sinistra e dashboard a destra, ridimensionata, senza backdrop). Su mobile aggiungere una barra di KPI sticky nel drawer (patrimonio finale reale, FIRE number, anno di indipendenza) che si aggiorna mentre si modifica. Chiudere il drawer con Esc e gestire il focus.

### CRIT-07 · Medio · Accesso a localStorage non protetto nel provider lingua e nessun error boundary: con lo storage bloccato l'app si apre su una schermata d'errore

*Dove:* `lib/i18n/context.tsx:22` · *Verifica:* confermato

Lo store degli scenari protegge ogni accesso a localStorage con try/catch, il LanguageProvider invece no: legge window.localStorage.getItem in un useEffect al mount (riga 22) e lo scrive senza protezione al cambio lingua (riga 38). Se il browser blocca i dati del sito (Chrome 'non consentire ai siti di salvare dati', policy aziendali, alcune webview, iframe sandbox), l'accesso a window.localStorage lancia SecurityError; in Firefox con dom.storage disabilitato localStorage è null e si ottiene un TypeError. L'app non ha app/error.tsx, global-error.tsx né error boundary: l'eccezione nell'effect smonta tutto l'albero React e Next.js mostra 'Application error: a client-side exception has occurred'. Il problema già segnalato riguarda il salvataggio che fallisce in silenzio; qui l'app non si apre affatto. Inoltre qualsiasi altra eccezione di rendering, per esempio in un grafico, fa cadere l'intera app invece della sola card.

**Evidenza (verifica indipendente):** pw3.js con launchPersistentContext, google-chrome --headless=new e Preferences {profile.default_content_setting_values.cookies:2}. Probe: 'throws SecurityError: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.' body.innerText: 'Application error: a client-side exception has occurred (see the browser console for more information).' Console: warning dello store gestito, poi errore SecurityError non gestito dal chunk dell'app. Con lo storage consentito la stessa pagina mostra la dashboard (Patrimonio Finale Netto 1.419.952 €).

**Impatto:** Una parte degli utenti, quelli con privacy rafforzata o in ambienti aziendali, non riesce a usare l'app. Qualunque bug di rendering rende tutta l'app inutilizzabile invece di una sola card.

**Correzione proposta:** Creare un helper safeStorage (get/set con try/catch e controllo sul null) da usare ovunque. Aggiungere app/error.tsx e app/global-error.tsx, più un ErrorBoundary per ogni card della dashboard con un messaggio di fallback, così l'errore di un grafico non fa cadere tutta l'app. Mostrare un banner 'salvataggio non disponibile' quando lo storage è bloccato.

### CRIT-08 · Medio · NumberInput: svuotare un campo scrive subito 0 e impedisce di iniziare a digitare un numero negativo

*Dove:* `app/components/ui/NumberInput.tsx:29` · *Verifica:* confermato

handleChange converte ogni valore non interpretabile in 0 (`isNaN(val) ? 0 : val`) e lo salva subito nello store. React 18, per gli input number controllati, riscrive '0' nel campo quando il valore è 0 e il DOM è vuoto. Svuotando il campo per riscriverlo compare quindi subito '0' (e digitando si ottiene per esempio '045000'). Digitando '-' come primo carattere il browser restituisce '', l'handler salva 0 e il '-' sparisce: non si può iniziare a scrivere un'inflazione o un rendimento negativo, cioè proprio gli stress test. Ogni stato intermedio (RAL = 0, orizzonte = 1) viene anche salvato e ricalcolato.

**Evidenza (verifica indipendente):** Playwright (pw1.js) su next-server con sorgenti identici: orizzonte svuotato → '1'; inflazione 2 svuotata → '0'; poi '3' → '03'; Ctrl+A e '-' → '0'; poi '1' → '01'. node_modules/react-dom/cjs/react-dom.development.js:1831 e next/dist/compiled/react-dom/cjs/react-dom.development.js:3458: `value === 0 && node.value === ''` → node.value = toString(value). NumberInput.tsx:28-31 `onChange(isNaN(val) ? 0 : val)`, riga 53 `value={value === 0 && props.placeholder ? '' : value}`.

**Impatto:** Inserire i dati è frustrante (zeri iniziali, segno meno che sparisce). In più aumentano gli stati intermedi salvati, che alimentano i problemi di persistenza già noti.

**Correzione proposta:** Tenere una stringa locale di bozza nell'input. Fare commit verso lo store solo su blur, su Invio o quando la stringa è un numero valido e completo (gestendo '-', '' e la virgola decimale italiana). Applicare min e max e mostrare l'errore inline invece di forzare 0.

## Rilievi respinti dalla verifica

- **TAX-14 — Destinazione parziale del TFR (25/50/75%) offerta a tutti, ma ammessa solo ai 'vecchi iscritti'; adesione automatica 2026 assente**: La tesi centrale è sbagliata. Dalla L. 124/2017 (legge annuale sulla concorrenza, che ha modificato l'art. 8 c.2 del D.Lgs. 252/2005) gli accordi o contratti collettivi possono fissare una percentuale minima di TFR maturando da destinare alla previdenza complementare, anche per chi si è iscritto dopo il 28/04/1993. Solo in assenza di questa indicazione il conferimento è totale (circ. COVIP 5027/2017). Le chip 25/50/75% non sono quindi 'configurazioni illegali per la maggioranza': sono ammesse se previste dal CCNL o dal fondo. Restano veri due punti minori. L'adesione tacita o automatica comporta sempre il 100%, e l'adesione automatica dei neoassunti dal 2026 non è menzionata (decorrenza 1/7/2026 per la maggior parte delle fonti; alcune riportano un rinvio). Il testo translations.ts:80 ('i nuovi iscritti versano il 100%') è a sua volta impreciso. Al massimo è un problema di testo o UX di […]

