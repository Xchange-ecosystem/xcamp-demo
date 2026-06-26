# `src/shared/ui/`

Shared, Claude Design-driven UI components reused across features.

- These are app-level shared components composed from `@xchange/ui` and the
  shadcn primitives in `src/components/ui/`.
- Style exclusively with design-system tokens (semantic Tailwind classes) so
  Claude Design can iterate against a single source of truth.
- Keep feature-specific components inside their feature dir under
  `src/features/<feature>/` instead.
