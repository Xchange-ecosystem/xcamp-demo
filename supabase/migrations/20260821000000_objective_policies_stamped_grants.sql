-- Objective Policies & Stamped Grants — Phase 1 schema
--
-- Context (Phase 0 findings): sharing today is enforced by THREE separate,
-- partially-inconsistent RLS-driving mechanisms — object_memberships,
-- collaborators (with a recursive get_effective_role() parent walk), and an
-- unused access_rights table. This migration does not touch any of them.
-- It adds a fourth, additive mechanism: node_grants, stamped onto content
-- nodes at attach time from an objective's active policies, resolved by a
-- single flat lookup (no recursion). Phase 3 will add node_grants as an
-- additional path in notes/objectives RLS, alongside the existing ones —
-- the legacy tables keep serving whatever they serve today unchanged.
--
-- Role seed rationale (Phase 0 decision 3): live object_memberships/
-- collaborators data is overwhelmingly owner/creator vs viewer (2 rows total
-- across both tables carry any intermediate role), i.e. effectively binary
-- today. Seeding owner/editor/viewer/none and stopping there, per the spec's
-- fallback. 'none' carries zero rights and exists so a direct grant can
-- explicitly toggle a principal's access off without deleting the row that
-- records the toggle (see node_grants below).
--
-- Rights seeded: read, write, link. `link` is not speculative — Phase 2 of
-- this build explicitly requires guarding the attach (link) operation, so it
-- is a real, immediately-consumed right, not a pre-seeded unused one.

-- ═══════════════════════════════════════════════════════════════════════
-- roles / role_rights
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE public.roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.role_rights (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id    uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  right_name text NOT NULL,
  UNIQUE (role_id, right_name)
);

INSERT INTO public.roles (name) VALUES ('owner'), ('editor'), ('viewer'), ('none');

INSERT INTO public.role_rights (role_id, right_name)
SELECT id, r
FROM public.roles, unnest(ARRAY['read', 'write', 'link']) AS r
WHERE name IN ('owner', 'editor')
UNION ALL
SELECT id, 'read'
FROM public.roles
WHERE name = 'viewer';
-- 'none' intentionally carries no rows — zero rights.

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.role_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_rights FORCE ROW LEVEL SECURITY;

-- Roles/rights are a shared, tenant-agnostic vocabulary — readable by any
-- authenticated user, writable only via migration/service-role.
CREATE POLICY "roles_select_authenticated" ON public.roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_rights_select_authenticated" ON public.role_rights
  FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- node_grants
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE public.node_grants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id        uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  principal_id   uuid NOT NULL REFERENCES public.central_users(id) ON DELETE CASCADE,
  role_id        uuid NOT NULL REFERENCES public.roles(id),
  granted_via    uuid REFERENCES public.objectives(id) ON DELETE CASCADE,
  policy_version int,
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES public.central_users(id)
);

-- "One grant per source per principal per node." NULL granted_via (direct
-- grants) needs its own partial unique index — plain NULL != NULL semantics
-- would otherwise allow duplicate direct-grant rows for the same principal.
CREATE UNIQUE INDEX node_grants_direct_unique
  ON public.node_grants (node_id, principal_id)
  WHERE granted_via IS NULL;

CREATE UNIQUE INDEX node_grants_stamped_unique
  ON public.node_grants (node_id, principal_id, granted_via)
  WHERE granted_via IS NOT NULL;

CREATE INDEX node_grants_node_idx ON public.node_grants (node_id);
CREATE INDEX node_grants_granted_via_idx ON public.node_grants (granted_via) WHERE granted_via IS NOT NULL;
CREATE INDEX node_grants_principal_idx ON public.node_grants (principal_id);

ALTER TABLE public.node_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_grants FORCE ROW LEVEL SECURITY;

-- No permissive policy yet: node_grants is written only by the SECURITY
-- DEFINER stamping/attach/detach RPCs added in Phase 2, and read only via
-- the flat-lookup helper those RPCs and Phase 3's notes RLS will call — both
-- run as definer and bypass RLS. Direct client access stays closed.
CREATE POLICY "node_grants_tenant_isolation" ON public.node_grants
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT current_user_tenant_ids()));

-- ═══════════════════════════════════════════════════════════════════════
-- objective_policies
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE public.objective_policies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id          uuid NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  policy_type           text NOT NULL CHECK (policy_type IN ('grant', 'value', 'assignment_rule')),
  applies_to_note_types text[],
  payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
  version               int NOT NULL DEFAULT 1,
  active                boolean NOT NULL DEFAULT true,
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES public.central_users(id)
);

CREATE INDEX objective_policies_objective_idx ON public.objective_policies (objective_id);
CREATE INDEX objective_policies_active_idx ON public.objective_policies (objective_id) WHERE active;

ALTER TABLE public.objective_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_policies FORCE ROW LEVEL SECURITY;

-- Same rationale as node_grants: mutated only by Phase 2's definer RPCs
-- (editing a policy inserts a new version rather than updating in place).
CREATE POLICY "objective_policies_tenant_isolation" ON public.objective_policies
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT current_user_tenant_ids()));

-- ═══════════════════════════════════════════════════════════════════════
-- policy_audit — append-only
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE public.policy_audit (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            uuid REFERENCES public.objective_policies(id) ON DELETE SET NULL,
  objective_id         uuid NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  action               text NOT NULL CHECK (action IN ('create', 'update', 'deactivate', 'apply_to_existing')),
  before                jsonb,
  after                jsonb,
  actor                uuid REFERENCES public.central_users(id),
  affected_node_count  int,
  tenant_id            uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX policy_audit_objective_idx ON public.policy_audit (objective_id);
CREATE INDEX policy_audit_policy_idx ON public.policy_audit (policy_id) WHERE policy_id IS NOT NULL;

ALTER TABLE public.policy_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_audit FORCE ROW LEVEL SECURITY;

CREATE POLICY "policy_audit_tenant_isolation" ON public.policy_audit
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id IN (SELECT current_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT current_user_tenant_ids()));

-- Append-only, enforced at the DB level rather than by convention.
CREATE FUNCTION public.policy_audit_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'policy_audit is append-only: % is not permitted', TG_OP;
END;
$$;

CREATE TRIGGER policy_audit_no_update
  BEFORE UPDATE ON public.policy_audit
  FOR EACH ROW EXECUTE FUNCTION public.policy_audit_block_mutation();

CREATE TRIGGER policy_audit_no_delete
  BEFORE DELETE ON public.policy_audit
  FOR EACH ROW EXECUTE FUNCTION public.policy_audit_block_mutation();

-- ═══════════════════════════════════════════════════════════════════════
-- Date normalisation
-- ═══════════════════════════════════════════════════════════════════════
-- Phase 0 scanned notes/objectives/projects/objective_notes/project_notes
-- (and, broadly, every public table) for date/timestamp values stored as
-- text/varchar. None were found — start_date/end_date are already `date`,
-- every *_at column is already `timestamptz`. No conversion needed.
