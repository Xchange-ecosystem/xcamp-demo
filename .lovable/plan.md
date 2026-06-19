## Plan

1. **Fix the token cascade at the source**
   - Move the Xcamp `--skin-*` light token block before `.dark`, or merge it into the main `:root` block, so `.dark` overrides are not overwritten later by the second `:root` block.
   - Keep dark-mode values in `.dark` as the final active override.

2. **Register skin tokens with Tailwind**
   - Add `--color-skin-bg`, `--color-skin-surface`, `--color-skin-ink`, `--color-skin-line`, etc. in `@theme inline` so token-backed utilities work consistently.
   - This prevents components from falling back to default Tailwind tokens where Xcamp skin tokens are intended.

3. **Remove remaining hardcoded light overlays in the main page shell**
   - Update `PageHeroShell` overlay gradients that currently use fixed light colors like `rgba(248,250,251,0.55)` so they resolve through `--skin-surface` / semantic color mixing instead.
   - This addresses the main page specifically.

4. **Patch Project Builder token usage only where needed**
   - Keep its layout and content unchanged.
   - Ensure wrapper/card/textarea/diagnostics colors all read from the corrected skin tokens after the cascade fix.

5. **Verify in dark mode**
   - Check `/project-builder` and the main page in the preview after implementation to confirm the card, text field, diagnostics, and page backgrounds switch to dark tokens.