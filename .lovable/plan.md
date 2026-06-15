# Fix: notes not appearing + links not working

## Bug 1 — saved notes don't appear
`listNotes` in `src/lib/xcamp-api.ts` uses:
```ts
.not("detail->archived", "eq", true)
```
For a normal note `detail.archived` is absent → `detail->archived` is NULL → `NULL <> true` is NULL → the row is excluded. So every non-archived note is hidden even though the insert succeeds (confirmed: POST 201, GET returns `[]`).

**Fix:** keep only non-archived notes while allowing NULL/false. Replace the `.not(...)` filter with:
```ts
.or("detail->>archived.is.null,detail->>archived.eq.false")
```
(`detail->>archived` compares as text: NULL when unset, `"false"` when explicitly not archived; archived notes store `true` and are excluded.)

## Bug 2 — attaching a link does nothing
StarterKit v3 already includes a Link extension, so the extra `Link` registration in `src/components/editor/RichTextEditor.tsx` collides ("Duplicate extension names: ['link']") and the link command misbehaves.

**Fix:** disable StarterKit's bundled link and keep our configured one:
```ts
StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
```

## Verification
- Create a note → it appears immediately in the history list and persists after reload.
- Select text, click the link button, enter a URL → link is applied, shows in the editor, and appears in the Links preview below. No duplicate-extension warning in the console.
