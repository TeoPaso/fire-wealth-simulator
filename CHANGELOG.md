# Changelog

Tutte le modifiche importanti del progetto sono elencate qui. Il formato si ispira a
[Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e le versioni seguono il
[Semantic Versioning](https://semver.org/lang/it/).

## 2.0.0 — 2026-11-17

**Riscrittura completa: da simulatore di accumulo (v1 "FIRE Wealth Simulator") a pianificatore FIRE
("FIRE Planner Italia").** La v1 proiettava solo la crescita del patrimonio. La v2 risponde alla domanda "a che
età posso smettere di lavorare?": simula lavoro, ritiro e decumulo anno per anno con le regole italiane 2026.
Ogni problema confermato dall'audit della v1 ([docs/AUDIT-v1.md](docs/AUDIT-v1.md), 105 rilievi) è stato
affrontato; l'elenco è più sotto. Le formule sono in [docs/METODOLOGIA.md](docs/METODOLOGIA.md).

### Aggiunto

- **Grandezze FIRE:**
  - età FI deterministica;
  - età con la probabilità di successo richiesta (Monte Carlo, 90% predefinito);
  - probabilità di successo;
  - numero FIRE e avanzamento;
  - anni di "ponte" fino al primo sblocco;
  - tasso di risparmio.
- **Profilo e decumulo:**
  - età, orizzonte del piano, fase da ritirato;
  - vendite al netto delle tasse sulle plusvalenze e costo fiscale per strumento;
  - età di esaurimento;
  - strategie di prelievo a spese costanti o con guardrail.
- **Spese:** spese mensili, spese da ritirato, eventi di vita (spese o entrate, una tantum o per più anni), fondo
  di emergenza in mesi di spesa, interessi sulla liquidità.
- **Euro di oggi.** Tutti gli importi si inseriscono in euro di oggi e la simulazione è nominale con un indice dei
  prezzi. I risultati si vedono in euro di oggi o nominali.
- **Busta paga 2026 calcolata dal motore:**
  - INPS con l'1% aggiuntivo e il massimale;
  - IRPEF 23/33/43%;
  - detrazioni per lavoro dipendente e cuneo fiscale;
  - trattamento integrativo;
  - addizionali regionale e comunale;
  - deduzione dei contributi al fondo pensione con il tetto di 5.300 €, datore compreso;
  - risparmio fiscale, aliquota marginale e aliquota media.
- **Premio:**
  - quattro regimi: premio di produttività (1% fino a 5.000 € nel 2026–2027, con INPS, tetto al netto
    dell'INPS e limite di reddito di 80.000 €), tassato come stipendio, versato al fondo pensione, welfare;
  - un regime per ogni fase della carriera.
- **TFR:** quota corretta, rivalutazione con imposta del 17%, tassazione separata alla fine del rapporto; TFR al
  fondo per fase.
- **Fondo pensione:**
  - imposta sui rendimenti con quota in titoli di Stato e compensazione delle perdite;
  - imposta in uscita dal 15% al 9% per anni di iscrizione;
  - parte tassabile;
  - tre modalità di accesso: alla pensione (capitale + rendita), RITA e riscatto totale per inoccupazione.
- **Pensione INPS:** metodo contributivo (montante, rivalutazione, coefficienti 2027–2028, requisiti di età e
  contributi, perequazione, tasse da pensionato) oppure importo netto stimato.
- **Patrimonio accessibile e bloccato** separati: il denaro bloccato non viene mai usato prima dello sblocco.
- **Monte Carlo:**
  - rendimenti lognormali correlati e inflazione casuale;
  - seme riproducibile;
  - percentili del patrimonio, istogramma delle età di esaurimento, probabilità per età di ritiro.
- **Analisi di sensibilità** dell'età FI su sette ipotesi.
- **Validazione:**
  - errori, avvisi e informazioni con il percorso esatto del campo;
  - gli errori fermano il calcolo, avvisi e informazioni no;
  - nessuna correzione silenziosa.
- **Regole fiscali** del piano tutte modificabili, con la fonte di ogni valore e il ripristino dei valori 2026.
- **Gestione dei piani:**
  - tre piani di esempio, varianti della stessa persona con ipotesi di mercato diverse;
  - crea, duplica, rinomina, elimina, confronta;
  - esporta e importa in JSON (l'importazione aggiunge sempre, non sostituisce);
  - ripristino degli esempi con backup.
- **Migrazione automatica dei dati della v1.** La chiave originale non viene modificata.
- **Interfaccia:**
  - pannello dei dati affiancato ai risultati, due schede su mobile;
  - sezioni a fisarmonica con riepilogo;
  - anteprima del netto in busta paga;
  - campi numerici che accettano la virgola decimale e i valori parziali durante la digitazione.
- **Traduzione inglese completa** con test di parità delle chiavi. `<html lang>` segue la lingua scelta.
- **Documentazione:** README, metodologia di calcolo, specifica tecnica, audit della v1.

### Cambiato

- Nome: "FIRE Planner Italia" (pacchetto `fire-planner-italia`).
- Stack: Next.js 16.4.6 (App Router, export statico), React 19.3, TypeScript 5.9, Tailwind CSS 3.4,
  Recharts 3.10, Vitest 5, ESLint 10. Node.js 22.12 o successivo. Nessuna vulnerabilità nota nelle dipendenze al momento del rilascio.
- Motore riscritto da zero: TypeScript puro e deterministico, separato dall'interfaccia, con un contratto di tipi
  unico (`lib/engine/types.ts`).
- Salvataggio nella chiave `fire-planner:v2`, con versione dello schema. I dati illeggibili vengono copiati in un
  backup, mai cancellati.
- La build produce un sito statico (`out/`). `npm start` non esiste più: si pubblica su qualunque hosting statico.

### Rimosso

- IRR/TIR, "capitale versato", "rendimento lordo/netto": indicatori non pertinenti per il FIRE e calcolati in modo
  errato.
- La card "Flusso di cassa mensile", che ricalcolava le tasse nell'interfaccia.
- L'aliquota marginale IRPEF unica da inserire a mano.
- Il premio con aliquota "personalizzata".
- La destinazione del TFR globale e la quota dei risparmi destinata al fondo (`savingsToPensionPercent`).
- La normalizzazione silenziosa del piano (`sanitize`).
- `framer-motion` e l'animazione `AnimatedFlame`.

### Problemi della v1 risolti

Rilievi dell'audit, raggruppati per area, con il codice e il titolo originali. Dopo ogni rilievo, come è stato
risolto. "In parte" indica un rilievo affrontato solo in parte: quello che manca è anche tra i limiti noti della
[metodologia](docs/METODOLOGIA.md#16-semplificazioni-e-limiti-noti).

#### Motore di calcolo

- **ENG-01** Fondo pensione disattivato: il TFR destinato al fondo sparisce.
  → Con il fondo disattivato non ci sono versamenti al fondo e tutto il TFR resta in azienda, fino alla
  liquidazione. Un test verifica la conservazione del denaro anno per anno.
- **ENG-02** Fondo disattivato con savingsToPensionPercent > 0: parte dei risparmi viene distrutta e il costo
  fiscale gonfiato.
  → Il campo non esiste più. I versamenti extra sono contributi volontari trattenuti in busta paga (nessuno, fino
  al limite deducibile, importo fisso), solo con il fondo attivo.
- **ENG-03** Il campo UI 'Imposta Rendimenti Interni' del fondo non ha effetto: il motore legge un altro campo non
  modificabile.
  → L'imposta sui rendimenti nasce da `pensionFund.yieldTaxPct` e `govBondYieldTaxPct` (regole) e dalla quota in
  titoli di Stato del comparto. Il motore usa tutti e tre i valori.
- **ENG-04** Formula TFR sbagliata: lo 0,50% viene tolto dalla quota TFR invece che dalla retribuzione.
  → Quota = RAL / 13,5 − 0,50% della RAL (circa 6,907% della RAL), con test.
- **ENG-05** Con autoMaxDeductibility, capitale versato, IRR e rendimento usano una % dipendente vecchia e diversa
  da quella simulata.
  → "Fino al limite deducibile" si calcola ogni anno sulla RAL di quell'anno. IRR e capitale versato sono stati
  rimossi.
- **ENG-06** autoMax con contributo datore oltre il tetto azzera anche il contributo del datore.
  → Il versamento volontario è `max(0, tetto − datore − tuo contributo)`. Il contributo del datore resta sempre;
  la parte oltre il tetto diventa reddito imponibile.
- **ENG-07** Tetto di deducibilità applicato al solo contributo dipendente: rimborso IRPEF e base dell'imposta in
  uscita sovrastimati.
  → Un solo tetto per dipendente e datore. La parte tassabile all'uscita segue i contributi dedotti.
- **ENG-08** L'IRR usa il bonus lordo come esborso: il TIR mostrato è sistematicamente troppo basso.
  → IRR rimosso. Gli indicatori principali sono età FI, probabilità di successo e patrimonio in euro di oggi.
- **ENG-09** Capitale versato, rendimento lordo/netto e 'tasse pagate' classificano male i flussi: rimborsi IRPEF
  contati come guadagni, tasse del fondo invisibili.
  → Non c'è un flusso di "rimborso IRPEF": il risparmio fiscale è già nel netto. I totali sono divisi per
  categoria (IRPEF e addizionali, INPS, imposte sui capitali, bollo, imposte del fondo, imposte sul TFR, costi).
- **ENG-10** Colonna 'Costi / TER' del portafoglio ETF include i costi del fondo pensione; stima dei costi
  approssimata.
  → I costi del portafoglio (`portfolioCosts`) e del fondo (`pfCosts`) sono separati e calcolati esattamente ogni
  anno.
- **ENG-11** Default diversi tra motore e sanitize: lo stesso scenario dà risultati molto diversi in base a un
  errore non correlato.
  → Un'unica fonte di valori predefiniti (`createDefaultPlan`) e nessuna sanitize. I piani salvati vengono
  completati con i predefiniti solo nei campi mancanti.
- **ENG-12** sanitize modifica in silenzio lo scenario (allocazioni rinormalizzate, fasi riscritte) e la dashboard
  mostra numeri di un altro scenario.
  → `validatePlan` non modifica mai il piano. Con errori il calcolo non parte e l'interfaccia mostra il problema
  accanto al campo.
- **ENG-13** Buchi di validazione: crash con orizzonte frazionario, NaN propagati, percentuali fuori range
  accettate.
  → Validazione completa di tipi, numeri interi, NaN e intervalli, provata con oltre 1.000 piani casuali o
  malformati. Ogni piano accettato produce risultati finiti.
- **ENG-14** Contributo del datore attivato da versamenti volontari (bonifico) e da qualsiasi importo > 0.
  → Il contributo del datore spetta solo se il tuo contributo in % della RAL è maggiore di zero.
- **ENG-15** Rimborso IRPEF riconosciuto anche con RAL = 0 (nessuna IRPEF da cui dedurre).
  → La deduzione non supera il reddito. Il risparmio fiscale si ottiene ricalcolando le imposte.
- **ENG-16** Bonus netto sovrastimato: mancano i contributi INPS e i limiti della detassazione (tetto annuo,
  RAL ≤ 80k); aliquota 2026 superata.
  → Premio di produttività con contributi INPS, tetto misurato al netto dell'INPS, limite di reddito e aliquota
  dell'1% nel 2026–2027. Dopo valgono le regole parametriche (10% fino a 3.000 €).
- **ENG-17** Aliquota di uscita del fondo costante in tutti gli anni: non applica la riduzione 15% → 9% per
  anzianità.
  → Aliquota dal 15% al 9% secondo gli anni di iscrizione all'accesso.
- **ENG-18** Ordine sbagliato tra TER e imposta del fondo: l'imposta del 20% si applica al rendimento lordo prima
  dei costi.
  → L'imposta si applica al risultato al netto dei costi, compensando i risultati negativi degli anni precedenti.
- **ENG-19** Il bollo riduce il saldo ma non il costo fiscale: crea uno scudo fiscale fittizio pari al 26% del
  bollo cumulato.
  → Il bollo è una spesa dell'anno pagata dal flusso di cassa o da vendite tassate. Non tocca il costo fiscale.
- **ENG-20** TFR in azienda: rivalutazione non tassata al 17% ogni anno e tassata al 23% in uscita.
  → Imposta del 17% sulla rivalutazione ogni anno. Alla liquidazione, tassazione separata con l'aliquota media
  IRPEF sul solo capitale.
- **ENG-21** Fondo disattivato: il saldo iniziale del fondo resta congelato senza rendimento.
  → Il saldo esistente continua a rendere, al netto di costi e imposta, ed è pagato all'accesso.
- **ENG-22** Tempi dei flussi: risparmi verso il fondo da 13ª, 14ª e bonus spalmati da gennaio; rimborso IRPEF
  accreditato un anno prima.
  → Passo annuale con la convenzione di metà anno per tutti i flussi. Non c'è più un rimborso IRPEF separato.

#### Fiscalità e normativa 2026

- **TAX-01** Quota TFR annua calcolata male: lo 0,50% viene tolto dal TFR invece che dalla retribuzione.
  → Vedi ENG-04.
- **TAX-02** Card 'Sconto Fiscale IRPEF su Fondo' sbagliata: mostra 2×contributo − risparmio invece del
  risparmio.
  → Il risparmio fiscale (`pensionTaxSaving`) è la differenza tra le imposte senza e con la deduzione, verificata
  con casi calcolati a mano. L'interfaccia mostra solo il valore del motore.
- **TAX-03** Stimatore del netto in busta paga fermo alle regole 2025, senza addizionali e incompleto.
  → Busta paga 2026 completa nel motore (sezione 4 della metodologia). L'anteprima del netto usa la stessa
  funzione.
- **TAX-04** Plafond di deducibilità: l'engine non conta il contributo datoriale nel tetto.
  → Vedi ENG-07.
- **TAX-05** Aliquota marginale IRPEF unica per tutte le fasi; i preset usano aliquote inesistenti nel 2026 (35%,
  28%).
  → L'IRPEF si calcola per scaglioni ogni anno, sul reddito effettivo. Non c'è più un'aliquota da inserire.
- **TAX-06** Premio di risultato: INPS ignorato, 5% superato (2026-27: 1% fino a 5.000 €), nessun tetto né
  requisito, IRPEF ordinaria al 35%.
  → Vedi ENG-16. La parte oltre il tetto è tassata con l'IRPEF effettiva.
- **TAX-07** TFR in azienda: manca l'imposta sostitutiva del 17% sulla rivalutazione e la tassazione separata è un
  23% fisso su tutto.
  → Vedi ENG-20.
- **TAX-08** Fondo pensione contato come patrimonio netto liquidabile ogni anno al 12%, ignorando le regole di
  accesso (critico per il FIRE).
  → Il fondo è patrimonio bloccato, separato da quello accessibile. È pagato solo secondo la modalità di accesso
  scelta (alla pensione, RITA, riscatto per inoccupazione) e mai usato prima.
- **TAX-09** Aliquota di uscita del fondo pensione fissa, non legata agli anni di adesione.
  → Vedi ENG-17.
- **TAX-10** Il campo 'Imposta Rendimenti Interni' del fondo pensione non ha alcun effetto; quello reale non è
  esposto; l'imposta è calcolata prima dei costi.
  → Vedi ENG-03 ed ENG-18. Le aliquote sono modificabili nelle regole fiscali.
- **TAX-11** Tetto di deducibilità non aggiornato (5.300 € dal 2026) e manca l'extradeducibilità per i lavoratori
  di prima occupazione.
  → In parte: il tetto è 5.300 € (`pensionFund.deductionCap`). L'extra-deducibilità per la prima occupazione non è
  ancora modellata.
- **TAX-12** ETF obbligazionari 'aggregate' tassati al 12,5% piatto; VAGF etichettato come governativo.
  → Ogni strumento ha la sua aliquota. L'esempio obbligazionario usa una media del 20% (titoli di Stato al 12,5% e
  altre obbligazioni al 26%) e ha un nome corretto.
- **TAX-13** La card del cashflow usa aliquote bonus fisse nel codice (5% e 35%), incoerenti con l'engine e con i
  parametri.
  → Card rimossa. Nell'interfaccia non ci sono aliquote scritte nel codice: tutti i parametri sono nelle regole
  fiscali.
- **TAX-15** Manca la conversione del premio di risultato in contributi al fondo pensione o in welfare (esente,
  fuori plafond).
  → Nuovi regimi "Versato al fondo pensione" (fuori dal tetto, esente all'uscita) e "Welfare aziendale". In parte:
  i limiti del premio di produttività non vengono verificati per la conversione.
- **TAX-16** Testi normativi in tooltip, label e README errati o superati.
  → Regole 2026 verificate a novembre 2026, con una fonte per ogni gruppo di parametri, consultabili nell'app e
  documentate nella metodologia.
- **TAX-17** Imposta di bollo e tassazione della liquidità semplificate (conto corrente, conto deposito, IVAFE).
  → In parte: bollo dello 0,20% sugli investimenti, 34,20 € sul conto oltre 5.000 €, interessi della liquidità
  tassati al 26%. Restano semplificati il conto deposito e la giacenza media.

#### Metodologia FIRE e ipotesi del piano

- **FIRE-01** Un'app chiamata FIRE che non calcola nessuna grandezza FIRE: spese, tasso di risparmio, FIRE number,
  anno ed età di indipendenza finanziaria.
  → Spese, tasso di risparmio, numero FIRE, età FI e anni che mancano.
- **FIRE-02** Nessuna fase di decumulo né verifica di sopravvivenza del portafoglio; emularla con un risparmio
  negativo produce saldi negativi e imposte assurde.
  → Decumulo anno per anno fino all'orizzonte, con vendite al netto delle tasse. I saldi non vanno mai sotto zero
  e c'è un'età di esaurimento.
- **FIRE-03** Il patrimonio bloccato (fondo pensione) è sommato a quello accessibile; tassazione di uscita al 12%
  anche in caso di accesso anticipato.
  → Vedi TAX-08. La tassazione segue la modalità di accesso effettiva.
- **FIRE-04** Mescolanza nominale/reale: RAL e risparmi sono importi nominali fissi per 5-15 anni, senza
  indicazione se vadano inseriti in euro di oggi o futuri.
  → Tutti gli importi si inseriscono in euro di oggi. Stipendi e spese crescono con l'inflazione, la simulazione è
  nominale con indice dei prezzi e la vista può essere reale o nominale.
- **FIRE-05** Rendimenti deterministici costanti: nessuna volatilità, Monte Carlo, percentile, stress test o
  rischio di sequenza.
  → Monte Carlo con percentili, probabilità di successo per età di ritiro ed età con la probabilità richiesta.
- **FIRE-06** Ipotesi di rendimento dei preset ottimistiche rispetto alle stime 2026 (Base al limite superiore,
  Optimistic fuori scala); Pessimistic ha un rendimento reale negativo non segnalato.
  → Esempi con il 6% per le azioni e il 3% per le obbligazioni, nominali prima dei costi, inflazione 2%. Avvisi
  per rendimenti oltre l'8% e per rendimento reale non positivo.
- **FIRE-07** Rischio di concentrazione e di cambio non segnalato; nessun ribilanciamento: l'allocazione deriva
  verso più azionario mentre il grafico ad anello mostra quella iniziale.
  → In parte: c'è un avviso se oltre l'80% del portafoglio è in un solo strumento azionario, il ribilanciamento
  può essere con i flussi o annuale, e il valore di ogni strumento è calcolato anno per anno. Il rischio di cambio
  non è modellato a parte.
- **FIRE-08** Risparmi scollegati da reddito e spese: si può risparmiare più del netto, e i preset implicano tassi
  di risparmio del 53-75% con spese reali in calo.
  → Il risparmio è un risultato: netto + altre entrate − spese − eventi − bollo. Se è negativo si usano liquidità
  e investimenti, con un avviso se succede mentre lavori.
- **FIRE-09** Mancano età, aspettativa di vita e pensione INPS: impossibile dimensionare il ponte FIRE fino ai 67
  anni.
  → Età, orizzonte, pensione INPS (contributiva o stimata) e anni di ponte fino al primo sblocco.
- **FIRE-10** KPI principali non pertinenti per il FIRE: patrimonio netto nominale di liquidazione all'anno N e un
  IRR nominale per giunta sottostimato.
  → Indicatori principali: età FI, età con la probabilità richiesta, probabilità di successo, numero FIRE e
  avanzamento, patrimonio accessibile e bloccato in euro di oggi.
- **FIRE-11** Nessuna analisi di sensitività; i tre preset non sono varianti dello stesso piano ma tre vite
  diverse.
  → Analisi di sensibilità su sette ipotesi. Gli esempi descrivono la stessa vita con ipotesi di mercato diverse.
- **FIRE-12** Liquidità a rendimento zero e mai usata; nessun fondo emergenza né eventi di vita (casa, figli,
  auto, spese straordinarie).
  → Liquidità con interessi, fondo di emergenza in mesi di spesa, eventi di vita. La liquidità è la prima fonte
  usata quando servono soldi.
- **FIRE-13** Descrizioni dei preset incoerenti con i parametri.
  → Le descrizioni degli esempi corrispondono alle ipotesi che usano.

#### Interfaccia e coerenza dei dati

- **UI-01** Ogni modifica intermedia non valida viene salvata e al ricaricamento TUTTI gli scenari dell'utente
  vengono cancellati.
  → I piani non validi sono salvati così come sono, come bozze modificabili, e non vengono mai cancellati. I dati
  illeggibili vengono copiati in un backup prima di ripartire dagli esempi.
- **UI-02** Il 'Sconto Fiscale IRPEF su Fondo' è calcolato con una formula sbagliata: circa 4 volte il valore
  reale, e la card mostra '--28 €/m'.
  → Vedi TAX-02.
- **UI-03** La card 'Flusso di Cassa' ricalcola bonus, TFR, contributi e RAL con costanti proprie che
  contraddicono l'engine e i parametri dell'utente.
  → Card rimossa. Ogni numero mostrato viene dal motore: le righe annuali contengono anche la busta paga.
- **UI-04** Lo stimatore del netto in busta paga usa tabelle IRPEF/INPS hardcoded, non parametriche e superate per
  il 2026; mancano le addizionali.
  → Vedi TAX-03.
- **UI-05** Il campo 'Imposta Rendimenti Interni' del Fondo Pensione non ha alcun effetto: scrive un campo che
  l'engine non legge.
  → Vedi ENG-03.
- **UI-06** La 'Destinazione TFR' globale non ha effetto in tutti e 3 i preset perché ogni fase la sovrascrive.
  → Non c'è più una destinazione globale: la quota di TFR al fondo è un campo di ogni fase.
- **UI-07** Modificare 'Anno Inizio' di una fase viene ignorato oppure riordina le fasi; digitare 'Anno Fine'
  comprime le fasi successive.
  → Le fasi sono definite solo dall'età di fine. Età non crescenti sono un errore mostrato sul campo: niente
  riordini o compressioni automatiche.
- **UI-08** La tabella anno per anno non ha le colonne richieste RAL, TFR maturato e liquidità; il totale non è la
  somma delle colonne.
  → Ogni riga annuale del motore contiene RAL, TFR maturato, liquidità, saldi e flussi, ed è riconciliata dai test
  di conservazione. La tabella "Anno per anno" mostra queste righe.
- **UI-09** La colonna 'Costi / TER' sotto ETF include il TER del fondo pensione e le righe ETF non si
  riconciliano (il bollo non è mostrato).
  → Vedi ENG-10. Il bollo è una voce separata di ogni anno.
- **UI-10** Il Service Worker non viene mai registrato: l'app non è installabile né utilizzabile offline.
  → Il service worker si registra all'avvio nella build di produzione. L'app è installabile e funziona offline.
- **UI-11** Allocazione ≠ 100%: la UI mostra solo un testo rosso, mentre la dashboard normalizza in silenzio e la
  ciambella mostra percentuali sbagliate con un '100%' fisso.
  → Un'allocazione diversa da 100% è un errore che ferma il calcolo, mostrato con la somma attuale. Nessuna
  normalizzazione.
- **UI-12** Il donut 'Allocazione Portafoglio' mostra l'allocazione target iniziale, non quella reale che deriva
  nel tempo.
  → Il motore calcola il valore di ogni strumento anno per anno (`portfolioByAsset`), così i risultati possono
  mostrare l'allocazione reale.
- **UI-13** Le KPI nascondono bollo e imposte latenti, mescolano il TER di fondo ed ETF e non rendono i tooltip che
  spiegano le definizioni.
  → Bollo, imposte latenti, costi del portafoglio e costi del fondo sono valori separati. Il patrimonio
  accessibile è al netto delle imposte latenti.
- **UI-14** 'Massimizza Tetto Deducibilità' calcola la % solo sulla RAL della fase 1 e la scrive nel campo
  globale, falsando Versamenti e IRR.
  → Vedi ENG-05.
- **UI-15** Bonus 'Personalizzata' senza campo aliquota; l'etichetta '5% (Agevolata)' è hardcoded e non segue il
  parametro (2026: 1%).
  → Il regime "personalizzato" è stato eliminato. L'etichetta del premio di produttività mostra l'aliquota letta
  dalle regole.
- **UI-16** Il toggle EN è incompleto: 72 testi visibili restano in italiano, circa 95 stringhe hardcoded fuori da
  t() e numeri sempre in formato italiano.
  → Tutti i testi passano dall'i18n, con test sulla parità delle chiavi e sulle chiavi usate. Numeri e date
  seguono la lingua.
- **UI-17** Mancano export, import e reset in UI (lo store li supporta) e la dashboard non mostra quale scenario si
  sta guardando.
  → Menu con "Esporta JSON", "Importa JSON" (con anteprima e conferma) e "Ripristina gli esempi". Il piano attivo
  è nel selettore dell'intestazione.
- **UI-18** Accessibilità: zoom bloccato (maximumScale=1), lang fisso 'it', contrasti insufficienti, controlli
  senza nome o non raggiungibili da tastiera.
  → Zoom consentito, `<html lang>` sincronizzato con la lingua, etichetta su ogni campo, focus visibile,
  controlli usabili da tastiera.
- **UI-19** Il grafico 'Composizione' divide per contenitore e non per fonte; i grafici di confronto e crescita
  non hanno le viste richieste.
  → Il motore fornisce i flussi per fonte (netto, tasse, spese, risparmi, prelievi, pensioni) e il patrimonio
  accessibile e bloccato di ogni anno, per i grafici dei risultati e il confronto tra piani.
- **UI-20** La card cashflow mostra la fase sbagliata dopo l'eliminazione di una fase o il cambio di scenario
  (indice fuori range).
  → Card rimossa. Il dettaglio della busta paga viene dalla riga dell'anno scelto.
- **UI-21** 6 errori in console a ogni caricamento dall'animazione AnimatedFlame (path d e circle cx/cy
  'undefined').
  → Animazione rimossa.
- **UI-22** All'avvio compaiono per un istante dati di default e lingua italiana prima della reidratazione.
  → La shell si carica solo nel browser, con uno scheletro di caricamento: nessun lampo di dati predefiniti.

#### Architettura, persistenza, PWA e test

Questi rilievi vengono da [docs/AUDIT-v1.md](docs/AUDIT-v1.md).

- **ARCH-01** Perdita totale degli scenari utente: lo stato invalido viene salvato, al reload tutto torna ai
  default e il primo click sovrascrive i dati.
  → Vedi UI-01. Il caricamento non scarta mai dati senza prima farne un backup.
- **ARCH-02** Disattivando il Fondo Pensione, il TFR destinato al fondo sparisce: −134.065 € sul preset Base.
  → Vedi ENG-01.
- **ARCH-03** Il Service Worker non viene mai registrato: nessuna capacità offline (requisito R4 non
  soddisfatto).
  → Vedi UI-10.
- **ARCH-04** Nessun backup, esportazione o importazione nella UI; importJson sostituirebbe tutto senza conferma.
  → Vedi UI-17. L'importazione aggiunge sempre piani nuovi; il ripristino degli esempi chiede conferma e fa un
  backup.
- **ARCH-05** Più schede aperte: chi salva per ultimo vince e cancella le modifiche dell'altra scheda.
  → Quando un'altra scheda salva, l'evento `storage` ricarica lo stato. Il salvataggio avviene poco dopo ogni
  modifica e alla chiusura della pagina.
- **ARCH-06** Il campo UI 'Imposta Rendimenti Interni' del Fondo Pensione non ha alcun effetto: scrive un campo che
  il motore non legge.
  → Vedi ENG-03.
- **ARCH-07** Il selettore globale 'Destinazione TFR' non ha effetto sui preset (override di fase nascosti) e le
  regole legacy creano precedenze confuse.
  → Vedi UI-06.
- **ARCH-08** Il dashboard mostra in silenzio i risultati di uno scenario 'sanitizzato' diverso da quello
  inserito; ci sono 4 livelli di validazione con regole e default divergenti.
  → Un solo livello di validazione (`validatePlan`) e nessuna sanitize. Vedi ENG-12.
- **ARCH-09** Logica fiscale duplicata nella UI e divergente dal motore (flusso di cassa mensile, auto-max
  deducibilità).
  → Nessuna logica fiscale nell'interfaccia: la UI importa solo dal motore (`@/lib/engine`).
- **ARCH-10** Versionamento dello schema senza migrazioni e con un campo legacy obbligatorio: ogni evoluzione
  cancellerà i dati di tutti.
  → Schema versionato, migrazione dalla v1, piani completati con i valori predefiniti nei campi nuovi. Un file
  di una versione più recente genera un avviso, senza perdere dati.
- **ARCH-11** All'avvio compaiono per un istante i dati di default (Base Case) prima dei dati dell'utente.
  → Vedi UI-22.
- **ARCH-12** Strategia di cache di sw.js difettosa: risposte di errore in cache, cache mai versionata né
  ripulita, offline fallisce con query string.
  → Cache versionata e ripulita all'attivazione, solo risposte valide in cache. Le pagine vengono chieste prima
  alla rete, con la pagina in cache come riserva offline.
- **ARCH-13** Next.js 14.2.35 con vulnerabilità note (npm audit: 1 critica, 2 alte) e nessuna patch nella linea
  14.x.
  → Next.js 16.4.6 e dipendenze aggiornate, 0 vulnerabilità al momento del rilascio.
- **ARCH-14** Accessibilità nel layout: zoom disabilitato e attributo lang fisso a 'it' anche con la UI in
  inglese.
  → Vedi UI-18.
- **ARCH-15** Icone del manifest: due file identici da 1024×1024 dichiarati 192 e 512, con purpose 'any maskable'
  combinato.
  → Icone reali da 192×192 e 512×512, con `purpose: any`.
- **ARCH-16** Il fallimento del salvataggio (quota, navigazione privata, storage disabilitato) è silenzioso.
  → Un avviso segnala quando il salvataggio non riesce o lo storage non è disponibile. Se non si può fare un
  backup, la sessione resta in sola lettura.
- **ARCH-17** SalaryPhasesForm modifica in place gli oggetti dello stato dello store.
  → Aggiornamenti immutabili: `updatePlan` lavora su una copia del piano.
- **ARCH-18** Le descrizioni dei preset non corrispondono ai parametri e i preset contengono campi legacy
  duplicati.
  → Vedi FIRE-13. Gli esempi usano solo lo schema v2.
- **TEST-01** I test certificano una formula TFR legalmente errata: lo 0,5% viene applicato alla RAL invece di
  essere sottratto dalla quota.
  → I test verificano la quota di legge (6,907% della RAL).
- **TEST-02** Il test T1-F3-4 certifica una deduzione che ignora i contributi datoriali nel tetto di 5.164,57 €;
  l'harness codifica una terza regola diversa.
  → I test verificano il tetto di 5.300 € con il datore incluso: contributi entro il tetto, dipendente oltre il
  tetto, datore oltre il tetto.
- **TEST-03** I test di persistenza certificano il comportamento che causa la perdita dati; mancano i test sui
  percorsi critici.
  → Test su storage corrotto, piani non validi salvati e ricaricati intatti, backup e migrazione dalla v1.
- **TEST-04** Test tautologici o deboli, harness matematico mai usato contro il motore e tipi dell'harness
  obsoleti.
  → Test riscritti con valori calcolati a mano e invarianti: conservazione, monotonia, riproducibilità, fuzzing.
- **TEST-05** La copertura misura solo lib/engine; sanitize, context, UI, store e service worker restano scoperti.
  → In parte: la copertura misura tutto `lib/` (motore, store, i18n) e ci sono test sui modelli dei campi della
  UI e sulle traduzioni. Il browser è coperto da uno smoke test end-to-end (`npm run e2e`).
- **TEST-06** Il test di accettazione 'interesse composto' evita la RAL (impostata a 0) e i test sull'IRR non
  coprono casi reali.
  → Test dell'interesse composto con convenzione di metà anno e TER. Test di conservazione con stipendio, fondo
  pensione e TFR attivi.

#### Critico di completezza

Anche questi rilievi vengono da [docs/AUDIT-v1.md](docs/AUDIT-v1.md).

- **CRIT-01** Il contributo dipendente in % della RAL viene trattato come denaro in più: alzarlo o attivare
  'Massimizza Tetto Deducibilità' gonfia il patrimonio finale di oltre 200.000 €.
  → I contributi del dipendente sono trattenuti dal netto: alzarli riduce il netto disponibile, non crea denaro.
- **CRIT-02** Ridurre l'orizzonte temporale crea fasi invalide (es. 16-12): il cruscotto funziona, ma al
  ricaricamento tutti gli scenari tornano ai default.
  → Fasi e orizzonte sono età. Valori incoerenti producono errori di validazione, mai la perdita dei piani.
- **CRIT-03** Il solver dell'IRR restituisce valori assurdi (fino a +14 miliardi di %) quando il patrimonio finale
  è molto sotto i versamenti, e 0% con patrimonio negativo.
  → IRR rimosso. Vedi ENG-08.
- **CRIT-04** Destinazione TFR: l'app permette quote (25%, 75%) e un ritorno dal fondo all'azienda che la
  normativa non consente; ignora l'adesione automatica 2026.
  → In parte: avviso se una fase manda al fondo meno TFR di una precedente (`tfrBackToCompany`) e informazione
  sulle quote parziali (`tfrPartialCheckContract`). L'adesione automatica dei neoassunti non è modellata.
- **CRIT-05** Capitale iniziale senza prezzo di carico: plusvalenze latenti già presenti ignorate e saldo iniziale
  del fondo tassato per intero all'uscita.
  → Costo fiscale per ogni investimento e parte tassabile del fondo inseribili. Le plusvalenze latenti già
  presenti sono considerate.
- **CRIT-06** Il configuratore è un overlay modale che copre o oscura la dashboard: non si vedono gli effetti delle
  modifiche mentre si modificano i parametri.
  → Dati e risultati affiancati su schermi larghi; due schede "Dati" e "Risultati" su mobile.
- **CRIT-07** Accesso a localStorage non protetto nel provider lingua e nessun error boundary: con lo storage
  bloccato l'app si apre su una schermata d'errore.
  → Accesso allo storage protetto: con lo storage bloccato l'app funziona senza salvare e lo dice. Ogni pannello
  ha un error boundary che permette comunque di esportare i dati.
- **CRIT-08** NumberInput: svuotare un campo scrive subito 0 e impedisce di iniziare a digitare un numero
  negativo.
  → I campi numerici tengono una bozza locale: si può svuotare il campo, scrivere "1," o un segno meno. Il valore
  si salva solo quando è un numero valido.

#### Rilievo respinto dall'audit

- **TAX-14** Destinazione parziale del TFR (25/50/75%) offerta a tutti, ma ammessa solo ai 'vecchi iscritti';
  adesione automatica 2026 assente.
  → Respinto in verifica: le quote parziali sono ammesse se il CCNL o il fondo prevedono una quota minima. La v2 lo
  spiega con l'informazione `tfrPartialCheckContract`.

### Limiti noti

Le semplificazioni del modello, per esempio i coefficienti di trasformazione fissi, la rendita del fondo non
rivalutata, gli strumenti solo ad accumulazione e una sola persona senza familiari, sono elencate in
[docs/METODOLOGIA.md](docs/METODOLOGIA.md#16-semplificazioni-e-limiti-noti).

## 1.0.0 — 2026-08-15

Prima versione pubblica, "FIRE Wealth Simulator" (commit `51eee8d`; in `package.json` la versione era `0.1.0`).

- Simulatore di accumulo del patrimonio, da 1 a 50 anni, con fasi salariali in anni, RAL, mensilità e risparmio
  mensile inserito a mano.
- Premio con tassazione agevolata o ordinaria, TFR in azienda o nel fondo, fondo pensione con contributi del
  dipendente e del datore e reinvestimento del rimborso IRPEF.
- Bucket di investimento con rendimento atteso, TER e aliquota; imposta di bollo; patrimonio lordo e netto di
  imposte latenti; vista reale o nominale.
- Grafici di crescita e composizione, card del flusso di cassa mensile, allocazione, tabella anno per anno, KPI
  (patrimonio finale, IRR).
- Scenari multipli salvati in `localStorage`, interfaccia in italiano e inglese, manifest PWA (il service worker
  non veniva mai registrato: vedi UI-10).
- Next.js 14, React 18, Tailwind CSS, framer-motion, Recharts, Vitest.

I problemi di questa versione sono documentati in [docs/AUDIT-v1.md](docs/AUDIT-v1.md) e risolti nella 2.0.0.
