import { supabase } from '../lib/supabase';
import { Project, ProjectCategory, ProjectStatus } from '../types';

export interface ProjectFilterOptions {
  category?: ProjectCategory | 'All';
  status?: ProjectStatus | 'All';
  tech?: string;
  query?: string;
  hasOpenPositions?: boolean;
}

export function mapDbProjectToDomain(row: any, contributors: any[] = [], isFollowing: boolean = false): Project {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.description || '',
    description: row.description || '',
    stars: row.stars || 0,
    forkCount: row.forkCount || 0,
    repositoryUrl: row.website_url || '',
    websiteUrl: row.website_url || undefined,
    demoUrl: row.website_url || undefined,
    primaryTech: 'TypeScript',
    techStack: ['TypeScript'],
    status: (row.status as ProjectStatus) || 'active',
    category: 'AI',
    ownerId: row.owner_id,
    contributors: contributors.length > 0 ? contributors : [
      {
        id: row.profiles?.id || row.owner_id || 'dev',
        name: row.profiles?.full_name || row.profiles?.username || 'Builder',
        handle: row.profiles?.username || 'builder',
        avatar: row.profiles?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'Creator & Maintainer',
      },
    ],
    buildActivityCount: 0,
    isFollowing,
  };
}

export const projectService = {
  /**
   * Fetches projects with filtering and search
   */
  async getProjects(params?: ProjectFilterOptions, currentUserId?: string): Promise<Project[]> {
    let q = supabase
      .from('projects')
      .select('*, profiles:owner_id(id, username, full_name, avatar_url)')
      .order('created_at', { ascending: false });

    if (params?.status && params.status !== 'All') {
      q = q.eq('status', params.status);
    }
    if (params?.query) {
      const term = `%${params.query.toLowerCase()}%`;
      q = q.or(`name.ilike.${term},description.ilike.${term}`);
    }

    const { data: rows, error } = await q;
    if (error) {
      console.error('Error fetching projects:', error.message);
      return [];
    }

    if (!rows || rows.length === 0) return [];

    // Query star counts from project_follows
    const [{ data: follows }, { data: allProjectFollows }, { data: forks }] = await Promise.all([
      currentUserId
        ? supabase.from('project_follows').select('project_id').eq('user_id', currentUserId)
        : Promise.resolve({ data: [] }),
      supabase.from('project_follows').select('project_id'),
      supabase.from('forks').select('source_project_id'),
    ]);

    const userFollowSet = new Set((follows || []).map((f) => f.project_id));
    const starsMap: Record<string, number> = {};
    (allProjectFollows || []).forEach((f) => {
      starsMap[f.project_id] = (starsMap[f.project_id] || 0) + 1;
    });

    const forksMap: Record<string, number> = {};
    (forks || []).forEach((f) => {
      forksMap[f.source_project_id] = (forksMap[f.source_project_id] || 0) + 1;
    });

    return rows.map((r) => {
      const p = mapDbProjectToDomain(r, [], userFollowSet.has(r.id));
      p.stars = starsMap[r.id] || 0;
      p.forkCount = forksMap[r.id] || 0;
      return p;
    });
  },

  /**
   * Retrieves single project by ID with members & follower status
   */
  async getProjectById(id: string, currentUserId?: string): Promise<Project | null> {
    const { data: row, error } = await supabase
      .from('projects')
      .select('*, profiles:owner_id(id, username, full_name, avatar_url)')
      .eq('id', id)
      .maybeSingle();

    if (error || !row) return null;

    // Load contributors from project_members
    const [{ data: members }, { count: starCount }, { count: forkCount }, isFollowingRes] = await Promise.all([
      supabase
        .from('project_members')
        .select('role, profiles:user_id(id, username, full_name, avatar_url)')
        .eq('project_id', id),
      supabase
        .from('project_follows')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id),
      supabase
        .from('forks')
        .select('*', { count: 'exact', head: true })
        .eq('source_project_id', id),
      currentUserId
        ? supabase.from('project_follows').select('user_id').eq('project_id', id).eq('user_id', currentUserId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const contributors = (members || []).map((m: any) => ({
      id: m.profiles?.id || 'm-id',
      name: m.profiles?.full_name || m.profiles?.username || 'Contributor',
      handle: m.profiles?.username || 'contributor',
      avatar: m.profiles?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: m.role || 'Contributor',
    }));

    const p = mapDbProjectToDomain(row, contributors, !!isFollowingRes.data);
    p.stars = starCount || 0;
    p.forkCount = forkCount || 0;
    return p;
  },

  /**
   * Creates a new project in PostgreSQL database
   */
  async createProject(
    projectData: Omit<Project, 'id' | 'stars' | 'forkCount' | 'buildActivityCount' | 'contributors'> & { contributors?: any[] },
    ownerId: string
  ): Promise<Project> {
    const slug = (projectData.name || 'project')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now().toString().slice(-4)}`;

    const payload = {
      owner_id: ownerId,
      name: projectData.name.trim(),
      slug,
      description: (projectData.description || projectData.tagline || '').trim(),
      status: projectData.status || 'active',
      website_url: (projectData.websiteUrl || projectData.repositoryUrl || '').trim(),
    };

    const { data: row, error } = await supabase
      .from('projects')
      .insert(payload)
      .select('*, profiles:owner_id(id, username, full_name, avatar_url)')
      .single();

    if (error) {
      throw new Error(`Create project error: ${error.message}`);
    }

    // Auto-follow own project
    await supabase.from('project_follows').insert({
      user_id: ownerId,
      project_id: row.id,
    });

    const p = mapDbProjectToDomain(row, [], true);
    p.stars = 1;
    return p;
  },

  /**
   * Updates an existing project
   */
  async updateProject(id: string, partial: Partial<Project>): Promise<Project> {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (partial.name) payload.name = partial.name.trim();
    if (partial.description !== undefined) payload.description = partial.description.trim();
    if (partial.status) payload.status = partial.status;
    if (partial.websiteUrl !== undefined) payload.website_url = partial.websiteUrl.trim();

    const { data: row, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .select('*, profiles:owner_id(id, username, full_name, avatar_url)')
      .single();

    if (error) {
      throw new Error(`Update project error: ${error.message}`);
    }

    return mapDbProjectToDomain(row);
  },

  /**
   * Deletes a project by ID
   */
  async deleteProject(id: string): Promise<boolean> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      throw new Error(`Delete project error: ${error.message}`);
    }
    return true;
  },

  /**
   * Forks an existing project
   */
  async forkProject(
    sourceProjectId: string,
    forkedName: string,
    author: { id: string; name: string; handle: string; avatar: string }
  ): Promise<Project> {
    const original = await this.getProjectById(sourceProjectId);
    if (!original) {
      throw new Error(`Source project ${sourceProjectId} not found`);
    }

    const slug = `${forkedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const payload = {
      owner_id: author.id,
      name: forkedName.trim(),
      slug,
      description: `Community fork of ${original.name}. ${original.description}`,
      status: 'active',
      website_url: original.websiteUrl || '',
    };

    const { data: row, error } = await supabase
      .from('projects')
      .insert(payload)
      .select('*, profiles:owner_id(id, username, full_name, avatar_url)')
      .single();

    if (error) {
      throw new Error(`Fork project error: ${error.message}`);
    }

    // Record in forks table
    await supabase.from('forks').insert({
      source_project_id: sourceProjectId,
      forked_project_id: row.id,
    });

    return mapDbProjectToDomain(row, [], true);
  },

  /**
   * Lists distinct technologies from database with project count
   */
  async getTechnologies(): Promise<{ name: string; count: number; desc: string }[]> {
    const { data: techRows } = await supabase
      .from('technologies')
      .select('name, description')
      .order('name');

    if (!techRows || techRows.length === 0) {
      return [
        { name: 'Rust', count: 0, desc: 'Systems programming, kernel runtimes, and low-latency engines' },
        { name: 'Python', count: 0, desc: 'AI model pipelines, asynchronous inference, and ML platforms' },
        { name: 'TypeScript', count: 0, desc: 'WebGPU graphics, collaborative CRDTs, and modern frontend' },
        { name: 'FastAPI', count: 0, desc: 'High-throughput async SSE endpoints and microservices' },
        { name: 'CUDA', count: 0, desc: 'GPU kernel acceleration and tensor operations' },
        { name: 'WebGPU', count: 0, desc: 'Next-generation browser compute shaders and graphics' },
        { name: 'Go', count: 0, desc: 'Distributed storage, Raft consensus, and cloud infrastructure' },
      ];
    }

    return techRows.map((t) => ({
      name: t.name,
      count: 0,
      desc: t.description || 'Modern software development technology',
    }));
  },
};
