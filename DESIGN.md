# Design

Target visual system for GitPulpo v2 ("orquídea eléctrica"). Replaces the retired "bioluminescent abyss" dark theme. Register: product — design serves the workflow.

## Theme

Light, soft, precise. Violet-tinted light neutrals as the field, white surfaces for content, near-black purple ink, one saturated purple as the brand/primary, yellow as the single energy accent (fills and highlights, never body text). Black pills carry dense data chips (SHA, counts) as in the reference dashboards. No gradients as decoration, no glows.

## Color

All OKLCH-derived, expressed as hex tokens in `public/style.css`:

| Token | Value | Role |
|---|---|---|
| `--field` | `#f3f1f7` | app background (violet-tinted neutral, L≈0.96 C≈0.01 H≈300) |
| `--surface` | `#ffffff` | cards, panels, topbar |
| `--panel` | `#eae6f2` | sidebar / secondary panels |
| `--line` | `#d9d3e6` | borders, dividers |
| `--ink` | `#241b33` | primary text (≥12:1 on field) |
| `--ink-dim` | `#5c5470` | secondary text (≥4.5:1 on field/surface) |
| `--ink-faint` | `#8a819e` | disabled/tertiary only, never body |
| `--purple` | `#6d3ef0` | primary actions, selection, links, current branch |
| `--purple-soft` | `#ece5fd` | selected row bg, hover tint |
| `--yellow` | `#f7c948` | accent fills: WIP row, highlights, badges (always with `--ink` text) |
| `--pill` | `#1d1628` | black data pills (SHA, counters) with light text |
| `--add` | `#1d8f56` | diff additions |
| `--del` | `#d43f6e` | diff deletions |

Graph lane palette (distinct on light bg): `#6d3ef0` purple, `#c99310` ochre, `#0e8a8a` teal, `#d43f6e` magenta, `#2f6fe4` blue, `#8a6d00` olive, `#a24bc8` orchid, `#496073` slate.

## Typography

- **UI/body**: Inter (400/500/600/800) — labels, buttons, headings. Product register: one sans carries the UI.
- **Data/mono**: IBM Plex Mono — SHAs, diffs, file paths, graph metadata.
- Fixed rem scale, ratio ≈1.2: 12px base UI, 13px body, 15px section, 18px panel title. No fluid clamp.
- Bricolage Grotesque retired (display font in UI labels is a product ban).

## Components

- Buttons: solid `--purple` primary (white text), quiet `--surface`+border secondary, `--del` for destructive confirms. Radius 8px.
- Ref chips: `--purple-soft` bg + `--purple` text (branches), `--yellow` bg + `--ink` (HEAD/tags).
- Rows: hover `--purple-soft` at 50%, selected full `--purple-soft` with 2px inset `--purple` marker (full border, not side-stripe).
- Every control ships default/hover/focus/active/disabled states; focus = 2px `--purple` outline offset 2.

## Motion

150–200ms ease-out on state transitions only (tab switch, row select, diff expand). No page-load choreography. `prefers-reduced-motion`: transitions drop to 0ms.

## i18n

UI is bilingual ES/EN, runtime-switchable (topbar toggle, persisted in `localStorage.gitpulpo-lang`, default from `navigator.language`). All strings live in one `I18N` dictionary in `public/i18n.js`; static HTML uses `data-i18n` keys, JS templates call `t(key)`. Layouts must tolerate both languages' string lengths.
