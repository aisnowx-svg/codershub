import { supabase } from '../lib/supabase';
import { BuildLog, CreateBuildLogInput } from '../types';

export function mapDbBuildLogToDomain(
  row: any,
  counts?: { fireCount?: number; commentsCount?: number; isLiked?: boolean }
): BuildLog {
  const profile = row.profiles;
  const project = row.projects;

  // Format relative timestamp
  const createdAtDate = new Date(row.created_at);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - createdAtDate.getTime()) / 1000);
  let timeAgo = 'Just now';
  if (diffSec >= 86400) {
    const days = Math.floor(diffSec / 86400);
    timeAgo = `${days}d ago`;
  } else if (diffSec >= 3600) {
    const hours = Math.floor(diffSec / 3600);
    timeAgo = `${hours}h ago`;
  } else if (diffSec >= 60) {
    const minutes = Math.floor(diffSec / 60);
    timeAgo = `${minutes}m ago`;
  }

  // Extract changes from build_log_changes table relation or fallback
  const changes = Array.isArray(row.build_log_changes) && row.build_log_changes.length > 0
    ? row.build_log_changes.map((c: any) => c.summary).filter(Boolean)
    : [row.content || row.title];

  // Extract media from build_log_media table relation
  const media = Array.isArray(row.build_log_media) && row.build_log_media.length > 0
    ? row.build_log_media.map((m: any) => ({
        id: m.id,
        type: (m.media_type as any) || 'image',
        url: m.storage_path,
        caption: m.caption || undefined,
      }))
    : [];

  return {
    id: row.id,
    projectId: row.project_id,
    projectName: project?.name || 'Project',
    authorId: row.author_id,
    authorName: profile?.full_name || profile?.username || 'Builder',
    authorHandle: profile?.username || 'builder',
    authorAvatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    dayNumber: 1,
    title: row.title,
    summary: row.content || row.title,
    changes,
    techStack: ['TypeScript'],
    repositoryUrl: project?.website_url || undefined,
    media,
    fireCount: counts?.fireCount ?? 0,
    commentsCount: counts?.commentsCount ?? 0,
    forkCount: 0,
    createdAt: timeAgo,
    isLiked: counts?.isLiked ?? false,
    isDraft: row.status === 'draft',
  };
}

async function attachCounts(rows: any[], currentUserId?: string): Promise<BuildLog[]> {
  if (!rows || rows.length === 0) return [];
  const logIds = rows.map((r) => r.id);

  const [reactionsRes, commentsRes, userReactionsRes] = await Promise.all([
    supabase.from('reactions').select('build_log_id').in('build_log_id', logIds),
    supabase.from('comments').select('build_log_id').in('build_log_id', logIds),
    currentUserId
      ? supabase.from('reactions').select('build_log_id').eq('user_id', currentUserId).in('build_log_id', logIds)
      : Promise.resolve({ data: [] }),
  ]);

  const reactionCounts: Record<string, number> = {};
  (reactionsRes.data || []).forEach((r) => {
    reactionCounts[r.build_log_id] = (reactionCounts[r.build_log_id] || 0) + 1;
  });

  const commentCounts: Record<string, number> = {};
  (commentsRes.data || []).forEach((c) => {
    commentCounts[c.build_log_id] = (commentCounts[c.build_log_id] || 0) + 1;
  });

  const userLikedSet = new Set((userReactionsRes.data || []).map((r) => r.build_log_id));

  return rows.map((r) =>
    mapDbBuildLogToDomain(r, {
      fireCount: reactionCounts[r.id] || 0,
      commentsCount: commentCounts[r.id] || 0,
      isLiked: userLikedSet.has(r.id),
    })
  );
}

export const buildLogService = {
  /**
   * Retrieves build logs for home feed
   */
  async getFeed(
    filter: 'for-you' | 'following' | 'projects' = 'for-you',
    currentUserId?: string,
    limit: number = 30
  ): Promise<BuildLog[]> {
    let q = supabase
      .from('build_logs')
      .select('*, profiles:author_id(id, username, full_name, avatar_url), projects:project_id(id, name, website_url), build_log_changes(*), build_log_media(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filter === 'following' && currentUserId) {
      const [{ data: userFollows }, { data: projFollows }] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
        supabase.from('project_follows').select('project_id').eq('user_id', currentUserId),
      ]);

      const followedUserIds = (userFollows || []).map((f) => f.following_id);
      const followedProjectIds = (projFollows || []).map((f) => f.project_id);

      if (followedUserIds.length > 0 || followedProjectIds.length > 0) {
        let orConditions: string[] = [];
        if (followedUserIds.length > 0) orConditions.push(`author_id.in.(${followedUserIds.join(',')})`);
        if (followedProjectIds.length > 0) orConditions.push(`project_id.in.(${followedProjectIds.join(',')})`);
        orConditions.push(`author_id.eq.${currentUserId}`);
        q = q.or(orConditions.join(','));
      }
    }

    const { data: rows, error } = await q;
    if (error) {
      console.error('Error fetching build logs feed:', error.message);
      return [];
    }

    return attachCounts(rows || [], currentUserId);
  },

  /**
   * Retrieves build logs for a specific project
   */
  async getBuildLogsByProject(projectId: string, currentUserId?: string): Promise<BuildLog[]> {
    const { data: rows, error } = await supabase
      .from('build_logs')
      .select('*, profiles:author_id(id, username, full_name, avatar_url), projects:project_id(id, name, website_url), build_log_changes(*), build_log_media(*)')
      .eq('project_id', projectId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project build logs:', error.message);
      return [];
    }

    return attachCounts(rows || [], currentUserId);
  },

  /**
   * Retrieves build logs written by a specific developer
   */
  async getBuildLogsByAuthor(authorId: string, currentUserId?: string): Promise<BuildLog[]> {
    const { data: rows, error } = await supabase
      .from('build_logs')
      .select('*, profiles:author_id(id, username, full_name, avatar_url), projects:project_id(id, name, website_url), build_log_changes(*), build_log_media(*)')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching author build logs:', error.message);
      return [];
    }

    return attachCounts(rows || [], currentUserId);
  },

  /**
   * Creates a new user-authored Build Log
   */
  async createBuildLog(
    input: CreateBuildLogInput,
    authorId: string
  ): Promise<BuildLog> {
    const payload = {
      project_id: input.projectId,
      author_id: authorId,
      title: input.title.trim(),
      content: (input.summary || input.title).trim(),
      status: input.isDraft ? 'draft' : 'published',
    };

    const { data: row, error } = await supabase
      .from('build_logs')
      .insert(payload)
      .select('*, profiles:author_id(id, username, full_name, avatar_url), projects:project_id(id, name, website_url)')
      .single();

    if (error) {
      throw new Error(`Create build log error: ${error.message}`);
    }

    // Insert change items into build_log_changes
    if (input.changes && input.changes.length > 0) {
      const changeRows = input.changes
        .filter((c) => c && c.trim())
        .map((c) => ({
          build_log_id: row.id,
          summary: c.trim(),
        }));
      if (changeRows.length > 0) {
        await supabase.from('build_log_changes').insert(changeRows);
      }
    }

    // Insert media into build_log_media
    if (input.media && input.media.length > 0) {
      const mediaRows = input.media.map((m) => ({
        build_log_id: row.id,
        storage_path: m.url,
        media_type: m.type || 'image',
      }));
      await supabase.from('build_log_media').insert(mediaRows);
    }

    // Auto-like own log
    await supabase.from('reactions').insert({
      user_id: authorId,
      build_log_id: row.id,
      reaction_type: 'fire',
    });

    return mapDbBuildLogToDomain(row, {
      fireCount: 1,
      commentsCount: 0,
      isLiked: true,
    });
  },

  /**
   * Updates an existing build log
   */
  async updateBuildLog(id: string, partial: Partial<BuildLog>): Promise<BuildLog> {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (partial.title) payload.title = partial.title.trim();
    if (partial.summary !== undefined) payload.content = partial.summary.trim();
    if (partial.isDraft !== undefined) {
      payload.status = partial.isDraft ? 'draft' : 'published';
    }

    const { data: row, error } = await supabase
      .from('build_logs')
      .update(payload)
      .eq('id', id)
      .select('*, profiles:author_id(id, username, full_name, avatar_url), projects:project_id(id, name, website_url), build_log_changes(*), build_log_media(*)')
      .single();

    if (error) {
      throw new Error(`Update build log error: ${error.message}`);
    }

    return mapDbBuildLogToDomain(row);
  },

  /**
   * Deletes a build log
   */
  async deleteBuildLog(id: string): Promise<boolean> {
    const { error } = await supabase.from('build_logs').delete().eq('id', id);
    if (error) {
      throw new Error(`Delete build log error: ${error.message}`);
    }
    return true;
  },

  /**
   * Toggles reaction on a build log using real reactions table
   */
  async toggleFire(logId: string, userId: string): Promise<{ isLiked: boolean; fireCount: number }> {
    if (!userId) throw new Error('Must be signed in to react');

    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('user_id', userId)
      .eq('build_log_id', logId)
      .maybeSingle();

    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('reactions').insert({
        user_id: userId,
        build_log_id: logId,
        reaction_type: 'fire',
      });
    }

    const { count } = await supabase
      .from('reactions')
      .select('*', { count: 'exact', head: true })
      .eq('build_log_id', logId);

    return {
      isLiked: !existing,
      fireCount: count || 0,
    };
  },
};
