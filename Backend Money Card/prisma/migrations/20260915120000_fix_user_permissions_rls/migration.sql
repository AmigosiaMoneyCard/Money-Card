-- Migration: Fix Security and Enable Row Level Security (RLS) on public.user_permissions
-- Description:
-- 1. Enables Row Level Security (RLS) on public.user_permissions.
-- 2. Revokes all permissions from anon to prevent unauthenticated data exposure.
-- 3. Revokes mutation privileges (INSERT, UPDATE, DELETE, TRUNCATE) from authenticated users to prevent privilege self-escalation.
-- 4. Grants SELECT only to authenticated users subject to RLS policy.
-- 5. Adds index on "userId" foreign key column to optimize RLS policy evaluation.
-- 6. Creates restrictive RLS SELECT policy ensuring users can only view their own permissions,
--    while Org Admins can view staff permissions in their organization, and Super Admins can view all permissions.

-- Step 1: Enable Row Level Security
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Step 2: Minimize Role Privileges
-- Revoke all access from anon
REVOKE ALL ON public.user_permissions FROM anon;

-- Revoke mutation access from authenticated role (permission changes must flow through server-side business logic)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_permissions FROM authenticated;

-- Ensure authenticated role can only SELECT subject to RLS
GRANT SELECT ON public.user_permissions TO authenticated;

-- Step 3: Add Index for RLS Policy Performance
CREATE INDEX IF NOT EXISTS "idx_user_permissions_userId" ON public.user_permissions ("userId");

-- Step 4: Create Restrictive RLS Policies
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;

CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (
    -- User can view their own permissions (supports both Supabase UUIDs and standard text IDs)
    "userId" = coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (auth.jwt() ->> 'sub'))
    OR EXISTS (
        SELECT 1 FROM public.users AS caller
        WHERE caller.id = coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (auth.jwt() ->> 'sub'))
          AND (
            -- Super Admin can inspect permissions across the platform
            caller.role = 'SUPER_ADMIN'
            OR (
                -- Org Admin can inspect permissions within their own organization
                caller.role = 'ORG_ADMIN'
                AND caller."organizationId" IS NOT NULL
                AND caller."organizationId" = (
                    SELECT target."organizationId"
                    FROM public.users AS target
                    WHERE target.id = public.user_permissions."userId"
                )
            )
          )
    )
);
