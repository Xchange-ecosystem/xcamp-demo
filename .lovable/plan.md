# Xcamp Journal — editor + history upgrade

## Current state
- Notes save through `createNote`/`updateNote` writing only the `notes` table (contract-safe). The Save button is gated by `disabled={!canSave}` where `canSave` requires a non-empty **title** — that's why saving feels "disabled".
- Editor is a plain markdown `<textarea>`, constrained to `max-width: 820px`.
- Sidebar lists notes but has no search / sort / filter / multi-select.
- `notes` already has native `tags text[]` and `detail jsonb` columns; TipTap is not installed.

## What I'll build

### 1. Saving works
- Allow save when title **or** body has content (auto-fill "Untitled" when title blank), so notes always save.
- Keep writing `notes` only: `body_html` = TipTap HTML, `body_text` = plain text, `body_markdown` = HTML (kept populated for cross-app readability), plus `tags`, `detail`.

### 2. TipTap editor (full width)
- Add deps: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-placeholder`.
- New `src/components/editor/NoteEditor.tsx` adapting Nox Notes Studio's layout (big title input, meta row with updated/created, sticky toolbar) but with a **standard StarterKit TipTap** editor.
- Toolbar: bold/italic/strike, H1–H3, lists, quote, code, undo/redo, insert link, insert image/attachment.
- Main content area uses **full width** (remove the `maxWidth: 820` / `300px 1fr` clamp; editor spans the available column).
- TipTap content stored as HTML in `body_html`.

### 3. Attachments (drag & drop + inline) with preview
- Create a private Supabase Storage bucket `note-attachments` with RLS on `storage.objects` scoping each file to the owner's folder (`{centralId}/...`).
- Drag-and-drop onto the editor (and a toolbar button) uploads to the bucket; images insert inline via TipTap Image, other files attach as metadata.
- Attachment metadata stored in `notes.detail.attachments` (array of `{ path, name, mime, size }`). No extra tables — stays within notes-only writes.
- **Preview panel below the editor**: image thumbnails, file cards (icon + name + download via signed URL), and a list of links found in the note.

### 4. Inline links + link preview
- TipTap Link extension for inline links (add-link dialog, click to open).
- Below the note, a "Links" section derived by parsing `<a href>` from `body_html`, each with a lightweight preview (favicon + hostname + label).

### 5. Tags per note
- Tag editor in the note (chip input): add by typing + Enter, remove with ×.
- Persisted to the native `notes.tags text[]` column (no extra table).

### 6. History side panel: search / sort / filter / multi-select / bulk actions
- Rework the left sidebar into a richer history panel:
  - **Search** box (title + body text).
  - **Sort**: updated (default), created, title A–Z.
  - **Filter**: by project, by "linked to objective", by tag.
  - **Multi-select** mode: checkboxes on cards; selection toolbar with:
    - **Delete** (soft-archive via `detail.archived = true`, existing pattern; confirm dialog).
    - **Assign to project** (sets `detail.project_id` on each selected note).
- Implemented with existing shadcn components (input, select, checkbox, dropdown-menu, alert-dialog).

## Data-access additions (`src/lib/xcamp-api.ts`)
- Extend `createNote`/`updateNote` to accept `bodyHtml`, `tags`, and `detail.attachments`.
- `bulkArchive(noteIds)` and `bulkAssignProject(noteIds, projectId)` — both update only `notes`, scoped by `owner_central_id`.
- `uploadAttachment(file)` / `getAttachmentUrl(path)` using the storage bucket.
- `listNotes` already returns everything needed; add `tags` to the selected columns and `NoteRow`.

## Backend change (only one)
- New private storage bucket `note-attachments` + RLS policies on `storage.objects` (owner-scoped by first path segment). No schema migrations — tags/attachments reuse existing `notes` columns, honoring the "Journal writes only `notes`" contract.

## Out of scope (flag)
- No AI tag suggestions, collaborators, or sharing (present in Nox Notes Studio but not requested here).
- Deletion stays **soft** (archive), consistent with the current app and the shared-DB contract; say the word if you want hard deletes.

## Verification
- Create a note with title only, body only, and both → all save.
- Drag an image and a PDF in → image renders inline, PDF shows as a file card with working download; both persist after reload.
- Add inline link → appears in editor and in the Links preview.
- Add/remove tags → persisted in `notes.tags`.
- Search/sort/filter narrow the list; multi-select + delete and + assign-to-project update the right notes.
