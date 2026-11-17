/**
 * Messages for the inputs domain ("Dati" panel): flat map, every key starts with "inputs." (docs/SPEC.md §7).
 * Help texts are plain text (shown in tooltips) and teach the concept to a non-expert in plain words.
 * Rule editor keys are generated from the TaxRules paths: `inputs.rules.field.<path>` / `inputs.rules.help.<path>`
 * (tests/inputs/taxRulesConfig.test.ts checks that every configured path has both).
 * English keys are typed against the Italian ones, so a missing or extra key fails the type check.
 */
const it = {
  /* ───────────── Panel ───────────── */
  'inputs.panel.intro': 'Inserisci i dati del tuo piano. Gli importi sono in euro di oggi.',
  'inputs.group.essentials': 'Essenziali',
  'inputs.group.essentialsHint': 'i dati che contano di più',
  'inputs.group.details': 'Dettagli',
  'inputs.group.detailsHint': 'investimenti, fondo pensione, pensione INPS, ritiro',
  'inputs.group.advanced': 'Avanzate',
  'inputs.group.advancedHint': 'lascia i valori predefiniti se non sei sicuro',
  'inputs.intro.title': 'Questo è un piano di esempio',
  'inputs.intro.body': 'Il piano «{name}» descrive una persona immaginaria: {age} anni, RAL {ral}, spese di {spending} al mese. I risultati diventano tuoi quando inserisci i tuoi dati, a partire da questi:',
  'inputs.intro.step.age': 'La tua età attuale',
  'inputs.intro.step.salary': 'Il tuo stipendio lordo annuo (RAL)',
  'inputs.intro.step.spending': 'Le tue spese mensili',
  'inputs.intro.step.wealth': 'Il tuo patrimonio attuale (conto, investimenti, fondo pensione)',
  'inputs.intro.stepDone': 'fatto',
  'inputs.intro.stepTodo': 'da fare',
  'inputs.intro.advancedHint': 'Le sezioni “Avanzate” (mercato e regole fiscali) puoi lasciarle come sono.',
  'inputs.intro.doneTitle': 'I dati principali sono tuoi',
  'inputs.intro.doneBody': 'Controlla anche carriera, fondo pensione e pensione INPS: ogni modifica aggiorna subito i risultati.',
  'inputs.intro.dismiss': 'Chiudi la guida',
  'inputs.notes.title': 'Note sul piano',
  'inputs.notes.edit': 'Modifica le note',
  'inputs.notes.editHint': 'Le note restano nel piano (anche nell’export JSON). Cancellale quando hai controllato i dati.',
  'inputs.panel.todayEurosLabel': 'euro di oggi',
  'inputs.panel.todayEurosHelp':
    'Scrivi stipendi, spese e obiettivi come li vedi oggi: 1.500 € al mese significano «quello che oggi compri con 1.500 €». Il simulatore aggiunge da solo l’inflazione anno per anno, così non devi indovinare quanto costerà la vita fra 20 anni. Saldi e patrimonio attuali sono semplicemente i valori di oggi, come li leggi negli estratti conto.',
  'inputs.panel.collapseAll': 'Chiudi tutte le sezioni',
  'inputs.panel.expandAll': 'Apri tutte le sezioni',
  'inputs.panel.errorCount.one': '1 errore',
  'inputs.panel.errorCount.other': '{count} errori',
  'inputs.panel.warningCount.one': '1 avviso',
  'inputs.panel.warningCount.other': '{count} avvisi',
  'inputs.panel.issueCount.one': '1 segnalazione',
  'inputs.panel.issueCount.other': '{count} segnalazioni',
  'inputs.panel.errorsTitle.one': '1 dato da correggere',
  'inputs.panel.errorsTitle.other': '{count} dati da correggere',
  'inputs.panel.errorsBody':
    'Finché ci sono errori i risultati non vengono ricalcolati. Quello che hai scritto resta salvato: tocca una voce per andare al campo.',
  'inputs.panel.moreErrors.one': '…e un altro errore nelle sezioni segnate in rosso.',
  'inputs.panel.moreErrors.other': '…e altri {count} errori nelle sezioni segnate in rosso.',

  'inputs.section.profile': 'Profilo',
  'inputs.section.career': 'Lavoro e carriera',
  'inputs.section.spending': 'Spese ed eventi',
  'inputs.section.wealth': 'Patrimonio attuale',
  'inputs.section.portfolio': 'Investimenti',
  'inputs.section.pensionFund': 'Fondo pensione e TFR',
  'inputs.section.statePension': 'Pensione INPS',
  'inputs.section.withdrawal': 'Ritiro e prelievi',
  'inputs.section.market': 'Mercato e simulazione',
  'inputs.section.taxRules': 'Regole fiscali (avanzate)',

  'inputs.common.moveUp': 'Sposta su: {name}',
  'inputs.common.moveDown': 'Sposta giù: {name}',
  'inputs.common.remove': 'Elimina',
  'inputs.common.removeItem': 'Elimina {name}',

  /* ───────────── Profilo ───────────── */
  'inputs.profile.currentAge': 'Età attuale',
  'inputs.profile.currentAgeHelp': 'La tua età oggi, in anni compiuti. Il piano parte da quest’anno e procede un anno alla volta.',
  'inputs.profile.lifeExpectancy': 'Orizzonte del piano',
  'inputs.profile.lifeExpectancyHelp':
    'Fino a che età vuoi che i soldi bastino. Meglio abbondare: un orizzonte di 90–95 anni ti protegge dal rischio di restare senza risparmi se vivi a lungo.',
  'inputs.profile.startYear': 'Anno di partenza',
  'inputs.profile.startYearHelp':
    'L’anno da cui parte la simulazione: la tua età attuale si riferisce a quest’anno. Le regole fiscali sono quelle del {year}: tieni lo stesso anno per coerenza.',
  'inputs.profile.summary': '{age} anni · piano fino a {horizon} · dal {year}',
  'inputs.profile.shift.body': 'Le fasi di carriera sono definite da età fisse: ora finiscono a {ages} anni. Vuoi spostarle anche loro, così che durino come prima a partire dalla tua età? Finirebbero a {shifted} anni.',
  'inputs.profile.shift.apply.one': 'Sposta le fasi di {sign}{count} anno',
  'inputs.profile.shift.apply.other': 'Sposta le fasi di {sign}{count} anni',
  'inputs.profile.shift.keep': 'Lascia così',
  'inputs.profile.shift.done': 'Fasi di carriera spostate: ora finiscono a {ages} anni.',
  'inputs.profile.shift.undo': 'Annulla',

  /* ───────────── Lavoro e carriera ───────────── */
  'inputs.career.intro':
    'Descrivi la tua carriera da dipendente a fasi. Ogni fase ha uno stipendio lordo (RAL) in euro di oggi, una crescita reale e le scelte su premio, fondo pensione e TFR. Puoi aggiungere, togliere e riordinare le fasi.',
  'inputs.career.timelineLabel': 'Fasi della carriera per età',
  'inputs.career.timelineItem': '{name}: da {from} a {to} anni',
  'inputs.career.timelineAfter': 'Dopo l’ultima fase: da {from} a {to} anni',
  'inputs.career.timelineAfterShort': 'dopo',
  'inputs.career.timelineUnavailable':
    'La linea del tempo compare quando ogni fase termina a un’età maggiore della precedente.',
  'inputs.career.emptyTitle': 'Nessuna fase di lavoro',
  'inputs.career.emptyBody': 'Aggiungi la tua situazione lavorativa attuale per stimare stipendio netto e risparmi.',
  'inputs.career.add': 'Aggiungi fase',
  'inputs.career.phaseName': 'Fase {n}',
  'inputs.career.phaseAges': 'da {from} a {to} anni',
  'inputs.career.removeTitle': 'Eliminare {name}?',
  'inputs.career.removeBody': 'La fase «{name}» e i suoi dati verranno eliminati. Le altre fasi restano come sono.',
  'inputs.career.label': 'Nome della fase',
  'inputs.career.labelHelp': 'Facoltativo: un nome per riconoscerla, ad esempio «Junior» o «Part-time».',
  'inputs.career.untilAge': 'Fino all’età di',
  'inputs.career.untilAgeHelp':
    'La fase va dalla fine della fase precedente (o da oggi) fino a quest’età esclusa. Se smetti di lavorare prima, lo stipendio si ferma all’età di ritiro.',
  'inputs.career.untilAgeDesc': 'Inizia a {from} anni.',
  'inputs.career.ralToday': 'RAL',
  'inputs.career.ralTodayHelp':
    'Retribuzione annua lorda all’inizio della fase, come nel contratto ma in euro di oggi: per una promozione fra 5 anni scrivi quanto guadagneresti oggi in quel ruolo. L’inflazione la aggiunge il simulatore.',
  'inputs.career.realRaisePct': 'Aumento reale annuo',
  'inputs.career.realRaisePctHelp':
    'Di quanto cresce lo stipendio ogni anno della fase OLTRE l’inflazione (scatti, rinnovi, merito). 0% significa che lo stipendio tiene solo il passo dei prezzi.',
  'inputs.career.mensilita': 'Mensilità',
  'inputs.career.mensilitaHelp':
    'In quante rate ti viene pagata la RAL (12, 13 o 14). Cambia solo il netto mensile mostrato qui sotto: tasse e totale annuo dipendono dalla RAL.',
  'inputs.career.bonusGrossToday': 'Premio lordo annuo',
  'inputs.career.bonusGrossTodayHelp':
    'Premio di risultato o bonus variabile lordo, in euro di oggi. Cresce insieme allo stipendio. 0 se non lo ricevi.',
  'inputs.career.bonusRegime': 'Come ricevi il premio',
  'inputs.career.bonusRegime.productivity': 'Premio di produttività (imposta agevolata)',
  'inputs.career.bonusRegime.ordinary': 'Tassato come stipendio',
  'inputs.career.bonusRegime.pensionFund': 'Versato al fondo pensione',
  'inputs.career.bonusRegime.welfare': 'Welfare aziendale (beni e servizi)',
  'inputs.career.bonusRegimeHelp':
    'Premio di produttività: fino a {cap} (al netto dei contributi INPS) paga un’imposta sostitutiva del {rate}% invece dell’IRPEF, se l’anno prima hai guadagnato al massimo {limit}; dopo il {year} si ipotizza il {afterRate}% fino a {afterCap}. Al fondo pensione: niente tasse né contributi ora e nemmeno all’uscita. Welfare: beni e servizi esentasse che riducono le tue spese. Tassato come stipendio: si somma alla RAL.',
  'inputs.career.bonusRegimeHelpNoExpiry':
    'Premio di produttività: fino a {cap} (al netto dei contributi INPS) paga un’imposta sostitutiva del {rate}% invece dell’IRPEF, se l’anno prima hai guadagnato al massimo {limit}. Al fondo pensione: niente tasse né contributi ora e nemmeno all’uscita. Welfare: beni e servizi esentasse che riducono le tue spese. Tassato come stipendio: si somma alla RAL.',
  'inputs.career.employeePensionPct': 'Tuo contributo al fondo',
  'inputs.career.employeePensionPctHelp':
    'La percentuale della RAL che versi al fondo pensione, trattenuta in busta paga. Spesso basta il minimo del contratto (1–2%) per ottenere anche il contributo del datore. È deducibile: riduce l’IRPEF che paghi.',
  'inputs.career.employerPensionPct': 'Contributo del datore',
  'inputs.career.employerPensionPctHelp':
    'La percentuale della RAL che l’azienda aggiunge al tuo fondo pensione, ma solo se versi anche tu. Sono soldi in più rispetto allo stipendio: rinunciarci è come rinunciare a un aumento.',
  'inputs.career.tfrToFundPct': 'TFR al fondo pensione',
  'inputs.career.tfrToFundPctHelp':
    'Il TFR (trattamento di fine rapporto) è una parte dello stipendio, circa il {pct}% della RAL ogni anno, che non ricevi subito. Se resta in azienda si rivaluta del {fixed}% più il {share}% dell’inflazione e ti viene pagato quando lasci il lavoro. Se va al fondo pensione viene investito ed è tassato meno all’uscita, ma resta bloccato fino all’accesso al fondo.',
  'inputs.career.tfrToFundPctDesc':
    '0% = resta in azienda, 100% = tutto al fondo. Una quota parziale è ammessa se il tuo CCNL o il fondo prevede una quota minima, o se lavori da prima del 29/04/1993. Mandare il TFR al fondo è una scelta irreversibile.',
  'inputs.career.fundDisabledNote':
    'Il fondo pensione è disattivato (sezione «Fondo pensione e TFR»): in questa fase non si versano contributi al fondo e il TFR resta in azienda.',
  'inputs.career.onlyWithFund': 'Usato solo se usi un fondo pensione.',
  'inputs.career.bonusRegime.pensionFundOff': 'Versato al fondo pensione (fondo disattivato: tassato come premio di produttività)',
  'inputs.career.netPay.title': 'Netto in busta paga a {age} anni ({year})',
  'inputs.career.netPay.help':
    'Calcolato con le regole fiscali del piano: RAL meno contributi INPS, IRPEF, addizionali e contributo al fondo pensione, più le eventuali somme esenti del cuneo fiscale. Il netto mensile non comprende il premio.',
  'inputs.career.netPay.perMonth': 'netto mensile in busta per {n} mensilità, senza premio',
  'inputs.career.netPay.noMensilita': 'al mese (mensilità non valide)',
  'inputs.career.netPay.annual': 'Netto annuo con il premio: {amount}',
  'inputs.career.netPay.marginal': 'aliquota marginale {pct}',
  'inputs.career.netPay.bonusToFund': 'Il premio va al fondo pensione: non è compreso nel netto.',
  'inputs.career.netPay.bonusWelfare': 'Il premio è in welfare: non è nel netto, ma riduce le tue spese.',
  'inputs.career.netPay.realNote': 'Importi in euro di oggi.',
  'inputs.career.netPay.nominalNote': 'Importi nominali del {year}.',
  'inputs.career.netPay.unavailable': 'Il netto in busta paga comparirà quando età, RAL e regole fiscali saranno validi.',
  'inputs.career.summaryEmpty': 'Nessuna fase di lavoro',
  'inputs.career.summaryOne': '1 fase · RAL {from}',
  'inputs.career.summaryMany': '{count} fasi · RAL da {from} a {to}',

  /* ───────────── Spese ed eventi ───────────── */
  'inputs.spending.monthlyToday': 'Spese mensili',
  'inputs.spending.monthlyTodayHelp':
    'Quanto spendi in un mese tipico mentre lavori, affitto o rata del mutuo compresi, in euro di oggi. Le spese straordinarie (casa, auto, figli) vanno negli eventi qui sotto.',
  'inputs.spending.retirementPct': 'Spese dopo il ritiro',
  'inputs.spending.retirementPctHelp':
    'Quanto spenderai dopo aver smesso di lavorare, in percentuale delle spese attuali. 100% = stesso tenore di vita; meno se, ad esempio, il mutuo sarà finito.',
  'inputs.spending.eventsTitle': 'Eventi',
  'inputs.spending.eventsHelp':
    'Spese o entrate importanti in un momento preciso, una tantum o ripetute: l’acquisto della casa, l’auto, gli studi dei figli, un’eredità. Importo positivo = spesa, negativo = entrata.',
  'inputs.spending.eventsEmptyTitle': 'Nessun evento',
  'inputs.spending.eventsEmptyBody': 'Aggiungi spese o entrate straordinarie previste (casa, auto, eredità…).',
  'inputs.spending.addEvent': 'Aggiungi evento',
  'inputs.spending.newEventLabel': 'Nuovo evento',
  'inputs.spending.eventUntitled': 'Evento {n}',
  'inputs.spending.eventOnce': 'una volta, a {age} anni',
  'inputs.spending.eventRepeated': 'dai {age} anni, per {years} anni',
  'inputs.spending.removeEventTitle': 'Eliminare l’evento?',
  'inputs.spending.removeEventBody': 'L’evento «{name}» verrà eliminato.',
  'inputs.spending.eventLabel': 'Descrizione',
  'inputs.spending.eventAge': 'Età',
  'inputs.spending.eventAgeHelp': 'L’età in cui avviene l’evento (la prima volta, se si ripete).',
  'inputs.spending.eventYears': 'Per quanti anni',
  'inputs.spending.eventYearsHelp': '1 = una volta sola; ad esempio 5 per una spesa che si ripete ogni anno per 5 anni.',
  'inputs.spending.eventAmount': 'Importo per anno',
  'inputs.spending.eventAmountHelp':
    'In euro di oggi, per ogni anno dell’evento. Positivo = spesa (ad esempio 30.000 per l’auto), negativo = entrata (ad esempio −50.000 per un’eredità).',
  'inputs.spending.amountIsExpense': 'È una spesa.',
  'inputs.spending.amountIsInflow': 'È un’entrata.',
  'inputs.spending.amountSign': 'Positivo = spesa, negativo = entrata.',
  'inputs.spending.summary': '{monthly}/mese · dopo il ritiro {pct} · eventi: {events}',

  /* ───────────── Patrimonio attuale ───────────── */
  'inputs.wealth.intro':
    'Quello che possiedi oggi, ai valori attuali. Il piano distingue i soldi disponibili (conto, investimenti) da quelli bloccati (fondo pensione, TFR in azienda), che arrivano solo più avanti.',
  'inputs.wealth.accessibleTitle': 'Liquidità',
  'inputs.wealth.cash': 'Conto corrente e deposito',
  'inputs.wealth.cashHelp':
    'I soldi liquidi su conto corrente o conto deposito. Una parte resta come fondo di emergenza (vedi «Investimenti»), il resto viene investito.',
  'inputs.wealth.holdingsTitle': 'Investimenti attuali',
  'inputs.wealth.holdingsHelp':
    'Per ogni strumento del portafoglio (sezione «Investimenti») indica il valore di mercato di oggi e il costo fiscale, cioè quanto l’hai pagato: serve a calcolare le tasse sui guadagni quando vendi.',
  'inputs.wealth.noAssets': 'Aggiungi prima gli strumenti nella sezione «Investimenti».',
  'inputs.wealth.holdingValue': 'Valore attuale',
  'inputs.wealth.holdingCostBasis': 'Costo fiscale',
  'inputs.wealth.holdingCostBasisHelp':
    'Prezzo medio di carico per quantità, come da estratto conto titoli. Se non lo conosci usa il valore attuale: nessuna plusvalenza da tassare.',
  'inputs.wealth.useValue': 'Usa il valore attuale ({value})',
  'inputs.wealth.otherHolding': 'Posizione {n}',
  'inputs.wealth.otherHoldingNote': 'Non collegata a uno strumento del portafoglio',
  'inputs.wealth.holdingAsset': 'Strumento',
  'inputs.wealth.removeHoldingTitle': 'Eliminare la posizione?',
  'inputs.wealth.removeHoldingBody': 'La posizione da {value} verrà eliminata dal patrimonio.',
  'inputs.wealth.pfTitle': 'Fondo pensione',
  'inputs.wealth.pfHelp':
    'Il saldo del fondo pensione è bloccato: lo ricevi solo alla pensione, con la RITA o con il riscatto (vedi «Fondo pensione e TFR»).',
  'inputs.wealth.pfBalance': 'Saldo attuale',
  'inputs.wealth.pfBalanceHelp': 'Il valore della tua posizione oggi, dall’area riservata o dall’ultimo estratto conto del fondo.',
  'inputs.wealth.pfTaxableBasis': 'Parte tassabile',
  'inputs.wealth.pfTaxableBasisHelp':
    'La parte del saldo che sarà tassata all’uscita: contributi dedotti, contributi del datore e TFR. I contributi non dedotti e i rendimenti (già tassati ogni anno) sono esenti. Se non lo sai, usa il saldo intero: è la stima prudente.',
  'inputs.wealth.useBalance': 'Usa il saldo ({value})',
  'inputs.wealth.pfMembershipStartYear': 'Anno di prima iscrizione',
  'inputs.wealth.pfMembershipStartYearHelp':
    'L’anno della tua prima iscrizione a un fondo pensione (contano tutti i periodi). All’uscita la tassa parte dal {max}% e scende di {step} punti per ogni anno di iscrizione oltre il {after}°, fino al {min}%.',
  'inputs.wealth.tfrTitle': 'TFR in azienda',
  'inputs.wealth.tfrHelp':
    'Il TFR già maturato e lasciato al datore di lavoro (o al Fondo di Tesoreria INPS). Ti viene pagato quando lasci il lavoro, con una tassazione separata più leggera dell’IRPEF.',
  'inputs.wealth.companyTfr': 'TFR maturato',
  'inputs.wealth.companyTfrHelp': 'Il TFR accumulato finora, come risulta dalla busta paga (voce «fondo TFR») o dalla Certificazione Unica.',
  'inputs.wealth.companyTfrYears': 'Anni di servizio',
  'inputs.wealth.companyTfrYearsHelp':
    'Gli anni di lavoro a cui si riferisce il TFR maturato: servono a calcolare l’aliquota della tassazione separata.',
  'inputs.wealth.inpsTitle': 'Contributi INPS',
  'inputs.wealth.inpsHelp':
    'I contributi versati all’INPS determinano la tua pensione pubblica. Trovi i dati nell’estratto conto contributivo sul sito INPS (MyINPS, accesso con SPID o CIE).',
  'inputs.wealth.contributionYears': 'Anni di contributi',
  'inputs.wealth.contributionYearsHelp':
    'Gli anni di contribuzione già accreditati, dall’estratto conto contributivo INPS. Contano per i requisiti della pensione (vedi «Pensione INPS»).',
  'inputs.wealth.montante': 'Montante contributivo',
  'inputs.wealth.montanteHelp':
    'La somma dei contributi versati, rivalutata: è la base del calcolo contributivo della pensione. La trovi nell’estratto conto contributivo INPS o nel servizio «La mia pensione futura». Lascia 0 se non la conosci: verrà stimata.',
  'inputs.wealth.montanteDesc': 'Leggilo dall’estratto conto INPS. Ogni anno di lavoro aggiunge circa il {rate}% della RAL. 0 = stima automatica.',
  'inputs.wealth.summary': 'Disponibile {liquid} · bloccato {locked}',

  /* ───────────── Investimenti ───────────── */
  'inputs.portfolio.intro':
    'Come investi i risparmi oltre il fondo di emergenza: scegli gli strumenti e il peso di ciascuno. I rendimenti sono ipotesi di lungo periodo, non promesse.',
  'inputs.portfolio.emergencyFundMonths': 'Fondo di emergenza',
  'inputs.portfolio.emergencyFundMonthsHelp':
    'Quanti mesi di spese tenere sempre sul conto per gli imprevisti. I risparmi riempiono prima questo cuscinetto e poi vanno negli investimenti.',
  'inputs.portfolio.assetsTitle': 'Strumenti',
  'inputs.portfolio.assetsHelp':
    'Ogni strumento (di solito un ETF) ha un peso obiettivo, un rendimento atteso, una volatilità, un costo e un’aliquota fiscale. I pesi devono sommare a 100%.',
  'inputs.portfolio.allocationComplete': 'Allocazione completa: 100%.',
  'inputs.portfolio.allocationMissing': 'Allocato {sum}%: manca il {left}%.',
  'inputs.portfolio.allocationExcess': 'Allocato {sum}%: {excess}% in più del 100%.',
  'inputs.portfolio.emptyTitle': 'Nessuno strumento',
  'inputs.portfolio.emptyBody': 'Aggiungi almeno uno strumento partendo da un modello.',
  'inputs.portfolio.add': 'Aggiungi strumento',
  'inputs.portfolio.template.equityGlobal': 'Azionario globale',
  'inputs.portfolio.template.bondAggregate': 'Obbligazionario EUR aggregate',
  'inputs.portfolio.template.govBonds': 'BTP / titoli di Stato',
  'inputs.portfolio.template.gold': 'Oro',
  'inputs.portfolio.template.moneyMarket': 'Monetario / liquidità',
  'inputs.portfolio.template.custom': 'Personalizzato',
  'inputs.portfolio.template.hint': 'Rendimento {ret} · volatilità {vol} · TER {ter} · tasse {tax}',
  'inputs.portfolio.template.customHint': 'Tutti i valori a zero, da compilare',
  'inputs.portfolio.assetUntitled': 'Strumento {n}',
  'inputs.portfolio.assetSubtitle': '{kind} · {pct}',
  'inputs.portfolio.removeTitle': 'Eliminare «{name}»?',
  'inputs.portfolio.removeBody': 'Lo strumento «{name}» verrà tolto dal portafoglio.',
  'inputs.portfolio.removeBodyHolding':
    'Lo strumento «{name}» verrà tolto dal portafoglio insieme alla posizione attuale da {value} (sezione «Patrimonio attuale»).',
  'inputs.portfolio.name': 'Nome',
  'inputs.portfolio.kindLabel': 'Tipo',
  'inputs.portfolio.kindHelp':
    'Serve alla simulazione Monte Carlo per far muovere insieme gli strumenti simili (azioni con azioni, obbligazioni con obbligazioni).',
  'inputs.portfolio.kind.equity': 'Azionario',
  'inputs.portfolio.kind.bond': 'Obbligazionario',
  'inputs.portfolio.kind.cash': 'Liquidità',
  'inputs.portfolio.kind.other': 'Altro',
  'inputs.portfolio.allocationPct': 'Peso obiettivo',
  'inputs.portfolio.allocationPctHelp': 'La quota del portafoglio da tenere in questo strumento.',
  'inputs.portfolio.expectedReturnPct': 'Rendimento atteso',
  'inputs.portfolio.expectedReturnPctHelp':
    'Rendimento medio annuo composto atteso, nominale (cioè inflazione compresa) e prima dei costi: ad esempio 6% per l’azionario globale. È un valore centrale di lungo periodo: alcuni anni andrà molto meglio, altri molto peggio.',
  'inputs.portfolio.volatilityPct': 'Volatilità',
  'inputs.portfolio.volatilityPctHelp':
    'Quanto oscilla il rendimento da un anno all’altro (deviazione standard). La usa solo la simulazione Monte Carlo: più è alta, più gli esiti possibili sono dispersi.',
  'inputs.portfolio.terPct': 'Costo annuo (TER)',
  'inputs.portfolio.terPctHelp':
    'Il costo annuo dello strumento in percentuale del valore, trattenuto dall’ETF o dal fondo. Lo trovi nel KID (documento contenente le informazioni chiave).',
  'inputs.portfolio.taxRatePct': 'Tassa sui guadagni',
  'inputs.portfolio.taxRatePctHelp':
    'Aliquota sulle plusvalenze quando vendi: {cg}% per azioni ed ETF, {gov}% per i titoli di Stato; per un ETF obbligazionario usa una media pesata (ad esempio 20%).',
  'inputs.portfolio.policyTitle': 'Regole di gestione',
  'inputs.portfolio.rebalancing': 'Ribilanciamento',
  'inputs.portfolio.rebalancingHelp':
    'Come riportare i pesi all’obiettivo quando i mercati li spostano. Con i flussi: compri ciò che è sottopeso con i nuovi risparmi e vendi ciò che è sovrappeso quando prelevi, senza vendite extra. Annuale: ogni anno vendi e compri per tornare ai pesi esatti, pagando le tasse sui guadagni realizzati.',
  'inputs.portfolio.rebalancingFlows': 'Con i flussi',
  'inputs.portfolio.rebalancingAnnual': 'Annuale',
  'inputs.portfolio.rebalancingFlowsDesc': 'I pesi si avvicinano all’obiettivo con versamenti e prelievi, senza vendite extra.',
  'inputs.portfolio.rebalancingAnnualDesc':
    'A fine anno vendi e compri per tornare ai pesi obiettivo: i guadagni realizzati sono tassati.',
  'inputs.portfolio.equityBondCorrelation': 'Correlazione azioni–obbligazioni',
  'inputs.portfolio.equityBondCorrelationHelp':
    'Quanto azioni e obbligazioni tendono a muoversi insieme, da −1 a 1. 0 = indipendenti; più è bassa, più il portafoglio è stabile. La usa solo la simulazione Monte Carlo.',
  'inputs.portfolio.summary': '{count} strumenti · {alloc}%',

  /* ───────────── Fondo pensione e TFR ───────────── */
  'inputs.pf.intro':
    'Il fondo pensione è un investimento di lungo periodo con vantaggi fiscali: i contributi si deducono dal reddito fino a {cap} l’anno (contando anche quelli del datore di lavoro, il TFR no), i rendimenti pagano meno tasse e all’uscita l’aliquota è bassa. In cambio i soldi restano bloccati fino alla pensione, alla RITA o al riscatto.',
  'inputs.pf.enabled': 'Uso un fondo pensione',
  'inputs.pf.enabledDesc': 'Contributi, premio e TFR scelti nelle fasi della carriera vanno al fondo.',
  'inputs.pf.disabledDesc': 'Nessun nuovo versamento al fondo: il TFR resta in azienda.',
  'inputs.pf.lineTitle': 'Comparto',
  'inputs.pf.name': 'Nome del fondo e del comparto',
  'inputs.pf.expectedReturnPct': 'Rendimento atteso',
  'inputs.pf.expectedReturnPctHelp':
    'Rendimento medio annuo composto atteso del comparto, nominale e prima dei costi. Riferimento COVIP: negli ultimi 10 anni i comparti bilanciati hanno reso circa il 2–3% netto l’anno; quelli azionari di più, con più oscillazioni.',
  'inputs.pf.volatilityPct': 'Volatilità',
  'inputs.pf.volatilityPctHelp':
    'Quanto oscilla il rendimento del comparto da un anno all’altro; la usa solo il Monte Carlo. Indicativamente: garantito 2–4%, bilanciato 6–9%, azionario 12–15%.',
  'inputs.pf.costPct': 'Costo annuo (ISC)',
  'inputs.pf.costPctHelp':
    'L’Indicatore Sintetico dei Costi del comparto, in percentuale del patrimonio. È nella Nota informativa del fondo; i fondi negoziali costano spesso meno dello 0,5%.',
  'inputs.pf.govBondSharePct': 'Quota in titoli di Stato',
  'inputs.pf.govBondSharePctHelp':
    'La parte del comparto investita in titoli di Stato «white list». I rendimenti del fondo sono tassati ogni anno al {yield}%, ma quelli dei titoli di Stato al {gov}%: più è alta questa quota, meno tasse.',
  'inputs.pf.govBondSharePctDesc': 'Tassa annua effettiva sui rendimenti: {pct}%.',
  'inputs.pf.equityCorrelation': 'Correlazione con le azioni',
  'inputs.pf.equityCorrelationHelp':
    'Quanto il comparto si muove insieme alle azioni del tuo portafoglio, da −1 a 1 (un comparto azionario è vicino a 1). La usa solo il Monte Carlo.',
  'inputs.pf.accessTitle': 'Quando ricevi il fondo',
  'inputs.pf.accessHelp':
    'I soldi del fondo pensione sono bloccati. Li riavrai in uno di tre modi: alla pensione (parte in capitale e parte come rendita), con la RITA (rate anticipate negli anni prima della pensione, se hai smesso di lavorare) oppure con il riscatto totale se resti a lungo senza lavoro.',
  'inputs.pf.accessMode': 'Modalità di accesso',
  'inputs.pf.accessModeHelp':
    'Come pensi di ritirare il fondo. Se smetti di lavorare molto prima della pensione, il riscatto per inoccupazione o la RITA sbloccano il fondo anni prima della prestazione ordinaria: è un dettaglio che può cambiare l’età in cui puoi smettere.',
  'inputs.pf.accessMode.retirement': 'Alla pensione (capitale + rendita)',
  'inputs.pf.accessMode.rita': 'RITA (rendita anticipata)',
  'inputs.pf.accessMode.redemption': 'Riscatto totale per inoccupazione',
  'inputs.pf.accessMode.retirementDesc':
    'Prestazione ordinaria: all’età di accesso (di norma {oldAge} anni, e mai prima di quando smetti di lavorare) ricevi fino al {max}% in capitale e il resto come rendita a vita.',
  'inputs.pf.accessMode.ritaDesc':
    'RITA (Rendita Integrativa Temporanea Anticipata): se hai smesso di lavorare, il fondo ti paga tutta la posizione a rate annuali dall’età di accesso fino alla pensione di vecchiaia ({oldAge} anni). Si può chiedere fino a {years} anni prima ({from} anni), o fino a {yearsUnemployed} anni prima ({fromUnemployed} anni) se sei disoccupato da più di 24 mesi. Le rate hanno la tassazione agevolata delle prestazioni.',
  'inputs.pf.accessMode.redemptionDesc':
    'Riscatto totale: dopo più di {after} anni senza lavoro puoi ritirare il 100% del fondo in un’unica soluzione, con la stessa tassazione agevolata delle prestazioni. Il piano lo incassa {after} anni dopo il ritiro. Non è ammesso negli ultimi {blocked} anni prima della pensione di vecchiaia ({oldAge} anni): in quel caso il piano usa la RITA da {fallback} anni. Per chi smette molto presto è spesso il modo più rapido di sbloccare il fondo.',
  'inputs.pf.accessAge': 'Età di accesso',
  'inputs.pf.accessAgeHelp':
    'L’età da cui inizi a ricevere il fondo. Alla pensione: di norma {oldAge} anni. Con la RITA: fino a {years} anni prima ({yearsUnemployed} se sei disoccupato da più di 24 mesi), purché tu abbia smesso di lavorare. Servono almeno {min} anni di iscrizione.',
  'inputs.pf.accessAgeRetirement': 'Di norma l’età della pensione di vecchiaia ({oldAge} anni).',
  'inputs.pf.accessAgeRita': 'RITA possibile da {from} anni ({fromUnemployed} se disoccupato da più di 24 mesi) fino a {oldAge}.',
  'inputs.pf.accessAgeRedemption': 'Non usata: il riscatto arriva {after} anni dopo il ritiro.',
  'inputs.pf.useRitaAge': 'Usa {age} anni (prima età RITA)',
  'inputs.pf.useOldAge': 'Usa {age} anni (età della pensione di vecchiaia)',
  'inputs.pf.capitalSharePct': 'Quota in capitale',
  'inputs.pf.capitalSharePctHelp':
    'La parte del fondo che ritiri subito in un’unica soluzione alla pensione. Per legge al massimo il {max}% (il 100% solo se la rendita sarebbe molto piccola); il resto diventa una rendita a vita.',
  'inputs.pf.capitalSharePctDesc': 'Massimo di legge: {max}%.',
  'inputs.pf.annuityRatePct': 'Tasso di conversione in rendita',
  'inputs.pf.annuityRatePctHelp':
    'Quanto ti paga ogni anno la rendita a vita, in percentuale del capitale convertito: con 4,8%, 100.000 € diventano 4.800 € l’anno. La rendita non si rivaluta con l’inflazione.',
  'inputs.pf.onlyRetirementMode': 'Usato solo con l’accesso «Alla pensione».',
  'inputs.pf.exitTaxNote':
    'Tasse all’uscita: {max}% sulla parte tassabile, ridotto di {step} punti per ogni anno di iscrizione oltre il {after}°, fino al {min}%. Molto meno dell’IRPEF che pagheresti sullo stesso stipendio.',
  'inputs.pf.voluntaryTitle': 'Contributi volontari',
  'inputs.pf.voluntaryHelp':
    'Puoi versare più del minimo in busta paga. Conviene fino al limite di deducibilità di {cap} l’anno, che comprende i tuoi contributi E quelli del datore di lavoro (il TFR no): ogni euro sotto il limite ti fa risparmiare IRPEF all’aliquota marginale.',
  'inputs.pf.voluntaryPension': 'Versamento extra',
  'inputs.pf.voluntary.none': 'Nessuno',
  'inputs.pf.voluntary.fillCap': 'Fino al limite deducibile',
  'inputs.pf.voluntary.fixed': 'Importo fisso annuo',
  'inputs.pf.voluntary.noneDesc': 'Versi solo la percentuale indicata in ogni fase.',
  'inputs.pf.voluntary.fillCapDesc': 'Ogni anno aggiungi quanto serve per arrivare a {cap} tra contributi tuoi e del datore.',
  'inputs.pf.voluntary.fixedDesc': 'Ogni anno aggiungi l’importo indicato qui accanto, in euro di oggi.',
  'inputs.pf.voluntaryPensionFixedToday': 'Importo extra annuo',
  'inputs.pf.voluntaryPensionFixedTodayHelp': 'Versamento volontario aggiuntivo ogni anno, in euro di oggi, trattenuto in busta paga.',
  'inputs.pf.tfrNote':
    'Quanta parte del TFR mandare al fondo si sceglie in ogni fase di «Lavoro e carriera». Destinarlo al fondo è una scelta irreversibile; una quota parziale è possibile solo se il tuo CCNL o il fondo prevede una quota minima, o se lavori da prima del 29/04/1993.',
  'inputs.pf.summaryOff': 'Non usato',
  'inputs.pf.summaryOn': 'Rendimento atteso {ret} · alla pensione a {age} anni, {capital} in capitale',
  'inputs.pf.summaryRita': 'Rendimento atteso {ret} · RITA da {age} anni',
  'inputs.pf.summaryRedemption': 'Rendimento atteso {ret} · riscatto {after} anni dopo il ritiro',

  /* ───────────── Pensione INPS ───────────── */
  'inputs.sp.mode': 'Come stimare la pensione',
  'inputs.sp.modeHelp':
    'Importo stimato: scrivi il netto mensile che ti aspetti, ad esempio dal servizio INPS «La mia pensione futura». Calcolo contributivo: il piano la calcola dai contributi come fa l’INPS per chi ha iniziato a lavorare dopo il 1995 (montante rivalutato × coefficiente di trasformazione dell’età).',
  'inputs.sp.modeContributivo': 'Calcolo contributivo',
  'inputs.sp.modeEstimate': 'Importo stimato',
  'inputs.sp.modeContributivoDesc':
    'Ogni anno di lavoro versi il {rate}% della RAL; il montante si rivaluta con inflazione più crescita del PIL e alla richiesta diventa pensione con il coefficiente della tua età. Se smetti prima, versi per meno anni e la pensione scende.',
  'inputs.sp.modeEstimateDesc':
    'Usa un importo netto mensile già noto, in euro di oggi. Attenzione: non cambia se anticipi il ritiro.',
  'inputs.sp.monthlyNetToday': 'Pensione netta mensile',
  'inputs.sp.monthlyNetTodayHelp': 'La pensione netta al mese che ti aspetti, in euro di oggi, pagata per {n} mensilità l’anno.',
  'inputs.sp.onlyEstimate': 'Usato solo con «Importo stimato».',
  'inputs.sp.claimAge': 'Età di richiesta',
  'inputs.sp.claimAgeHelp':
    'Quando inizi a ricevere la pensione INPS. Vecchiaia: {age} anni con almeno {years} anni di contributi; con meno contributi (almeno {fbYears}) a {fbAge} anni. Prima solo se hai i requisiti per un’uscita anticipata.',
  'inputs.sp.realGdpGrowthPct': 'Crescita reale del PIL',
  'inputs.sp.realGdpGrowthPctHelp':
    'Il montante si rivaluta ogni anno con la crescita del PIL nominale (media di 5 anni): qui indichi la parte oltre l’inflazione. Un’ipotesi prudente è 0,5–1%.',
  'inputs.sp.onlyContributivo': 'Usato solo con il calcolo contributivo.',
  'inputs.sp.indexationPct': 'Adeguamento all’inflazione',
  'inputs.sp.indexationPctHelp':
    'Quanta inflazione recupera la pensione ogni anno (perequazione). 100% = adeguamento pieno; per le pensioni più alte la legge ne riconosce meno (75–90%).',
  'inputs.sp.wealthNote': 'Anni di contributi e montante già maturati si inseriscono in «Patrimonio attuale».',
  'inputs.sp.summaryEstimate': '{amount}/mese da {age} anni',
  'inputs.sp.summaryContributivo': 'Contributivo · da {age} anni',

  /* ───────────── Ritiro e prelievi ───────────── */
  'inputs.withdrawal.mode': 'Quando smetti di lavorare',
  'inputs.withdrawal.modeHelp':
    'Automatica: il piano trova la prima età in cui puoi smettere senza finire i soldi (età FIRE). Età fissa: prova un’età che hai in mente e guarda se regge.',
  'inputs.withdrawal.modeAuto': 'Automatica',
  'inputs.withdrawal.modeFixed': 'Età fissa',
  'inputs.withdrawal.modeAutoDesc': 'Il piano cerca l’età più bassa in cui i soldi bastano fino alla fine dell’orizzonte.',
  'inputs.withdrawal.modeFixedDesc': 'Il piano simula il ritiro all’età indicata anche se i soldi non bastano: così vedi cosa succede.',
  'inputs.withdrawal.fixedAge': 'Età di ritiro',
  'inputs.withdrawal.fixedAgeHelp': 'L’età in cui smetti di lavorare nello scenario a età fissa.',
  'inputs.withdrawal.fixedAgeOnly': 'Usata solo con «Età fissa».',
  'inputs.withdrawal.withdrawalsTitle': 'Prelievi',
  'inputs.withdrawal.swrPct': 'Tasso di prelievo sicuro (SWR)',
  'inputs.withdrawal.swrPctHelp':
    'La percentuale del patrimonio che puoi prelevare il primo anno (poi adeguata all’inflazione) con buone probabilità di non finire i soldi. La famosa «regola del 4%» viene da studi USA su 30 anni: per un ritiro lungo e con le tasse italiane il 3–3,5% è più prudente. Serve a calcolare il numero FIRE di riferimento: spese annue diviso SWR.',
  'inputs.withdrawal.swrPctDesc': 'Numero FIRE: {amount} in euro di oggi (spese annue in pensione × {multiple}).',
  'inputs.withdrawal.strategyLabel': 'Strategia di prelievo',
  'inputs.withdrawal.strategyHelp':
    'Spese costanti: prelevi ogni anno quanto ti serve, adeguato all’inflazione. Guardrail: negli anni in cui prelevi troppo rispetto al patrimonio riduci le spese, per proteggere il piano nei mercati difficili.',
  'inputs.withdrawal.strategy.constantReal': 'Spese costanti (reali)',
  'inputs.withdrawal.strategy.guardrails': 'Guardrail (spese flessibili)',
  'inputs.withdrawal.guardrailCutPct': 'Taglio delle spese',
  'inputs.withdrawal.guardrailCutPctHelp':
    'Di quanto riduci le spese negli anni in cui il prelievo supera di oltre il 20% il tasso di prelievo sicuro.',
  'inputs.withdrawal.guardrailOnly': 'Usato solo con la strategia guardrail.',
  'inputs.withdrawal.summaryAuto': 'Età automatica · SWR {swr}',
  'inputs.withdrawal.summaryFixed': 'Ritiro a {age} anni · SWR {swr}',

  /* ───────────── Mercato e simulazione ───────────── */
  'inputs.market.inflationPct': 'Inflazione attesa',
  'inputs.market.inflationPctHelp':
    'L’aumento medio annuo dei prezzi (l’obiettivo della BCE è il 2%). Stipendi e spese crescono con l’inflazione; gli scaglioni IRPEF invece no, quindi paghi via via più tasse (drenaggio fiscale).',
  'inputs.market.inflationVolatilityPct': 'Volatilità dell’inflazione',
  'inputs.market.inflationVolatilityPctHelp':
    'Quanto l’inflazione varia da un anno all’altro nella simulazione Monte Carlo (ad esempio 1%). 0 = sempre uguale.',
  'inputs.market.cashRatePct': 'Interesse sulla liquidità',
  'inputs.market.cashRatePctHelp': 'Il tasso lordo annuo di conto deposito o conto corrente. Gli interessi sono tassati al {tax}%.',
  'inputs.market.monteCarloTitle': 'Simulazione Monte Carlo',
  'inputs.market.monteCarloHelp':
    'Il Monte Carlo ripete il piano molte volte con rendimenti e inflazione casuali, coerenti con le tue ipotesi, per stimare la probabilità di successo: la quota di scenari in cui i soldi bastano.',
  'inputs.market.monteCarloRuns': 'Numero di simulazioni',
  'inputs.market.monteCarloRunsHelp': 'Più simulazioni danno una stima più stabile ma un calcolo più lento. 1.000 è un buon compromesso.',
  'inputs.market.successTargetPct': 'Probabilità di successo richiesta',
  'inputs.market.successTargetPctHelp':
    'Con quale probabilità vuoi che i soldi bastino. L’età FIRE «sicura» è la prima età in cui il Monte Carlo raggiunge questo valore (ad esempio 90%).',
  'inputs.market.seed': 'Seme casuale',
  'inputs.market.seedHelp':
    'Lo stesso seme produce sempre le stesse simulazioni, così i confronti tra piani sono equi. Cambialo per vedere un altro campione di scenari.',
  'inputs.market.newSeed': 'Nuovo seme',
  'inputs.market.summary': 'Inflazione {inflation} · {runs} simulazioni · obiettivo {target}',

  /* ───────────── Regole fiscali (avanzate) ───────────── */
  'inputs.rules.intro':
    'I parametri di legge usati dal calcolo: scaglioni IRPEF, detrazioni, contributi, TFR, fondo pensione, tasse sugli investimenti e pensione INPS. Sono aggiornati al {year}: cambiali solo se sai cosa fai, ad esempio per l’addizionale della tua regione o del tuo comune. Gli importi in euro sono quelli scritti nella legge del {year}. Ogni piano ha una sua copia delle regole.',
  'inputs.rules.statusDefault': 'Valori di legge predefiniti, non modificati.',
  'inputs.rules.statusModified': 'Hai modificato alcuni valori: i risultati usano le tue regole.',
  'inputs.rules.reset': 'Ripristina valori 2026',
  'inputs.rules.resetTitle': 'Ripristinare le regole fiscali 2026?',
  'inputs.rules.resetBody':
    'Tutte le regole fiscali di questo piano torneranno ai valori di legge 2026. Le modifiche fatte in questa sezione andranno perse; gli altri dati del piano non cambiano.',
  'inputs.rules.resetConfirm': 'Ripristina',
  'inputs.rules.changedCount.one': '1 valore modificato',
  'inputs.rules.changedCount.other': '{count} valori modificati',
  'inputs.rules.unchanged': 'Valori predefiniti',
  'inputs.rules.summaryDefault': 'Valori di legge 2026',
  'inputs.rules.summaryModified': 'Regole personalizzate',
  'inputs.rules.noExpiry': 'Nessuna scadenza',
  'inputs.rules.optionalOn': 'Incluso nel calcolo.',
  'inputs.rules.optionalOff': 'Non incluso nel calcolo.',
  'inputs.rules.band.upToColumn': 'Fino a (€)',
  'inputs.rules.band.rateColumn': 'Aliquota (%)',
  'inputs.rules.band.empty': 'Nessuno scaglione.',
  'inputs.rules.band.add': 'Aggiungi scaglione',
  'inputs.rules.band.upTo': 'Scaglione {n}: limite superiore',
  'inputs.rules.band.rate': 'Scaglione {n}: aliquota',
  'inputs.rules.band.unlimitedShort': 'senza limite',
  'inputs.rules.band.remove': 'Elimina lo scaglione {n}',
  'inputs.rules.band.noLimit': 'Senza limite superiore',
  'inputs.rules.coeff.empty': 'Nessun coefficiente.',
  'inputs.rules.coeff.age': '{age} anni',
  'inputs.rules.coeff.remove': 'Elimina il coefficiente a {age} anni',
  'inputs.rules.coeff.addAge': 'Aggiungi {age} anni',
  'inputs.rules.sourcesTitle': 'Fonti',
  'inputs.rules.sourcesHelp': 'Le norme e gli approfondimenti da cui vengono i valori predefiniti. I link si aprono in una nuova scheda.',
  'inputs.rules.sourcesEmpty': 'Nessuna fonte indicata.',
  'inputs.rules.opensInNewTab': '(si apre in una nuova scheda)',

  'inputs.rules.group.general': 'Generale',
  'inputs.rules.group.irpef': 'IRPEF',
  'inputs.rules.group.employeeDeduction': 'Detrazioni per lavoro dipendente',
  'inputs.rules.group.pensionerDeduction': 'Detrazioni per redditi da pensione',
  'inputs.rules.group.cuneo': 'Cuneo fiscale',
  'inputs.rules.group.surcharges': 'Addizionali regionale e comunale',
  'inputs.rules.group.supplementaryTreatment': 'Trattamento integrativo',
  'inputs.rules.group.inps': 'Contributi INPS',
  'inputs.rules.group.productivityBonus': 'Premi di produttività',
  'inputs.rules.group.tfr': 'TFR',
  'inputs.rules.group.pensionFund': 'Fondo pensione',
  'inputs.rules.group.investments': 'Investimenti e conti',
  'inputs.rules.group.statePension': 'Pensione INPS',
  'inputs.rules.groupDesc.general': 'Identificano questo insieme di regole.',
  'inputs.rules.groupDesc.irpef':
    'L’imposta sul reddito delle persone fisiche: progressiva, a scaglioni, sul reddito complessivo.',
  'inputs.rules.groupDesc.employeeDeduction':
    'La detrazione per lavoro dipendente (art. 13 c.1 TUIR) riduce l’IRPEF lorda e diminuisce al crescere del reddito.',
  'inputs.rules.groupDesc.pensionerDeduction':
    'La detrazione per redditi da pensione (art. 13 c.3 TUIR), usata per calcolare il netto della pensione INPS.',
  'inputs.rules.groupDesc.cuneo':
    'Il cuneo fiscale (L. 207/2024): una somma esentasse per i redditi bassi e una detrazione extra per quelli medi.',
  'inputs.rules.groupDesc.surcharges': 'Le imposte locali sul reddito: dipendono dalla regione e dal comune di residenza.',
  'inputs.rules.groupDesc.supplementaryTreatment':
    'Il trattamento integrativo (DL 3/2020): una somma in busta paga per i redditi bassi.',
  'inputs.rules.groupDesc.inps': 'I contributi previdenziali del dipendente e come alimentano la pensione.',
  'inputs.rules.groupDesc.productivityBonus': 'La tassazione agevolata dei premi di risultato (L. 199/2025).',
  'inputs.rules.groupDesc.tfr': 'Come si calcola e si rivaluta il TFR lasciato in azienda (art. 2120 del codice civile).',
  'inputs.rules.groupDesc.pensionFund':
    'Deducibilità, tassazione e accesso della previdenza complementare (D.Lgs. 252/2005).',
  'inputs.rules.groupDesc.investments': 'Tasse su investimenti e conti, imposta di bollo.',
  'inputs.rules.groupDesc.statePension': 'Requisiti e coefficienti della pensione pubblica con il calcolo contributivo.',

  'inputs.rules.field.label': 'Nome delle regole',
  'inputs.rules.help.label': 'Una descrizione di queste regole, ad esempio l’anno e la legge di bilancio.',
  'inputs.rules.field.id': 'Codice',
  'inputs.rules.help.id': 'Un identificativo breve delle regole, utile nei file esportati.',
  'inputs.rules.field.referenceYear': 'Anno di riferimento',
  'inputs.rules.help.referenceYear':
    'L’anno a cui si riferiscono gli importi in euro di queste regole. Il calcolo assume che coincida con l’anno di partenza del piano.',

  'inputs.rules.field.irpef.brackets': 'Scaglioni IRPEF',
  'inputs.rules.help.irpef.brackets':
    'L’IRPEF è progressiva: ogni aliquota si applica solo alla parte di reddito che cade nel suo scaglione. Nel 2026: 23% fino a 28.000 €, 33% fino a 50.000 €, 43% oltre.',
  'inputs.rules.field.irpef.indexToInflation': 'Adegua scaglioni e detrazioni all’inflazione',
  'inputs.rules.help.irpef.indexToInflation':
    'In Italia scaglioni e detrazioni non si adeguano ai prezzi: con l’inflazione paghi via via più tasse anche senza diventare più ricco (drenaggio fiscale). Attivalo solo per ipotizzare un adeguamento futuro.',

  'inputs.rules.field.irpef.employeeDeduction.band1Limit': 'Detrazione piena fino a',
  'inputs.rules.help.irpef.employeeDeduction.band1Limit':
    'Reddito complessivo fino al quale spetta la detrazione piena per lavoro dipendente.',
  'inputs.rules.field.irpef.employeeDeduction.band1Amount': 'Detrazione piena',
  'inputs.rules.help.irpef.employeeDeduction.band1Amount':
    'L’importo della detrazione per i redditi più bassi. Una detrazione riduce l’imposta, non il reddito.',
  'inputs.rules.field.irpef.employeeDeduction.band2Limit': 'Seconda fascia fino a',
  'inputs.rules.help.irpef.employeeDeduction.band2Limit':
    'Tra il limite precedente e questo la detrazione è: base + quota variabile × (questo limite − reddito) ÷ (questo limite − limite precedente).',
  'inputs.rules.field.irpef.employeeDeduction.band2Base': 'Base della seconda fascia',
  'inputs.rules.help.irpef.employeeDeduction.band2Base':
    'La parte fissa della detrazione nella seconda fascia; è anche il valore da cui parte la terza fascia.',
  'inputs.rules.field.irpef.employeeDeduction.band2Extra': 'Quota variabile della seconda fascia',
  'inputs.rules.help.irpef.employeeDeduction.band2Extra':
    'La parte che diminuisce in modo lineare e si annulla alla fine della seconda fascia.',
  'inputs.rules.field.irpef.employeeDeduction.band3Limit': 'Detrazione azzerata a',
  'inputs.rules.help.irpef.employeeDeduction.band3Limit':
    'Oltre la seconda fascia la detrazione è base × (questo limite − reddito) ÷ (questo limite − limite della seconda fascia) e si annulla a questo reddito.',
  'inputs.rules.field.irpef.employeeDeduction.bonusFrom': 'Maggiorazione per redditi oltre',
  'inputs.rules.help.irpef.employeeDeduction.bonusFrom': 'La maggiorazione spetta ai redditi maggiori di questo importo…',
  'inputs.rules.field.irpef.employeeDeduction.bonusTo': 'Maggiorazione per redditi fino a',
  'inputs.rules.help.irpef.employeeDeduction.bonusTo': '…e fino a questo importo compreso.',
  'inputs.rules.field.irpef.employeeDeduction.bonusAmount': 'Maggiorazione',
  'inputs.rules.help.irpef.employeeDeduction.bonusAmount': 'La detrazione aggiuntiva fissa per i redditi nella fascia indicata.',

  'inputs.rules.field.irpef.pensionerDeduction.band1Limit': 'Detrazione piena fino a',
  'inputs.rules.help.irpef.pensionerDeduction.band1Limit':
    'Reddito complessivo fino al quale spetta la detrazione piena per i redditi da pensione.',
  'inputs.rules.field.irpef.pensionerDeduction.band1Amount': 'Detrazione piena',
  'inputs.rules.help.irpef.pensionerDeduction.band1Amount': 'L’importo della detrazione per le pensioni più basse.',
  'inputs.rules.field.irpef.pensionerDeduction.band2Limit': 'Seconda fascia fino a',
  'inputs.rules.help.irpef.pensionerDeduction.band2Limit':
    'Tra il limite precedente e questo la detrazione è: base + quota variabile × (questo limite − reddito) ÷ (questo limite − limite precedente).',
  'inputs.rules.field.irpef.pensionerDeduction.band2Base': 'Base della seconda fascia',
  'inputs.rules.help.irpef.pensionerDeduction.band2Base':
    'La parte fissa della detrazione nella seconda fascia; è anche il valore da cui parte la terza fascia.',
  'inputs.rules.field.irpef.pensionerDeduction.band2Extra': 'Quota variabile della seconda fascia',
  'inputs.rules.help.irpef.pensionerDeduction.band2Extra':
    'La parte che diminuisce in modo lineare e si annulla alla fine della seconda fascia.',
  'inputs.rules.field.irpef.pensionerDeduction.band3Limit': 'Detrazione azzerata a',
  'inputs.rules.help.irpef.pensionerDeduction.band3Limit':
    'Oltre la seconda fascia la detrazione scende in modo lineare e si annulla a questo reddito.',
  'inputs.rules.field.irpef.pensionerDeduction.bonusFrom': 'Maggiorazione per redditi oltre',
  'inputs.rules.help.irpef.pensionerDeduction.bonusFrom': 'La maggiorazione spetta ai redditi maggiori di questo importo…',
  'inputs.rules.field.irpef.pensionerDeduction.bonusTo': 'Maggiorazione per redditi fino a',
  'inputs.rules.help.irpef.pensionerDeduction.bonusTo': '…e fino a questo importo compreso.',
  'inputs.rules.field.irpef.pensionerDeduction.bonusAmount': 'Maggiorazione',
  'inputs.rules.help.irpef.pensionerDeduction.bonusAmount': 'La detrazione aggiuntiva fissa per i redditi nella fascia indicata.',

  'inputs.rules.field.irpef.cuneo.exemptSumBands': 'Somma esente per redditi bassi',
  'inputs.rules.help.irpef.cuneo.exemptSumBands':
    'Chi ha un reddito da lavoro fino all’ultimo limite riceve in busta paga una somma esentasse pari a una percentuale del reddito, che dipende dalla fascia (2026: 7,1% fino a 8.500 €, 5,3% fino a 15.000 €, 4,8% fino a 20.000 €). La percentuale della fascia si applica a tutto il reddito.',
  'inputs.rules.field.irpef.cuneo.extraDeductionAmount': 'Detrazione extra',
  'inputs.rules.help.irpef.cuneo.extraDeductionAmount': 'La detrazione aggiuntiva del cuneo fiscale per i redditi medi (1.000 € nel 2026).',
  'inputs.rules.field.irpef.cuneo.extraDeductionFrom': 'Detrazione extra per redditi oltre',
  'inputs.rules.help.irpef.cuneo.extraDeductionFrom': 'Spetta per redditi maggiori di questo importo.',
  'inputs.rules.field.irpef.cuneo.extraDeductionFullUpTo': 'Detrazione extra piena fino a',
  'inputs.rules.help.irpef.cuneo.extraDeductionFullUpTo': 'Fino a questo reddito la detrazione extra spetta per intero.',
  'inputs.rules.field.irpef.cuneo.extraDeductionZeroAt': 'Detrazione extra azzerata a',
  'inputs.rules.help.irpef.cuneo.extraDeductionZeroAt':
    'Oltre il limite precedente la detrazione extra scende in modo lineare e si annulla a questo reddito.',

  'inputs.rules.field.irpef.regionalSurchargeBands': 'Addizionale regionale',
  'inputs.rules.help.irpef.regionalSurchargeBands':
    'Imposta della regione sul reddito imponibile, a scaglioni come l’IRPEF. Il valore predefinito è il minimo di legge (1,23%): molte regioni applicano aliquote più alte, fino a circa il 3,33%. Inserisci gli scaglioni della tua regione.',
  'inputs.rules.field.irpef.municipalSurchargePct': 'Addizionale comunale',
  'inputs.rules.help.irpef.municipalSurchargePct':
    'L’aliquota del tuo comune, applicata a tutto il reddito imponibile (di solito fino allo 0,8%). La trovi sul sito del comune o del Ministero dell’Economia.',
  'inputs.rules.field.irpef.municipalExemptionThreshold': 'Esenzione comunale fino a',
  'inputs.rules.help.irpef.municipalExemptionThreshold':
    'Molti comuni esentano i redditi fino a una soglia: sotto questo importo l’addizionale comunale è zero. 0 = nessuna esenzione.',

  'inputs.rules.field.irpef.supplementaryTreatment': 'Trattamento integrativo (ex bonus Renzi)',
  'inputs.rules.help.irpef.supplementaryTreatment':
    'Una somma esentasse in busta paga per i redditi bassi: spetta fino a un limite di reddito se l’IRPEF lorda supera la detrazione per lavoro dipendente meno un piccolo margine. Il caso tra 15.000 e 28.000 € dipende da altre detrazioni e non è modellato.',
  'inputs.rules.field.irpef.supplementaryTreatment.amount': 'Importo annuo',
  'inputs.rules.help.irpef.supplementaryTreatment.amount': 'La somma annua pagata in busta paga (1.200 € nel 2026).',
  'inputs.rules.field.irpef.supplementaryTreatment.incomeLimit': 'Limite di reddito',
  'inputs.rules.help.irpef.supplementaryTreatment.incomeLimit': 'Spetta per redditi complessivi fino a questo importo.',
  'inputs.rules.field.irpef.supplementaryTreatment.capacityMargin': 'Margine di capienza',
  'inputs.rules.help.irpef.supplementaryTreatment.capacityMargin':
    'Spetta se l’IRPEF lorda supera la detrazione per lavoro dipendente diminuita di questo importo.',

  'inputs.rules.field.inps.employeeRatePct': 'Contributi a carico del dipendente',
  'inputs.rules.help.inps.employeeRatePct':
    'La percentuale della retribuzione trattenuta in busta paga per i contributi previdenziali (9,19% nella maggior parte dei casi).',
  'inputs.rules.field.inps.additionalRatePct': 'Contributo aggiuntivo',
  'inputs.rules.help.inps.additionalRatePct': 'Punti percentuali in più sulla parte di retribuzione oltre la soglia qui sotto.',
  'inputs.rules.field.inps.additionalThreshold': 'Soglia del contributo aggiuntivo',
  'inputs.rules.help.inps.additionalThreshold':
    'La retribuzione annua oltre la quale si paga il contributo aggiuntivo (prima fascia di retribuzione pensionabile). È aggiornata ogni anno.',
  'inputs.rules.field.inps.ceiling': 'Massimale contributivo',
  'inputs.rules.help.inps.ceiling':
    'Oltre questa retribuzione annua non si pagano contributi (vale per chi ha iniziato a lavorare dopo il 1995). È aggiornato ogni anno.',
  'inputs.rules.field.inps.indexThresholdsToInflation': 'Adegua soglia e massimale all’inflazione',
  'inputs.rules.help.inps.indexThresholdsToInflation':
    'Per legge la soglia e il massimale INPS si rivalutano ogni anno con i prezzi: lascialo attivo.',
  'inputs.rules.field.inps.pensionAccrualRatePct': 'Aliquota di computo',
  'inputs.rules.help.inps.pensionAccrualRatePct':
    'La percentuale della retribuzione che alimenta il montante della pensione contributiva (33% per i dipendenti): comprende anche la parte pagata dal datore di lavoro.',

  'inputs.rules.field.productivityBonus.ratePct': 'Imposta sostitutiva',
  'inputs.rules.help.productivityBonus.ratePct':
    'L’aliquota agevolata sui premi di risultato, al posto di IRPEF e addizionali (1% per i premi del 2026 e del 2027).',
  'inputs.rules.field.productivityBonus.cap': 'Tetto agevolato',
  'inputs.rules.help.productivityBonus.cap':
    'L’importo massimo di premio tassato con l’aliquota agevolata, misurato al netto dei contributi INPS. La parte in più è tassata come stipendio.',
  'inputs.rules.field.productivityBonus.priorYearIncomeLimit': 'Limite di reddito dell’anno prima',
  'inputs.rules.help.productivityBonus.priorYearIncomeLimit':
    'L’agevolazione spetta solo se nell’anno precedente il reddito da lavoro dipendente non ha superato questo importo.',
  'inputs.rules.field.productivityBonus.validUntilYear': 'Valida fino al',
  'inputs.rules.help.productivityBonus.validUntilYear':
    'L’ultimo anno con l’aliquota e il tetto qui sopra; dopo si applicano i valori «dopo la scadenza». Con «Nessuna scadenza» valgono sempre.',
  'inputs.rules.field.productivityBonus.afterRatePct': 'Imposta dopo la scadenza',
  'inputs.rules.help.productivityBonus.afterRatePct': 'L’aliquota ipotizzata dopo l’ultimo anno indicato (il regime ordinario prevede il 10%).',
  'inputs.rules.field.productivityBonus.afterCap': 'Tetto dopo la scadenza',
  'inputs.rules.help.productivityBonus.afterCap': 'Il tetto agevolato ipotizzato dopo la scadenza (3.000 € nel regime ordinario).',

  'inputs.rules.field.tfr.divisor': 'Divisore della quota annua',
  'inputs.rules.help.tfr.divisor':
    'La quota annua di TFR è la retribuzione divisa per questo numero (13,5 per il codice civile), cioè circa il 7,4%.',
  'inputs.rules.field.tfr.contributionPct': 'Contributo sottratto alla quota',
  'inputs.rules.help.tfr.contributionPct':
    'Un contributo dello 0,50% della retribuzione viene sottratto dalla quota annua: il TFR netto è quindi circa il 6,91% della RAL.',
  'inputs.rules.field.tfr.revalFixedPct': 'Rivalutazione fissa',
  'inputs.rules.help.tfr.revalFixedPct': 'Il TFR lasciato in azienda si rivaluta ogni anno di questa percentuale fissa…',
  'inputs.rules.field.tfr.revalInflationSharePct': 'Quota di inflazione',
  'inputs.rules.help.tfr.revalInflationSharePct': '…più questa percentuale dell’inflazione dell’anno.',
  'inputs.rules.field.tfr.revalTaxPct': 'Imposta sulla rivalutazione',
  'inputs.rules.help.tfr.revalTaxPct': 'L’imposta sostitutiva pagata ogni anno sulla rivalutazione del TFR lasciato in azienda.',

  'inputs.rules.field.pensionFund.deductionCap': 'Limite di deducibilità',
  'inputs.rules.help.pensionFund.deductionCap':
    'Il massimo che puoi dedurre ogni anno: contributi tuoi più quelli del datore di lavoro (il TFR non conta). È 5.300 € dal 2026 e non si adegua all’inflazione. Esempio: se il datore versa 1.000 €, a te restano 4.300 € deducibili.',
  'inputs.rules.field.pensionFund.yieldTaxPct': 'Tassa sui rendimenti',
  'inputs.rules.help.pensionFund.yieldTaxPct':
    'L’imposta annua sui rendimenti netti del fondo, più bassa di quella sugli investimenti normali.',
  'inputs.rules.field.pensionFund.govBondYieldTaxPct': 'Tassa sui rendimenti da titoli di Stato',
  'inputs.rules.help.pensionFund.govBondYieldTaxPct': 'Sui rendimenti dei titoli di Stato «white list» l’aliquota è ridotta.',
  'inputs.rules.field.pensionFund.exitTaxMaxPct': 'Tassa massima all’uscita',
  'inputs.rules.help.pensionFund.exitTaxMaxPct':
    'L’aliquota sulle prestazioni (capitale, rendita, RITA, riscatto per inoccupazione) per chi ha pochi anni di iscrizione.',
  'inputs.rules.field.pensionFund.exitTaxMinPct': 'Tassa minima all’uscita',
  'inputs.rules.help.pensionFund.exitTaxMinPct': 'L’aliquota non scende sotto questo valore, per quanti anni tu sia iscritto.',
  'inputs.rules.field.pensionFund.exitTaxReductionPerYearPct': 'Riduzione per anno di iscrizione',
  'inputs.rules.help.pensionFund.exitTaxReductionPerYearPct':
    'I punti di aliquota in meno per ogni anno di iscrizione oltre la soglia qui sotto.',
  'inputs.rules.field.pensionFund.exitTaxReductionAfterYears': 'Riduzione a partire da',
  'inputs.rules.help.pensionFund.exitTaxReductionAfterYears': 'Gli anni di iscrizione dopo i quali la tassa all’uscita inizia a scendere.',
  'inputs.rules.field.pensionFund.earlyRedemptionTaxPct': 'Tassa su riscatti e anticipazioni',
  'inputs.rules.help.pensionFund.earlyRedemptionTaxPct':
    'L’aliquota sui riscatti per altri motivi e sulle anticipazioni non sanitarie. Le anticipazioni non sono simulate.',
  'inputs.rules.field.pensionFund.maxCapitalSharePct': 'Quota massima in capitale',
  'inputs.rules.help.pensionFund.maxCapitalSharePct': 'Alla pensione puoi ritirare in capitale al massimo questa quota; il resto diventa rendita.',
  'inputs.rules.field.pensionFund.minMembershipYears': 'Anni minimi di iscrizione',
  'inputs.rules.help.pensionFund.minMembershipYears': 'Gli anni di partecipazione richiesti per la prestazione pensionistica e per la RITA.',
  'inputs.rules.field.pensionFund.ritaMaxYearsEarly': 'RITA: anni di anticipo',
  'inputs.rules.help.pensionFund.ritaMaxYearsEarly':
    'Con la RITA puoi ricevere il fondo fino a questo numero di anni prima della pensione di vecchiaia, se hai smesso di lavorare.',
  'inputs.rules.field.pensionFund.ritaMaxYearsEarlyUnemployed': 'RITA: anni di anticipo da disoccupato',
  'inputs.rules.help.pensionFund.ritaMaxYearsEarlyUnemployed': 'L’anticipo massimo se sei disoccupato da più di 24 mesi.',
  'inputs.rules.field.pensionFund.redemptionAfterUnemployedYears': 'Riscatto: anni senza lavoro',
  'inputs.rules.help.pensionFund.redemptionAfterUnemployedYears':
    'Il riscatto totale per inoccupazione si può chiedere dopo più di questi anni senza lavoro (oltre 48 mesi).',
  'inputs.rules.field.pensionFund.redemptionBlockedYearsBeforeOldAge': 'Riscatto: anni esclusi prima della pensione',
  'inputs.rules.help.pensionFund.redemptionBlockedYearsBeforeOldAge':
    'Il riscatto per inoccupazione non è ammesso in questi ultimi anni prima dei requisiti della pensione di vecchiaia: lì si usa la RITA.',

  'inputs.rules.field.investments.capitalGainsPct': 'Tassa su guadagni finanziari',
  'inputs.rules.help.investments.capitalGainsPct': 'L’aliquota sui guadagni di azioni, ETF e fondi.',
  'inputs.rules.field.investments.govBondPct': 'Tassa sui titoli di Stato',
  'inputs.rules.help.investments.govBondPct': 'L’aliquota agevolata per BTP e titoli di Stato «white list».',
  'inputs.rules.field.investments.stampDutyPct': 'Imposta di bollo sugli investimenti',
  'inputs.rules.help.investments.stampDutyPct':
    'Il bollo annuo sul valore del dossier titoli (IVAFE per gli investimenti all’estero), pagato ogni anno anche senza vendere.',
  'inputs.rules.field.investments.cashStampDuty': 'Bollo sul conto corrente',
  'inputs.rules.help.investments.cashStampDuty': 'L’imposta fissa annua sul conto corrente…',
  'inputs.rules.field.investments.cashStampDutyThreshold': 'Bollo dovuto oltre una giacenza di',
  'inputs.rules.help.investments.cashStampDutyThreshold': '…dovuta solo se la giacenza media supera questo importo.',
  'inputs.rules.field.investments.cashInterestTaxPct': 'Tassa sugli interessi',
  'inputs.rules.help.investments.cashInterestTaxPct': 'L’aliquota sugli interessi di conti correnti e conti deposito.',

  'inputs.rules.field.statePension.oldAgeAge': 'Età della pensione di vecchiaia',
  'inputs.rules.help.statePension.oldAgeAge':
    'L’età della pensione di vecchiaia (67 anni nel 2026; aumenterà con la speranza di vita).',
  'inputs.rules.field.statePension.oldAgeMinYears': 'Contributi minimi per la vecchiaia',
  'inputs.rules.help.statePension.oldAgeMinYears': 'Gli anni di contributi necessari per la pensione di vecchiaia.',
  'inputs.rules.field.statePension.fallbackAge': 'Età della pensione con pochi contributi',
  'inputs.rules.help.statePension.fallbackAge':
    'Con meno anni di contributi, chi rientra nel sistema contributivo può andare in pensione a questa età…',
  'inputs.rules.field.statePension.fallbackMinYears': 'Contributi minimi a quell’età',
  'inputs.rules.help.statePension.fallbackMinYears': '…con almeno questi anni di contributi effettivi.',
  'inputs.rules.field.statePension.installmentsPerYear': 'Mensilità della pensione',
  'inputs.rules.help.statePension.installmentsPerYear': 'Le rate in cui la pensione è pagata ogni anno (13, con la tredicesima).',
  'inputs.rules.field.statePension.transformationCoefficients': 'Coefficienti di trasformazione',
  'inputs.rules.help.statePension.transformationCoefficients':
    'La percentuale del montante contributivo che diventa pensione lorda annua, secondo l’età in cui la chiedi: più tardi vai in pensione, più alto è il coefficiente. Sono aggiornati ogni due anni in base alla speranza di vita.',
};

const en: Record<keyof typeof it, string> = {
  /* ───────────── Panel ───────────── */
  'inputs.panel.intro': 'Enter your plan data. Amounts are in today’s euros.',
  'inputs.group.essentials': 'Essentials',
  'inputs.group.essentialsHint': 'the inputs that matter most',
  'inputs.group.details': 'Details',
  'inputs.group.detailsHint': 'investments, pension fund, state pension, retirement',
  'inputs.group.advanced': 'Advanced',
  'inputs.group.advancedHint': 'keep the defaults if unsure',
  'inputs.intro.title': 'This is an example plan',
  'inputs.intro.body': 'The plan “{name}” describes a fictional person: aged {age}, gross salary {ral}, spending {spending} a month. The results become yours once you enter your own data, starting with these:',
  'inputs.intro.step.age': 'Your current age',
  'inputs.intro.step.salary': 'Your gross annual salary (RAL)',
  'inputs.intro.step.spending': 'Your monthly spending',
  'inputs.intro.step.wealth': 'Your current savings (accounts, investments, pension fund)',
  'inputs.intro.stepDone': 'done',
  'inputs.intro.stepTodo': 'to do',
  'inputs.intro.advancedHint': 'You can leave the “Advanced” sections (market and tax rules) as they are.',
  'inputs.intro.doneTitle': 'The main inputs are yours',
  'inputs.intro.doneBody': 'Also check your career, pension fund and state pension: every change updates the results right away.',
  'inputs.intro.dismiss': 'Close the guide',
  'inputs.notes.title': 'Plan notes',
  'inputs.notes.edit': 'Edit notes',
  'inputs.notes.editHint': 'Notes stay with the plan (also in the JSON export). Clear them once you have checked the data.',
  'inputs.panel.todayEurosLabel': 'today’s euros',
  'inputs.panel.todayEurosHelp':
    'Write salaries, expenses and goals as you see them today: €1,500 a month means “what €1,500 buys today”. The simulator adds inflation year by year, so you do not have to guess what life will cost in 20 years. Current balances and wealth are simply today’s values, as shown on your statements.',
  'inputs.panel.collapseAll': 'Collapse all sections',
  'inputs.panel.expandAll': 'Expand all sections',
  'inputs.panel.errorCount.one': '1 error',
  'inputs.panel.errorCount.other': '{count} errors',
  'inputs.panel.warningCount.one': '1 warning',
  'inputs.panel.warningCount.other': '{count} warnings',
  'inputs.panel.issueCount.one': '1 issue',
  'inputs.panel.issueCount.other': '{count} issues',
  'inputs.panel.errorsTitle.one': '1 value to fix',
  'inputs.panel.errorsTitle.other': '{count} values to fix',
  'inputs.panel.errorsBody':
    'Results are not recalculated while there are errors. What you typed stays saved: select an item to go to its field.',
  'inputs.panel.moreErrors.one': '…and one more error in the sections marked in red.',
  'inputs.panel.moreErrors.other': '…and {count} more errors in the sections marked in red.',

  'inputs.section.profile': 'Profile',
  'inputs.section.career': 'Work and career',
  'inputs.section.spending': 'Expenses and events',
  'inputs.section.wealth': 'Current wealth',
  'inputs.section.portfolio': 'Investments',
  'inputs.section.pensionFund': 'Pension fund and TFR',
  'inputs.section.statePension': 'INPS state pension',
  'inputs.section.withdrawal': 'Retirement and withdrawals',
  'inputs.section.market': 'Market and simulation',
  'inputs.section.taxRules': 'Tax rules (advanced)',

  'inputs.common.moveUp': 'Move up: {name}',
  'inputs.common.moveDown': 'Move down: {name}',
  'inputs.common.remove': 'Delete',
  'inputs.common.removeItem': 'Delete {name}',

  /* ───────────── Profile ───────────── */
  'inputs.profile.currentAge': 'Current age',
  'inputs.profile.currentAgeHelp': 'Your age today, in completed years. The plan starts this year and moves one year at a time.',
  'inputs.profile.lifeExpectancy': 'Plan horizon',
  'inputs.profile.lifeExpectancyHelp':
    'Up to what age the money must last. Better to aim high: a 90–95 horizon protects you from running out of savings if you live long.',
  'inputs.profile.startYear': 'Start year',
  'inputs.profile.startYearHelp':
    'The year the simulation starts: your current age refers to this year. The tax rules are those of {year}: keep the same year for consistency.',
  'inputs.profile.summary': 'Age {age} · plan to {horizon} · from {year}',
  'inputs.profile.shift.body': 'Career phases are defined by fixed ages: they now end at {ages}. Do you want to move them too, so that they last as before starting from your age? They would end at {shifted}.',
  'inputs.profile.shift.apply.one': 'Move the phases by {sign}{count} year',
  'inputs.profile.shift.apply.other': 'Move the phases by {sign}{count} years',
  'inputs.profile.shift.keep': 'Keep them',
  'inputs.profile.shift.done': 'Career phases moved: they now end at {ages}.',
  'inputs.profile.shift.undo': 'Undo',

  /* ───────────── Work and career ───────────── */
  'inputs.career.intro':
    'Describe your career as an employee in phases. Each phase has a gross salary (RAL) in today’s euros, a real growth rate and your choices on bonus, pension fund and TFR. You can add, remove and reorder phases.',
  'inputs.career.timelineLabel': 'Career phases by age',
  'inputs.career.timelineItem': '{name}: from {from} to {to}',
  'inputs.career.timelineAfter': 'After the last phase: from {from} to {to}',
  'inputs.career.timelineAfterShort': 'after',
  'inputs.career.timelineUnavailable': 'The timeline appears when every phase ends at a higher age than the previous one.',
  'inputs.career.emptyTitle': 'No work phase',
  'inputs.career.emptyBody': 'Add your current job to estimate net salary and savings.',
  'inputs.career.add': 'Add phase',
  'inputs.career.phaseName': 'Phase {n}',
  'inputs.career.phaseAges': 'from {from} to {to}',
  'inputs.career.removeTitle': 'Delete {name}?',
  'inputs.career.removeBody': 'Phase “{name}” and its data will be deleted. The other phases stay as they are.',
  'inputs.career.label': 'Phase name',
  'inputs.career.labelHelp': 'Optional: a name to recognise it, e.g. “Junior” or “Part-time”.',
  'inputs.career.untilAge': 'Until age',
  'inputs.career.untilAgeHelp':
    'The phase runs from the end of the previous phase (or today) up to this age, excluded. If you stop working earlier, the salary stops at your retirement age.',
  'inputs.career.untilAgeDesc': 'Starts at {from}.',
  'inputs.career.ralToday': 'Gross salary (RAL)',
  'inputs.career.ralTodayHelp':
    'Gross annual salary at the start of the phase, as in your contract but in today’s euros: for a promotion in 5 years, write what that role would pay today. The simulator adds inflation.',
  'inputs.career.realRaisePct': 'Real yearly raise',
  'inputs.career.realRaisePctHelp':
    'How much the salary grows each year of the phase ABOVE inflation (seniority, renewals, merit). 0% means the salary just keeps pace with prices.',
  'inputs.career.mensilita': 'Monthly payments',
  'inputs.career.mensilitaHelp':
    'How many instalments the gross salary is paid in (12, 13 or 14). It only changes the monthly net shown below: taxes and the annual total depend on the gross salary.',
  'inputs.career.bonusGrossToday': 'Gross yearly bonus',
  'inputs.career.bonusGrossTodayHelp': 'Performance or variable bonus, gross, in today’s euros. It grows with the salary. 0 if you get none.',
  'inputs.career.bonusRegime': 'How the bonus is paid',
  'inputs.career.bonusRegime.productivity': 'Productivity bonus (reduced tax)',
  'inputs.career.bonusRegime.ordinary': 'Taxed like salary',
  'inputs.career.bonusRegime.pensionFund': 'Paid into the pension fund',
  'inputs.career.bonusRegime.welfare': 'Company welfare (goods and services)',
  'inputs.career.bonusRegimeHelp':
    'Productivity bonus: up to {cap} (net of INPS contributions) pays a {rate}% substitute tax instead of income tax, if last year you earned at most {limit}; after {year} we assume {afterRate}% up to {afterCap}. Pension fund: no tax or contributions now, and none at exit. Welfare: tax-free goods and services that lower your expenses. Taxed like salary: added to the gross salary.',
  'inputs.career.bonusRegimeHelpNoExpiry':
    'Productivity bonus: up to {cap} (net of INPS contributions) pays a {rate}% substitute tax instead of income tax, if last year you earned at most {limit}. Pension fund: no tax or contributions now, and none at exit. Welfare: tax-free goods and services that lower your expenses. Taxed like salary: added to the gross salary.',
  'inputs.career.employeePensionPct': 'Your fund contribution',
  'inputs.career.employeePensionPctHelp':
    'The share of your gross salary you pay into the pension fund, withheld from your pay. Often the contract minimum (1–2%) is enough to also get the employer’s contribution. It is deductible: it lowers your income tax.',
  'inputs.career.employerPensionPct': 'Employer contribution',
  'inputs.career.employerPensionPctHelp':
    'The share of your gross salary the company adds to your pension fund, only if you contribute too. It is money on top of your salary: giving it up is like refusing a raise.',
  'inputs.career.tfrToFundPct': 'TFR to the pension fund',
  'inputs.career.tfrToFundPctHelp':
    'The TFR (severance pay) is a part of your salary, about {pct}% of the gross salary each year, that you do not receive straight away. If it stays with the company it grows by {fixed}% plus {share}% of inflation and is paid when you leave the job. If it goes to the pension fund it is invested and taxed less at exit, but it stays locked until you access the fund.',
  'inputs.career.tfrToFundPctDesc':
    '0% = stays with the company, 100% = all to the fund. A partial share is allowed if your collective agreement (CCNL) or fund sets a minimum share, or if you have worked since before 29/04/1993. Sending the TFR to the fund cannot be undone.',
  'inputs.career.fundDisabledNote':
    'The pension fund is turned off (“Pension fund and TFR” section): in this phase nothing is paid into the fund and the TFR stays with the company.',
  'inputs.career.onlyWithFund': 'Used only if you have a pension fund.',
  'inputs.career.bonusRegime.pensionFundOff': 'Paid into the pension fund (fund turned off: taxed as a productivity bonus)',
  'inputs.career.netPay.title': 'Take-home pay at {age} ({year})',
  'inputs.career.netPay.help':
    'Computed with the plan’s tax rules: gross salary minus INPS contributions, income tax, regional and municipal surcharges and pension contribution, plus any tax-free “cuneo fiscale” sums. The monthly figure excludes the bonus.',
  'inputs.career.netPay.perMonth': 'monthly take-home pay, {n} payments, without the bonus',
  'inputs.career.netPay.noMensilita': 'per month (invalid number of payments)',
  'inputs.career.netPay.annual': 'Annual net with bonus: {amount}',
  'inputs.career.netPay.marginal': 'marginal rate {pct}',
  'inputs.career.netPay.bonusToFund': 'The bonus goes to the pension fund: it is not in the net pay.',
  'inputs.career.netPay.bonusWelfare': 'The bonus is paid as welfare: not in the net pay, but it lowers your expenses.',
  'inputs.career.netPay.realNote': 'Amounts in today’s euros.',
  'inputs.career.netPay.nominalNote': 'Nominal amounts of {year}.',
  'inputs.career.netPay.unavailable': 'Take-home pay will appear once ages, salary and tax rules are valid.',
  'inputs.career.summaryEmpty': 'No work phase',
  'inputs.career.summaryOne': '1 phase · salary {from}',
  'inputs.career.summaryMany': '{count} phases · salary {from} to {to}',

  /* ───────────── Expenses and events ───────────── */
  'inputs.spending.monthlyToday': 'Monthly expenses',
  'inputs.spending.monthlyTodayHelp':
    'What you spend in a typical month while working, rent or mortgage included, in today’s euros. One-off expenses (house, car, children) go in the events below.',
  'inputs.spending.retirementPct': 'Expenses after retiring',
  'inputs.spending.retirementPctHelp':
    'What you will spend after you stop working, as a percentage of today’s expenses. 100% = same lifestyle; less if, for example, the mortgage will be paid off.',
  'inputs.spending.eventsTitle': 'Events',
  'inputs.spending.eventsHelp':
    'Large expenses or inflows at a given time, one-off or repeated: buying a house, a car, children’s education, an inheritance. Positive amount = expense, negative = inflow.',
  'inputs.spending.eventsEmptyTitle': 'No events',
  'inputs.spending.eventsEmptyBody': 'Add expected one-off expenses or inflows (house, car, inheritance…).',
  'inputs.spending.addEvent': 'Add event',
  'inputs.spending.newEventLabel': 'New event',
  'inputs.spending.eventUntitled': 'Event {n}',
  'inputs.spending.eventOnce': 'once, at {age}',
  'inputs.spending.eventRepeated': 'from {age}, for {years} years',
  'inputs.spending.removeEventTitle': 'Delete the event?',
  'inputs.spending.removeEventBody': 'Event “{name}” will be deleted.',
  'inputs.spending.eventLabel': 'Description',
  'inputs.spending.eventAge': 'Age',
  'inputs.spending.eventAgeHelp': 'The age at which the event happens (the first time, if it repeats).',
  'inputs.spending.eventYears': 'For how many years',
  'inputs.spending.eventYearsHelp': '1 = once; e.g. 5 for an expense repeated every year for 5 years.',
  'inputs.spending.eventAmount': 'Amount per year',
  'inputs.spending.eventAmountHelp':
    'In today’s euros, for each year of the event. Positive = expense (e.g. 30,000 for a car), negative = inflow (e.g. −50,000 for an inheritance).',
  'inputs.spending.amountIsExpense': 'This is an expense.',
  'inputs.spending.amountIsInflow': 'This is an inflow.',
  'inputs.spending.amountSign': 'Positive = expense, negative = inflow.',
  'inputs.spending.summary': '{monthly}/month · after retiring {pct} · events: {events}',

  /* ───────────── Current wealth ───────────── */
  'inputs.wealth.intro':
    'What you own today, at current values. The plan separates available money (accounts, investments) from locked money (pension fund, TFR held by the employer), which only arrives later.',
  'inputs.wealth.accessibleTitle': 'Cash',
  'inputs.wealth.cash': 'Current and savings accounts',
  'inputs.wealth.cashHelp':
    'Cash on current or savings accounts. Part of it is kept as an emergency fund (see “Investments”), the rest is invested.',
  'inputs.wealth.holdingsTitle': 'Current investments',
  'inputs.wealth.holdingsHelp':
    'For each instrument of the portfolio (“Investments” section) enter today’s market value and the tax cost basis, i.e. what you paid: it is needed to compute the tax on gains when you sell.',
  'inputs.wealth.noAssets': 'First add the instruments in the “Investments” section.',
  'inputs.wealth.holdingValue': 'Current value',
  'inputs.wealth.holdingCostBasis': 'Tax cost basis',
  'inputs.wealth.holdingCostBasisHelp':
    'Average purchase price times quantity, as on your securities statement. If you do not know it, use the current value: no gain to tax.',
  'inputs.wealth.useValue': 'Use the current value ({value})',
  'inputs.wealth.otherHolding': 'Holding {n}',
  'inputs.wealth.otherHoldingNote': 'Not linked to a portfolio instrument',
  'inputs.wealth.holdingAsset': 'Instrument',
  'inputs.wealth.removeHoldingTitle': 'Delete the holding?',
  'inputs.wealth.removeHoldingBody': 'The holding worth {value} will be removed from your wealth.',
  'inputs.wealth.pfTitle': 'Pension fund',
  'inputs.wealth.pfHelp':
    'The pension fund balance is locked: you receive it only at retirement, through RITA or through a redemption (see “Pension fund and TFR”).',
  'inputs.wealth.pfBalance': 'Current balance',
  'inputs.wealth.pfBalanceHelp': 'The value of your position today, from the fund’s website or your latest statement.',
  'inputs.wealth.pfTaxableBasis': 'Taxable part',
  'inputs.wealth.pfTaxableBasisHelp':
    'The part of the balance that will be taxed at exit: deducted contributions, employer contributions and TFR. Non-deducted contributions and returns (already taxed every year) are exempt. If you do not know it, use the whole balance: it is the prudent estimate.',
  'inputs.wealth.useBalance': 'Use the balance ({value})',
  'inputs.wealth.pfMembershipStartYear': 'Year you first joined',
  'inputs.wealth.pfMembershipStartYearHelp':
    'The year you first joined a pension fund (all periods count). At exit the tax starts at {max}% and drops by {step} points for each year of membership beyond the {after}th, down to {min}%.',
  'inputs.wealth.tfrTitle': 'TFR held by the employer',
  'inputs.wealth.tfrHelp':
    'TFR already accrued and left with your employer (or the INPS Treasury Fund). It is paid when you leave the job, with a separate taxation lighter than income tax.',
  'inputs.wealth.companyTfr': 'Accrued TFR',
  'inputs.wealth.companyTfrHelp': 'The TFR accumulated so far, as shown on your payslip (“fondo TFR”) or Certificazione Unica.',
  'inputs.wealth.companyTfrYears': 'Years of service',
  'inputs.wealth.companyTfrYearsHelp':
    'The years of work the accrued TFR refers to: needed to compute the separate-taxation rate.',
  'inputs.wealth.inpsTitle': 'INPS contributions',
  'inputs.wealth.inpsHelp':
    'Contributions paid to INPS determine your state pension. You find the data in your contribution statement (estratto conto contributivo) on the INPS website (MyINPS, login with SPID or CIE).',
  'inputs.wealth.contributionYears': 'Contribution years',
  'inputs.wealth.contributionYearsHelp':
    'Contribution years already credited, from your INPS contribution statement. They count towards the pension requirements (see “INPS state pension”).',
  'inputs.wealth.montante': 'Contribution pot (montante)',
  'inputs.wealth.montanteHelp':
    'The sum of the contributions paid, revalued: the basis of the contribution-based pension. You find it in the INPS contribution statement or the “La mia pensione futura” service. Leave 0 if you do not know it: it will be estimated.',
  'inputs.wealth.montanteDesc': 'Read it from the INPS statement. Each working year adds about {rate}% of the gross salary. 0 = automatic estimate.',
  'inputs.wealth.summary': 'Available {liquid} · locked {locked}',

  /* ───────────── Investments ───────────── */
  'inputs.portfolio.intro':
    'How you invest the savings above your emergency fund: choose the instruments and the weight of each. Returns are long-term assumptions, not promises.',
  'inputs.portfolio.emergencyFundMonths': 'Emergency fund',
  'inputs.portfolio.emergencyFundMonthsHelp':
    'How many months of expenses to always keep in the account for the unexpected. Savings fill this cushion first, then go into investments.',
  'inputs.portfolio.assetsTitle': 'Instruments',
  'inputs.portfolio.assetsHelp':
    'Each instrument (usually an ETF) has a target weight, an expected return, a volatility, a cost and a tax rate. Weights must add up to 100%.',
  'inputs.portfolio.allocationComplete': 'Allocation complete: 100%.',
  'inputs.portfolio.allocationMissing': 'Allocated {sum}%: {left}% left.',
  'inputs.portfolio.allocationExcess': 'Allocated {sum}%: {excess}% over 100%.',
  'inputs.portfolio.emptyTitle': 'No instruments',
  'inputs.portfolio.emptyBody': 'Add at least one instrument from a template.',
  'inputs.portfolio.add': 'Add instrument',
  'inputs.portfolio.template.equityGlobal': 'Global equity',
  'inputs.portfolio.template.bondAggregate': 'EUR aggregate bonds',
  'inputs.portfolio.template.govBonds': 'BTP / government bonds',
  'inputs.portfolio.template.gold': 'Gold',
  'inputs.portfolio.template.moneyMarket': 'Money market / cash',
  'inputs.portfolio.template.custom': 'Custom',
  'inputs.portfolio.template.hint': 'Return {ret} · volatility {vol} · TER {ter} · tax {tax}',
  'inputs.portfolio.template.customHint': 'All values at zero, to fill in',
  'inputs.portfolio.assetUntitled': 'Instrument {n}',
  'inputs.portfolio.assetSubtitle': '{kind} · {pct}',
  'inputs.portfolio.removeTitle': 'Delete “{name}”?',
  'inputs.portfolio.removeBody': 'Instrument “{name}” will be removed from the portfolio.',
  'inputs.portfolio.removeBodyHolding':
    'Instrument “{name}” will be removed from the portfolio together with its current holding worth {value} (“Current wealth” section).',
  'inputs.portfolio.name': 'Name',
  'inputs.portfolio.kindLabel': 'Type',
  'inputs.portfolio.kindHelp':
    'Used by the Monte Carlo simulation to make similar instruments move together (stocks with stocks, bonds with bonds).',
  'inputs.portfolio.kind.equity': 'Equity',
  'inputs.portfolio.kind.bond': 'Bonds',
  'inputs.portfolio.kind.cash': 'Cash',
  'inputs.portfolio.kind.other': 'Other',
  'inputs.portfolio.allocationPct': 'Target weight',
  'inputs.portfolio.allocationPctHelp': 'The share of the portfolio to keep in this instrument.',
  'inputs.portfolio.expectedReturnPct': 'Expected return',
  'inputs.portfolio.expectedReturnPctHelp':
    'Expected average compound annual return, nominal (inflation included) and before costs: e.g. 6% for global equity. It is a long-term central value: some years will be much better, others much worse.',
  'inputs.portfolio.volatilityPct': 'Volatility',
  'inputs.portfolio.volatilityPctHelp':
    'How much the return swings from one year to the next (standard deviation). Only the Monte Carlo simulation uses it: the higher it is, the wider the possible outcomes.',
  'inputs.portfolio.terPct': 'Yearly cost (TER)',
  'inputs.portfolio.terPctHelp': 'The yearly cost of the instrument as a percentage of its value, taken by the ETF or fund. You find it in the KID.',
  'inputs.portfolio.taxRatePct': 'Tax on gains',
  'inputs.portfolio.taxRatePctHelp':
    'Tax rate on gains when you sell: {cg}% for stocks and ETFs, {gov}% for government bonds; for a bond ETF use a weighted average (e.g. 20%).',
  'inputs.portfolio.policyTitle': 'Management rules',
  'inputs.portfolio.rebalancing': 'Rebalancing',
  'inputs.portfolio.rebalancingHelp':
    'How weights are brought back to target when markets move them. With cash flows: buy what is underweight with new savings and sell what is overweight when withdrawing, with no extra sales. Yearly: every year sell and buy to get back to the exact weights, paying tax on realised gains.',
  'inputs.portfolio.rebalancingFlows': 'With cash flows',
  'inputs.portfolio.rebalancingAnnual': 'Yearly',
  'inputs.portfolio.rebalancingFlowsDesc': 'Weights move towards the target through contributions and withdrawals, with no extra sales.',
  'inputs.portfolio.rebalancingAnnualDesc': 'At year end you sell and buy to get back to the target weights: realised gains are taxed.',
  'inputs.portfolio.equityBondCorrelation': 'Stock–bond correlation',
  'inputs.portfolio.equityBondCorrelationHelp':
    'How much stocks and bonds tend to move together, from −1 to 1. 0 = independent; the lower it is, the steadier the portfolio. Only the Monte Carlo simulation uses it.',
  'inputs.portfolio.summary': '{count} instruments · {alloc}%',

  /* ───────────── Pension fund and TFR ───────────── */
  'inputs.pf.intro':
    'A pension fund is a long-term investment with tax advantages: contributions are deductible from income up to {cap} a year (employer contributions included, TFR excluded), returns pay less tax and the exit tax rate is low. In exchange the money stays locked until retirement, RITA or a redemption.',
  'inputs.pf.enabled': 'I use a pension fund',
  'inputs.pf.enabledDesc': 'Contributions, bonus and TFR chosen in the career phases go to the fund.',
  'inputs.pf.disabledDesc': 'No new payments into the fund: the TFR stays with the company.',
  'inputs.pf.lineTitle': 'Investment line',
  'inputs.pf.name': 'Fund and line name',
  'inputs.pf.expectedReturnPct': 'Expected return',
  'inputs.pf.expectedReturnPctHelp':
    'Expected average compound annual return of the line, nominal and before costs. COVIP reference: over the last 10 years balanced lines returned about 2–3% net a year; equity lines more, with bigger swings.',
  'inputs.pf.volatilityPct': 'Volatility',
  'inputs.pf.volatilityPctHelp':
    'How much the line’s return swings from year to year; only the Monte Carlo uses it. Roughly: guaranteed 2–4%, balanced 6–9%, equity 12–15%.',
  'inputs.pf.costPct': 'Yearly cost (ISC)',
  'inputs.pf.costPctHelp':
    'The line’s synthetic cost indicator (ISC), as a percentage of assets. It is in the fund’s information note; negotiated (contractual) funds often cost less than 0.5%.',
  'inputs.pf.govBondSharePct': 'Government bond share',
  'inputs.pf.govBondSharePctHelp':
    'The part of the line invested in “white list” government bonds. Fund returns are taxed every year at {yield}%, but government bond returns at {gov}%: the higher this share, the lower the tax.',
  'inputs.pf.govBondSharePctDesc': 'Effective yearly tax on returns: {pct}%.',
  'inputs.pf.equityCorrelation': 'Correlation with stocks',
  'inputs.pf.equityCorrelationHelp':
    'How much the line moves with the stocks in your portfolio, from −1 to 1 (an equity line is close to 1). Only the Monte Carlo uses it.',
  'inputs.pf.accessTitle': 'When you receive the fund',
  'inputs.pf.accessHelp':
    'Pension fund money is locked. You get it back in one of three ways: at retirement (part as a lump sum, part as an annuity), through RITA (early instalments in the years before the state pension, if you have stopped working), or through a full redemption if you stay out of work for a long time.',
  'inputs.pf.accessMode': 'Access mode',
  'inputs.pf.accessModeHelp':
    'How you plan to take the fund. If you stop working long before the state pension age, the redemption for unemployment or RITA unlock the fund years before the ordinary benefit: a detail that can change the age at which you can stop.',
  'inputs.pf.accessMode.retirement': 'At retirement (lump sum + annuity)',
  'inputs.pf.accessMode.rita': 'RITA (early temporary annuity)',
  'inputs.pf.accessMode.redemption': 'Full redemption for unemployment',
  'inputs.pf.accessMode.retirementDesc':
    'Ordinary benefit: at the access age (normally {oldAge}, and never before you stop working) you get up to {max}% as a lump sum and the rest as a lifetime annuity.',
  'inputs.pf.accessMode.ritaDesc':
    'RITA (Rendita Integrativa Temporanea Anticipata): if you have stopped working, the fund pays out your whole position in yearly instalments from the access age until the state old-age pension ({oldAge}). You can ask for it up to {years} years earlier (age {from}), or up to {yearsUnemployed} years earlier (age {fromUnemployed}) if you have been unemployed for more than 24 months. Instalments get the reduced tax rate of fund benefits.',
  'inputs.pf.accessMode.redemptionDesc':
    'Full redemption: after more than {after} years without work you can withdraw 100% of the fund in one go, with the same reduced tax as fund benefits. The plan cashes it {after} years after you retire. It is not allowed in the last {blocked} years before the old-age pension ({oldAge}): in that case the plan uses RITA from age {fallback}. For very early retirees it is often the fastest way to unlock the fund.',
  'inputs.pf.accessAge': 'Access age',
  'inputs.pf.accessAgeHelp':
    'The age from which you start receiving the fund. At retirement: normally {oldAge}. With RITA: up to {years} years earlier ({yearsUnemployed} if unemployed for more than 24 months), provided you have stopped working. At least {min} years of membership are required.',
  'inputs.pf.accessAgeRetirement': 'Normally the old-age pension age ({oldAge}).',
  'inputs.pf.accessAgeRita': 'RITA possible from {from} ({fromUnemployed} if unemployed for more than 24 months) until {oldAge}.',
  'inputs.pf.accessAgeRedemption': 'Not used: the redemption comes {after} years after you retire.',
  'inputs.pf.useRitaAge': 'Use age {age} (earliest RITA age)',
  'inputs.pf.useOldAge': 'Use age {age} (old-age pension age)',
  'inputs.pf.capitalSharePct': 'Lump-sum share',
  'inputs.pf.capitalSharePctHelp':
    'The part of the fund you take at once at retirement. By law at most {max}% (100% only if the annuity would be very small); the rest becomes a lifetime annuity.',
  'inputs.pf.capitalSharePctDesc': 'Legal maximum: {max}%.',
  'inputs.pf.annuityRatePct': 'Annuity conversion rate',
  'inputs.pf.annuityRatePctHelp':
    'What the lifetime annuity pays each year as a percentage of the converted capital: at 4.8%, €100,000 becomes €4,800 a year. The annuity is not adjusted for inflation.',
  'inputs.pf.onlyRetirementMode': 'Only used with “At retirement” access.',
  'inputs.pf.exitTaxNote':
    'Exit tax: {max}% on the taxable part, reduced by {step} points for each year of membership beyond the {after}th, down to {min}%. Much less than the income tax you would pay on the same salary.',
  'inputs.pf.voluntaryTitle': 'Voluntary contributions',
  'inputs.pf.voluntaryHelp':
    'You can pay in more than the minimum through your payslip. It pays off up to the deduction limit of {cap} a year, which includes your contributions AND your employer’s (not the TFR): every euro below the limit saves income tax at your marginal rate.',
  'inputs.pf.voluntaryPension': 'Extra contribution',
  'inputs.pf.voluntary.none': 'None',
  'inputs.pf.voluntary.fillCap': 'Up to the deductible limit',
  'inputs.pf.voluntary.fixed': 'Fixed yearly amount',
  'inputs.pf.voluntary.noneDesc': 'You only pay the percentage set in each phase.',
  'inputs.pf.voluntary.fillCapDesc': 'Every year you add what is needed to reach {cap} between your and your employer’s contributions.',
  'inputs.pf.voluntary.fixedDesc': 'Every year you add the amount entered next to this, in today’s euros.',
  'inputs.pf.voluntaryPensionFixedToday': 'Extra yearly amount',
  'inputs.pf.voluntaryPensionFixedTodayHelp': 'Additional voluntary payment each year, in today’s euros, withheld from your pay.',
  'inputs.pf.tfrNote':
    'How much of the TFR goes to the fund is set in each phase of “Work and career”. Sending it to the fund cannot be undone; a partial share is possible only if your collective agreement (CCNL) or fund sets a minimum share, or if you have worked since before 29/04/1993.',
  'inputs.pf.summaryOff': 'Not used',
  'inputs.pf.summaryOn': 'Expected return {ret} · at retirement at {age}, {capital} lump sum',
  'inputs.pf.summaryRita': 'Expected return {ret} · RITA from {age}',
  'inputs.pf.summaryRedemption': 'Expected return {ret} · redemption {after} years after retiring',

  /* ───────────── INPS state pension ───────────── */
  'inputs.sp.mode': 'How to estimate the pension',
  'inputs.sp.modeHelp':
    'Estimated amount: enter the monthly net you expect, e.g. from the INPS “La mia pensione futura” service. Contribution-based: the plan computes it from your contributions, as INPS does for people who started working after 1995 (revalued pot × transformation coefficient of your age).',
  'inputs.sp.modeContributivo': 'Contribution-based',
  'inputs.sp.modeEstimate': 'Estimated amount',
  'inputs.sp.modeContributivoDesc':
    'Each working year you pay {rate}% of your gross salary; the pot grows with inflation plus GDP growth and at claim time becomes a pension through the coefficient of your age. If you stop earlier, you pay in for fewer years and the pension is lower.',
  'inputs.sp.modeEstimateDesc': 'Uses a known monthly net amount, in today’s euros. Note: it does not change if you retire earlier.',
  'inputs.sp.monthlyNetToday': 'Monthly net pension',
  'inputs.sp.monthlyNetTodayHelp': 'The monthly net pension you expect, in today’s euros, paid {n} times a year.',
  'inputs.sp.onlyEstimate': 'Only used with “Estimated amount”.',
  'inputs.sp.claimAge': 'Claim age',
  'inputs.sp.claimAgeHelp':
    'When you start receiving the INPS pension. Old-age pension: age {age} with at least {years} years of contributions; with fewer contributions (at least {fbYears}) at {fbAge}. Earlier only if you meet the requirements for early retirement.',
  'inputs.sp.realGdpGrowthPct': 'Real GDP growth',
  'inputs.sp.realGdpGrowthPctHelp':
    'The pot is revalued every year with nominal GDP growth (5-year average): here you enter the part above inflation. A prudent assumption is 0.5–1%.',
  'inputs.sp.onlyContributivo': 'Only used with the contribution-based calculation.',
  'inputs.sp.indexationPct': 'Inflation adjustment',
  'inputs.sp.indexationPctHelp':
    'How much of inflation the pension recovers each year (perequazione). 100% = full adjustment; for higher pensions the law grants less (75–90%).',
  'inputs.sp.wealthNote': 'Contribution years and pot already accrued are entered in “Current wealth”.',
  'inputs.sp.summaryEstimate': '{amount}/month from {age}',
  'inputs.sp.summaryContributivo': 'Contribution-based · from {age}',

  /* ───────────── Retirement and withdrawals ───────────── */
  'inputs.withdrawal.mode': 'When you stop working',
  'inputs.withdrawal.modeHelp':
    'Automatic: the plan finds the earliest age at which you can stop without running out of money (FI age). Fixed age: try an age you have in mind and see whether it holds.',
  'inputs.withdrawal.modeAuto': 'Automatic',
  'inputs.withdrawal.modeFixed': 'Fixed age',
  'inputs.withdrawal.modeAutoDesc': 'The plan looks for the lowest age at which the money lasts until the end of the horizon.',
  'inputs.withdrawal.modeFixedDesc': 'The plan simulates retiring at the given age even if the money does not last: so you see what happens.',
  'inputs.withdrawal.fixedAge': 'Retirement age',
  'inputs.withdrawal.fixedAgeHelp': 'The age at which you stop working in the fixed-age scenario.',
  'inputs.withdrawal.fixedAgeOnly': 'Only used with “Fixed age”.',
  'inputs.withdrawal.withdrawalsTitle': 'Withdrawals',
  'inputs.withdrawal.swrPct': 'Safe withdrawal rate (SWR)',
  'inputs.withdrawal.swrPctHelp':
    'The percentage of your wealth you can withdraw in the first year (then adjusted for inflation) with a good chance of not running out. The famous “4% rule” comes from US studies over 30 years: for a long retirement and with Italian taxes 3–3.5% is more prudent. It sets the reference FIRE number: annual expenses divided by the SWR.',
  'inputs.withdrawal.swrPctDesc': 'FIRE number: {amount} in today’s euros (annual retirement spending × {multiple}).',
  'inputs.withdrawal.strategyLabel': 'Withdrawal strategy',
  'inputs.withdrawal.strategyHelp':
    'Constant spending: each year you withdraw what you need, adjusted for inflation. Guardrails: in years when you withdraw too much compared with your wealth you cut spending, to protect the plan in bad markets.',
  'inputs.withdrawal.strategy.constantReal': 'Constant spending (real)',
  'inputs.withdrawal.strategy.guardrails': 'Guardrails (flexible spending)',
  'inputs.withdrawal.guardrailCutPct': 'Spending cut',
  'inputs.withdrawal.guardrailCutPctHelp':
    'How much you cut spending in years when the withdrawal rate exceeds the safe rate by more than 20%.',
  'inputs.withdrawal.guardrailOnly': 'Only used with the guardrails strategy.',
  'inputs.withdrawal.summaryAuto': 'Automatic age · SWR {swr}',
  'inputs.withdrawal.summaryFixed': 'Retire at {age} · SWR {swr}',

  /* ───────────── Market and simulation ───────────── */
  'inputs.market.inflationPct': 'Expected inflation',
  'inputs.market.inflationPctHelp':
    'The average yearly rise in prices (the ECB target is 2%). Salaries and expenses grow with inflation; Italian income-tax brackets do not, so you pay progressively more tax (fiscal drag).',
  'inputs.market.inflationVolatilityPct': 'Inflation volatility',
  'inputs.market.inflationVolatilityPctHelp': 'How much inflation varies from year to year in the Monte Carlo simulation (e.g. 1%). 0 = always the same.',
  'inputs.market.cashRatePct': 'Interest on cash',
  'inputs.market.cashRatePctHelp': 'The gross yearly rate of your savings or current account. Interest is taxed at {tax}%.',
  'inputs.market.monteCarloTitle': 'Monte Carlo simulation',
  'inputs.market.monteCarloHelp':
    'The Monte Carlo repeats the plan many times with random returns and inflation, consistent with your assumptions, to estimate the probability of success: the share of scenarios in which the money lasts.',
  'inputs.market.monteCarloRuns': 'Number of runs',
  'inputs.market.monteCarloRunsHelp': 'More runs give a steadier estimate but a slower calculation. 1,000 is a good compromise.',
  'inputs.market.successTargetPct': 'Required success probability',
  'inputs.market.successTargetPctHelp':
    'How likely you want the money to last. The “confident” FI age is the first age at which the Monte Carlo reaches this value (e.g. 90%).',
  'inputs.market.seed': 'Random seed',
  'inputs.market.seedHelp':
    'The same seed always produces the same runs, so comparisons between plans are fair. Change it to see another sample of scenarios.',
  'inputs.market.newSeed': 'New seed',
  'inputs.market.summary': 'Inflation {inflation} · {runs} runs · target {target}',

  /* ───────────── Tax rules (advanced) ───────────── */
  'inputs.rules.intro':
    'The legal parameters used by the calculation: income-tax brackets, deductions, contributions, TFR, pension fund, investment taxes and the INPS pension. They are up to date for {year}: change them only if you know what you are doing, e.g. for your region’s or municipality’s surcharge. Euro amounts are those written in the {year} law. Each plan has its own copy of the rules.',
  'inputs.rules.statusDefault': 'Default legal values, not modified.',
  'inputs.rules.statusModified': 'You changed some values: results use your rules.',
  'inputs.rules.reset': 'Restore 2026 values',
  'inputs.rules.resetTitle': 'Restore the 2026 tax rules?',
  'inputs.rules.resetBody':
    'All tax rules of this plan will go back to the 2026 legal values. Changes made in this section will be lost; the rest of the plan does not change.',
  'inputs.rules.resetConfirm': 'Restore',
  'inputs.rules.changedCount.one': '1 value changed',
  'inputs.rules.changedCount.other': '{count} values changed',
  'inputs.rules.unchanged': 'Default values',
  'inputs.rules.summaryDefault': '2026 legal values',
  'inputs.rules.summaryModified': 'Custom rules',
  'inputs.rules.noExpiry': 'No expiry',
  'inputs.rules.optionalOn': 'Included in the calculation.',
  'inputs.rules.optionalOff': 'Not included in the calculation.',
  'inputs.rules.band.upToColumn': 'Up to (€)',
  'inputs.rules.band.rateColumn': 'Rate (%)',
  'inputs.rules.band.empty': 'No bands.',
  'inputs.rules.band.add': 'Add band',
  'inputs.rules.band.upTo': 'Band {n}: upper limit',
  'inputs.rules.band.rate': 'Band {n}: rate',
  'inputs.rules.band.unlimitedShort': 'no limit',
  'inputs.rules.band.remove': 'Delete band {n}',
  'inputs.rules.band.noLimit': 'No upper limit',
  'inputs.rules.coeff.empty': 'No coefficients.',
  'inputs.rules.coeff.age': 'Age {age}',
  'inputs.rules.coeff.remove': 'Delete the coefficient for age {age}',
  'inputs.rules.coeff.addAge': 'Add age {age}',
  'inputs.rules.sourcesTitle': 'Sources',
  'inputs.rules.sourcesHelp': 'The laws and explanations the default values come from. Links open in a new tab.',
  'inputs.rules.sourcesEmpty': 'No sources given.',
  'inputs.rules.opensInNewTab': '(opens in a new tab)',

  'inputs.rules.group.general': 'General',
  'inputs.rules.group.irpef': 'Income tax (IRPEF)',
  'inputs.rules.group.employeeDeduction': 'Employment income deductions',
  'inputs.rules.group.pensionerDeduction': 'Pension income deductions',
  'inputs.rules.group.cuneo': 'Tax wedge (cuneo fiscale)',
  'inputs.rules.group.surcharges': 'Regional and municipal surcharges',
  'inputs.rules.group.supplementaryTreatment': 'Supplementary payment (trattamento integrativo)',
  'inputs.rules.group.inps': 'INPS contributions',
  'inputs.rules.group.productivityBonus': 'Productivity bonuses',
  'inputs.rules.group.tfr': 'TFR',
  'inputs.rules.group.pensionFund': 'Pension fund',
  'inputs.rules.group.investments': 'Investments and accounts',
  'inputs.rules.group.statePension': 'INPS state pension',
  'inputs.rules.groupDesc.general': 'They identify this set of rules.',
  'inputs.rules.groupDesc.irpef': 'The personal income tax: progressive, by brackets, on total income.',
  'inputs.rules.groupDesc.employeeDeduction':
    'The employment income deduction (art. 13(1) TUIR) lowers gross income tax and shrinks as income grows.',
  'inputs.rules.groupDesc.pensionerDeduction':
    'The pension income deduction (art. 13(3) TUIR), used to compute the net INPS pension.',
  'inputs.rules.groupDesc.cuneo':
    'The tax wedge measures (Law 207/2024): a tax-free sum for low incomes and an extra deduction for middle incomes.',
  'inputs.rules.groupDesc.surcharges': 'Local income taxes: they depend on your region and municipality of residence.',
  'inputs.rules.groupDesc.supplementaryTreatment': 'The supplementary payment (Decree-Law 3/2020): a payslip sum for low incomes.',
  'inputs.rules.groupDesc.inps': 'Employee social security contributions and how they build the pension.',
  'inputs.rules.groupDesc.productivityBonus': 'The reduced taxation of performance bonuses (Law 199/2025).',
  'inputs.rules.groupDesc.tfr': 'How the TFR left with the employer is computed and revalued (art. 2120 Civil Code).',
  'inputs.rules.groupDesc.pensionFund': 'Deductibility, taxation and access of supplementary pensions (Legislative Decree 252/2005).',
  'inputs.rules.groupDesc.investments': 'Taxes on investments and accounts, stamp duty.',
  'inputs.rules.groupDesc.statePension': 'Requirements and coefficients of the contribution-based state pension.',

  'inputs.rules.field.label': 'Rules name',
  'inputs.rules.help.label': 'A description of these rules, e.g. the year and the budget law.',
  'inputs.rules.field.id': 'Code',
  'inputs.rules.help.id': 'A short identifier of the rules, useful in exported files.',
  'inputs.rules.field.referenceYear': 'Reference year',
  'inputs.rules.help.referenceYear':
    'The year the euro amounts of these rules refer to. The calculation assumes it is the plan’s start year.',

  'inputs.rules.field.irpef.brackets': 'Income tax brackets',
  'inputs.rules.help.irpef.brackets':
    'Income tax is progressive: each rate applies only to the part of income that falls in its bracket. In 2026: 23% up to €28,000, 33% up to €50,000, 43% above.',
  'inputs.rules.field.irpef.indexToInflation': 'Index brackets and deductions to inflation',
  'inputs.rules.help.irpef.indexToInflation':
    'In Italy brackets and deductions do not follow prices: with inflation you pay progressively more tax without becoming richer (fiscal drag). Turn it on only to assume a future adjustment.',

  'inputs.rules.field.irpef.employeeDeduction.band1Limit': 'Full deduction up to',
  'inputs.rules.help.irpef.employeeDeduction.band1Limit': 'Total income up to which the full employment deduction applies.',
  'inputs.rules.field.irpef.employeeDeduction.band1Amount': 'Full deduction',
  'inputs.rules.help.irpef.employeeDeduction.band1Amount': 'The deduction for the lowest incomes. A deduction lowers the tax, not the income.',
  'inputs.rules.field.irpef.employeeDeduction.band2Limit': 'Second band up to',
  'inputs.rules.help.irpef.employeeDeduction.band2Limit':
    'Between the previous limit and this one the deduction is: base + variable part × (this limit − income) ÷ (this limit − previous limit).',
  'inputs.rules.field.irpef.employeeDeduction.band2Base': 'Second band base',
  'inputs.rules.help.irpef.employeeDeduction.band2Base':
    'The fixed part of the deduction in the second band; it is also where the third band starts.',
  'inputs.rules.field.irpef.employeeDeduction.band2Extra': 'Second band variable part',
  'inputs.rules.help.irpef.employeeDeduction.band2Extra': 'The part that shrinks linearly and disappears at the end of the second band.',
  'inputs.rules.field.irpef.employeeDeduction.band3Limit': 'Deduction reaches zero at',
  'inputs.rules.help.irpef.employeeDeduction.band3Limit':
    'Above the second band the deduction is base × (this limit − income) ÷ (this limit − second band limit) and reaches zero at this income.',
  'inputs.rules.field.irpef.employeeDeduction.bonusFrom': 'Extra for incomes above',
  'inputs.rules.help.irpef.employeeDeduction.bonusFrom': 'The extra applies to incomes above this amount…',
  'inputs.rules.field.irpef.employeeDeduction.bonusTo': 'Extra for incomes up to',
  'inputs.rules.help.irpef.employeeDeduction.bonusTo': '…and up to this amount included.',
  'inputs.rules.field.irpef.employeeDeduction.bonusAmount': 'Extra deduction',
  'inputs.rules.help.irpef.employeeDeduction.bonusAmount': 'The fixed extra deduction for incomes in the given band.',

  'inputs.rules.field.irpef.pensionerDeduction.band1Limit': 'Full deduction up to',
  'inputs.rules.help.irpef.pensionerDeduction.band1Limit': 'Total income up to which the full pension income deduction applies.',
  'inputs.rules.field.irpef.pensionerDeduction.band1Amount': 'Full deduction',
  'inputs.rules.help.irpef.pensionerDeduction.band1Amount': 'The deduction for the lowest pensions.',
  'inputs.rules.field.irpef.pensionerDeduction.band2Limit': 'Second band up to',
  'inputs.rules.help.irpef.pensionerDeduction.band2Limit':
    'Between the previous limit and this one the deduction is: base + variable part × (this limit − income) ÷ (this limit − previous limit).',
  'inputs.rules.field.irpef.pensionerDeduction.band2Base': 'Second band base',
  'inputs.rules.help.irpef.pensionerDeduction.band2Base':
    'The fixed part of the deduction in the second band; it is also where the third band starts.',
  'inputs.rules.field.irpef.pensionerDeduction.band2Extra': 'Second band variable part',
  'inputs.rules.help.irpef.pensionerDeduction.band2Extra': 'The part that shrinks linearly and disappears at the end of the second band.',
  'inputs.rules.field.irpef.pensionerDeduction.band3Limit': 'Deduction reaches zero at',
  'inputs.rules.help.irpef.pensionerDeduction.band3Limit': 'Above the second band the deduction shrinks linearly and reaches zero at this income.',
  'inputs.rules.field.irpef.pensionerDeduction.bonusFrom': 'Extra for incomes above',
  'inputs.rules.help.irpef.pensionerDeduction.bonusFrom': 'The extra applies to incomes above this amount…',
  'inputs.rules.field.irpef.pensionerDeduction.bonusTo': 'Extra for incomes up to',
  'inputs.rules.help.irpef.pensionerDeduction.bonusTo': '…and up to this amount included.',
  'inputs.rules.field.irpef.pensionerDeduction.bonusAmount': 'Extra deduction',
  'inputs.rules.help.irpef.pensionerDeduction.bonusAmount': 'The fixed extra deduction for incomes in the given band.',

  'inputs.rules.field.irpef.cuneo.exemptSumBands': 'Tax-free sum for low incomes',
  'inputs.rules.help.irpef.cuneo.exemptSumBands':
    'Employees with employment income up to the last limit receive a tax-free sum in their payslip equal to a percentage of income, depending on the band (2026: 7.1% up to €8,500, 5.3% up to €15,000, 4.8% up to €20,000). The band’s percentage applies to the whole income.',
  'inputs.rules.field.irpef.cuneo.extraDeductionAmount': 'Extra deduction',
  'inputs.rules.help.irpef.cuneo.extraDeductionAmount': 'The extra tax-wedge deduction for middle incomes (€1,000 in 2026).',
  'inputs.rules.field.irpef.cuneo.extraDeductionFrom': 'Extra deduction for incomes above',
  'inputs.rules.help.irpef.cuneo.extraDeductionFrom': 'It applies to incomes above this amount.',
  'inputs.rules.field.irpef.cuneo.extraDeductionFullUpTo': 'Full extra deduction up to',
  'inputs.rules.help.irpef.cuneo.extraDeductionFullUpTo': 'Up to this income the extra deduction applies in full.',
  'inputs.rules.field.irpef.cuneo.extraDeductionZeroAt': 'Extra deduction reaches zero at',
  'inputs.rules.help.irpef.cuneo.extraDeductionZeroAt': 'Above the previous limit the extra deduction shrinks linearly and reaches zero at this income.',

  'inputs.rules.field.irpef.regionalSurchargeBands': 'Regional surcharge',
  'inputs.rules.help.irpef.regionalSurchargeBands':
    'The region’s tax on taxable income, by brackets like income tax. The default is the legal minimum (1.23%): many regions apply higher rates, up to about 3.33%. Enter your region’s brackets.',
  'inputs.rules.field.irpef.municipalSurchargePct': 'Municipal surcharge',
  'inputs.rules.help.irpef.municipalSurchargePct':
    'Your municipality’s rate, applied to the whole taxable income (usually up to 0.8%). You find it on the municipality’s or the Ministry of Economy’s website.',
  'inputs.rules.field.irpef.municipalExemptionThreshold': 'Municipal exemption up to',
  'inputs.rules.help.irpef.municipalExemptionThreshold':
    'Many municipalities exempt incomes up to a threshold: below this amount the municipal surcharge is zero. 0 = no exemption.',

  'inputs.rules.field.irpef.supplementaryTreatment': 'Supplementary payment (former “bonus Renzi”)',
  'inputs.rules.help.irpef.supplementaryTreatment':
    'A tax-free payslip sum for low incomes: it applies up to an income limit if gross income tax exceeds the employment deduction minus a small margin. The €15,000–28,000 case depends on other deductions and is not modelled.',
  'inputs.rules.field.irpef.supplementaryTreatment.amount': 'Yearly amount',
  'inputs.rules.help.irpef.supplementaryTreatment.amount': 'The yearly sum paid in the payslip (€1,200 in 2026).',
  'inputs.rules.field.irpef.supplementaryTreatment.incomeLimit': 'Income limit',
  'inputs.rules.help.irpef.supplementaryTreatment.incomeLimit': 'It applies to total incomes up to this amount.',
  'inputs.rules.field.irpef.supplementaryTreatment.capacityMargin': 'Tax capacity margin',
  'inputs.rules.help.irpef.supplementaryTreatment.capacityMargin':
    'It applies if gross income tax exceeds the employment deduction minus this amount.',

  'inputs.rules.field.inps.employeeRatePct': 'Employee contributions',
  'inputs.rules.help.inps.employeeRatePct':
    'The share of pay withheld from the payslip for social security contributions (9.19% in most cases).',
  'inputs.rules.field.inps.additionalRatePct': 'Additional contribution',
  'inputs.rules.help.inps.additionalRatePct': 'Extra percentage points on the part of pay above the threshold below.',
  'inputs.rules.field.inps.additionalThreshold': 'Additional contribution threshold',
  'inputs.rules.help.inps.additionalThreshold':
    'The yearly pay above which the additional contribution is due (first pensionable pay band). It is updated every year.',
  'inputs.rules.field.inps.ceiling': 'Contribution ceiling',
  'inputs.rules.help.inps.ceiling':
    'Above this yearly pay no contributions are due (for people who started working after 1995). It is updated every year.',
  'inputs.rules.field.inps.indexThresholdsToInflation': 'Index threshold and ceiling to inflation',
  'inputs.rules.help.inps.indexThresholdsToInflation': 'By law the INPS threshold and ceiling are revalued every year with prices: keep it on.',
  'inputs.rules.field.inps.pensionAccrualRatePct': 'Pension accrual rate',
  'inputs.rules.help.inps.pensionAccrualRatePct':
    'The share of pay that builds the contribution-based pension pot (33% for employees): it includes the part paid by the employer.',

  'inputs.rules.field.productivityBonus.ratePct': 'Substitute tax',
  'inputs.rules.help.productivityBonus.ratePct':
    'The reduced rate on performance bonuses, instead of income tax and surcharges (1% for bonuses paid in 2026 and 2027).',
  'inputs.rules.field.productivityBonus.cap': 'Reduced-rate cap',
  'inputs.rules.help.productivityBonus.cap':
    'The maximum bonus taxed at the reduced rate, measured net of INPS contributions. The excess is taxed like salary.',
  'inputs.rules.field.productivityBonus.priorYearIncomeLimit': 'Prior-year income limit',
  'inputs.rules.help.productivityBonus.priorYearIncomeLimit':
    'The relief applies only if the previous year’s employment income did not exceed this amount.',
  'inputs.rules.field.productivityBonus.validUntilYear': 'Valid until',
  'inputs.rules.help.productivityBonus.validUntilYear':
    'The last year with the rate and cap above; afterwards the “after expiry” values apply. With “No expiry” they always apply.',
  'inputs.rules.field.productivityBonus.afterRatePct': 'Tax after expiry',
  'inputs.rules.help.productivityBonus.afterRatePct': 'The rate assumed after the last year given (the ordinary regime has 10%).',
  'inputs.rules.field.productivityBonus.afterCap': 'Cap after expiry',
  'inputs.rules.help.productivityBonus.afterCap': 'The reduced-rate cap assumed after expiry (€3,000 in the ordinary regime).',

  'inputs.rules.field.tfr.divisor': 'Yearly accrual divisor',
  'inputs.rules.help.tfr.divisor':
    'The yearly TFR accrual is pay divided by this number (13.5 under the Civil Code), i.e. about 7.4%.',
  'inputs.rules.field.tfr.contributionPct': 'Contribution subtracted',
  'inputs.rules.help.tfr.contributionPct':
    'A 0.50% contribution on pay is subtracted from the yearly accrual: the net TFR is therefore about 6.91% of the gross salary.',
  'inputs.rules.field.tfr.revalFixedPct': 'Fixed revaluation',
  'inputs.rules.help.tfr.revalFixedPct': 'TFR left with the employer is revalued every year by this fixed percentage…',
  'inputs.rules.field.tfr.revalInflationSharePct': 'Inflation share',
  'inputs.rules.help.tfr.revalInflationSharePct': '…plus this percentage of the year’s inflation.',
  'inputs.rules.field.tfr.revalTaxPct': 'Tax on revaluation',
  'inputs.rules.help.tfr.revalTaxPct': 'The substitute tax paid every year on the revaluation of the TFR left with the employer.',

  'inputs.rules.field.pensionFund.deductionCap': 'Deduction limit',
  'inputs.rules.help.pensionFund.deductionCap':
    'The most you can deduct each year: your contributions plus your employer’s (the TFR does not count). It is €5,300 from 2026 and is not adjusted for inflation. Example: if your employer pays €1,000, you have €4,300 of deductible room left.',
  'inputs.rules.field.pensionFund.yieldTaxPct': 'Tax on returns',
  'inputs.rules.help.pensionFund.yieldTaxPct': 'The yearly tax on the fund’s net returns, lower than on ordinary investments.',
  'inputs.rules.field.pensionFund.govBondYieldTaxPct': 'Tax on government bond returns',
  'inputs.rules.help.pensionFund.govBondYieldTaxPct': 'Returns from “white list” government bonds are taxed at a reduced rate.',
  'inputs.rules.field.pensionFund.exitTaxMaxPct': 'Maximum exit tax',
  'inputs.rules.help.pensionFund.exitTaxMaxPct':
    'The rate on fund benefits (lump sum, annuity, RITA, redemption for unemployment) for members with few years of membership.',
  'inputs.rules.field.pensionFund.exitTaxMinPct': 'Minimum exit tax',
  'inputs.rules.help.pensionFund.exitTaxMinPct': 'The rate never goes below this value, however long you are a member.',
  'inputs.rules.field.pensionFund.exitTaxReductionPerYearPct': 'Reduction per year of membership',
  'inputs.rules.help.pensionFund.exitTaxReductionPerYearPct': 'Rate points removed for each year of membership beyond the threshold below.',
  'inputs.rules.field.pensionFund.exitTaxReductionAfterYears': 'Reduction starts after',
  'inputs.rules.help.pensionFund.exitTaxReductionAfterYears': 'The years of membership after which the exit tax starts to fall.',
  'inputs.rules.field.pensionFund.earlyRedemptionTaxPct': 'Tax on redemptions and advances',
  'inputs.rules.help.pensionFund.earlyRedemptionTaxPct':
    'The rate on redemptions for other reasons and on non-medical advances. Advances are not simulated.',
  'inputs.rules.field.pensionFund.maxCapitalSharePct': 'Maximum lump-sum share',
  'inputs.rules.help.pensionFund.maxCapitalSharePct': 'At retirement you can take at most this share as a lump sum; the rest becomes an annuity.',
  'inputs.rules.field.pensionFund.minMembershipYears': 'Minimum membership years',
  'inputs.rules.help.pensionFund.minMembershipYears': 'The years of membership required for the pension benefit and for RITA.',
  'inputs.rules.field.pensionFund.ritaMaxYearsEarly': 'RITA: years early',
  'inputs.rules.help.pensionFund.ritaMaxYearsEarly':
    'With RITA you can receive the fund up to this many years before the old-age pension, if you have stopped working.',
  'inputs.rules.field.pensionFund.ritaMaxYearsEarlyUnemployed': 'RITA: years early if unemployed',
  'inputs.rules.help.pensionFund.ritaMaxYearsEarlyUnemployed': 'The maximum advance if you have been unemployed for more than 24 months.',
  'inputs.rules.field.pensionFund.redemptionAfterUnemployedYears': 'Redemption: years without work',
  'inputs.rules.help.pensionFund.redemptionAfterUnemployedYears':
    'The full redemption for unemployment can be requested after more than this many years without work (over 48 months).',
  'inputs.rules.field.pensionFund.redemptionBlockedYearsBeforeOldAge': 'Redemption: years excluded before the pension',
  'inputs.rules.help.pensionFund.redemptionBlockedYearsBeforeOldAge':
    'The redemption for unemployment is not allowed in these last years before the old-age pension requirements: RITA applies there.',

  'inputs.rules.field.investments.capitalGainsPct': 'Tax on financial gains',
  'inputs.rules.help.investments.capitalGainsPct': 'The rate on gains from stocks, ETFs and funds.',
  'inputs.rules.field.investments.govBondPct': 'Tax on government bonds',
  'inputs.rules.help.investments.govBondPct': 'The reduced rate for BTPs and “white list” government bonds.',
  'inputs.rules.field.investments.stampDutyPct': 'Stamp duty on investments',
  'inputs.rules.help.investments.stampDutyPct':
    'The yearly stamp duty on the value of your securities account (IVAFE for investments abroad), paid every year even without selling.',
  'inputs.rules.field.investments.cashStampDuty': 'Stamp duty on the current account',
  'inputs.rules.help.investments.cashStampDuty': 'The fixed yearly duty on a current account…',
  'inputs.rules.field.investments.cashStampDutyThreshold': 'Due above an average balance of',
  'inputs.rules.help.investments.cashStampDutyThreshold': '…due only if the average balance exceeds this amount.',
  'inputs.rules.field.investments.cashInterestTaxPct': 'Tax on interest',
  'inputs.rules.help.investments.cashInterestTaxPct': 'The rate on interest from current and savings accounts.',

  'inputs.rules.field.statePension.oldAgeAge': 'Old-age pension age',
  'inputs.rules.help.statePension.oldAgeAge': 'The old-age pension age (67 in 2026; it will rise with life expectancy).',
  'inputs.rules.field.statePension.oldAgeMinYears': 'Minimum contributions for old age',
  'inputs.rules.help.statePension.oldAgeMinYears': 'The years of contributions needed for the old-age pension.',
  'inputs.rules.field.statePension.fallbackAge': 'Pension age with few contributions',
  'inputs.rules.help.statePension.fallbackAge':
    'With fewer contribution years, people under the contribution-based system can retire at this age…',
  'inputs.rules.field.statePension.fallbackMinYears': 'Minimum contributions at that age',
  'inputs.rules.help.statePension.fallbackMinYears': '…with at least this many years of actual contributions.',
  'inputs.rules.field.statePension.installmentsPerYear': 'Pension payments per year',
  'inputs.rules.help.statePension.installmentsPerYear': 'How many times a year the pension is paid (13, with the thirteenth payment).',
  'inputs.rules.field.statePension.transformationCoefficients': 'Transformation coefficients',
  'inputs.rules.help.statePension.transformationCoefficients':
    'The percentage of the contribution pot that becomes the yearly gross pension, depending on the age you claim it: the later you retire, the higher the coefficient. They are updated every two years with life expectancy.',
};

export const inputs = { it, en };
