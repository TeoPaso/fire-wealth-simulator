# Original User Request

## Initial Request — 2026-08-12T14:39:43Z

Build a Progressive Web App (PWA) for personal financial projection and wealth simulation. The app allows users to model their financial future by configuring salary, savings, pension funds (TFR), employer contributions, and personal investments — all with fully parametric inputs (no hardcoded values). Target audience: Italian workers who want to share this tool with friends/colleagues, so it must be intuitive and visually polished.

Working directory: c:\Users\Matte\OneDrive\Desktop\Documenti personali\Lavoro\FIRE
Integrity mode: development

## Requirements

### R1. Modular Financial Engine (Core Calculator)

A fully parametric calculation engine that projects wealth over a configurable time horizon (1–50 years). The engine must support:

- **Salary modeling with phases**: Users define multiple salary phases (e.g., Phase 1: years 1–3 at €35k RAL, Phase 2: years 4–7 at €45k RAL). Each phase specifies RAL, number of monthly payments (mensilità), and monthly savings amount.
- **TFR (Trattamento di Fine Rapporto)**: Model TFR accrual based on RAL (approximately RAL/13.5 per year, but the divisor must be a configurable parameter). Support routing TFR to a pension fund.
- **Pension fund (Fondo Pensione)**: Model employee voluntary contributions, employer additional contributions (as configurable % of RAL), and TFR flow. Each with its own configurable growth rate and annual fee/TER percentage.
- **Personal investments**: Users define multiple investment "buckets" (e.g., 60% equity, 30% bonds, 10% cash), each with its own expected annual return %, annual cost/TER %, and allocation percentage. Monthly savings are distributed across buckets according to allocation.
- **Initial wealth**: Support configuring starting invested capital and starting cash/liquidity so users can model from their current situation, not just from zero.
- **Inflation**: A separate configurable inflation rate parameter. All projections should be displayable in both nominal and real (inflation-adjusted) terms.
- **Parametric taxation**: Configurable tax rates for: capital gains on investments (default suggestion 26%), capital gains on government bonds (default suggestion 12.5%), pension fund taxation (default suggestion 9–15% range), annual wealth tax / imposta di bollo (default suggestion 0.2%), pension fund contribution tax deductibility cap (default suggestion €5,164.57/year). Defaults are provided as suggestions only — all values are user-editable.

No numbers or parameters may be hardcoded. Everything must be a user-configurable input.

### R2. Multi-Scenario Comparison

Users can define at least 3 named scenarios (e.g., "Pessimistic", "Base", "Optimistic") with different parameter sets. Scenarios should be overlayable on the same charts for visual comparison. Users can duplicate a scenario and modify individual parameters to create variants quickly.

### R3. Rich Dashboard & Visualizations

The app must include:
- **Line chart**: Wealth growth over time, with toggleable nominal vs real (inflation-adjusted) view
- **Stacked bar chart**: Wealth composition breakdown by source (savings, investment gains, pension fund, TFR) per year
- **Year-by-year detail table**: Full numerical breakdown of all flows and balances for each year
- **Donut/pie chart**: Current asset allocation across investment buckets
- **KPI dashboard cards**: Total wealth, average return, total contributions, total investment gains, total fees paid

Charts must be interactive (hover tooltips, responsive to screen size).

### R4. PWA, Persistence & Bilingual Support

- Full PWA with service worker, manifest, and offline capability (installable on mobile and desktop).
- All user configurations and scenarios saved to localStorage (no backend required).
- Bilingual interface with IT/EN toggle. All UI labels, tooltips, and descriptions must be translatable.

### R5. Premium Fintech Design

Dark mode with premium fintech aesthetic: glassmorphism effects, modern color palette, smooth micro-animations, professional typography (e.g., Inter or similar). The app should feel like a polished fintech product, not a basic calculator. Responsive design that works beautifully on both mobile and desktop.

### R6. Technology

Build with Next.js. Use a charting library suitable for interactive financial charts (e.g., Recharts, Chart.js, or similar).

## Acceptance Criteria

### Financial Engine Accuracy
- [ ] Changing any single parameter (RAL, growth rate, inflation, tax rate, TER, etc.) must immediately recalculate and update all projections
- [ ] With inflation set to 0%, fees set to 0%, and taxes set to 0%, a simple scenario (fixed RAL, single investment bucket at X% return) must produce results matching the compound interest formula within 0.01% tolerance
- [ ] Multi-phase salary transitions must be correctly reflected in the year-by-year table (RAL changes at the configured year boundaries)
- [ ] TFR accrual for each year must equal RAL / (configurable divisor), verifiable in the detail table
- [ ] Investment bucket allocations must sum to 100% (enforced by UI validation)
- [ ] Nominal vs real values must differ by exactly the configured inflation rate compounded over time

### Scenarios
- [ ] At least 3 scenarios can be created, named, and persisted
- [ ] Overlay chart correctly shows all selected scenarios with distinct visual styles
- [ ] Duplicating a scenario creates an independent copy that can be modified without affecting the original

### Visualizations
- [ ] All 5 chart/visualization types render correctly with sample data
- [ ] Charts are responsive and render without overflow on viewports from 375px to 1920px wide
- [ ] Year-by-year table includes at minimum: year number, RAL, net monthly savings, TFR accrued, pension fund balance, investment portfolio balance, total wealth (nominal), total wealth (real)

### PWA & Persistence
- [ ] App can be installed as PWA (valid manifest.json and service worker registration)
- [ ] Closing and reopening the browser preserves all user data and scenarios
- [ ] Language toggle switches all visible UI text between Italian and English without page reload

### Design Quality
- [ ] Dark theme is applied by default with glassmorphism elements visible on cards/panels
- [ ] No default/system fonts — a modern web font is loaded and applied
- [ ] Micro-animations present on at least: page transitions, chart rendering, hover states on interactive elements
- [ ] Lighthouse accessibility score ≥ 80
