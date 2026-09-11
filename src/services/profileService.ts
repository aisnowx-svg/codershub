import { supabase } from '../lib/supabase';
import { DeveloperProfile, DeveloperSpecialty } from '../types';

export function mapDbProfileToDomain(row: any, counts?: {
  followersCount?: number;
  followingCount?: number;
  projectsCount?: number;
  buildsCount?: number;
  isFollowing?: boolean;
}): DeveloperProfile {
  return {
    id: row.id,
    name: row.full_name || row.username || 'Developer',
    handle: row.username || 'builder',
    avatar: row.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: row.role || 'Developer / Builder',
    specialty: (row.specialty as DeveloperSpecialty) || 'Systems',
    bio: row.bio || 'Building software tools and open source systems.',
    location: row.location || '',
    website: row.website_url || undefined,
    githubHandle: row.github_handle || '',
    followersCount: counts?.followersCount ?? 0,
    followingCount: counts?.followingCount ?? 0,
    projectsCount: counts?.projectsCount ?? 0,
    buildsCount: counts?.buildsCount ?? 0,
    proofOfWork: {
      projectsShipped: counts?.projectsCount ?? 0,
      openSourceProjects: 0,
      githubContributions: 0,
      buildLogsCount: counts?.buildsCount ?? 0,
      collaborationsCount: 0,
    },
    currentlyBuilding: row.currently_building || {
      projectId: '',
      projectName: '',
      description: '',
      progressPercentage: 0,
      latestMilestone: '',
    },
    techStack: Array.isArray(row.tech_stack) ? row.tech_stack : [],
    isFollowing: counts?.isFollowing ?? false,
  };
}

export const profileService = {
  /**
   * Retrieves profile by user ID with social & activity counters
   */
  async getProfile(userId: string, currentUserId?: string): Promise<DeveloperProfile | null> {
    const { data: row, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }

    if (!row) return null;

    // Fetch counts in parallel from real tables: follows, projects, build_logs
    const [
      { count: followersCount },
      { count: followingCount },
      { count: projectsCount },
      { count: buildsCount },
      isFollowingRes,
    ] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('build_logs').select('*', { count: 'exact', head: true }).eq('author_id', userId),
      currentUserId && currentUserId !== userId
        ? supabase.from('follows').select('follower_id').eq('follower_id', currentUserId).eq('following_id', userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return mapDbProfileToDomain(row, {
      followersCount: followersCount ?? 0,
      followingCount: followingCount ?? 0,
      projectsCount: projectsCount ?? 0,
      buildsCount: buildsCount ?? 0,
      isFollowing: !!isFollowingRes.data,
    });
  },

  /**
   * Retrieves profile by unique username handle
   */
  async getProfileByUsername(username: string, currentUserId?: string): Promise<DeveloperProfile | null> {
    const cleanUsername = username.replace(/^@/, '');
    const { data: row, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (error || !row) return null;
    return this.getProfile(row.id, currentUserId);
  },

  /**
   * Lists developers with optional filtering
   */
  async getProfiles(options?: {
    specialty?: string;
    tech?: string;
    query?: string;
    currentUserId?: string;
    limit?: number;
  }): Promise<DeveloperProfile[]> {
    let q = supabase.from('profiles').select('*');

    if (options?.specialty && options.specialty !== 'All') {
      q = q.eq('specialty', options.specialty);
    }

    if (options?.query) {
      const term = `%${options.query.toLowerCase()}%`;
      q = q.or(`full_name.ilike.${term},username.ilike.${term},bio.ilike.${term}`);
    }

    if (options?.limit) {
      q = q.limit(options.limit);
    } else {
      q = q.limit(50);
    }

    const { data, error } = await q;
    if (error) {
      console.error('Error listing profiles:', error.message);
      return [];
    }

    // Filter by tech in memory if needed
    let rows = data || [];
    if (options?.tech) {
      const techLower = options.tech.toLowerCase();
      rows = rows.filter((r) =>
        Array.isArray(r.tech_stack) &&
        r.tech_stack.some((t: string) => t.toLowerCase() === techLower)
      );
    }

    return rows.map((r) => mapDbProfileToDomain(r));
  },

  /**
   * Upserts a profile record
   */
  async upsertProfile(profile: Partial<DeveloperProfile> & { id: string }): Promise<DeveloperProfile> {
    const payload: any = {
      id: profile.id,
      updated_at: new Date().toISOString(),
    };

    if (profile.handle) payload.username = profile.handle.replace(/^@/, '');
    if (profile.name) {
      payload.full_name = profile.name;
    }
    if (profile.avatar) payload.avatar_url = profile.avatar;
    if (profile.bio !== undefined) payload.bio = profile.bio;
    if (profile.role !== undefined) payload.role = profile.role;
    if (profile.specialty !== undefined) payload.specialty = profile.specialty;
    if (profile.githubHandle !== undefined) payload.github_handle = profile.githubHandle;
    if (profile.techStack !== undefined) payload.tech_stack = profile.techStack;

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Profile update error: ${error.message}`);
    }

    return mapDbProfileToDomain(data);
  },

  /**
   * Updates existing profile
   */
  async updateProfile(userId: string, partial: Partial<DeveloperProfile>): Promise<DeveloperProfile> {
    return this.upsertProfile({ ...partial, id: userId });
  },
};
