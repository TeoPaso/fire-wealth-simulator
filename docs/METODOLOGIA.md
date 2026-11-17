# Metodologia di calcolo

Questo documento spiega come il motore di FIRE Planner Italia (`lib/engine/`) calcola i risultati: convenzioni,
formule, parametri e fonti. Descrive il codice della versione 2.0.0 così com'è. Quando il codice fa una scelta
diversa da quella che ci si potrebbe aspettare, il documento lo dice.

- I **parametri di legge** stanno nell'oggetto `TaxRules`. I valori predefiniti sono in
  `lib/engine/rules/it2026.ts` (`IT_2026`), ognuno con una fonte (vedi la [sezione 18](#18-fonti)). Nel testo li
  trovi con il loro percorso, per esempio `irpef.brackets` o `inps.employeeRatePct`. Ogni piano ha la sua copia
  delle regole, modificabile nella sezione «Regole fiscali (avanzate)».
- Le **costanti di modello**, che non sono parametri di legge, hanno un nome esplicito nel codice: `SIM_MODEL`
  (`simulate.ts`), `MARKET_MODEL` (`paths.ts`), `MC_WINDOW` (`montecarlo.ts`), `VALIDATION_LIMITS`
  (`validate.ts`).
- I campi del piano sono indicati con il loro percorso nel tipo `Plan` (`lib/engine/types.ts`), per esempio
  `career[i].ralToday` o `pensionFund.accessMode`.
- Piano e regole hanno entrambi una sezione `pensionFund` e una `statePension`. Per esempio
  `pensionFund.accessAge`, `capitalSharePct` e `statePension.claimAge` sono campi del piano;
  `pensionFund.deductionCap`, `maxCapitalSharePct` e `statePension.oldAgeAge` sono regole (nel piano si trovano
  sotto `taxRules.`, per esempio `taxRules.pensionFund.deductionCap`).
- I numeri degli esempi vengono dai test (`lib/engine/**/__tests__/`), che li verificano con calcoli fatti a mano.

## Indice

1. [Ambito](#1-ambito)
2. [Convenzioni](#2-convenzioni)
3. [Stipendio e carriera](#3-stipendio-e-carriera)
4. [Busta paga](#4-busta-paga)
5. [TFR](#5-tfr)
6. [Fondo pensione](#6-fondo-pensione)
7. [Pensione INPS](#7-pensione-inps)
8. [Spese, eventi, liquidità e bollo](#8-spese-eventi-liquidità-e-bollo)
9. [Il flusso di cassa dell'anno e il fondo di emergenza](#9-il-flusso-di-cassa-dellanno-e-il-fondo-di-emergenza)
10. [Portafoglio](#10-portafoglio)
11. [Patrimonio accessibile, bloccato e netto](#11-patrimonio-accessibile-bloccato-e-netto)
12. [Età FI, piano mostrato e riepilogo](#12-età-fi-piano-mostrato-e-riepilogo)
13. [Monte Carlo](#13-monte-carlo)
14. [Analisi di sensibilità](#14-analisi-di-sensibilità)
15. [Validazione](#15-validazione)
16. [Semplificazioni e limiti noti](#16-semplificazioni-e-limiti-noti)
17. [Migrazione dalla v1](#17-migrazione-dalla-v1)
18. [Fonti](#18-fonti)

## 1. Ambito

- Il modello descrive **una persona**: lavoratore dipendente del settore privato, residente in Italia, iscritto al
  Fondo pensioni lavoratori dipendenti INPS. Non ha familiari a carico né altri redditi: mentre lavora il reddito
  complessivo è il reddito di lavoro dipendente; da ritirato è la pensione INPS.
- Il passo è **annuale**: un anno solare per volta, dall'anno di partenza `profile.startYear` all'anno in cui la
  persona compie `profile.lifeExpectancy` anni, compreso.
  - Indice dell'anno: `t = 0 … T`, con `T = lifeExpectancy − currentAge`.
  - Età nell'anno t: `età = currentAge + t`. Anno solare: `anno = startYear + t`.
  - "Età" è un numero intero: l'età che hai durante quell'anno solare.
- **Età di ritiro R.** Il lavoro si ferma all'inizio dell'anno in cui compi R anni. Gli anni con età < R sono anni
  di lavoro, gli altri sono anni da ritirato.

## 2. Convenzioni

### 2.1 Euro di oggi ed euro nominali

- **Input in euro di oggi.** Gli importi del piano sono espressi nel potere d'acquisto dei prezzi all'inizio
  dell'anno di partenza: stipendi, premi, spese, eventi, versamento volontario fisso, pensione stimata. I saldi
  iniziali (liquidità, investimenti, fondo pensione, TFR, montante INPS) sono valori di oggi, quindi sono uguali
  in euro di oggi e in euro nominali.
- **Simulazione in euro nominali.** Il motore lavora in euro correnti di ogni anno. Serve per le regole che sono
  fisse in euro nominali: scaglioni IRPEF non indicizzati (drenaggio fiscale), plusvalenze nominali, rivalutazione
  del TFR, tetto di deducibilità del fondo pensione.
- **Indice dei prezzi.** `P_0 = 1`, `P_{t+1} = P_t × (1 + π_t)`, dove `π_t` è l'inflazione dell'anno t:
  `market.inflationPct` nel percorso deterministico, un valore casuale nel Monte Carlo.
  - Ogni riga annuale (`YearRow`) ha `priceIndex = P_t` (inizio anno) e `priceIndexEnd = P_{t+1}` (fine anno).
- **Indicizzazione degli input.** Un importo in euro di oggi diventa `importoOggi × P_t` nell'anno t; RAL e premio
  crescono in più con l'aumento reale (sezione 3). I flussi dell'anno t sono quindi espressi ai prezzi di inizio
  anno t.
- **Ritorno agli euro di oggi.**
  - Flussi dell'anno t (redditi, spese, tasse): si dividono per `P_t`.
  - Saldi di fine anno: si dividono per `P_{t+1}`.
  - Il riepilogo, i percentili Monte Carlo e i totali seguono questa regola. La vista "€ di oggi" dell'app è il
    valore nominale diviso per l'indice.

### 2.2 Le regole fiscali negli anni futuri

Il motore applica le regole del 2026 a tutti gli anni simulati, senza ipotizzare riforme. Le soglie in euro si
comportano così:

| Parametri | Seguono l'inflazione? |
|---|---|
| Scaglioni IRPEF, detrazioni, cuneo fiscale, trattamento integrativo, scaglioni dell'addizionale regionale, soglia di esenzione comunale | **No** con il valore predefinito `irpef.indexToInflation = false`: è la situazione reale (drenaggio fiscale). Con `true`, tutti questi importi vengono moltiplicati per `P_t`. |
| Tassazione separata del TFR (usa gli scaglioni IRPEF) | Come l'IRPEF. |
| Soglia dell'1% INPS (`inps.additionalThreshold`) e massimale (`inps.ceiling`) | **Sì** (`inps.indexThresholdsToInflation = true`): × `P_t`. |
| Tetto di deducibilità del fondo pensione (`pensionFund.deductionCap`) | No, fisso in euro nominali. |
| Tetto e limite di reddito del premio di produttività (`productivityBonus.cap`, `afterCap`, `priorYearIncomeLimit`) | No. |
| Bollo sul conto (`investments.cashStampDuty`, `cashStampDutyThreshold`) | No. |
| Aliquote in % | Mai. |

- Le soglie indicizzate partono dal valore 2026 nell'anno di partenza: il motore assume
  `startYear = referenceYear` (2026). Con un anno di partenza diverso, nel primo anno valgono comunque i valori
  2026.
- Il regime del premio di produttività dipende dall'anno solare: aliquota dell'1% fino al 2027, poi le regole
  "dopo" (sezione 4.2).

### 2.3 Convenzione di metà anno

Per un saldo `V` a inizio anno, con rendimento `r` e costo annuo `c` (TER o ISC), il fattore di crescita è
`G = (1 + r) × (1 − c)` (mai sotto 0). Ogni flusso `F` dell'anno (versamento, acquisto, vendita, prelievo) avviene
a metà anno:

```
saldo di fine anno = V × G + F × √G
```

È come valutare la posizione a metà anno (`V × √G`), aggiungere o togliere il flusso e farla crescere per
l'altra metà dell'anno.

*Esempio:* rendimento 5%, TER 0,2%. `G = 1,05 × 0,998 = 1,0479`. 1.200 € versati durante l'anno valgono a fine
anno `1.200 × √1,0479 = 1.228,40 €`.

La regola vale per il portafoglio e per il fondo pensione. Due eccezioni, calcolate sul saldo di inizio anno: la
liquidazione del TFR e i pagamenti del fondo pensione (capitale, rata RITA, riscatto). Poi entrano nel flusso di
cassa dell'anno come ogni altra entrata.

### 2.4 Rendimenti attesi

- `portfolio.assets[i].expectedReturnPct` e `pensionFund.expectedReturnPct` sono rendimenti **nominali,
  composti** (geometrici: la mediana della distribuzione Monte Carlo) e **al lordo dei costi**. I costi (TER/ISC)
  si applicano in modo moltiplicativo, come in 2.3.
- Il percorso deterministico usa ogni anno il rendimento atteso e l'inflazione attesa.
- Rendimento reale netto approssimato: `(1 + r) × (1 − TER) / (1 + π) − 1`.

### 2.5 Percentuali

Tutte le percentuali, in input e in output, sono numeri in punti percentuali: 7 significa 7%.

### 2.6 Nessuna correzione silenziosa

Il motore non modifica mai un piano. `validatePlan` restituisce l'elenco dei problemi (sezione 15). Se c'è almeno
un errore, `runPlan`, `runMonteCarlo` e `runSensitivity` rifiutano il calcolo con `PlanValidationError`. Le
funzioni fiscali trattano un importo negativo o non numerico come 0, solo per non produrre mai `NaN`: la
validazione segnala comunque il dato sbagliato.

## 3. Stipendio e carriera

- **Fasi.** Le fasi `career[i]` sono ordinate per `untilAge`. La fase i copre le età da `untilAge` della fase
  precedente (o `currentAge` per la prima) fino a `untilAge − 1`. Se lavori oltre la fine dell'ultima fase,
  continua l'ultima.
- **RAL e premio dell'anno.** Con `k = età − età di inizio della fase`:
  ```
  ral   = ralToday        × (1 + realRaisePct/100)^k × P_t
  bonus = bonusGrossToday × (1 + realRaisePct/100)^k × P_t
  ```
  Ogni fase riparte dalla propria `ralToday`: un cambio di fase è un salto di stipendio.
- **Mensilità.** `mensilita` (12, 13 o 14) cambia solo gli importi mensili mostrati. I totali annui partono dalla
  RAL.
- **Contributi al fondo pensione.** Solo se `pensionFund.enabled`:
  - datore = `ral × employerPensionPct%`, ma solo se `employeePensionPct > 0` (il contributo del datore spetta se
    versi anche tu);
  - dipendente = `ral × employeePensionPct%` + versamento volontario;
  - versamento volontario (`savingsPolicy.voluntaryPension`):
    - `none`: 0;
    - `fillCap`: `max(0, tetto − datore − ral × employeePensionPct%)`, così tu e il datore arrivate esattamente
      al tetto;
    - `fixed`: `voluntaryPensionFixedToday × P_t`;
  - tetto = `pensionFund.deductionCap` (5.300 €, nominale). Il TFR non conta nel tetto.
  - I contributi del dipendente, volontari compresi, sono trattenuti in busta paga: riducono il netto.
- **Regime del premio** (`career[i].bonusRegime`):

  | Regime | Trattamento |
  |---|---|
  | `productivity` | Premio di produttività con imposta sostitutiva (sezione 4.2). |
  | `ordinary` | Si somma alla RAL ed è tassato come stipendio. |
  | `pensionFund` | Va tutto al fondo pensione. Non passa dalla busta paga: niente INPS a carico del dipendente, niente IRPEF, fuori dal tetto di deducibilità, non tassato all'uscita. Con il fondo disattivato è trattato come `productivity` (informazione `bonusToFundDisabled`). |
  | `welfare` | Beni e servizi esenti: il valore entra tra le entrate dell'anno e riduce quanto serve prendere dal netto per le spese. Niente INPS né IRPEF. |

- La quota di TFR si calcola solo sulla RAL (sezione 5).

## 4. Busta paga

`computePayroll` (`lib/engine/tax/payroll.ts`) calcola la busta paga di un anno in euro nominali. L'IRPEF usa il
fattore di indicizzazione `f_IRPEF` (1, oppure `P_t` se `irpef.indexToInflation`). Le soglie INPS usano `f_INPS`
(`P_t` se `inps.indexThresholdsToInflation`, altrimenti 1).

### 4.1 Contributi INPS a carico del dipendente

```
lordo = ral + premio ordinario + premio di produttività
base  = min(lordo, inps.ceiling × f_INPS)
INPS  = inps.employeeRatePct% × base + inps.additionalRatePct% × max(0, base − inps.additionalThreshold × f_INPS)
```

Valori 2026: 9,19%, più 1% sopra 56.224 €, massimale 122.295 €. Il calcolo è annuale: in busta paga la soglia
dell'1% è mensilizzata, con conguaglio a fine anno. Fonte: [contributi INPS 2026][inps].

### 4.2 Premio di produttività

- **Regime dell'anno.** Fino a `productivityBonus.validUntilYear` (2027) incluso: `ratePct` 1% e `cap`
  5.000 €. Dopo: `afterRatePct` 10% e `afterCap` 3.000 €. Con `validUntilYear = null` vale sempre il primo regime.
- **Requisito di reddito.** Il reddito di lavoro dipendente dell'anno precedente deve essere al massimo
  `priorYearIncomeLimit` (80.000 €). Il reddito di lavoro è `lordo − INPS − contributi dedotti + eccedenza del
  datore` dell'anno simulato precedente. Nel primo anno non c'è storia: il motore usa il reddito dello stesso
  anno.
- **Tetto al netto dei contributi.** Il tetto si misura sul premio al netto dei contributi INPS del dipendente
  (circ. AdE 28/E/2016). I contributi si attribuiscono al premio in proporzione, con quota `s = INPS / lordo`:
  ```
  parte nel tetto  = min(premio, tetto / (1 − s))      se il requisito di reddito è rispettato, altrimenti 0
  imposta sostitutiva = ratePct% × parte nel tetto × (1 − s)
  ```
  La parte oltre il tetto (o tutto il premio, senza requisito) si somma al reddito ordinario.
- **Avvisi.** `bonusAboveCap` e `bonusIneligibleIncome`, dal primo anno in cui succede.
- *Esempio:* RAL 35.000 € e premio di 3.000 € nel 2026. INPS 3.492,20 €. Imposta sostitutiva
  `(3.000 − 275,70) × 1% = 27,24 €`. Il reddito imponibile resta 31.783,50 €, come senza premio.

Fonte: [premi di risultato 2026–2027][premio].

### 4.3 Deduzione dei contributi al fondo pensione

Un solo tetto vale per i contributi tuoi e del datore insieme:

```
eccedenza del datore (imponibile) = max(0, datore − tetto)
contributo dedotto                = min(dipendente, max(0, tetto − datore), reddito ordinario dopo l'INPS + eccedenza del datore)
contributo non dedotto            = dipendente − contributo dedotto
```

- Reddito ordinario dopo l'INPS = `ral + premio ordinario + premio oltre il tetto − (INPS − INPS sulla parte del
  premio nel tetto)`.
- Il contributo non dedotto non riduce le tasse oggi, ma all'uscita non è tassato. L'eccedenza del datore è
  tassata oggi come reddito.
- Avviso `contributionAboveCap` quando c'è un contributo non dedotto o un'eccedenza del datore.
- *Esempio:* RAL 40.000 €, contributo tuo 6.000 €, del datore 1.000 €: dedotti 4.300 €
  (`min(6.000, 5.300 − 1.000)`), non dedotti 1.700 €.

Fonte: [deducibilità 5.300 € dal 2026][fpCap].

### 4.4 Reddito imponibile e IRPEF

- **Reddito imponibile** (reddito di lavoro dipendente = reddito complessivo):
  `max(0, reddito ordinario dopo l'INPS − contributo dedotto + eccedenza del datore)`.
- **IRPEF lorda** per scaglioni (`irpef.brackets`): 23% fino a 28.000 €, 33% fino a 50.000 €, 43% oltre.
- **Detrazione per lavoro dipendente**, art. 13 c.1 TUIR (`irpef.employeeDeduction`), con RC = reddito
  complessivo:

  | RC | Detrazione |
  |---|---|
  | ≤ 15.000 | 1.955 |
  | 15.000 – 28.000 | 1.910 + 1.190 × (28.000 − RC) / 13.000 |
  | 28.000 – 50.000 | 1.910 × (50.000 − RC) / 22.000 |
  | > 50.000 | 0 |

  Più 65 € se 25.000 < RC ≤ 35.000 (art. 13 c.1.1).
- **Ulteriore detrazione del cuneo fiscale** (`irpef.cuneo`): 1.000 € se 20.000 < RC ≤ 32.000; da 32.000 a
  40.000 cala in modo lineare, `1.000 × (40.000 − RC) / 8.000`; 0 negli altri casi.
- **Capienza.** Le detrazioni si usano fino all'imposta lorda: prima quella dell'art. 13, poi quella del cuneo.
  `IRPEF netta = max(0, lorda − detrazioni usate)`.

Fonti: [scaglioni IRPEF 2026][irpef], [Legge di Bilancio 2026][irpef2], [art. 13 TUIR][detrazioni],
[cuneo fiscale][cuneo].

### 4.5 Addizionali

- **Regionale:** per scaglioni progressivi `irpef.regionalSurchargeBands`. Il valore predefinito è il minimo di
  legge, 1,23% su tutto il reddito: imposta quello della tua regione.
- **Comunale:** `irpef.municipalSurchargePct` (0,8% predefinito) su tutto il reddito imponibile; zero se il
  reddito non supera `irpef.municipalExemptionThreshold` (0 predefinito).
- Le addizionali sono dovute solo se l'IRPEF netta è almeno di un centesimo.
- Il motore le conta nello stesso anno del reddito. Per legge si pagano l'anno dopo, con acconti.

Fonte: [addizionali regionali][addizionali].

### 4.6 Somme esenti: cuneo fiscale e trattamento integrativo

- **Somma esente del cuneo** (`irpef.cuneo.exemptSumBands`). Si applica la percentuale della prima fascia che
  contiene il reddito di lavoro, su tutto il reddito: 7,1% fino a 8.500 €, 5,3% fino a 15.000 €, 4,8% fino a
  20.000 €, niente oltre. Si aggiunge al netto e non è tassata.
- **Trattamento integrativo** (`irpef.supplementaryTreatment`, regola facoltativa, presente nei valori 2026):
  1.200 € se RC ≤ 15.000 € e l'IRPEF lorda supera la detrazione per lavoro dipendente meno 75 €. Si aggiunge al
  netto. Il caso parziale tra 15.000 e 28.000 € non è modellato: richiede detrazioni che il modello non ha.

Fonti: [cuneo fiscale][cuneo], [trattamento integrativo][trattamentoIntegrativo].

### 4.7 Netto in busta paga, risparmio fiscale e aliquote

```
netto = lordo − INPS − IRPEF netta − addizionali − imposta sostitutiva sul premio
        − contributi del dipendente al fondo + somma esente del cuneo + trattamento integrativo
```

Il contributo del datore non passa mai dalla busta paga.

- **Carico fiscale netto** = IRPEF netta + addizionali − somma esente − trattamento integrativo.
- **Risparmio fiscale del fondo** (`pensionTaxSaving`) = carico con il reddito aumentato del contributo dedotto −
  carico effettivo. L'eccedenza del datore non cambia. Il risparmio è **già nel netto**: non esiste un flusso
  separato di "rimborso IRPEF".
- **Aliquota marginale** (`marginalRatePct`) = variazione del carico fiscale netto per 100 € di reddito in più.
- **Aliquota media** (`averageRatePct`) = (IRPEF netta + addizionali) / lordo.

*Esempio completo* (RAL 35.000 €, 2026, niente fondo né premio):

| Voce | € |
|---|---|
| INPS (9,19%) | 3.216,50 |
| Reddito imponibile | 31.783,50 |
| IRPEF lorda (6.440 + 3.783,50 × 33%) | 7.688,56 |
| Detrazione lavoro dipendente (1.581,52 + 65) | 1.646,52 |
| Ulteriore detrazione cuneo | 1.000,00 |
| IRPEF netta | 5.042,03 |
| Addizionale regionale 1,23% | 390,94 |
| Addizionale comunale 0,8% | 254,27 |
| **Netto annuo** | **26.096,26** |

Aliquota media 16,25%, aliquota marginale 43,71%.

## 5. TFR

### 5.1 Quota annua

```
quota = ral / tfr.divisor − tfr.contributionPct% × ral        ≈ 6,907% della RAL (1/13,5 − 0,5%)
```

- Solo la RAL: i premi sono esclusi.
- Al fondo va `quota × tfrToFundPct%` della fase, ma solo se il fondo è attivo. Il resto rimane in azienda: con il
  fondo disattivato, tutto.

Fonte: [calcolo del TFR][tfr].

### 5.2 TFR lasciato in azienda

Ogni anno di lavoro, prima di aggiungere la quota dell'anno:

```
tasso       = tfr.revalFixedPct + tfr.revalInflationSharePct% × max(0, π_t)      (1,5% + 75% dell'inflazione)
rivalutaz.  = TFR inizio anno × tasso
imposta     = max(0, rivalutazione) × tfr.revalTaxPct%                           (17%)
TFR fine    = TFR inizio + rivalutazione − imposta + quota in azienda
```

- Con inflazione negativa vale solo la parte fissa.
- Il motore tiene due contatori. Il **capitale** è il TFR iniziale (`assets.companyTfr`) più le quote accantonate.
  Gli **anni** sono `assets.companyTfrYears` più gli anni di lavoro con una quota in azienda.

Fonte: [rivalutazione e imposta del 17%][tfrReval].

### 5.3 Liquidazione

All'inizio del primo anno da ritirato, il TFR in azienda viene pagato con la tassazione separata (art. 19 TUIR):

```
reddito di riferimento = capitale / anni × 12          (il capitale stesso se anni = 0)
aliquota               = IRPEF lorda per scaglioni sul reddito di riferimento / reddito di riferimento
imposta                = min(TFR, capitale × aliquota)
```

- Niente detrazioni. Le rivalutazioni sono già state tassate al 17%, quindi non vengono tassate di nuovo.
- Il netto è un'entrata di quell'anno.
- Nel patrimonio, prima della liquidazione, il TFR vale `TFR − capitale × aliquota` (`companyTfrNet`).
- *Esempio:* capitale di 30.000 € in 10 anni. Reddito di riferimento 36.000 €, IRPEF
  `6.440 + 8.000 × 33% = 9.080 €`, aliquota 25,22%, imposta 7.566,67 €.

Fonte: [tassazione separata del TFR][tfrTax].

## 6. Fondo pensione

### 6.1 Versamenti

Solo negli anni di lavoro e con il fondo attivo:

```
C = contributo dipendente (volontario compreso) + contributo datore + TFR al fondo + premio al fondo
```

### 6.2 Rendimento, costi e imposta sui rendimenti

```
G         = max(0, (1 + r) × (1 − pensionFund.costPct%))
fine      = B × G + C × √G                         (B = saldo a inizio anno)
risultato = fine − B − C                           (rendimento netto dei costi)
costi     = B × (1 + r) + C × √(1 + r) − fine
```

- Aliquota dell'imposta sui rendimenti:
  ```
  aliquota = yieldTaxPct − (yieldTaxPct − govBondYieldTaxPct) × govBondSharePct / 100
  ```
  Con `pensionFund.yieldTaxPct` 20%, `govBondYieldTaxPct` 12,5% e il 40% in titoli di Stato: 17%.
- L'imposta si applica al risultato **dopo i costi**, solo se positivo e dopo aver compensato i risultati
  negativi degli anni precedenti. Questi si riportano senza limiti di tempo.
- Saldo di fine anno = `fine − imposta`.

Fonte: [tassazione dei rendimenti][fpYield].

### 6.3 Parte tassabile all'uscita

- Valore iniziale: `min(assets.pensionFund.taxableBasis, saldo)`.
- Ogni anno di lavoro aumenta di: contributo dedotto + `min(datore, tetto)` + TFR al fondo.
- Non sono tassati all'uscita: i contributi non dedotti, l'eccedenza del datore (già tassata in busta paga), il
  premio versato al fondo e i rendimenti (già tassati ogni anno).
- A ogni pagamento la quota tassabile è `parte tassabile / saldo` (al massimo 100%). Dopo una rata RITA la parte
  tassabile scende in proporzione.

### 6.4 Imposta sulle prestazioni

```
anni di iscrizione = anno solare − assets.pensionFund.membershipStartYear
aliquota = max(exitTaxMinPct, exitTaxMaxPct − exitTaxReductionPerYearPct × anni interi oltre exitTaxReductionAfterYears)
```

Con i valori 2026: 15% fino a 15 anni di iscrizione, 0,3 punti in meno per ogni anno in più, minimo 9% dal 35°
anno. L'aliquota si applica alla quota tassabile di ogni pagamento: capitale, rendita, rate RITA e riscatto.

Fonte: [tassazione delle prestazioni][fpExit].

### 6.5 Accesso al fondo

Prima dell'accesso il fondo è **bloccato**: non viene mai usato per le spese. I pagamenti sono entrate dell'anno.
Quello che avanza dopo le spese va in liquidità o negli investimenti.

**Alla pensione** (`accessMode: 'retirement'`, prestazione ordinaria).
- Pagamento all'inizio dell'anno in cui l'età è `A = max(pensionFund.accessAge, R)`.
- Un `accessAge` inferiore a `statePension.oldAgeAge` (67) è un errore (`pfAccessTooEarly`): la pensione
  anticipata non è modellata.
- Capitale = `saldo × capitalSharePct%`, tassato. Oltre `pensionFund.maxCapitalSharePct` (50%) scatta l'avviso
  `capitalShareAboveLegal`.
- Rendita annua = `(saldo − capitale) × annuityRatePct%`. È costante in euro nominali, tassata con la quota
  tassabile e l'aliquota del momento dell'accesso, pagata ogni anno fino alla fine dell'orizzonte.
- Il saldo del fondo va a zero.

**RITA** (`accessMode: 'rita'`, rendita integrativa temporanea anticipata).
- Parte all'età `max(accessAge, R)`, perché la RITA richiede di aver smesso di lavorare. Se lavori oltre
  `accessAge`, parte al ritiro (informazione `ritaDelayedToRetirement`).
- Ogni anno la rata è `saldo residuo / (oldAgeAge − età)`, tassata. Nell'ultimo anno prima di `oldAgeAge` si paga
  tutto il residuo.
  - Esempio: dai 62 ai 66 anni, cinque rate, che valgono 1/5, 1/4, 1/3, 1/2 e il resto del saldo.
- Il residuo continua a rendere, al netto di costi e imposta.
- Età minima:
  - sotto `oldAgeAge − ritaMaxYearsEarlyUnemployed` (57 anni): errore `pfAccessTooEarly`;
  - sotto `oldAgeAge − ritaMaxYearsEarly` (62 anni): avviso `ritaRequiresUnemployment`, perché è ammessa solo con
    più di 24 mesi di disoccupazione.
- Se la RITA partirebbe a `oldAgeAge` o dopo, il fondo è pagato come prestazione ordinaria (informazione
  `pfOrdinaryBenefit`).

**Riscatto totale per inoccupazione** (`accessMode: 'redemption'`, art. 14 c.2 lett. c D.Lgs. 252/2005).
- Il 100% della posizione viene pagato all'età `R + redemptionAfterUnemployedYears` (4 anni dopo il ritiro) e
  tassato come una prestazione (dal 15% al 9%). `accessAge` e `capitalSharePct` non si usano.
- Il riscatto non è ammesso negli ultimi `redemptionBlockedYearsBeforeOldAge` (5) anni prima di `oldAgeAge`. Se
  `R + 4 ≥ 62`, il motore usa la RITA da `max(62, R)` (informazione `redemptionFallbackRita`).
- Se R ≥ `oldAgeAge`, il fondo è pagato come prestazione ordinaria (`pfOrdinaryBenefit`).

**Avvisi comuni.**
- `pfShortMembership`: al primo pagamento hai meno di `minMembershipYears` (5) anni di iscrizione. Il fondo viene
  pagato comunque.
- `pfAccessAfterHorizon`: l'accesso cade oltre l'orizzonte del piano, quindi quei soldi non entrano mai nel piano.

Non modellati: anticipazioni (spese sanitarie, prima casa, altre esigenze), riscatti parziali e riscatto per
altre cause. Il parametro `pensionFund.earlyRedemptionTaxPct` (23%) è presente nelle regole ma il motore non lo
usa.

Fonte: [RITA, anticipazioni, riscatti][fpAccess].

### 6.6 Valore nel patrimonio

Finché non è pagato, il fondo conta nel patrimonio bloccato al valore netto di un riscatto all'aliquota ordinaria:
`saldo − min(parte tassabile, saldo) × aliquota di uscita` (`pensionFundNet`). Gli anni di iscrizione sono quelli
alla fine dell'anno. Il capitale convertito in rendita esce dal patrimonio al momento dell'accesso: da lì resta
solo il flusso annuo della rendita.

### 6.7 Fondo disattivato

Con `pensionFund.enabled = false` non ci sono nuovi versamenti, tutto il TFR resta in azienda e il premio
destinato al fondo diventa premio di produttività. Il saldo già presente continua a rendere (al netto di costi e
imposta) ed è pagato secondo la modalità di accesso. Il denaro non sparisce mai: lo verifica un test di
conservazione.

## 7. Pensione INPS

### 7.1 Importo stimato

Con `statePension.mode: 'estimate'`:
- pensione netta annua = `monthlyNetToday × installmentsPerYear (13) × P_t`, dall'età `max(claimAge, R)`;
- l'importo è già netto, quindi il motore non calcola tasse; segue l'inflazione per intero;
- i requisiti contributivi non vengono verificati.

### 7.2 Metodo contributivo

Con `statePension.mode: 'contributivo'`.

**Montante iniziale.**
- È `assets.inps.montante`, che trovi nell'estratto conto INPS.
- Se vale 0, il motore lo stima e mostra l'informazione `montanteEstimated`:
  ```
  anni di contributi × inps.pensionAccrualRatePct% (33%) × RAL di oggi della prima fase × 0,85
  ```
  0,85 è `SIM_MODEL.montanteEstimateFactor`, un fattore di carriera media.
- *Esempio:* 5 anni, RAL 35.000 €: `5 × 33% × 35.000 × 0,85 = 49.087,50 €`.

**Ogni anno prima della pensione.**
```
montante = montante × max(1, 1 + π_t + realGdpGrowthPct%)                 (rivalutazione, mai negativa: DL 65/2015)
montante = montante + 33% × min(RAL, inps.ceiling × f_INPS)               (solo negli anni di lavoro)
```
I premi non entrano nella base pensionabile: conta solo la RAL.

**Anni di contributi** = `assets.inps.contributionYears` più un anno per ogni anno di lavoro.

**Età della pensione.** Il motore prova, nell'ordine:
1. `max(claimAge, oldAgeAge)` (67), se a quell'età hai almeno `oldAgeMinYears` (20) anni di contributi;
2. altrimenti `max(fallbackAge, claimAge)` (71), con almeno `fallbackMinYears` (5) anni;
3. altrimenti nessuna pensione: avviso `noStatePension`.

In tutti i casi la pensione non parte mentre lavori: l'età è almeno R. Una `claimAge` inferiore all'età di
vecchiaia genera l'avviso `claimBeforeOldAge`. Nel metodo contributivo viene comunque usata l'età di vecchiaia.

**Importo.**
```
pensione lorda annua al primo anno = montante (fine dell'anno precedente) × coefficiente(età)%
pensione lorda dell'anno dopo      = pensione lorda × (1 + indexationPct% × max(0, π_t))      (perequazione)
```

- Coefficienti di trasformazione (`statePension.transformationCoefficients`) validi dal 2027 al 2028: 4,153% a 57
  anni, 5,514% a 67, 6,382% a 71.
  - Nei valori predefiniti, i coefficienti di 60–63, 65, 66 e 69 anni non vengono dalle tabelle pubblicate: sono
    interpolati sul divisore (approssimazione).
  - Il motore interpola in modo lineare le età mancanti; fuori dalla tabella usa il valore più vicino.
- *Esempio:* montante di 300.000 € a 67 anni → `300.000 × 5,514% = 16.542 €` lordi l'anno.

**Netto** (`netPensionIncome`). La pensione è l'unico reddito:
```
IRPEF = max(0, IRPEF lorda per scaglioni − detrazione per pensionati)
netto = lordo − IRPEF − addizionali                       (addizionali solo se l'IRPEF è dovuta)
```

Detrazione per pensionati, art. 13 c.3 TUIR (`irpef.pensionerDeduction`):

| RC | Detrazione |
|---|---|
| ≤ 8.500 | 1.955 |
| 8.500 – 28.000 | 700 + 1.255 × (28.000 − RC) / 19.500 |
| 28.000 – 50.000 | 700 × (50.000 − RC) / 22.000 |
| > 50.000 | 0 |

Più 50 € se 25.000 < RC ≤ 29.000. Il cuneo fiscale non si applica ai pensionati.

Fonti: [coefficienti di trasformazione][coeff], [detrazioni dei pensionati][pensioner],
[contributi INPS][inps].

## 8. Spese, eventi, liquidità e bollo

- **Spese di vita.** `monthlyToday × 12 × P_t`, moltiplicate per `retirementPct%` negli anni da ritirato.
- **Guardrail** (`withdrawal.strategy: 'guardrails'`). Valgono solo negli anni da ritirato in cui le entrate non
  bastano.
  - Tasso di prelievo = fabbisogno netto dell'anno / patrimonio accessibile a inizio anno (liquidità + portafoglio
    − imposte latenti).
  - Se supera `swrPct × 1,2` (`SIM_MODEL.guardrailTriggerMultiple`), le spese di vita di quell'anno scendono di
    `guardrailCutPct%`. La riga dell'anno lo riporta in `spendingCutPct`.
  - Gli eventi non vengono tagliati. Ogni anno si decide da capo: non c'è una regola di aumento negli anni buoni.
- **Eventi** (`spending.events`). Ogni evento vale `amountToday × P_t` per gli anni da `age` a
  `age + years − 1`.
  - Un importo positivo è una spesa (`eventsExpense`), uno negativo un'entrata (`eventsInflow`).
  - Le entrate sono considerate già nette: non si calcolano imposte di successione o sulle vendite.
- **Liquidità** (`assets.cash`, conto corrente e deposito).
  - Interessi = liquidità a inizio anno × `market.cashRatePct%`.
  - Imposta del `investments.cashInterestTaxPct` (26%) sugli interessi positivi.
- **Bollo:**
  ```
  bollo = portafoglio a inizio anno × stampDutyPct% (0,2%)
        + (liquidità a inizio anno > cashStampDutyThreshold (5.000 €) ? cashStampDuty (34,20 €) : 0)
  ```
  Il bollo è una spesa dell'anno: non riduce il costo fiscale degli strumenti. Fondo pensione e TFR non pagano
  il bollo.

Fonti: [bollo e IVAFE][bollo], [tassazione degli ETF][cg].

## 9. Il flusso di cassa dell'anno e il fondo di emergenza

```
entrate = netto in busta paga + welfare + interessi netti + entrate da eventi + pensione INPS netta
        + rendita del fondo netta + capitale/RITA/riscatto netti + liquidazione TFR netta
risparmio netto (netSavings) = entrate − spese di vita − spese per eventi − bollo
obiettivo fondo di emergenza = savingsPolicy.emergencyFundMonths × spese di vita dell'anno / 12
```

L'obiettivo del fondo di emergenza usa le spese dell'anno, dopo un eventuale taglio dei guardrail.

**Se il risparmio è positivo.**
- Prima si riempie la liquidità fino all'obiettivo del fondo di emergenza.
- Il resto si investe nel portafoglio (sezione 10.2).
- La liquidità che supera l'obiettivo non viene investita automaticamente: resta sul conto, rende il tasso della
  liquidità ed è la prima fonte usata quando servono soldi.

**Se il risparmio è negativo**, il fabbisogno si copre in quest'ordine:
1. la liquidità che supera l'obiettivo del fondo di emergenza;
2. la vendita di investimenti, maggiorata per pagare le tasse sulle plusvalenze (sezione 10.3);
3. il resto della liquidità, cioè il fondo di emergenza;
4. quello che manca è un **ammanco** (`shortfall`): spese dell'anno non coperte.

- **Età di esaurimento** (`depletionAge`): il primo anno con un ammanco superiore a 0,50 €
  (`SIM_MODEL.shortfallThreshold`).
- I saldi non diventano mai negativi e la simulazione prosegue. Così, con un'età di ritiro fissa, vedi cosa
  succede dopo.
- Il denaro bloccato non viene mai usato: il fondo solo all'accesso, il TFR in azienda solo alla fine del lavoro.
- **Tasso di risparmio** di un anno di lavoro (`savingsRatePct`) = risparmio netto / netto in busta paga.
- **Avviso `negativeSavingsWhileWorking`**: mentre lavori, il bilancio ricorrente dell'anno, escluse le spese e
  le entrate per eventi, è negativo.

## 10. Portafoglio

### 10.1 Rendimento e costi

Per ogni strumento `i`:
```
G_i  = max(0, (1 + r_i) × (1 − terPct_i%))
fine = V_i × G_i + (acquisti_i − vendite_i) × √G_i
```

- `portfolioReturn` è il rendimento di mercato prima del TER; `portfolioCosts` è il costo del TER.
- Gli strumenti di tipo `cash` nel portafoglio (per esempio un ETF monetario) si comportano come gli altri: hanno
  rendimento, TER, bollo dello 0,2% e tassa sulle plusvalenze. Sono diversi dalla liquidità del conto
  (`assets.cash`).
- **Niente dividendi né cedole.** Gli strumenti sono trattati come ad accumulazione: i proventi restano investiti
  e si tassano solo alla vendita.

### 10.2 Acquisti

- `portfolio.rebalancing: 'flows'`: si comprano prima gli strumenti sottopesati. Per ogni strumento si calcola il
  deficit rispetto al peso obiettivo del portafoglio dopo l'acquisto, `d_i = max(0, w_i × (M + A) − M_i)`, dove
  `M_i` è il valore a metà anno e `A` l'importo da investire. L'importo si divide in proporzione ai deficit.
- `'annual'`: si compra ai pesi obiettivo, poi a fine anno si ribilancia (sezione 10.4).

### 10.3 Vendite e tasse sulle plusvalenze

- **Quota di plusvalenza** di ogni strumento, al valore di metà anno: `g_i = max(0, 1 − costo fiscale_i / M_i)`.
  L'imposta per euro venduto è `τ_i = g_i × taxRatePct_i%`.
- **Vendita lorda.** La vendita `S` deve rendere il fabbisogno al netto delle tasse:
  `S = fabbisogno / (1 − Σ s_i τ_i / S)`, risolta per iterazione.
  - `flows`: si vende prima chi è sovrappesato rispetto al portafoglio dopo la vendita.
  - `annual`: si vende in proporzione al peso di ciascuno.
  - Se il portafoglio non basta, si vende tutto.
- **Costo fiscale.** Una vendita riduce il costo fiscale di `costo_i × s_i / M_i` (metodo del prezzo medio di
  carico). Un acquisto lo aumenta dell'importo comprato.
- **Minusvalenze.** Una vendita in perdita non paga imposte e non crea crediti: le minusvalenze non sono
  compensabili (niente "zainetto fiscale").
- La tassa di ogni strumento è un input (`taxRatePct`). `investments.capitalGainsPct` (26%) e `govBondPct`
  (12,5%) nelle regole sono valori di riferimento per sceglierla. Per gli ETF obbligazionari va usata una media:
  il piano di esempio usa il 20%, cioè circa metà titoli di Stato al 12,5% e metà altre obbligazioni al 26%.

### 10.4 Ribilanciamento annuale

Con `'annual'`, a fine anno:
- si vendono gli strumenti sovrappesati;
- si pagano le tasse sulle plusvalenze con il ricavato (`rebalancingTax`);
- con il resto si comprano gli strumenti sottopesati.

Il portafoglio finisce esattamente ai pesi obiettivo di (totale − tasse).

### 10.5 Imposte latenti

```
imposte latenti = Σ max(0, V_i − costo fiscale_i) × taxRatePct_i%
```

Non possono essere negative, perché le minusvalenze non sono compensabili.

Fonti: [tassazione degli ETF][cg], [bollo][bollo].

## 11. Patrimonio accessibile, bloccato e netto

Tutti i saldi sono di fine anno, in euro nominali. Per averli in euro di oggi si dividono per `priceIndexEnd`.

```
accessibile (accessibleNet) = liquidità + portafoglio − imposte latenti
bloccato    (lockedNet)     = fondo pensione netto (6.6) + TFR in azienda netto (5.3), finché non sono pagati
patrimonio netto (netWorth) = accessibile + bloccato
```

I valori di partenza (t = 0) si calcolano allo stesso modo, con gli anni di iscrizione al fondo all'anno di
partenza (`startBalances`).

## 12. Età FI, piano mostrato e riepilogo

### 12.1 Età FI

- `successo(R)`: la simulazione deterministica con ritiro a R non ha nessun anno con un ammanco superiore a
  0,50 €, fino a `lifeExpectancy` compreso. La simulazione deterministica usa ogni anno il rendimento e
  l'inflazione attesi.
- **Età FI** (`fiAge`): la R più bassa in `[currentAge, lifeExpectancy]` con successo, trovata provando le età una
  per una. È `null` se nessuna età funziona. Può essere uguale all'età attuale.
- Contano solo i soldi accessibili. Il denaro bloccato conta dal momento in cui viene pagato.
- Non c'è un obiettivo di eredità: alla fine dell'orizzonte il patrimonio accessibile può essere vicino a zero.

### 12.2 Età di ritiro del piano mostrato

```
retirementAge = retirement.fixedAge                         se retirement.mode = 'fixedAge'
              = fiAge                                       altrimenti, se esiste
              = età della pensione INPS                     altrimenti
```

L'età della pensione INPS è `max(claimAge, oldAgeAge)` nel metodo contributivo e `claimAge` nella stima. Il
risultato resta dentro l'orizzonte. Tutti i risultati del riepilogo, compresi `success` e `depletionAge`, si
riferiscono a questa età.

### 12.3 Numero FIRE

```
numero FIRE (fireNumberToday) = monthlyToday × 12 × retirementPct% / swrPct%            (euro di oggi)
avanzamento (progressPct)     = patrimonio accessibile a oggi / numero FIRE
```

- Il numero FIRE è un riferimento classico: il motore non lo usa per trovare l'età FI.
- In ogni riga, `fireTarget` è lo stesso valore ai prezzi dell'anno.
- *Esempio:* 1.500 € al mese, 100% da ritirato, SWR 3,5% → 514.286 €.

### 12.4 Riepilogo (`PlanSummary`)

| Campo | Definizione |
|---|---|
| `yearsToFi` | `fiAge − currentAge` |
| `netWorthAtRetirementToday`, `accessibleAtRetirementToday` | A fine dell'ultimo anno di lavoro (età R − 1), in euro di oggi. |
| `finalNetWorthToday` | A fine orizzonte, in euro di oggi. |
| `avgSavingsRatePct` | Σ risparmio netto / Σ netto in busta paga, sugli anni di lavoro, in euro di oggi. |
| `statePensionAnnualNetToday` | Pensione INPS netta del primo anno, in euro di oggi. |
| `statePensionClaimAge`, `pensionFundAccessAge` | Età di inizio della pensione INPS e del primo pagamento del fondo. |
| `bridgeYears` | Anni di "ponte": dal ritiro al primo sblocco tra fondo pensione (se presente) e pensione INPS. |

### 12.5 Totali di vita (`LifetimeTotals`)

Somme dei flussi di ogni anno divisi per `P_t`, cioè in euro di oggi:

| Totale | Contenuto |
|---|---|
| `grossIncome` | RAL + tutti i premi (welfare e premio al fondo compresi) + pensione INPS lorda |
| `netIncome` | Netto in busta paga + welfare + pensione INPS netta |
| `irpefAndSurcharges` | IRPEF e addizionali (busta paga e pensione INPS) + imposta sostitutiva sul premio |
| `inps` | Contributi INPS del dipendente |
| `capitalGainsTax` | Tasse su vendite e ribilanciamenti + ritenuta sugli interessi della liquidità |
| `stampDuty` | Bollo |
| `pensionFundTaxes` | Imposta sui rendimenti + imposta sulle prestazioni del fondo |
| `tfrTaxes` | Imposta del 17% sulla rivalutazione + tassazione separata |
| `productCosts` | TER del portafoglio + costi del fondo |
| `pensionTaxSaving` | Risparmio fiscale dei contributi dedotti (già compreso nel netto) |
| `employerContributions` | Contributi del datore al fondo |

## 13. Monte Carlo

### 13.1 Modello di mercato

- **Fattori casuali.** Sono casuali gli strumenti del portafoglio con volatilità > 0 e tipo diverso da `cash`, più
  il fondo pensione se ha volatilità > 0. Gli altri usano ogni anno il rendimento atteso.
- **Rendimenti lognormali.** Il logaritmo del fattore di crescita segue una normale:
  ```
  ln(1 + R_i) ~ N(μ_i, s_i²)        μ_i = ln(1 + E_i)        s_i = √( ln(1 + σ_i² / (1 + E_i)²) )
  ```
  - `E_i` è il rendimento atteso (mediano) e `σ_i` la volatilità.
  - La **mediana** del rendimento è `E_i`: il percorso deterministico è quello dei rendimenti mediani.
  - La deviazione standard è circa `σ_i`.
  - La media aritmetica è più alta, `(1 + E_i) × e^(s_i²/2) − 1`. Per esempio, con E = 6% e σ = 15%: s = 0,1408 e
    media ≈ 7,06%.
- **Correlazioni** (`MARKET_MODEL` e piano):

  | Coppia | Correlazione |
  |---|---|
  | azioni – azioni | 0,85 |
  | obbligazioni – obbligazioni | 0,70 |
  | azioni – obbligazioni | `portfolio.equityBondCorrelation` |
  | `other` – qualsiasi strumento | 0,50 |
  | fondo – azioni | `pensionFund.equityCorrelation` |
  | fondo – obbligazioni, fondo – `other` | 0,50 |

  Le normali correlate si ottengono con la fattorizzazione di Cholesky. Se la matrice non è definita positiva, il
  motore riduce le correlazioni verso zero del minimo necessario, scegliendo tra alcuni passi prefissati.
- **Inflazione:** `π_t ~ N(inflationPct, inflationVolatilityPct)`, indipendente dai rendimenti, limitata a
  [−3%, +15%].
- **Anni indipendenti.** Non ci sono autocorrelazione, ritorno verso la media o regimi di mercato.

### 13.2 Riproducibilità

- I numeri casuali vengono da un generatore deterministico (mulberry32, normali con Box–Muller).
- Il percorso della simulazione k dipende solo da (seme, k). Per questo è identico per tutte le età di ritiro
  confrontate (*common random numbers*) e a ogni nuovo calcolo.
- Stesso piano e stesso seme (`simulation.seed`) danno sempre gli stessi risultati.

### 13.3 Età candidate ed età con la probabilità richiesta

1. Il motore calcola l'età FI deterministica `fiDet`.
2. Prova le età di ritiro in `[max(currentAge, fiDet − 3), min(lifeExpectancy, fiDet + 10)]` (`MC_WINDOW`).
   Senza `fiDet`, prova le età da 12 anni prima dell'età della pensione INPS fino a quest'ultima.
3. Allarga la finestra a gruppi di 5 anni:
   - verso il basso, finché anche l'età più bassa raggiunge l'obiettivo;
   - verso l'alto, fino all'età della pensione INPS, finché nessuna età lo raggiunge.
4. Per ogni età, la **probabilità di successo** è la percentuale di simulazioni senza ammanchi.
5. **Età con la probabilità richiesta** (`confidentFiAge`): la più bassa età della finestra con probabilità
   `≥ simulation.successTargetPct` (90% predefinito); `null` se non c'è.

### 13.4 Risultati

- Probabilità di successo all'età di ritiro del piano mostrato.
- Percentili 10, 25, 50, 75 e 90 del patrimonio netto e di quello accessibile, per età, in euro di oggi (fine
  anno), all'età di ritiro mostrata. I percentili sono interpolati in modo lineare tra i valori ordinati.
- Istogramma delle età di esaurimento delle simulazioni fallite.
- Probabilità di successo per ogni età candidata, per il grafico.

Lo stipendio nominale segue l'inflazione casuale. Gli aumenti reali e le spese reali restano quelli del piano.

## 14. Analisi di sensibilità

Per ogni ipotesi il motore crea due copie del piano, una con la variazione in giù e una in su, e ricalcola l'età
FI deterministica. Il piano originale non viene toccato.

| Chiave | Variazione |
|---|---|
| `returns` | ±1 punto al rendimento atteso di tutti gli strumenti e del fondo pensione |
| `inflation` | ±1 punto all'inflazione. I rendimenti attesi sono nominali e non cambiano, quindi i rendimenti reali vanno nella direzione opposta. |
| `spending` | ±10% alle spese mensili |
| `salary` | ±10% a RAL e premio di tutte le fasi |
| `retirementSpending` | ±10 punti alle spese da ritirato (`retirementPct`) |
| `lifeExpectancy` | ±5 anni di orizzonte |
| `statePension` | ±20% all'importo stimato o a tutti i coefficienti di trasformazione |

- I risultati sono ordinati per impatto. "Nessuna età FI" conta come `lifeExpectancy + 1`.
- Le copie modificate non vengono rivalidate.

## 15. Validazione

`validatePlan(plan)` controlla qualunque oggetto senza mai lanciare eccezioni e senza modificarlo. Ogni problema
ha un livello (`error`, `warning`, `info`), il percorso esatto del campo (per esempio `career[1].untilAge`), un
codice stabile (testo in `issues.<codice>`) e dei parametri. I problemi sono ordinati: prima gli errori, poi gli
avvisi, poi le informazioni.

- **Gli errori bloccano il calcolo:**
  - struttura e tipi: `invalidPlan`, `missingField`, `invalidType`, `invalidNumber`, `notInteger`,
    `invalidOption`;
  - intervalli: `negativeAmount`, `pctRange`, `valueRange`, `ageRange`, `lifeExpectancyRange`, `startYearRange`,
    `mensilitaRange`, `swrRange`, `runsRange`, `membershipYearRange`;
  - coerenza: `careerEmpty`, `careerFirstPhase`, `careerOrder`, `allocationSum` (pesi diversi da 100 ± 0,01),
    `duplicateAssetId`, `unknownHoldingAsset`, `fixedAgeRange`, `eventAgeRange`, `eventYears`,
    `pfAccessTooEarly`;
  - regole fiscali: `bandOrder`, `coefficientsEmpty`.
- **Gli avvisi non bloccano il calcolo:**
  - piano: `tfrBackToCompany`, `returnVeryHigh` (oltre 8%), `realReturnNonPositive`, `capitalShareAboveLegal`,
    `ritaRequiresUnemployment`, `claimBeforeOldAge`, `singleAssetConcentration` (oltre l'80% in un solo strumento
    azionario);
  - dopo la simulazione: `negativeSavingsWhileWorking`, `bonusAboveCap`, `bonusIneligibleIncome`,
    `contributionAboveCap`, `noStatePension`, `pfShortMembership`, `pfAccessAfterHorizon`.
- **Le informazioni:**
  - piano: `montanteEstimated`, `bonusToFundDisabled`, `tfrPartialCheckContract` (quota di TFR tra 0 e 100%:
    ammessa se il CCNL o il fondo prevede una quota minima, o per chi lavorava prima del 29/04/1993);
  - dopo la simulazione: `redemptionFallbackRita`, `pfOrdinaryBenefit`, `ritaDelayedToRetirement`,
    `statePensionAfterHorizon`.
- **Limiti di modello** (`VALIDATION_LIMITS`):
  - età: età attuale 15–100 anni; orizzonte fino a 120 anni;
  - mercato: rendimenti tra −50% e 50%; volatilità 0–100%; costi 0–10%; inflazione tra −5% e 30%;
  - prelievi: SWR 0,1–20%;
  - Monte Carlo: da 100 a 10.000 simulazioni; probabilità richiesta 1–100%.
- **Regole fiscali.** Le regole del piano vengono confrontate con la struttura di `IT_2026`:
  - ogni numero deve essere finito e non negativo;
  - le percentuali (campi che finiscono in `Pct`) non possono superare 100;
  - gli scaglioni devono avere limiti crescenti, e solo l'ultimo può essere senza limite;
  - serve almeno un coefficiente di trasformazione valido.

Gli avvisi "dopo la simulazione" vengono aggiunti da `runPlan` e si riferiscono al piano mostrato.

## 16. Semplificazioni e limiti noti

Il modello è utile per confrontare scelte e ipotesi, non per prevedere al centesimo. Questi sono i limiti che
conosciamo.

**Persona, lavoro e busta paga**
- Una sola persona: niente coniuge, figli, detrazioni per familiari a carico o assegno unico, e nessun altro
  reddito (affitti, lavoro autonomo, partita IVA).
- Solo lavoratori dipendenti del settore privato (FPLD, aliquota di computo 33%). Non sono modellati: dipendenti
  pubblici (TFS), lavoratori autonomi e gestione separata, regime forfettario.
- Niente oneri deducibili o detraibili diversi dalla previdenza complementare: spese mediche, mutuo,
  ristrutturazioni.
- Il trattamento integrativo parziale (reddito tra 15.000 e 28.000 €) non è modellato.
- L'extra-deducibilità per i lavoratori di prima occupazione non è modellata.
- Calcoli annuali, non mensili:
  - la soglia dell'1% INPS è applicata sul totale dell'anno;
  - le addizionali sono contate nell'anno del reddito;
  - premi e conguagli cadono nell'anno in cui maturano.
- Il premio versato al fondo pensione o convertito in welfare non è controllato rispetto ai limiti del premio di
  produttività (tetto e reddito massimo): il motore converte tutto il premio.
- Nel primo anno il requisito di reddito del premio usa il reddito dello stesso anno.
- Carriera senza interruzioni: niente disoccupazione, part-time o pause, a meno di inserire una fase con RAL 0.
  Un cambio di fase è un salto di stipendio.
- Le regole 2026 valgono per sempre: nessuna riforma futura. Gli scaglioni IRPEF non sono indicizzati (opzione
  modificabile).
- Le addizionali predefinite sono il minimo regionale (1,23%) e un'aliquota comunale tipica (0,8%), non quelle
  della tua regione e del tuo comune.

**TFR**
- Il TFR già maturato (`assets.companyTfr`) è considerato tutto capitale. Le rivalutazioni già incluse vengono
  quindi tassate di nuovo alla liquidazione: l'imposta è un po' sovrastimata.
- Non sono modellati la riliquidazione dell'Agenzia delle Entrate (aliquota media degli ultimi cinque anni) e le
  anticipazioni del TFR.
- La liquidazione avviene all'inizio del primo anno da ritirato, senza rivalutazione per quell'anno.

**Fondo pensione**
- La rendita è costante in euro nominali, perde potere d'acquisto e si ferma alla fine dell'orizzonte. Il tasso di
  conversione è un input, non una tavola attuariale.
- La quota di rendimento finanziario maturata durante l'erogazione della rendita, che per legge ha un trattamento
  fiscale proprio, non è distinta.
- Gli anni di iscrizione sono anni solari interi dall'anno di prima iscrizione.
- Non sono modellati:
  - anticipazioni, riscatti parziali e riscatto per altre cause;
  - la RITA parziale;
  - i requisiti contributivi della RITA nei regimi obbligatori;
  - l'adesione automatica dei neoassunti dal 2026.
- Il riscatto per inoccupazione presuppone che tu resti senza lavoro per più di 48 mesi dopo il ritiro.
- Un solo comparto con rendimento e quota in titoli di Stato costanti: niente percorsi *life-cycle*.

**Pensione INPS**
- I coefficienti di trasformazione 2027–2028 valgono per sempre. In realtà vengono rivisti ogni due anni in base
  alla speranza di vita, di solito al ribasso: per chi è giovane la pensione stimata è probabilmente ottimistica.
- L'età di vecchiaia è fissa a 67 anni interi. Per legge cresce con la speranza di vita (circa +1 mese nel 2027,
  +3 mesi nel 2028).
- La rivalutazione del montante è inflazione + crescita reale del PIL. Per legge è la media quinquennale del PIL
  nominale.
- La base pensionabile è la sola RAL, senza premi.
- Ogni anno di lavoro vale un anno di contributi, qualunque sia lo stipendio.
- Sono modellate solo la pensione di vecchiaia (67 anni con 20 di contributi) e quella a 71 anni con 5. Non sono
  modellate la pensione anticipata, le uscite agevolate e le soglie minime di importo per i "contributivi puri".
  Con l'importo stimato puoi indicare qualunque età, e ricevi un avviso.
- Il sistema retributivo e misto (contributi prima del 1996) non è modellato: il montante va inteso come montante
  contributivo.
- La perequazione è una sola percentuale dell'inflazione. Per legge varia per fasce di importo.
- La pensione è pagata per intero (13 rate) dal primo anno.
- Con l'importo stimato, il valore inserito è considerato netto e indicizzato al 100% all'inflazione.
- Riscatti (per esempio della laurea), contributi figurativi e NASpI non sono modellati.

**Investimenti e mercato**
- Strumenti ad accumulazione: dividendi e cedole non sono tassati ogni anno.
- Tassa sulle plusvalenze fissa per strumento (una media per gli ETF obbligazionari).
- Non ci sono compensazione delle minusvalenze, scelta tra regime amministrato e dichiarativo, costi di
  transazione o spread.
- Il rischio di cambio non è separato: è compreso nella volatilità.
- Il bollo sul conto usa il saldo di inizio anno invece della giacenza media. Conto deposito e libretti (che pagano
  lo 0,2%) non sono distinti dal conto corrente.
- La liquidità oltre il fondo di emergenza resta sul conto: non viene investita automaticamente.
- Niente immobili, mutui o debiti con il loro piano di ammortamento: affitto e rata vanno nelle spese mensili, gli
  acquisti negli eventi.
- Monte Carlo:
  - rendimenti lognormali indipendenti di anno in anno, con correlazioni costanti;
  - inflazione indipendente dai rendimenti;
  - niente code più pesanti della lognormale, crisi prolungate o regimi di mercato;
  - stipendio, spese e durata della vita non sono casuali.
- Con 1.000 simulazioni, una probabilità di successo intorno al 90% ha un errore statistico di circa ±1 punto.

**Spese e prelievi**
- Le spese restano costanti in termini reali, salvo il passaggio al ritiro e gli eventi. Non c'è un aumento
  automatico per salute o assistenza in età avanzata: si può aggiungere come evento.
- Guardrail semplici: un taglio nell'anno in cui il tasso di prelievo supera 1,2 × SWR, senza regole di aumento.
- Le entrate da eventi (eredità, vendite) sono considerate nette.
- Tempi semplificati:
  - i flussi avvengono a metà anno ai prezzi di inizio anno;
  - le prestazioni del fondo e il TFR sono pagati a inizio anno;
  - le età sono intere e il ritiro avviene a inizio anno solare.

**Età FI**
- L'età FI deterministica usa i rendimenti mediani ogni anno, quindi per definizione non ha margine. Per questo
  c'è anche l'età con la probabilità richiesta.
- Il successo richiede solo di non restare mai senza soldi accessibili. Non richiede un patrimonio minimo alla
  fine e non considera il denaro ancora bloccato a fine orizzonte.

## 17. Migrazione dalla v1

Al primo avvio, se esistono solo i dati della v1 (chiave `fire_wealth_simulator_v1`), `migrateV1State` li
converte. La chiave originale non viene modificata. La conversione è un "miglior tentativo": un dato sbagliato
della v1 viene copiato com'è e compare come problema di validazione. Ogni piano convertito riceve una nota
(`notes`) con i dati da controllare.

- La v1 non conosceva l'età: il motore assume 30 anni. Gli anni delle fasi (1…N) diventano età (30…29+N), gli
  aumenti reali sono 0.
- **Spese mensili** = (netto del primo anno con le regole 2026 − risparmi della v1) / 12. I risparmi sono: mensili,
  tredicesima e quattordicesima, premio netto e risparmio fiscale del fondo.
- **Fondo pensione.**
  - "Massimizza tetto deducibilità" diventa `fillCap`.
  - Una quota di risparmi destinata al fondo diventa un versamento volontario fisso.
  - Un'imposta sui rendimenti fissa diventa la quota in titoli di Stato equivalente.
- **Premio.** Il regime "detassazione" diventa premio di produttività. "Ordinario" e "personalizzato" diventano
  premio tassato come stipendio.
- **Saldi e investimenti.**
  - Il capitale investito si divide tra gli strumenti secondo i pesi, con costo fiscale uguale al valore.
  - Gli anni di TFR e di contributi INPS sono stimati dal TFR maturato.
  - L'anno di iscrizione al fondo è l'anno di partenza.
- **Regole fiscali** 2026, tranne il divisore del TFR e l'aliquota del bollo, copiati dalla v1 quando presenti.

## 18. Fonti

Le fonti sono quelle dell'elenco `IT_2026.sources`, verificate a novembre 2026. Nell'app sono consultabili
insieme ai valori.

| Chiave | Argomento | Parametri |
|---|---|---|
| [`irpef`][irpef] | IRPEF 2026: scaglioni 23/33/43% (L. 199/2025) | `irpef.brackets` |
| [`irpef2`][irpef2] | Legge di Bilancio 2026, misure fiscali (Confindustria) | `irpef.*`, `productivityBonus.*`, `pensionFund.deductionCap` |
| [`detrazioni`][detrazioni] | Detrazioni per lavoro dipendente, art. 13 TUIR | `irpef.employeeDeduction` |
| [`cuneo`][cuneo] | Cuneo fiscale strutturale (L. 207/2024) | `irpef.cuneo` |
| [`trattamentoIntegrativo`][trattamentoIntegrativo] | Trattamento integrativo (ex bonus Renzi) 2026 | `irpef.supplementaryTreatment` |
| [`inps`][inps] | Contributi INPS 2026: soglia dell'1% e massimale | `inps.*` |
| [`addizionali`][addizionali] | Addizionali regionali IRPEF per scaglione | `irpef.regionalSurchargeBands`, `irpef.municipalSurchargePct` |
| [`premio`][premio] | Premi di risultato 2026–2027: 1% fino a 5.000 € | `productivityBonus.*` |
| [`tfr`][tfr] | Calcolo del TFR: quota 1/13,5 meno 0,50% | `tfr.divisor`, `tfr.contributionPct` |
| [`tfrReval`][tfrReval] | Rivalutazione del TFR e imposta sostitutiva del 17% | `tfr.revalFixedPct`, `tfr.revalInflationSharePct`, `tfr.revalTaxPct` |
| [`tfrTax`][tfrTax] | Tassazione separata del TFR (art. 19 TUIR) | scaglioni IRPEF |
| [`fpCap`][fpCap] | Previdenza complementare: deducibilità di 5.300 € dal 2026 | `pensionFund.deductionCap` |
| [`fpYield`][fpYield] | Fondi pensione: tassazione dei rendimenti 20% / 12,5% | `pensionFund.yieldTaxPct`, `govBondYieldTaxPct` |
| [`fpExit`][fpExit] | Prestazioni del fondo pensione: dal 15% al 9% | `pensionFund.exitTax*` |
| [`fpAccess`][fpAccess] | RITA, anticipazioni, riscatti | `pensionFund.rita*`, `redemption*`, `maxCapitalSharePct`, `minMembershipYears` |
| [`cg`][cg] | ETF: 26% e quota di titoli di Stato al 12,5% | `investments.capitalGainsPct`, `govBondPct`, `cashInterestTaxPct` |
| [`bollo`][bollo] | Imposta di bollo e IVAFE 2026 | `investments.stampDutyPct`, `cashStampDuty`, `cashStampDutyThreshold` |
| [`coeff`][coeff] | Coefficienti di trasformazione dal 2027 | `statePension.transformationCoefficients` |
| [`pensioner`][pensioner] | Detrazioni per redditi di pensione 2026 | `irpef.pensionerDeduction` |

Riferimenti normativi citati nel codice: art. 11 e 13 TUIR (IRPEF e detrazioni), art. 19 TUIR (TFR), art. 2120
c.c. e art. 3 c.15 L. 297/1982 (TFR), L. 207/2024 c.4-9 (cuneo), DL 3/2020 come modificato dalla L. 234/2021
(trattamento integrativo), L. 199/2025 (Legge di Bilancio 2026), D.Lgs. 252/2005 art. 8, 11 e 14 (previdenza
complementare), circ. AdE 28/E/2016 (premi di risultato), D.Lgs. 446/1997 art. 50 e D.Lgs. 360/1998 art. 1
(addizionali), DL 65/2015 (rivalutazione del montante).

[irpef]: https://www.fiscozen.it/news/irpef-2026-come-si-calcola-alla-luce-del-taglio/
[irpef2]: https://public.confindustria.it/repository/2026/03/16160200/documenti-legge-di-bilancio-2026-analisi-Circolare-Legge-di-Bilancio-2026_analisi-delle-misure-fiscali.pdf
[detrazioni]: https://www.brocardi.it/testo-unico-imposte-redditi/titolo-i/capo-i/art13.html
[cuneo]: https://cafinforma.it/detrazioni-lavoro-dipendente-2026/
[trattamentoIntegrativo]: https://www.informazionefiscale.it/trattamento-integrativo-busta-paga-a-chi-quando-spetta
[inps]: https://www.informazionefiscale.it/contributi-INPS-2026-dipendenti-istruzioni-calcolo-importo
[addizionali]: https://www.pmi.it/card/addizionali-irpef-regionali-per-ogni-scaglione-di-reddito/doc/20
[premio]: https://www.fiscal-focus.it/quotidiano/il-quotidiano/articoli-fisco/premi-di-risultato-2026-come-detassare-fino-a-5-000-euro-senza-errori,3,183981
[tfr]: https://www.pensionioggi.it/dizionario/il-tfr/amp
[tfrReval]: https://assolombarda.it/servizi/fisco/documenti/la-rivalutazione-del-tfr
[tfrTax]: https://www.brocardi.it/testo-unico-imposte-redditi/titolo-i/capo-i/art19.html
[fpCap]: https://www.fiscozen.it/news/previdenza-complementare-cosa-cambia-dal-2026-tra-adesione-automatica-portabilita-del-contributo-datoriale-e-nuovo-limite-di-deducibilita/
[fpYield]: https://lavoro.gov.it/previdenza-complementare/educazione-previdenziale/incentivazione-fiscale
[fpExit]: https://www.fiscoetasse.com/domande-e-risposte/1715-quali-sono-le-regole-generali-di-tassazione-delle-prestazioni-erogate-dalle-forme-pensionistiche-complementari
[fpAccess]: https://www.cometafondo.it/prestazioni-anticipazioni/panoramica/
[cg]: https://fiscoinvestimenti.it/etf-obbligazionari-tassazione-12-5-26/
[bollo]: https://quifinanza.it/fisco-tasse/imposta-bollo-ivafe-prodotti-finanziari-2026/1005389/
[coeff]: https://www.ecnews.it/lavoro/prestazioni-assistenziali-e-previdenziali/pensioni/pensioni-aggiornati-i-coefficienti-di-trasformazione-del-montante-contributivo-dal-1-gennaio-2027/
[pensioner]: https://leggeinchiaro.it/detrazioni-pensione-2026-importi/
