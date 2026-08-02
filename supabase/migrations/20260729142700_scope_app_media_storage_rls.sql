-- Scope App media storage RLS to project-images subfolder.
-- Policies apply to storage.objects for authenticated users;
-- only project owners/managers may upload or update under project-images/.

DROP POLICY IF EXISTS "Project owners can upload project images" ON storage.objects;
CREATE POLICY "Project owners can upload project images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'App media'
    AND (storage.foldername(name))[1] = 'project-images'
    AND (
      EXISTS (
        SELECT 1
        FROM projects p
        WHERE (p.id)::text = (storage.foldername(objects.name))[2]
          AND (
            p.owner_central_id = (SELECT current_central_id())
            OR has_object_membership('project', p.id, ARRAY['owner_manager'])
          )
      )
    )
  );

DROP POLICY IF EXISTS "Project owners can update project images" ON storage.objects;
CREATE POLICY "Project owners can update project images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'App media'
    AND (storage.foldername(name))[1] = 'project-images'
    AND (
      EXISTS (
        SELECT 1
        FROM projects p
        WHERE (p.id)::text = (storage.foldername(objects.name))[2]
          AND (
            p.owner_central_id = (SELECT current_central_id())
            OR has_object_membership('project', p.id, ARRAY['owner_manager'])
          )
      )
    )
  );
