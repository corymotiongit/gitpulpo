# Product

## Register

product

## Users

Developers working with local Git repositories on their own machine. Context: mid-task, switching between editor/terminal and GitPulpo to understand history, stage changes, and manage branches. The job: see the state of a repo faster than `git log` and act on it without memorizing flags. Bilingual audience (Spanish/English); UI ships in both with a runtime switcher.

## Product Purpose

GitPulpo is a local, zero-build web GUI for Git: commit graph, staging, branches, and a GitHub panel, served from one Express process. Success: a developer opens a repo and understands its state in under five seconds, and every action (stage, commit, checkout) feels safer than the CLI because the state is visible.

## Brand Personality

Sober, professional, precise — with the octopus as a contained wink, not a theme park. Purple is the brand color (from the logo); yellow is the energy accent. Confidence through clarity and restraint, not glow effects.

## Anti-references

- Generic light SaaS dashboards: identical card grids, indigo gradients, hero metrics. Light surfaces are fine; template-grade blandness is not.
- GitKraken clone: inspiration yes, imitation no.
- Raw TUI/ncurses look: it's a designed tool, not a styled terminal.
- The previous "bioluminescent abyss" theme's decorative glows: retired in favor of sober contrast.

## Design Principles

1. **State over decoration** — color signals git state (branch, staged, conflict), never garnish.
2. **The graph is the hero** — every other panel supports reading the graph; density is welcome, noise is not.
3. **Earned familiarity** — standard affordances (tabs, sidebars, buttons) done precisely; surprise is reserved for the mascot's rare appearances.
4. **Both languages are first-class** — no truncated layouts in either Spanish or English; copy written, not machine-padded.
5. **Local and honest** — the UI never hides that it runs real git commands; destructive actions always confirm.

## Accessibility & Inclusion

WCAG AA assumed (not user-specified — flag if a different level is needed). Body text ≥4.5:1; graph lane colors distinguishable without hue alone (position + labels carry meaning); `prefers-reduced-motion` respected; keyboard focus visible on all interactive controls.
