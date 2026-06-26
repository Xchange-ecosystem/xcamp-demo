# `src/features/`

One directory per feature (e.g. `backcaster/`, `journal/`, `navigator/`,
`vox-chat/`). Each feature owns its routes' UI, components, hooks, and
feature-local state.

Conventions:

- Cross-feature, reusable UI goes in `src/shared/ui/` (Claude Design-driven).
- Generic shadcn/ui primitives live in `src/components/ui/`.
- Data access / API clients live in `src/lib/*-api.ts` and `src/integrations/`.
- Always style with design-system tokens (semantic Tailwind classes such as
  `bg-background`, `text-foreground`, `text-primary`) — not raw palette values.
