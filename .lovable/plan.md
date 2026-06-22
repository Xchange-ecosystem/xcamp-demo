Change the organiser `propose` request body key from `intent` to `goal` across the codebase.

1. **Update `src/lib/organiser-api.ts`**
   - Rename the `propose` argument `intent` → `goal`
   - Change the POST body field from `intent: args.intent` to `goal: args.goal`
   - Rename the helper `noteToIntent` → `noteToGoal` for consistency

2. **Update `src/components/organiser/OrganiseSheet.tsx`**
   - Rename the `intent` prop/variable to `goal`
   - Update the `propose` call to pass `goal`

3. **Update `src/components/Journal.tsx`**
   - Rename the `intent` prop passed to `OrganiseSheet` to `goal`
   - Use `noteToGoal(...)` instead of `noteToIntent(...)`