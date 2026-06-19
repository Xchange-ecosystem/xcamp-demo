## Goal

Make the accent and gradient colors distinct per theme: **Xcamp (light) mode** keeps its original teal identity, **Nox (dark) mode** keeps the new purple palette.

## Problem

In the last change, the light-mode `--skin-*` accent tokens in `src/styles.css` were overwritten with the purple palette (#731f7d / #b689e6 / #34acbf). That purple now also drives Xcamp light mode (visible in the screenshot's "+ New note" gradient).

## Changes (`src/styles.css`)

1. **Light `:root` block** — restore the original Xcamp teal tokens:
   - `--skin-accent: #4de0c1`
   - `--skin-accent-soft: #dcf8f2`
   - `--skin-accent-gradient: linear-gradient(135deg, #34acbf, #4de0c1)`

2. **`.dark` block** — leave the Nox purple palette as-is:
   - `--skin-accent: #b689e6`
   - `--skin-accent-soft: hsl(291, 35%, 22%)`
   - `--skin-accent-gradient: linear-gradient(135deg, #731f7d, #b689e6, #34acbf)`

3. **Dark `--primary`/`--ring`/sidebar tokens** — keep the purple oklch values from the last change (these only apply in dark/Nox mode, so they stay).

4. **`VoiceTranscriber` orb** — currently hardcoded to purple. Make the orb gradient theme-aware so the Vox orb is teal in Xcamp mode and purple in Nox mode (derive from `useBrand`/theme rather than a fixed purple).

## Result

- Xcamp (light): teal accent + teal gradient (original look).
- Nox (dark): purple accent + purple→teal gradient.
- Logos/icons already swap per theme and remain unchanged.
