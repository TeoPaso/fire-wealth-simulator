# FIRE Planner Italia

**A che età posso smettere di lavorare?**

FIRE Planner Italia è un pianificatore FIRE (*Financial Independence, Retire Early*) per lavoratori dipendenti
del settore privato in Italia. Parte dalla tua busta paga, dalle tue spese e da quello che hai già messo da
parte, applica le regole fiscali e previdenziali italiane del 2026 e simula la tua vita anno per anno, fino
all'età che scegli come orizzonte. Così trova l'età più bassa in cui puoi smettere di lavorare senza restare
senza soldi.

Tutto gira nel browser: niente server, niente account, niente tracciamento. I dati restano nel tuo dispositivo.

> Strumento educativo, non consulenza finanziaria. Leggi le [avvertenze](#avvertenze).

## Le domande a cui risponde

1. **A che età posso smettere di lavorare?** È l'*età FI* (indipendenza finanziaria): la prima età in cui,
   smettendo di lavorare, i soldi a cui puoi accedere bastano fino alla fine dell'orizzonte, con le ipotesi
   medie. In più c'è l'età in cui la probabilità di successo Monte Carlo raggiunge il tuo obiettivo (90% se non
   lo cambi).
2. **Quanto posso fidarmi?** La probabilità di successo all'età di ritiro, i percentili del patrimonio nel
   tempo e le età in cui il denaro finisce negli scenari sfavorevoli.
3. **Cosa sposta di più il risultato?** Un'analisi di sensibilità: di quanto cambia l'età FI se cambiano
   rendimenti, inflazione, spese, stipendio, spese da ritirato, orizzonte o pensione INPS.
4. **Dove vanno i miei soldi ogni anno?** Lordo → INPS → IRPEF e addizionali → netto → spese → risparmi →
   fondo di emergenza, investimenti e fondo pensione. Da ritirato: pensioni, prelievi e tasse.

## Funzionalità

**Lavoro e busta paga (regole 2026)**
- Carriera a fasi: RAL in euro di oggi, aumento reale annuo, mensilità, premio annuo, contributi al fondo
  pensione e quota di TFR al fondo, diversi per ogni fase.
- Busta paga completa calcolata dal motore: contributi INPS (9,19%, più l'1% oltre la prima fascia, fino al
  massimale), IRPEF a scaglioni 23/33/43%, detrazioni per lavoro dipendente, cuneo fiscale (somma esente e
  ulteriore detrazione), trattamento integrativo, addizionali regionale e comunale.
- Deduzione dei contributi al fondo pensione entro il limite di 5.300 € l'anno, che comprende anche il
  contributo del datore. Il risparmio d'imposta è già nel netto in busta paga: non c'è un "rimborso" contato due
  volte.
- Quattro regimi per il premio: premio di produttività (imposta sostitutiva dell'1% fino a 5.000 € nel
  2026–2027, con contributi INPS, tetto e limite di reddito), tassato come stipendio, versato al fondo pensione,
  welfare aziendale.

**TFR, fondo pensione e pensione INPS**
- TFR lasciato in azienda (rivalutazione 1,5% + 75% dell'inflazione, imposta del 17% sulla rivalutazione,
  tassazione separata alla fine del rapporto) oppure versato al fondo.
- Fondo pensione: costi, imposta sui rendimenti (20%, 12,5% sulla quota in titoli di Stato), imposta in uscita
  dal 15% al 9% in base agli anni di iscrizione, e tre modalità di accesso: alla pensione (capitale fino al 50% +
  rendita), RITA (rendita anticipata) e riscatto totale per inoccupazione.
- Pensione INPS con il calcolo contributivo (montante, rivalutazione, coefficienti di trasformazione 2027–2028)
  o con un importo netto stimato da te.

**Piano FIRE**
- Patrimonio *accessibile* (liquidità e investimenti) separato da quello *bloccato* (fondo pensione e TFR in
  azienda): il denaro bloccato non viene mai usato prima che si sblocchi.
- Spese mensili, spese da ritirato in % di quelle attuali, eventi di vita (casa, auto, figli, eredità…), fondo
  di emergenza in mesi di spesa.
- Decumulo realistico: vendite al netto delle tasse sulle plusvalenze, costo fiscale per strumento, bollo,
  costi annui (TER), ribilanciamento con i flussi o annuale.
- Strategie di prelievo a spese costanti o con *guardrail* (taglio delle spese negli anni difficili).
- Età FI, numero FIRE (spese annue ÷ tasso di prelievo sicuro) e avanzamento, anni di "ponte" tra il ritiro e
  il primo sblocco (fondo pensione o pensione INPS).
- Simulazione Monte Carlo con rendimenti lognormali correlati e inflazione casuale, riproducibile con un seme.
- Analisi di sensibilità su sette ipotesi.

**Uso quotidiano**
- Importi inseriti in euro di oggi; risultati mostrati in euro di oggi o in euro nominali.
- Più piani: crea da un esempio, duplica, rinomina, elimina, confronta.
- Validazione chiara: ogni errore o avviso compare accanto al campo che lo causa. Nessun dato viene "corretto"
  di nascosto.
- Tutte le regole fiscali sono modificabili (sezione avanzata), con la fonte di ogni valore e il ripristino dei
  valori 2026.
- Interfaccia in italiano e in inglese.
- App installabile (PWA) che funziona anche offline.
- Esportazione e importazione dei piani in JSON. I dati della versione precedente vengono convertiti
  automaticamente.

## Avvio rapido

Requisiti: [Node.js](https://nodejs.org/) 22.12 o successivo e npm.

```bash
git clone https://github.com/TeoPaso/fire-wealth-simulator.git
cd fire-wealth-simulator
npm install
npm run dev        # http://localhost:3000
```

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo con ricaricamento automatico. Il service worker non è attivo in sviluppo. |
| `npm test` | Tutti i test unitari (Vitest). |
| `npm run test:watch` | Test in modalità watch. |
| `npm run test:coverage` | Test con report di copertura (in `coverage/`). |
| `npm run typecheck` | Controllo dei tipi TypeScript. |
| `npm run lint` | ESLint. |
| `npm run build` | Build di produzione: sito statico nella cartella `out/`. |
| `npm run e2e` | Smoke test end-to-end nel browser (Playwright) sulla build di produzione. |

### Pubblicazione

`npm run build` produce un sito completamente statico in `out/`: puoi pubblicarlo su qualunque hosting
statico (GitHub Pages, Netlify, Cloudflare Pages, un server nginx…). Non serve un server Node: `next start` non
si usa con questa configurazione (`output: 'export'`).

- **Pubblica il sito alla radice di un'origine dedicata solo a questa app**: un dominio o sottodominio tuo (per
  esempio `https://fire.example.it/`). Manifest, service worker e risorse usano percorsi assoluti (`/manifest.json`,
  `/sw.js`, `/_next/…`).
- **Evita un'origine condivisa** come la radice `https://utente.github.io/`: tutti i progetti dello stesso utente
  (`https://utente.github.io/altro-progetto/`) condividono l'origine, quindi anche il `localStorage` con i tuoi piani,
  e il service worker registrato alla radice controllerebbe le loro pagine. Il service worker risponde solo alla
  pagina dell'app (`/` e `/index.html`), ma lo spazio dei dati resta comune. Su GitHub Pages usa un dominio
  personalizzato. Per una sottocartella, come `https://utente.github.io/repository/`, devi impostare `basePath` in
  `next.config.mjs` e adattare i percorsi in `public/manifest.json` e nella registrazione del service worker
  (`app/components/pwa/ServiceWorker.tsx`).
- **Netlify / Cloudflare Pages:** comando di build `npm run build`, cartella da pubblicare `out`. Usa sempre
  `npm run build` (non `npx next build`): dopo la build `scripts/sw-precache.mjs` scrive in `out/sw.js` l'elenco dei
  file da tenere offline e la versione della cache.
- **GitHub Pages:** pubblica il contenuto di `out/` con una GitHub Action (`actions/upload-pages-artifact` e
  `actions/deploy-pages`). Se invece pubblichi da un branch, aggiungi in `out/` un file vuoto `.nojekyll`:
  senza questo file Jekyll ignora la cartella `_next/`.
- **Prova locale della build:** `python3 -m http.server --directory out 8080` e apri `http://localhost:8080`.

### PWA e uso offline

Nella build di produzione l'app registra un service worker (`public/sw.js`). Dopo la prima visita online
funziona anche senza connessione e si può installare dal menu del browser ("Installa app" o "Aggiungi alla
schermata Home"). Il service worker richiede HTTPS (oppure `localhost`).

- **Cosa tiene offline.** Dopo `npm run build`, `scripts/sw-precache.mjs` inserisce in `out/sw.js` l'elenco di
  tutti i file della build (`out/_next/static/**`, manifest, icone) e una versione calcolata dal contenuto della
  build: alla prima visita il service worker li scarica tutti. In più la pagina gli comunica i file che ha già
  caricato, così anche una build senza elenco funziona offline dopo una sola visita.
- **Aggiornamenti.** La pagina viene chiesta prima alla rete: quando pubblichi una nuova versione, gli utenti la
  ricevono al primo caricamento online. Ogni build ha una cache nuova (il nome contiene la versione) e le cache e i
  file delle build precedenti vengono cancellati: non c'è nessuna versione da aggiornare a mano.
- **Rete lenta o sito in errore.** Se la rete non risponde entro 4 secondi, o il sito risponde con un errore 5xx,
  l'app parte dalla copia in cache: i dati sono comunque nel browser.

## Come si usa

L'app parte con tre piani di esempio: *Base*, *Prudente* e *Ottimista*. Descrivono la stessa persona con
ipotesi di mercato diverse. Duplica un esempio o creane uno nuovo dal selettore del piano nell'intestazione, poi
compila le sezioni del pannello **Dati** nell'ordine. Finché usi un piano di esempio, in cima al pannello un
riquadro ricorda che descrive una persona immaginaria ed elenca i quattro dati essenziali da cambiare (età,
stipendio, spese, patrimonio), con un segno di spunta quando li hai cambiati. **Tutti gli importi si inseriscono
in euro di oggi**: la crescita con l'inflazione la calcola l'app.

1. **Profilo.** Età attuale, orizzonte del piano (l'età fino a cui simulare: scegli un valore prudente, per
   esempio 95 anni) e anno di partenza. Se cambi l'età attuale, l'app propone di spostare dello stesso numero di
   anni le età di fine delle fasi di carriera (con la possibilità di annullare).
2. **Lavoro e carriera.** Una fase per ogni periodo della tua carriera, definita dall'età a cui finisce. Per ogni
   fase indica RAL, aumento reale annuo (oltre l'inflazione), mensilità, premio lordo annuo e come lo ricevi, il
   tuo contributo e quello del datore al fondo pensione (in % della RAL) e la quota di TFR al fondo. L'anteprima
   mostra il netto in busta paga calcolato dal motore.
3. **Spese ed eventi.** Spese mensili attuali, affitto o mutuo compresi. Spese dopo il ritiro, in % di quelle
   attuali. Eventi straordinari: importo positivo per una spesa, negativo per un'entrata, una volta sola o per più
   anni.
4. **Patrimonio attuale.** Conto corrente e deposito; investimenti attuali, ciascuno con il valore e il *costo
   fiscale* (prezzo medio di carico × quantità); fondo pensione (saldo, parte tassabile, anno di prima
   iscrizione); TFR in azienda e anni di servizio; anni di contributi INPS e montante contributivo, che trovi
   nell'estratto conto INPS (0 = stima automatica).
5. **Investimenti.** Gli strumenti del portafoglio: tipo, peso obiettivo (la somma deve fare 100%), rendimento
   atteso (nominale, composto, prima dei costi), volatilità, costo annuo (TER) e tassa sui guadagni (26% per le
   azioni; per gli ETF obbligazionari una media tra 12,5% e 26%). Poi i mesi del fondo di emergenza, il tipo di
   ribilanciamento e la correlazione tra azioni e obbligazioni.
6. **Fondo pensione e TFR.** Se usi un fondo, il comparto (rendimento, volatilità, costo ISC, quota in titoli
   di Stato), quando lo ricevi (alla pensione, RITA o riscatto per inoccupazione) e gli eventuali versamenti
   extra (nessuno, fino al limite deducibile, importo fisso).
7. **Pensione INPS.** Calcolo contributivo o importo netto stimato (per esempio dal servizio INPS "La mia
   pensione futura"), età di richiesta, crescita reale del PIL e adeguamento all'inflazione.
8. **Ritiro e prelievi.** Età di ritiro automatica (l'età FI) o fissa, per vedere cosa succede a una certa età.
   Tasso di prelievo sicuro (SWR) per il numero FIRE e strategia di prelievo.

Due sezioni facoltative:
- **Mercato e simulazione:** inflazione attesa e sua volatilità, interesse sulla liquidità, numero di
  simulazioni Monte Carlo, probabilità di successo richiesta, seme casuale.
- **Regole fiscali (avanzate):** tutti i parametri di legge, con la fonte e il ripristino dei valori 2026.

Ogni sezione chiusa mostra un riepilogo di una riga. Gli **errori** (per esempio pesi che non sommano a 100%)
fermano il calcolo e sono elencati in alto, con un collegamento al campo. Gli **avvisi** e le **informazioni**
non fermano il calcolo. Il piano viene salvato anche quando contiene errori, così puoi correggerlo con calma.

Nel pannello **Risultati** trovi, affiancate, l'età FI nello scenario medio e quella con la probabilità
richiesta, seguite da un giudizio colorato sulla probabilità di successo rispetto al tuo obiettivo; poi il
numero FIRE, il patrimonio accessibile e bloccato nel tempo (con le zone di spese non coperte), il grafico Monte
Carlo del patrimonio accessibile, i flussi e la busta paga di ogni anno, la tabella anno per anno, la
sensibilità, il confronto tra piani e le ipotesi con le fonti. Con un'età di ritiro fissa il riquadro risponde a
"posso smettere a quell'età?". Se i soldi finiscono mentre lavori ancora (per esempio per un acquisto più grande
dei risparmi accessibili), il riquadro lo dice con l'età e l'importo che manca, invece di "età FI non
raggiungibile". Monte Carlo e sensibilità si aggiornano in background poco dopo ogni modifica. Con il selettore **€ di oggi / Nominale** nell'intestazione
scegli come vedere gli importi. Su schermi stretti, dati e risultati sono due schede separate.

Come vengono fatti i calcoli, con formule e fonti: [docs/METODOLOGIA.md](docs/METODOLOGIA.md).

## Novità rispetto alla v1

La v2 è una riscrittura completa. La v1 calcolava solo l'accumulo del patrimonio. La v2 risponde alla domanda
"quando posso smettere di lavorare?" e risolve i problemi trovati dall'audit della v1
([docs/AUDIT-v1.md](docs/AUDIT-v1.md)); i pochi risolti solo in parte sono indicati nel CHANGELOG. In sintesi:

- spese, età, orizzonte, pensione INPS, fase di decumulo, età FI e numero FIRE;
- importi in euro di oggi e simulazione nominale coerente, con vista reale o nominale;
- patrimonio bloccato separato da quello accessibile, con le vere regole di accesso al fondo pensione;
- regole fiscali 2026 corrette, complete e modificabili, con le fonti (TFR, tetto di deducibilità con il
  datore, premio di risultato all'1%, imposta del 17% sulla rivalutazione del TFR, imposta in uscita del fondo
  per anni di iscrizione);
- Monte Carlo e analisi di sensibilità;
- nessuna perdita di dati: i piani non validi vengono salvati come bozze, i dati illeggibili vanno in un
  backup, i dati della v1 vengono convertiti;
- PWA funzionante, traduzione inglese completa, accessibilità migliorata, dipendenze aggiornate.

L'elenco completo è nel [CHANGELOG](CHANGELOG.md).

## Struttura del progetto

```
app/                      Interfaccia (Next.js App Router, solo lato client)
  layout.tsx, page.tsx    Pagina unica; la shell viene caricata solo nel browser
  components/
    shell/                Intestazione, selettore del piano, menu, layout, schede mobili
    inputs/               Pannello "Dati": sezioni, campi e modelli (model/)
    results/              Pannello "Risultati"
    ui/                   Componenti di base (campi, pulsanti, schede, finestre di dialogo…)
    pwa/                  Registrazione del service worker
  workers/                Web Worker che esegue Monte Carlo e sensibilità senza bloccare l'interfaccia
lib/
  engine/                 Motore di calcolo: TypeScript puro, senza React né DOM
    types.ts              Contratto condiviso tra motore e UI (piano, regole, risultati)
    rules/it2026.ts       Regole fiscali e previdenziali 2026, con le fonti
    defaults.ts           Piano predefinito e piani di esempio
    tax/                  IRPEF, busta paga, pensione, TFR, fondo pensione
    simulate.ts           Simulazione anno per anno
    portfolio.ts          Acquisti, vendite con costo fiscale, ribilanciamento
    fire.ts               Età FI, riepilogo e totali (runPlan)
    paths.ts, random.ts   Percorsi di mercato e numeri casuali riproducibili
    montecarlo.ts         Simulazione Monte Carlo
    sensitivity.ts        Analisi di sensibilità
    validate.ts           Validazione del piano (codici dei problemi)
    migrate-v1.ts         Conversione dei dati della v1
    index.ts              API pubblica: la UI importa solo da '@/lib/engine'
  store/                  Stato dei piani, salvataggio in localStorage, importazione ed esportazione
  i18n/                   Testi in italiano e inglese, formattazione di numeri e date
public/                   Manifest, service worker, icone
tests/                    Test della UI e della parità delle traduzioni
docs/                     Specifica (SPEC.md), metodologia, audit della v1
```

## Test

```bash
npm test             # test unitari
npm run typecheck    # tipi
npm run lint         # ESLint
```

La suite (oltre 300 test con Vitest) copre:
- **busta paga 2026** su casi calcolati a mano (RAL da 9.000 a 130.000 €, cuneo fiscale, trattamento
  integrativo, soglia INPS dell'1% e massimale, tetto di deducibilità con il contributo del datore, premio di
  produttività con tetto, requisito di reddito e regole dopo il 2027);
- **TFR, fondo pensione e pensione INPS**: quota TFR del 6,907%, rivalutazione e imposta del 17%, tassazione
  separata, imposta in uscita dal 15% al 9%, imposta sui rendimenti, capitale e rendita, RITA, riscatto,
  metodo contributivo;
- **invarianti del motore**: conservazione del denaro anno per anno con rendimenti, inflazione e tasse a zero;
  interesse composto con la convenzione di metà anno; disattivare il fondo non fa mai perdere denaro; il denaro
  bloccato non viene usato prima dello sblocco; l'età FI non cresce se le spese scendono o i rendimenti salgono;
  Monte Carlo riproducibile a parità di seme;
- **validazione** con oltre 1.000 piani casuali o malformati: nessuna eccezione, e ogni piano accettato produce
  risultati finiti;
- **migrazione dalla v1**, **salvataggio** (storage corrotto, piani non validi salvati e ricaricati intatti,
  backup) e **traduzioni** (stesse chiavi in italiano e inglese, nessuna chiave mancante nella UI).

`npm run e2e` esegue uno smoke test nel browser sulla build di produzione (lancia prima `npm run build`): serve
`out/` con un piccolo server locale e controlla caricamento senza errori in console, età FI visibile, Monte Carlo
nel Web Worker, esportazione JSON, numeri mostrati uguali a quelli del motore (età FI, numero FIRE, patrimonio al
ritiro, busta paga = `computePayroll`, valori reali = nominali / indice dei prezzi), modifica delle spese che
cambia l'età FI e resta dopo il ricaricamento, service worker attivo e funzionamento offline (anche all'avvio a
freddo, in un browser nuovo, dopo una sola visita online), interfaccia inglese senza parole italiane, nessuno
scorrimento orizzontale a 375 e 1440 px, nessun errore in console per tutta la prova. Prima di servire `out/`
esegue `scripts/sw-precache.mjs`, quindi funziona anche dopo `npx next build`. Richiede il pacchetto `playwright` con
Chromium e Node ≥ 22.18 (legge il motore TypeScript direttamente dai sorgenti). Con `E2E_SHOTS=<cartella>`
salva anche gli screenshot.

## Privacy

- Tutti i calcoli avvengono nel tuo browser. L'app non ha server, account, cookie né statistiche di utilizzo,
  e non invia i tuoi dati da nessuna parte. Il font è incluso nel sito al momento della
  build: anche lui non viene scaricato da servizi esterni.
- I piani sono salvati solo nel `localStorage` del browser (chiave `fire-planner:v2`). Se i dati salvati sono
  illeggibili, o prima di ripristinare gli esempi, l'app ne fa una copia di sicurezza nella chiave
  `fire-planner:backup:<data>` (al massimo 5 copie: la più vecchia viene sostituita). Se la copia non si può
  scrivere, il ripristino degli esempi si ferma e ti propone di esportare i piani. Da **Menu → Copie di
  sicurezza** puoi ripristinare una copia (i suoi piani si aggiungono come piani nuovi), scaricarla o eliminarla.
  I dati della v1 (chiave `fire_wealth_simulator_v1`) vengono letti per convertirli ma non vengono mai modificati.
- Un valore salvato o importato del tipo sbagliato (per esempio un numero al posto di un testo) viene sostituito
  con il valore predefinito e l'app te lo dice: i dati originali restano in una copia di sicurezza.
- Se cancelli i dati del sito, usi la navigazione privata o cambi browser o dispositivo, i piani non ci sono.
  Usa **Menu → Esporta JSON** per salvarne una copia e **Importa JSON** per caricarla altrove. L'importazione
  aggiunge sempre piani nuovi e non sostituisce quelli esistenti.
- Se apri l'app in più schede, le modifiche salvate in una scheda compaiono anche nelle altre.

## Avvertenze

- **FIRE Planner Italia è uno strumento educativo e di simulazione. Non è consulenza finanziaria, fiscale,
  legale o previdenziale.** Prima di decisioni importanti (dimissioni, adesione o riscatto di un fondo
  pensione, investimenti) confrontati con un professionista abilitato.
- I risultati sono proiezioni basate sulle ipotesi che inserisci. Rendimenti, inflazione, carriera, leggi e
  pensioni future sono incerti; i rendimenti passati non garantiscono quelli futuri.
- Le regole fiscali e previdenziali sono quelle in vigore nel **2026** (Legge di Bilancio 2026, L. 199/2025),
  verificate a novembre 2026. Ogni parametro ha la sua fonte, consultabile nell'app (sezione «Regole fiscali») e
  in [docs/METODOLOGIA.md](docs/METODOLOGIA.md). Il modello le applica anche agli anni futuri: non prevede
  riforme.
- Il modello contiene semplificazioni. L'elenco onesto è in
  [docs/METODOLOGIA.md](docs/METODOLOGIA.md#16-semplificazioni-e-limiti-noti).

## Licenza

[MIT](LICENSE).
