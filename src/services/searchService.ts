import { profileService } from './profileService';
import { projectService } from './projectService';
import { supabase } from '../lib/supabase';
import { DeveloperProfile, Project, BuildLog } from '../types';

export interface SearchResults {
  developers: DeveloperProfile[];
  projects: Project[];
  buildLogs: BuildLog[];
  technologies: { name: string; count: number; desc: string }[];
}

export const searchService = {
  /**
   * Unified search across developers, projects, build logs, and technologies
   */
  async searchAll(query: string, currentUserId?: string): Promise<SearchResults> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return {
        developers: [],
        projects: [],
        buildLogs: [],
        technologies: [],
      };
    }

    const [devs, projs, logs, techRows] = await Promise.all([
      profileService.getProfiles({ query: cleanQuery, currentUserId }),
      projectService.getProjects({ query: cleanQuery }, currentUserId),
      supabase
        .from('build_logs')
        .select('*, profiles:author_id(id, username, full_name, avatar_url), projects:project_id(id, name, website_url), build_log_changes(*), build_log_media(*)')
        .eq('status', 'published')
        .or(`title.ilike.%${cleanQuery}%,content.ilike.%${cleanQuery}%`)
        .limit(20),
      supabase
        .from('technologies')
        .select('*')
        .ilike('name', `%${cleanQuery}%`),
    ]);

    const mappedLogs = (logs.data || []).map((r) => {
      const profile = r.profiles;
      const project = r.projects;
      const changes = Array.isArray(r.build_log_changes) && r.build_log_changes.length > 0
        ? r.build_log_changes.map((c: any) => c.summary).filter(Boolean)
        : [r.content || r.title];

      return {
        id: r.id,
        projectId: r.project_id,
        projectName: project?.name || 'Project',
        authorId: r.author_id,
        authorName: profile?.full_name || profile?.username || 'Builder',
        authorHandle: profile?.username || 'builder',
        authorAvatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        dayNumber: 1,
        title: r.title,
        summary: r.content || r.title,
        changes,
        techStack: ['TypeScript'],
        fireCount: 0,
        commentsCount: 0,
        forkCount: 0,
        createdAt: 'Recently',
      };
    });

    const mappedTech = (techRows.data || []).map((t) => ({
      name: t.name,
      count: 0,
      desc: 'Technology',
    }));

    return {
      developers: devs,
      projects: projs,
      buildLogs: mappedLogs as BuildLog[],
      technologies: mappedTech,
    };
  },
};
