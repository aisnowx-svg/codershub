-- ======================================================================
-- CODE SOCIAL — SUPABASE POSTGRESQL SCHEMA & MIGRATIONS
-- Project: snowbrain-dev (isolated CODE SOCIAL namespace)
-- ======================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================================
-- 1. PROFILES TABLE (Safe, non-destructive alterations)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Safely add CODE SOCIAL profile fields without touching existing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'Developer / Builder';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty text DEFAULT 'Systems';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_handle text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tech_stack text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_building jsonb DEFAULT NULL;

-- Unique constraint on username (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- ======================================================================
-- 2. TECHNOLOGIES
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.technologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  category text DEFAULT 'General',
  icon_url text,
  created_at timestamptz DEFAULT now()
);

-- ======================================================================
-- 3. PROFILE_TECHNOLOGIES (Many-to-Many)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.profile_technologies (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technology_id uuid NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, technology_id)
);

-- ======================================================================
-- 4. PROJECTS
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tagline text DEFAULT '',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active', -- 'active' | 'incubating' | 'archived'
  category text NOT NULL DEFAULT 'AI', -- 'AI' | 'Systems' | 'Web' | 'Mobile' | 'Open Source' | 'Data'
  primary_tech text NOT NULL DEFAULT 'TypeScript',
  tech_stack text[] DEFAULT '{}',
  repository_url text DEFAULT '',
  website_url text DEFAULT '',
  demo_url text DEFAULT '',
  stars int DEFAULT 0,
  fork_count int DEFAULT 0,
  build_activity_count int DEFAULT 0,
  original_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ======================================================================
-- 5. PROJECT_TECHNOLOGIES
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.project_technologies (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  technology_id uuid NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, technology_id)
);

-- ======================================================================
-- 6. PROJECT_MEMBERS (Collaborators)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Contributor',
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- ======================================================================
-- 7. BUILD_LOGS (CODE SOCIAL Core Content)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.build_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_number int DEFAULT 1,
  title text NOT NULL,
  summary text DEFAULT '',
  content text DEFAULT '',
  changes text[] DEFAULT '{}',
  tech_stack text[] DEFAULT '{}',
  commit_hash text,
  repository_url text,
  demo_url text,
  diff_snippet jsonb DEFAULT NULL,
  fire_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  fork_count int DEFAULT 0,
  status text NOT NULL DEFAULT 'published', -- 'draft' | 'published'
  is_draft boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz DEFAULT now()
);

-- ======================================================================
-- 8. BUILD_LOG_MEDIA
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.build_log_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_log_id uuid NOT NULL REFERENCES public.build_logs(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'image', -- 'image' | 'video' | 'attachment'
  url text NOT NULL,
  caption text DEFAULT '',
  aspect_ratio text,
  created_at timestamptz DEFAULT now()
);

-- ======================================================================
-- 9. COMMENTS
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_log_id uuid NOT NULL REFERENCES public.build_logs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ======================================================================
-- 10. USER_FOLLOWS
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- ======================================================================
-- 11. PROJECT_FOLLOWS (Stars/Follows)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.project_follows (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

-- ======================================================================
-- 12. NOTIFICATIONS
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'user_followed' | 'project_followed' | 'comment_received' | 'collaboration_request' | 'collaboration_accepted'
  target_id text,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ======================================================================
-- 13. COLLABORATION POSITIONS & REQUESTS
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.collaboration_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  skills text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open', -- 'open' | 'filled'
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collaboration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position text NOT NULL,
  pitch text DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined'
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id, position)
);

-- ======================================================================
-- 14. GITHUB ABSTRACTION TABLES
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.github_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  github_user_id bigint,
  github_username text NOT NULL,
  avatar_url text,
  profile_url text,
  public_repo_count int DEFAULT 0,
  total_stars int DEFAULT 0,
  sync_status text DEFAULT 'synced',
  connected_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.github_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.github_accounts(id) ON DELETE CASCADE,
  github_repo_id bigint NOT NULL,
  full_name text NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  html_url text NOT NULL,
  default_branch text DEFAULT 'main',
  is_private boolean DEFAULT false,
  is_fork boolean DEFAULT false,
  primary_language text DEFAULT '',
  languages jsonb DEFAULT '{}',
  stars_count int DEFAULT 0,
  forks_count int DEFAULT 0,
  open_issues_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_github_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  github_repo_id bigint NOT NULL,
  repository_full_name text NOT NULL,
  html_url text NOT NULL,
  default_branch text DEFAULT 'main',
  primary_language text DEFAULT '',
  is_primary boolean DEFAULT true,
  root_directory text,
  linked_at timestamptz DEFAULT now(),
  UNIQUE (project_id, github_repo_id)
);

-- ======================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ======================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_log_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_github_repositories ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Technologies Policies
DROP POLICY IF EXISTS "Technologies are viewable by everyone" ON public.technologies;
CREATE POLICY "Technologies are viewable by everyone" ON public.technologies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert technologies" ON public.technologies;
CREATE POLICY "Authenticated users can insert technologies" ON public.technologies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Profile Technologies Policies
DROP POLICY IF EXISTS "Profile technologies are viewable by everyone" ON public.profile_technologies;
CREATE POLICY "Profile technologies are viewable by everyone" ON public.profile_technologies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile technologies" ON public.profile_technologies;
CREATE POLICY "Users can manage own profile technologies" ON public.profile_technologies
  FOR ALL USING (auth.uid() = profile_id);

-- Projects Policies
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.projects;
CREATE POLICY "Projects are viewable by everyone" ON public.projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners and members can update projects" ON public.projects;
CREATE POLICY "Owners and members can update projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can delete projects" ON public.projects;
CREATE POLICY "Owners can delete projects" ON public.projects
  FOR DELETE USING (auth.uid() = owner_id);

-- Project Technologies Policies
DROP POLICY IF EXISTS "Project technologies viewable by everyone" ON public.project_technologies;
CREATE POLICY "Project technologies viewable by everyone" ON public.project_technologies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Project owners can manage technologies" ON public.project_technologies;
CREATE POLICY "Project owners can manage technologies" ON public.project_technologies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

-- Project Members Policies
DROP POLICY IF EXISTS "Project members viewable by everyone" ON public.project_members;
CREATE POLICY "Project members viewable by everyone" ON public.project_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
CREATE POLICY "Project owners can manage members" ON public.project_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

-- Build Logs Policies
DROP POLICY IF EXISTS "Published build logs are viewable by everyone" ON public.build_logs;
CREATE POLICY "Published build logs are viewable by everyone" ON public.build_logs
  FOR SELECT USING (
    status = 'published' OR (auth.uid() IS NOT NULL AND author_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can create build logs" ON public.build_logs;
CREATE POLICY "Authenticated users can create build logs" ON public.build_logs
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own build logs" ON public.build_logs;
CREATE POLICY "Authors can update own build logs" ON public.build_logs
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own build logs" ON public.build_logs;
CREATE POLICY "Authors can delete own build logs" ON public.build_logs
  FOR DELETE USING (auth.uid() = author_id);

-- Build Log Media Policies
DROP POLICY IF EXISTS "Build log media viewable by everyone" ON public.build_log_media;
CREATE POLICY "Build log media viewable by everyone" ON public.build_log_media
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Log authors can manage media" ON public.build_log_media;
CREATE POLICY "Log authors can manage media" ON public.build_log_media
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.build_logs WHERE id = build_log_id AND author_id = auth.uid())
  );

-- Comments Policies
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.comments;
CREATE POLICY "Comments viewable by everyone" ON public.comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can post comments" ON public.comments;
CREATE POLICY "Authenticated users can post comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;
CREATE POLICY "Authors can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = author_id);

-- Follows Policies
DROP POLICY IF EXISTS "User follows viewable by everyone" ON public.user_follows;
CREATE POLICY "User follows viewable by everyone" ON public.user_follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own follows" ON public.user_follows;
CREATE POLICY "Users can manage own follows" ON public.user_follows
  FOR ALL USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Project follows viewable by everyone" ON public.project_follows;
CREATE POLICY "Project follows viewable by everyone" ON public.project_follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own project follows" ON public.project_follows;
CREATE POLICY "Users can manage own project follows" ON public.project_follows
  FOR ALL USING (auth.uid() = user_id);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Collaboration Policies
DROP POLICY IF EXISTS "Collaboration positions viewable by everyone" ON public.collaboration_positions;
CREATE POLICY "Collaboration positions viewable by everyone" ON public.collaboration_positions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Project owners can manage positions" ON public.collaboration_positions;
CREATE POLICY "Project owners can manage positions" ON public.collaboration_positions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Collaboration requests viewable by owner and requester" ON public.collaboration_requests;
CREATE POLICY "Collaboration requests viewable by owner and requester" ON public.collaboration_requests
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Users can create collaboration requests" ON public.collaboration_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- GitHub Abstraction Policies
DROP POLICY IF EXISTS "GitHub accounts viewable by everyone" ON public.github_accounts;
CREATE POLICY "GitHub accounts viewable by everyone" ON public.github_accounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own GitHub account" ON public.github_accounts;
CREATE POLICY "Users can manage own GitHub account" ON public.github_accounts
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "GitHub repositories viewable by everyone" ON public.github_repositories;
CREATE POLICY "GitHub repositories viewable by everyone" ON public.github_repositories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own GitHub repositories" ON public.github_repositories;
CREATE POLICY "Users can manage own GitHub repositories" ON public.github_repositories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.github_accounts WHERE id = account_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Project GitHub repositories viewable by everyone" ON public.project_github_repositories;
CREATE POLICY "Project GitHub repositories viewable by everyone" ON public.project_github_repositories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Project owners can manage linked repositories" ON public.project_github_repositories;
CREATE POLICY "Project owners can manage linked repositories" ON public.project_github_repositories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

-- ======================================================================
-- 16. AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ======================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_username text;
  v_display_name text;
BEGIN
  v_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  v_display_name := COALESCE(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    full_name,
    avatar_url,
    role,
    specialty,
    bio,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    v_username,
    v_display_name,
    v_display_name,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    'Developer / Builder',
    'Systems',
    'Building open source software tools and systems.',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ======================================================================
-- 17. SEED TECHNOLOGIES (Initial catalog)
-- ======================================================================
INSERT INTO public.technologies (name, description, category)
VALUES
  ('Rust', 'Systems programming, kernel runtimes, and low-latency engines', 'Languages'),
  ('Python', 'AI model pipelines, asynchronous inference, and ML platforms', 'Languages'),
  ('TypeScript', 'Modern web, CRDTs, and developer tooling', 'Languages'),
  ('React', 'Component-driven interactive web interfaces', 'Frontend'),
  ('FastAPI', 'High-throughput async SSE endpoints and microservices', 'Backend'),
  ('CUDA', 'GPU kernel acceleration and tensor operations', 'Hardware'),
  ('WebGPU', 'Next-generation browser compute shaders and graphics', 'Graphics'),
  ('PyTorch', 'Deep learning framework for flexible research and deployment', 'AI'),
  ('Go', 'Distributed storage, Raft consensus, and cloud infrastructure', 'Languages'),
  ('C++', 'High-performance embedded runtimes and game engines', 'Languages'),
  ('Linux', 'Kernel eBPF instrumentation and direct I/O systems', 'Systems'),
  ('io_uring', 'Linux kernel asynchronous I/O interface', 'Systems'),
  ('Vulkan', 'Cross-platform low-overhead graphics and compute API', 'Graphics'),
  ('Docker', 'Container virtualization and automated build environments', 'DevOps'),
  ('PostgreSQL', 'Advanced relational database with vector and JSON extensions', 'Database')
ON CONFLICT (name) DO NOTHING;

-- ======================================================================
-- 18. STORAGE BUCKET CREATION (run in SQL editor)
-- ======================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('code-social-media', 'code-social-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies
DROP POLICY IF EXISTS "Public Access to code-social-media" ON storage.objects;
CREATE POLICY "Public Access to code-social-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'code-social-media');

DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'code-social-media' AND
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'code-social-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'code-social-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
