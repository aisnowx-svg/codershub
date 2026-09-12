-- ======================================================================
-- CODE SOCIAL — GITHUB APP INTEGRATION SECURITY & SCHEMA UPDATE
-- ======================================================================

-- 1. Add installation_id to github_accounts to store GitHub App installation reference
ALTER TABLE public.github_accounts 
ADD COLUMN IF NOT EXISTS installation_id bigint;

-- 2. Add indexes for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_github_accounts_user_id ON public.github_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_github_accounts_installation_id ON public.github_accounts(installation_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_account_id ON public.github_repositories(account_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_repo_id ON public.github_repositories(github_repo_id);
CREATE INDEX IF NOT EXISTS idx_project_github_repos_project_id ON public.project_github_repositories(project_id);

-- 3. Enhance RLS for github_repositories:
-- Public repositories are viewable by everyone.
-- Private repositories are ONLY viewable by the account owner.
DROP POLICY IF EXISTS "GitHub repositories viewable by everyone" ON public.github_repositories;
DROP POLICY IF EXISTS "Public repositories viewable by everyone, private only by owner" ON public.github_repositories;

CREATE POLICY "Public repositories viewable by everyone, private only by owner" 
ON public.github_repositories
FOR SELECT USING (
  is_private = false OR 
  EXISTS (
    SELECT 1 FROM public.github_accounts 
    WHERE public.github_accounts.id = public.github_repositories.account_id 
      AND public.github_accounts.user_id = auth.uid()
  )
);

-- 4. Verify RLS is enabled on all GitHub tables
ALTER TABLE public.github_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_github_repositories ENABLE ROW LEVEL SECURITY;
