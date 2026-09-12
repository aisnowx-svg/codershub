-- ======================================================================
-- CODE SOCIAL — GITHUB APP INTEGRATION HARDENING & CONSTRAINTS
-- ======================================================================

-- 1. Ensure installation_id column exists on github_accounts
ALTER TABLE public.github_accounts 
ADD COLUMN IF NOT EXISTS installation_id bigint;

-- 2. Ensure UNIQUE index on github_accounts(github_user_id)
-- Guarantees one-to-one mapping between GitHub identities and CODE SOCIAL users
CREATE UNIQUE INDEX IF NOT EXISTS idx_github_accounts_github_user_id 
ON public.github_accounts(github_user_id);

-- 3. Ensure UNIQUE index on github_repositories(account_id, github_repo_id)
-- This is strictly required for Supabase/PostgreSQL upsert:
-- .upsert(..., { onConflict: 'account_id,github_repo_id' })
CREATE UNIQUE INDEX IF NOT EXISTS idx_github_repositories_account_repo 
ON public.github_repositories(account_id, github_repo_id);

-- 4. Add index on github_accounts(installation_id) for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_github_accounts_installation_id 
ON public.github_accounts(installation_id);

-- 5. Add index on project_github_repositories for fast project lookup
CREATE INDEX IF NOT EXISTS idx_project_github_repositories_repo_id 
ON public.project_github_repositories(github_repo_id);
