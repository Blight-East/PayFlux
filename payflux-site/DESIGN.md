# PayFlux Design System — Institutional Intelligence Desk

This document is the tactical design spec for the PayFlux marketing site and intelligence dashboard. AI agents and engineers should read it before writing any UI. It is the execution layer beneath the philosophical brief in `/Users/ct/payflux-prod/CLAUDE.md`.

Synthesized from four reference DESIGN.md files in `/Users/ct/reference/awesome-design-md/payflux-refs/` (pulled from VoltAgent's awesome-design-md collection):
- **WIRED** — paper-white broadsheet density, mono kickers, hairline rules, no cards or shadows
- **Vercel** — shadow-as-border discipline, three-weight typography, monochrome precision
- **Linear** — dark-mode-native dashboard, weight 510, sparse chromatic accents, ultra-thin borders
- **Coinbase** — single institutional blue as the only chromatic accent

## 1. Visual Theme & Atmosphere

PayFlux is a **research desk** for Stripe operators — a filing room where capital-at-risk is logged, annotated, and filed. The site splits into two environments that share one typographic backbone:

- **Light Environment** (marketing, pricing, public pages): paper-white canvas, editorial density, hairline rules, mono kickers. Reads as a research memo / financial broadsheet, not a SaaS landing page.
- **Dark Environment** (intelligence dashboard, reports): near-black `#0A0B0E` canvas, weight-510 text, 1px semi-transparent borders. Reads as a Bloomberg terminal or SEC filing console, not a BI dashboard.

The two environments are visually distinct but typographically unified — a reader moving from `/` to `/reports` should feel like they walked from the lobby into the filing room of the same institution.

Nothing glows, pulses, or gradients. Numerics are always tabular mono. Corners are minimal (2–6px max). There are no illustrations, no glassmorphism, no decorative icons as chrome. Icons only appear when they carry semantic weight (risk severity, signal class).

**Differentiation anchor:** competitors (Baremetrics, ChartMogul, ProfitWell) all converge on bright chart-heavy SaaS aesthetics. PayFlux intentionally looks like a law firm or a research desk — the value proposition is *authority*, not *cleverness*.

**Key Characteristics:**
- Light/dark duality maps to public/operator surfaces, never mixed on one page
- Mono ALL-CAPS kickers on every section (`text-[11px] tracking-[0.22em]`) — the WIRED move
- Hairline rules (`border-slate-200` light / `border-white/[0.06]` dark) replace cards and shadows
- Single chromatic accent: PayFlux Blue `#0A64BC` — used for data marks, logo, one primary CTA per surface
- Signal palette for the dashboard: amber `#BC620A` (degrading), emerald-600 (positive delta), red-500 (critical only, rarely)
- Weight discipline: 400 (body), 500 (UI), 600 (headings/emphasis) — no bold, no thin
- Numerics use `font-family: JetBrains Mono` + `font-variant-numeric: tabular-nums` + `letter-spacing: -0.02em`
- Max content width: 960px (documents) / 1120px (two-column marketing) — never wider

## 2. Color Palette & Roles

### Light Environment (marketing, pricing)
- **Paper** `#FFFFFF` — page canvas
- **Ink Primary** `#0F172A` (slate-900) — headlines, body text
- **Ink Secondary** `#475569` (slate-600) — deck copy, secondary meta
- **Ink Tertiary** `#94A3B8` (slate-400) — captions, timestamps, disabled
- **Hairline** `#E2E8F0` (slate-200) — section rules, dividers
- **Hairline Strong** `#CBD5E1` (slate-300) — emphasized rules under section headers

### Dark Environment (dashboard, reports)
- **Canvas** `#0A0B0E` — primary dashboard background (deeper than slate-950)
- **Surface** `#0F1116` — elevated panels, table header rows
- **Surface-2** `#17191F` — hover state, active row
- **Ink Primary** `#F5F6F8` — headlines, primary text
- **Ink Secondary** `#A1A7B3` — body copy, deck text
- **Ink Tertiary** `#636872` — metadata, captions, timestamps
- **Hairline** `rgba(255,255,255,0.06)` — default border
- **Hairline Strong** `rgba(255,255,255,0.10)` — hover/active borders

### Brand & Signals (both environments)
- **PayFlux Blue** `#0A64BC` — logo, data accents, one primary CTA per surface, link hover
- **PayFlux Blue Deep** `#08539E` — button hover
- **Signal Amber** `#BC620A` — degrading trend, medium risk
- **Signal Amber Tint** `rgba(188, 98, 10, 0.12)` — amber pill background (dark env)
- **Signal Emerald** `#059669` (emerald-600) — positive delta
- **Signal Red** `#DC2626` (red-600) — critical only; must be justified

### Not in palette (deliberate)
- No purple (Stripe owns this — avoid confusion)
- No gradients of any kind
- No neon / glow colors
- No tints on surfaces (no `bg-slate-50` washes — use hairlines instead)

## 3. Typography Rules

### Font Families
- **Sans**: `Inter` (weights 400, 500, 600, 700 loaded via Google Fonts in `index.html`) — all UI text, headings, body.
- **Mono**: `JetBrains Mono` (weights 400, 500, 600) — all numerics, timestamps, kickers, tags, IDs, file/report slugs.
- **Never** use italic. **Never** use weights 300, 800, 900.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---|---|---|---|---|
| Hero (light) | Inter | 56px / 3.5rem desktop, 40px mobile | 600 | 1.05 | -0.02em | Editorial — one sentence, not marketing copy |
| Hero (dark dashboard) | Inter | 32px / 2rem | 600 | 1.1 | -0.01em | Dashboard H1 — compact, scannable |
| Section Heading | Inter | 32px / 2rem | 600 | 1.15 | -0.01em | Major section break |
| Sub-section | Inter | 20px / 1.25rem | 600 | 1.3 | -0.005em | Card title, block header |
| Body Large | Inter | 18px / 1.125rem | 400 | 1.6 | 0 | Lead paragraph, hero deck |
| Body | Inter | 15px / 0.9375rem | 400 | 1.65 | 0 | Standard reading text |
| Body Small | Inter | 14px / 0.875rem | 400 | 1.5 | 0 | Secondary meta, captions |
| UI Label | Inter | 13px / 0.8125rem | 500 | 1.4 | 0 | Button, nav link, form label |
| Kicker (dateline) | JetBrains Mono | 11px / 0.6875rem | 500 | 1 | 0.22em | UPPERCASE — section eyebrows |
| Kicker Small | JetBrains Mono | 10px / 0.625rem | 500 | 1 | 0.2em | UPPERCASE — table column headers |
| Numeric Display | JetBrains Mono | 48–64px | 500 | 1 | -0.02em | Hero numerics ($12.4M at risk) |
| Numeric Inline | JetBrains Mono | inherit | 500 | inherit | -0.01em | Table cells, stat blocks |
| Tag / Pill | JetBrains Mono | 10–11px | 500 | 1 | 0.1em | UPPERCASE — severity, processor, category |

### Principles
- **Three-weight discipline**: 400 / 500 / 600 only. Hierarchy comes from size + tracking + color, not weight.
- **Mono for instruments**: every number that represents a financial fact is mono + tabular-nums. Typing `$12,400` in proportional sans is a bug.
- **Kickers before headlines**: every section opens with an uppercase mono dateline. It answers "what section am I in?" before the eye reads the headline.
- **One hero per page**: only the top-of-page H1 uses 48px+. All subsequent "headlines" are max 32px.
- **No italic, ever**: quote text uses left ink-rule + larger size, not italic.

## 4. Component Stylings

### Buttons
All buttons have `rounded-md` (6px) — square-ish but not sharp. No pill shapes. One primary button per surface.

**Primary CTA (light env)**
- Background `#0F172A` (slate-900), text white
- Padding `12px 20px`, font `text-sm font-semibold` (14px / 600)
- Hover: background `#020617` (slate-950)

**Primary CTA (dark env)**
- Background `#0A64BC`, text white
- Padding `12px 20px`, font `text-sm font-semibold`
- Hover: background `#08539E`

**Secondary CTA (both envs)**
- Background transparent, border 1px (`slate-300` light / `white/[0.12]` dark)
- Text primary ink color
- Hover: border intensifies to `slate-900` / `white/[0.24]`

**Tertiary link**
- Text only, `text-sm text-slate-600` (light) / `text-[#A1A7B3]` (dark)
- Hover: `text-slate-900` / `text-white`
- Never underlined by default; underline on hover only for inline prose links

### Dateline (signature element)
A two-line block that opens every major section:
```
DATELINE           — mono 11px, uppercase, tracking-[0.22em], slate-500 / [#636872]
Section Headline   — Inter 32px / 600 / -0.01em
```
The dateline sits directly above the headline with `margin-bottom: 12px`. No other decoration.

### Hairline Rule
- `border-t border-slate-200` (light) or `border-t border-white/[0.06]` (dark)
- Always 1px, always full-width within its container
- Used between sections, around tables, above footers
- **Never** use `<hr>` with default styling — always explicit tailwind utilities

### Filing Row (replaces cards on dashboard list)
Each report is a table row, not a card:
```
[SEVERITY PILL]  Title of the filing goes here                    [MONO DATE]
                 One-line deck in slate-400                        [PROCESSOR]
```
Row has `border-b border-white/[0.06]`, `py-5`, hover background `#0F1116`.

### Severity Pill
- Mono uppercase, `text-[10px] tracking-[0.15em] font-medium`
- `px-2 py-0.5`, `rounded-sm` (2px — almost square)
- 1px border + 8% tint background
- Variants: `critical` (red-500/10 border-red-500/20 text-red-400), `high` (orange), `medium` (amber), `low` (slate)

### Data Block (capital-at-risk tile, KPI)
- Structure: dateline (mono) → numeric value (mono 48–64px) → unit line (sans 14px slate-400)
- No card chrome — just left border `border-l-2` if grouped
- Example:
  ```
  CAPITAL AT RISK
  $12,400,000
  Across 3 processors — next review T+14
  ```

### Table (Reports list, signal ledger)
- Header row: mono 10px uppercase kickers, `border-b border-white/[0.10]`, py-3
- Body rows: sans 14px, `border-b border-white/[0.06]`, py-4
- No zebra stripes. Row hover is `bg-[#0F1116]` only.
- Numeric columns right-aligned with mono + tabular-nums
- No sort icons unless interaction is wired — no decorative chrome

### Nav
- Height: 64px (both envs)
- Logo: 24px PayFlux wordmark, 2px blue square mark
- Links: mono 11px uppercase, tracking-[0.2em], color `slate-500` / `#636872`
- Active state: color becomes primary ink, no underline/border
- Border-bottom hairline
- Backdrop blur: `bg-white/85 backdrop-blur` (light) / `bg-[#0A0B0E]/85 backdrop-blur` (dark)

## 5. Layout Principles

### Spacing Scale
Use Tailwind's default 4-based scale. Preferred rhythms:
- Intra-block: `gap-3` (12px), `gap-4` (16px)
- Block padding: `p-6` (24px) or `p-8` (32px)
- Section gap: `py-20` (80px) desktop, `py-16` (64px) mobile
- Page top padding below nav: `pt-24` (96px)
- Page bottom padding: `pb-32` (128px) before footer

### Grid
- Max content width: `max-w-[960px]` (editorial / documents) — default
- Two-column marketing sections: `max-w-[1120px]` with `grid-cols-[1.1fr_0.9fr]`
- Dashboard list: `max-w-[960px]`
- Always center with `mx-auto`, always `px-6` (mobile) / `px-8` (desktop)

### Whitespace Philosophy
- **Whitespace is structural, not decorative**. Increase it before adding a rule line.
- **Never center long prose**. Center only hero statements (under 12 words).
- **Align everything to a consistent left edge** — mono kickers, headlines, and body copy share the same x-position.

## 6. Depth & Elevation

PayFlux has **no shadows**. Depth is encoded via:
1. **Hairline rules** between sections
2. **Background tone shift** on hover (`bg-[#0F1116]` on dark, `bg-slate-50` on light — sparingly)
3. **Weight and size contrast** in typography

The only exception: the fixed nav uses `backdrop-blur` + `bg-*/85` semi-transparency to imply depth without shadow. This is structural, not decorative.

**Corner radius:**
- Buttons: 6px (`rounded-md`)
- Blocks / tiles: 4px (`rounded`)
- Severity pills: 2px (`rounded-sm`)
- Icons in badges: 4px
- Never use `rounded-xl`, `rounded-2xl`, `rounded-3xl`, or `rounded-full` except for the severity pill border dot indicator if used.

## 7. Do's & Don'ts

### Do
- Use `font-variant-numeric: tabular-nums` on every financial number
- Open every section with a mono UPPERCASE dateline
- Replace traditional cards with hairline-bounded rows or tiles
- Use PayFlux Blue as a data mark (single color among neutrals), not as a background wash
- Write UI copy in declarative institutional voice: "Capital at Risk" not "Your money may be at risk"
- Align kickers, headlines, and body copy to the same left edge
- Use dark environment for operator tools; light for public-facing pages
- Keep one primary CTA per surface

### Don't
- Don't use gradients, glassmorphism, neon, glow, or decorative shadows
- Don't mix light and dark environments on the same page
- Don't use purple (Stripe owns that color territory)
- Don't use rounded-2xl or larger — corners should feel printed, not marshmallow
- Don't use emoji as UI chrome (reports may contain risk emoji only if semantic)
- Don't use more than three font weights per page
- Don't center long paragraphs or left-align hero statements
- Don't animate for flair — motion only communicates state change
- Don't use `bg-slate-900/60`-style washed-out card backgrounds — either hairline or solid surface
- Don't use `text-3xl md:text-5xl` mixed scales on body-adjacent headings — pick one

## 8. Responsive Behavior

### Breakpoints
- Mobile: < 640px (sm)
- Tablet: 640–1024px (md–lg)
- Desktop: ≥ 1024px (lg+)

### Behaviors
- **Nav**: collapses to hamburger below `md`. Hamburger opens full-screen sheet with mono uppercase links.
- **Grids**: `grid-cols-3` collapses to `grid-cols-1` below `md`. No 2-column intermediate unless content demands it.
- **Hero**: 56px → 40px below `md`
- **Tables**: horizontal scroll on mobile, never collapse to cards — the dense-row identity is sacred
- **Padding**: `px-8` → `px-6` below `sm`
- **Touch targets**: all interactive elements have min-height `44px` (use `py-3` + `px-4` on links when in a touch context)

## 9. Agent Prompt Guide

When asking an AI agent to build or extend PayFlux UI, the shortest effective prompt is:

> Use `PayFlux DESIGN.md`. Environment: [light | dark]. Section: [name]. Build using Tailwind utilities only. Use `font-mono` for numerics, mono uppercase datelines (`text-[11px] tracking-[0.22em]`) to open each section, hairlines instead of cards, PayFlux Blue (`#0A64BC`) as the sole chromatic accent. No shadows, no gradients, no pill buttons.

### Quick Color Reference (paste-ready)
```
PayFlux Blue:    #0A64BC  (brand, single accent)
Signal Amber:    #BC620A  (degrading trends)
Signal Emerald:  #059669  (positive delta)
Light Canvas:    #FFFFFF
Light Ink:       #0F172A
Light Hairline:  #E2E8F0  (slate-200)
Dark Canvas:     #0A0B0E
Dark Surface:    #0F1116
Dark Ink:        #F5F6F8
Dark Hairline:   rgba(255,255,255,0.06)
```

### Reusable Snippets

**Dateline + Headline (section opener):**
```jsx
<div className="text-[11px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-3">
  Capital Intelligence
</div>
<h2 className="text-3xl font-semibold tracking-tight text-slate-900 leading-tight">
  The headline goes here
</h2>
```

**Numeric display (capital at risk):**
```jsx
<div className="text-[11px] font-mono uppercase tracking-[0.22em] text-slate-500 mb-2">
  Capital at Risk
</div>
<div className="font-mono text-5xl md:text-6xl font-medium tracking-tight text-slate-900 tabular-nums">
  $12,400,000
</div>
<div className="text-sm text-slate-500 mt-2">
  Across 3 processors — next review T+14
</div>
```

**Filing row (report list item):**
```jsx
<Link to={`/reports/${slug}`} className="block border-b border-white/[0.06] hover:bg-[#0F1116] transition-colors">
  <div className="grid grid-cols-[120px_1fr_120px] items-baseline gap-6 py-5 px-2">
    <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500">2026-04-15</div>
    <div>
      <div className="text-white font-medium">{title}</div>
      <div className="text-sm text-slate-500 mt-1 line-clamp-1">{deck}</div>
    </div>
    <SeverityPill level={risk_level} />
  </div>
</Link>
```
