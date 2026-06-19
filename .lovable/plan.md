Plan to stabilize Backcaster Step 3

1. Fix the real Step 3 failure
- Update `src/lib/backcaster-api.ts` so `generate()` accepts all observed successful response shapes:
  - `data.output`
  - `data.output_json`
  - `data.backcaster_version.output_json`
  - root-level `output` / `output_json` fallbacks
- This directly addresses the screenshot error: `No tree returned by the generator.` The network trace shows `/generate` returned 200 with `data.output`, but the current parser only checks `output_json` paths.

2. Keep the 400 protection, but make it stricter and clearer
- Preserve the existing preflight validation for `session_id`, `interpreted_input`, and `mode_id`.
- Ensure the outbound body always uses `interpreted_input`, never the old `interpretation` field.
- Improve the user-facing message when the API itself returns validation errors so it identifies missing fields without implying the generator failed.

3. Normalize generated tree data before rendering
- Add a small normalization step for generated nodes so unexpected API values like `node_type: "object"` do not break downstream rendering.
- Keep unknown node types display-safe with a fallback label/color instead of failing the plan.
- Validate that the tree has a usable `root_nodes` array before accepting it.

4. Improve diagnostics for future failures
- Add response-shape diagnostics such as `tree: present/missing` and whether root nodes were returned.
- Keep raw API logging in the console, but avoid exposing long backend JSON to users.

5. Clean up unrelated noise in the investigation notes
- Treat Lovable preview messages like `Checking for app updates`, WebSocket failures, Vite chunk 504s, and uploaded-image 404s as preview/runtime noise unless they block the app UI.
- Focus the code change only on Backcaster response parsing and stable Step 3 recovery.

Files to change after approval
- `src/lib/backcaster-api.ts`
- `src/components/quickroad/WorkflowDiagnostics.tsx` only if adding the extra diagnostics display is small and safe