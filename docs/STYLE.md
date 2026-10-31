# Style Brief — W.I.N.K (FSM Activity & Mutual-Meetup Demo)

> Authored per `distinctive-visual-style` & `design-system-and-visual-language`.

```text
ANCESTOR:   An FSM (Faculté des Sciences de Monastir) departmental cork-and-linen noticeboard
            pinned with ruled index-card activity slips and stamped with a kiln-fired terracotta
            confirmation seal under warm Monastir limestone daylight.

RECIPE:     Derived from R3 Warm Analog (with tabular campus-timetable discipline), shifted
            specifically to Tunisian coastal limestone, fountain ink, and Nabeul/Monastir terracotta.

REJECTED:   1) R4 Dense Technical / Spec Sheet — rejected because arranging an in-person coffee
               or 5v5 football game with a fellow student requires human warmth and approachable
               safety, not a cold server-monitoring datasheet aesthetic.
            2) R2 Swiss / Brutalist — rejected because 0px hard corners, 900-weight shouting
               headlines, and 4px solid black offset shadows feel confrontational rather than
               calm and welcoming for first-time face-to-face campus plans.
            (R1 Paper & Ink also deliberately avoided per the anti-repetition rule.)
```

## Palette & One-Line Ancestor Justification

Every colour is shifted for W.I.N.K's FSM campus ancestor — zero verbatim recipe or default Tailwind hexes:

### Light Mode (`:root` — Monastir Limestone Daylight)
- `--bg: #F8F5EE` — Sun-warmed Monastir campus limestone courtyard wall (never sterile `#ffffff`).
- `--card: #FFFCF6` — Unbleached cotton index card pinned to the faculty noticeboard.
- `--subtle: #EFEADF` — Pressed linen noticeboard backing used for quiet panels and skeleton pulses.
- `--fg: #1F1D1A` — Deep espresso-charcoal fountain pen ink (14.2:1 AAA contrast on `--bg`).
- `--muted: #696257` — Weathered HB pencil margin notes (5.4:1 AA contrast on `--bg`).
- `--border: #DDD6C7` — Ruled 1px index-card hairline.
- `--border-strong: #C4B9A5` — Perforated tear-off ticket seam.
- `--primary: #B44326` — Kiln-fired Tunisian terracotta rubber stamp (~5% surface budget: primary CTA, confirmed seal, focus ring).
- `--primary-hover: #96351C` — Pressed ink-pad terracotta on hover/active.
- `--primary-fg: #FFFCF6` — Crisp card stock lettering on terracotta buttons.
- `--success: #2A6342` / `--success-bg: #EBF4EE` — Campus olive-pine stamp for mutually confirmed plans.
- `--warning: #9C5D16` / `--warning-bg: #FDF4E7` — Warm ochre ink for pending mutual choice / arranging details.
- `--danger: #A62626` / `--danger-bg: #FDECEC` — Crimson cancellation / safety withdrawal mark.

### Dark Mode (`[data-theme="dark"]` — Evening Study Courtyard)
- `--bg: #141311` — Warm basalt night slate (never AI-default navy `#0a0e27`).
- `--card: #1D1B18` — Dark walnut library study table surface.
- `--subtle: #272420` — Muted charcoal felt backing for dark skeletons and recessed rows.
- `--fg: #F2EDE3` — Warm chalk lettering (14.5:1 contrast on `--bg`).
- `--muted: #A69E91` — Soft chalk dust secondary copy (6.1:1 AA contrast on `--bg`).
- `--border: #312D27` — Subtle slate hairline rule.
- `--border-strong: #464037` — Ticket perforation rule in dark mode.
- `--primary: #E06B4B` — Luminous terracotta chalk (~5% surface budget, 5.6:1 contrast against `--primary-fg: #141311`).
- `--primary-hover: #EB7D5F` — Highlighted terracotta chalk on hover.
- `--success: #58B37C` / `--success-bg: #182920` — Night-legible olive-pine confirmation badge.
- `--warning: #E5A24C` / `--warning-bg: #2B2115` — Night-legible amber pending state.
- `--danger: #E56B6B` / `--danger-bg: #2C1919` — Night-legible crimson alert state.

## Typography & Scale

- **Display (`--font-display`):** `Fraunces, "Iowan Old Style", "Palatino Linotype", Georgia, serif` — weight `400–500`, tracking `-0.02em`, line-height `1.08`. Confident light-weight editorial serif, never heavy sans.
- **Working (`--font-body`):** `"Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif` — `16px` minimum body, line-height `1.6`.
- **Data (`--font-mono`):** `ui-monospace, "SF Mono", Menlo, Consolas, monospace` — used **strictly** for times (`17:00`), tabular counts, byte sizes, request IDs, and column headers (`11px`, uppercase, `0.11em` tracking, `font-variant-numeric: tabular-nums`).
- **Scale:** `48px` (Display) / `30px` (Title) / `20px` (Section Heading) / `16px` (Body) / `14px` (Secondary) / `11px` (Mono Label). Hierarchy holds completely in greyscale.

## Layout, Radius, Shadow & Signature

- **Layout:** Asymmetric 12-column board (`max-width: 1240px`). Left rail (`cols 1–4`) holds the active FSM student persona switcher, active intent lens, and live `localStorage` DB status; right column (`cols 5–12`) renders hairline-separated activity slips and confirmed meetup tickets. Collapses cleanly down to `320px`.
- **Radius:** `6px` (`--radius: 6px`), `4px` (`--radius-sm: 4px`). Index-card corners only.
- **Shadow:** `none` on flat surfaces (hairlines and surface contrast do all structural work). Soft elevation (`--shadow-float`) reserved strictly for floating modals and spotlight coach marks.
- **Signature Element:** **Two-Half Perforated "Mutual Match & Logistics Slip"** — displays a 5-axis compatibility check (`Activity · Purpose · Role · Time Window · Public FSM Venue`) above a perforated tear line, with two independent student confirmation seals and structured time/venue agreement below.
- **Banned:** Gradient text · radial hero glows · emoji as UI icons · glassmorphism · centered paragraphs · radius > 8px on cards · drop shadows on flat cards · fake browser/terminal chrome · `alert()` or raw server/storage error strings.
