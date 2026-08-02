-- Fix: scope App media bucket write policies to project owners/managers only
--
-- Finding: the two blanket INSERT/UPDATE policies below allowed any authenticated
-- user to upload or overwrite any object in this bucket, bypassing the correctly-
-- scoped projects_update table policy entirely.
--
-- Bucket layout (confirmed against live data):
--   project-images/{project_id}/{timestamp}.ext  — per-project feature images
--   Hero/{filename}.ext                          — static hero backgrounds (admin-managed, read-only from app)
--   Xcamp-Nox Home Background *.png              — root-level static assets (admin-managed, read-only from app)
--
-- Only project-images/ has an upload code path in the app (project-details.tsx).
-- Hero/ and root files are never uploaded via the client; they remain admin-managed
-- and are not covered by the new INSERT/UPDATE policies.

-- Remove blanket authenticated-user write policies
DROP POLICY IF EXISTS "authenticated users can upload to App media" ON storage.objects;
DROP POLICY IF EXISTS "authenticated users can update App media" ON storage.objects;

-- INSERT: project owner or owner_manager can upload into project-images/{project_id}/
-- Mirrors the logic already proven correct on the projects_update table policy:
--   owner_central_id = current_central_id() OR has_object_membership('project', id, ['owner_manager'])
CREATE POLICY "Project owners can upload project images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'App media'
  AND (storage.foldername(name))[1] = 'project-images'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND (
        p.owner_central_id = (SELECT current_central_id())
        OR has_object_membership('project', p.id, ARRAY['owner_manager'])
      )
  )
);

-- UPDATE: same ownership check for overwrites (covers upsert: true re-uploads in
-- project-details.tsx which issues a PUT when the object already exists)
CREATE POLICY "Project owners can update project images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'App media'
  AND (storage.foldername(name))[1] = 'project-images'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND (
        p.owner_central_id = (SELECT current_central_id())
        OR has_object_membership('project', p.id, ARRAY['owner_manager'])
      )
  )
);
