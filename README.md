# 🔥 FIRE Wealth Simulator — Simulatore Finanziario & Proiezione Patrimoniale

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-1.6-green?style=flat-square&logo=vitest)](https://vitest.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange?style=flat-square)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

Un'applicazione web progressiva (**PWA**) avanzata e completamente parametrica per la simulazione del percorso verso l'indipendenza finanziaria (**FIRE - Financial Independence, Retire Early**) e la proiezione patrimoniale nel tempo, con supporto approfondito per la fiscalità e la normativa lavorativa italiana (CCNL, TFR, Fondo Pensione, deducibilità IRPEF, imposta di bollo, capital gain).

---

## 🌟 Caratteristiche Principali / Key Features

### 🇮🇹 Motore di Calcolo & Fiscalità Italiana Completa
- **Fasi Salariali Multi-Livello**: Modellazione dinamica della carriera a scaglioni di anni, con RAL configurabile, numero di mensilità (12, 13 o 14), risparmio mensile personalizzato e gestione del risparmio aggiuntivo da tredicesima/quattordicesima.
- **Premi di Risultato (Bonus Variabile)**: Simulazione del bonus annuale con tassazione agevolata al 5% (detassazione premi di produttività) o aliquota ordinaria/personalizzata, con quota reinvestibile.
- **TFR (Trattamento di Fine Rapporto)**: Calcolo parametrico (divisore 13,5 o personalizzato, deduzione 0,5% ex L. 297/82) con opzione di routing percentuale (0% - 100%) verso Fondo Pensione di categoria/aperto o mantenimento in azienda con rivalutazione legale (1,5% fisso + 75% inflazione) e tassazione separata.
- **Fondo Pensione Integrativo**: Contributo volontario dipendente e matching contribution datoriale (in % della RAL), calcolo automatico della saturazione del plafond di deducibilità fiscale (€5.164,57/anno), opzione di reinvestimento del rimborso IRPEF nel portafoglio investimenti e tassazione agevolata alla prestazione (9%-15%).
- **Bucket di Investimento Personalizzati**: Portafoglio multi-asset (Azionario Globale, Obbligazioni Governative White List, Oro, Liquidità, ecc.) con rendimenti attesi, TER/costi di gestione e fiscalità differenziata (26% azionario vs 12,5% titoli di stato).
- **Imposta di Bollo & Tassazione Latente**: Calcolo dell'imposta di bollo sui dossier titoli (0,20% annuo) e visualizzazione sia del patrimonio lordo che netto da imposte latenti su capital gain.
- **Inflazione e Valori Reali vs Nominali**: Conversione istantanea di tutte le grandezze patrimoniali in potere d'acquisto reale attualizzato all'inflazione configurabile.

---

### 📊 Dashboard Interattiva & Visualizzazioni
- **Grafico di Crescita Patrimoniale**: Proiezione dell'evoluzione nel tempo (1-50 anni) con toggle Nominale vs Reale.
- **Grafico a Barre Sovrapposte (Composizione)**: Ripartizione anno per anno tra Risparmi/Contributi, Rendimenti da Investimento, Fondo Pensione e TFR Aziendale.
- **Cash Flow Mensile Disponibile**: Visualizzazione dello stipendio netto medio mensile disponibile al netto del risparmio investito.
- **Donut Chart Asset Allocation**: Distribuzione percentuale del capitale tra le classi di investimento.
- **Tabella di Dettaglio Anno per Anno**: Rendicontazione dettagliata di flussi, stipendio, rivalutazioni, rimborsi fiscali, imposte e saldi progressivi.
- **KPI Finanziari di Sintesi**: Patrimonio finale, TIR / IRR (Tasso Interno di Rendimento monetario ponderato), contributi totali, plusvalenze nette e commissioni totali corrisposte.

---

### 🔀 Gestione Scenari Multipli
- Creazione e salvataggio di scenari multipli (es. *Base*, *Ottimistico*, *Pessimistico*, *Carriera Accelerata*).
- Duplicazione rapida con modifica selettiva dei parametri.
- Sovrapposizione grafica per il confronto diretto delle traiettorie di accumulo.
- Persistenza automatica su `localStorage` con validazione dello schema.

---

### 📱 PWA & Esperienza Utente Premium
- **Installabile su Desktop e Mobile (PWA)** con supporto offline e Service Worker.
- **Bilingue (Italiano / Inglese)** con switch istantaneo senza ricaricamento della pagina.
- **Fintech Dark Mode**: Design professionale e moderno con effetti glassmorphism, micro-animazioni fluide (`framer-motion`), icone (`lucide-react`) e palette cromatica premium.

---

## 🛠️ Stack Tecnologico

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animazioni**: [Framer Motion](https://www.framer.com/motion/)
- **Grafici**: [Recharts](https://recharts.org/)
- **Icone**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) con suite completa di test unitari e di integrazione (116+ test)

---

## 🚀 Avvio Rapido / Getting Started

### Prerequisiti
- [Node.js](https://nodejs.org/) (versione 18 o superiore)
- `npm` o `pnpm` o `yarn`

### Installazione

1. Clona il repository:
```bash
git clone https://github.com/TeoPaso/fire-wealth-simulator.git
cd fire-wealth-simulator
```

2. Installa le dipendenze:
```bash
npm install
```

3. Avvia il server di sviluppo:
```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel tuo browser.

---

## 🧪 Testing & Build

Esegui l'intera suite di test con Vitest:
```bash
npm test
```

Esegui il coverage report:
```bash
npm run test:coverage
```

Costruisci l'applicazione per la produzione:
```bash
npm run build
```

Avvia la build di produzione in locale:
```bash
npm run start
```

---

## 📁 Struttura del Progetto

```
├── app/
│   ├── components/
│   │   ├── charts/          # Componenti grafici Recharts (Wealth, Composition, Allocation, etc.)
│   │   ├── dashboard/       # Dashboard principale con KPI e layout interattivo
│   │   ├── forms/           # Moduli di configurazione (RAL, TFR, Pensione, Investimenti, Tasse)
│   │   ├── scenario/        # Gestione, clonazione e confronto scenari
│   │   └── ui/              # Componenti UI riutilizzabili (Card, Input, Select, Tooltip)
│   ├── globals.css          # Stili globali Tailwind e variabili CSS
│   ├── layout.tsx           # Root layout con metadata PWA e font Inter
│   └── page.tsx             # Entry point principale dell'applicazione
├── lib/
│   ├── engine/              # Motore matematico di simulazione finanziaria
│   │   ├── calculator.ts    # Logica di calcolo anno per anno, capitalizzazione e deduzioni
│   │   ├── types.ts         # TypeScript interfaces e type definitions
│   │   └── __tests__/       # Test unitari del motore di calcolo
│   ├── i18n/                # Dizionari di traduzione IT / EN
│   └── store/               # Gestione stato e persistenza LocalStorage
├── public/                  # Asset statici, manifest PWA e icone
├── tests/                   # Test suite di integrazione e scenari limite
├── next.config.mjs          # Configurazione Next.js
├── tailwind.config.ts       # Configurazione temi e colori Tailwind
├── tsconfig.json            # Configurazione TypeScript
└── vitest.config.ts         # Configurazione test runner Vitest
```

---

## 📄 Licenza

Questo progetto è distribuito sotto la licenza [MIT](LICENSE).
