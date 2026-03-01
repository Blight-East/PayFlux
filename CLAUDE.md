# PayFlux System Guidelines

## General Guidelines

- Optimize for institutional clarity, not marketing flair.
- Avoid decorative UI elements unless they serve hierarchy.
- Default to flexbox and grid layouts. Avoid absolute positioning.
- Prefer whitespace over dividers.
- Do not introduce visual noise to create excitement.
- Refactor as you go. Keep components small and composable.
- Keep financial numerics aligned using tabular-nums.
- Never introduce animations unless they communicate state change.

## Design Philosophy

PayFlux is a capital projection instrument, not a SaaS growth platform.

The UI must feel:
- Institutional
- Precise
- Composed
- Financial
- Calm
- Authoritative

It must NOT feel:
- Startup-y
- Growth-hacked
- Dashboard-heavy
- BI-oriented
- Playful
- Engineering console-like

## Layout Principles

- Maximum content width: 960px
- Default page padding: 48px top, 32px sides, 96px bottom
- Section gap: minimum 48px, preferred 64–96px
- Use soft rounded corners (12–16px)
- Use 1px borders (slate-200) instead of heavy shadows
- Surfaces: white or slate-50 only

## Typography

Base Font: Inter (or similar institutional sans-serif)

Scale:
- Hero numeric: 48–56px
- Section title: 20px
- Data value: 16px
- Body text: 14px
- Labels: 12px
- Footnotes: 10px uppercase tracking-wide

Rules:
- All financial numbers must use tabular-nums
- Section headers must be visually subordinate
- Avoid bold except for primary values
- Never mix more than 3 font weights on a page

## Color System

Primary Background: #FFFFFF
Surface Background: slate-50
Borders: slate-200

Text:
- Primary: slate-900
- Secondary: slate-600
- Tertiary: slate-400

Brand: #0A64BC (data accents, logo, chart elements only)
Risk/Degrading: #BC620A (amber, trend indicators only)
Positive delta: emerald-600

Do NOT use:
- Red
- Gradients
- Neon accents
- Glassmorphism
- Glow effects

## Landing Page Guidelines

### Hero Section
- Must occupy 60–70% of viewport height
- Headline must dominate visually
- Projection preview must be structured and calm
- No animated counters
- No decorative charts
- No floating UI cards

### Section Headers
- Uppercase
- text-[11px]
- tracking-widest
- slate-400
- Never bold

### Pricing
- Equal weight cards
- No "recommended" badge
- No highlighted glow
- Pro distinguished by border weight only
- Clear bullet hierarchy

## Dashboard Guidelines

### Information Hierarchy (MANDATORY ORDER)
1. Capital at Risk
2. Projection Windows (T+30 / T+60 / T+90)
3. Recommended Intervention
4. Model Accuracy
5. Reserve History
6. Generate Board Report
7. Diagnostics (subtle)

### Capital Hero
- Large exposure number (48–56px)
- Left-aligned
- Structured metadata on right
- Generous vertical breathing room
- Must visually own the page

### Projection Windows
- Three simple bordered panels
- Just numbers
- No charts
- No visual drama

### Intervention
- Current vs If Applied
- Clear delta
- No animated diff

### Model Accuracy
- Grid layout
- Instrumentation style
- Clean metrics
- No badges

### Reserve History
- Ledger rows
- 1px dividers
- Tabular numeric columns
- "Generate Board Report" inline button
- No timeline visuals

### Diagnostics
- Small text link
- No border separator
- No arrow
- No call-to-action framing
- Visually tertiary

## Buttons

Primary: solid slate-900, white text, rounded 8px. Used once per surface.
Secondary: 1px border slate-900, white background.
Tertiary: text only, slate-600, no underline by default.

Never use more than one primary button per section.

## Interaction Rules

- No pulsing alerts
- No animated counters
- No hover theatrics
- Subtle hover only (background shade change)
- Motion should imply confidence, not urgency
