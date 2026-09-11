import { supabase } from '../lib/supabase';

export const followService = {
  /**
   * Follow a developer (uses public.follows table)
   */
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) return false;

    const { error } = await supabase
      .from('follows')
      .upsert(
        { follower_id: followerId, following_id: followingId },
        { onConflict: 'follower_id,following_id' }
      );

    if (error) {
      console.error('Error following user:', error.message);
      return false;
    }

    // Generate notification for followed developer
    await supabase.from('notifications').insert({
      recipient_id: followingId,
      actor_id: followerId,
      type: 'follow_dev',
      title: 'New Follower',
      body: 'started following your developer profile and builds.',
      entity_id: followerId,
      entity_type: 'developer',
      is_read: false,
    });

    return true;
  },

  /**
   * Unfollow a developer
   */
  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      console.error('Error unfollowing user:', error.message);
      return false;
    }
    return true;
  },

  /**
   * Check if follower is following user
   */
  async isFollowingUser(followerId: string, followingId: string): Promise<boolean> {
    if (!followerId || !followingId) return false;

    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    return !!data;
  },

  /**
   * Follow / Star a project (uses public.project_follows table)
   */
  async followProject(userId: string, projectId: string): Promise<boolean> {
    const { error } = await supabase
      .from('project_follows')
      .upsert(
        { user_id: userId, project_id: projectId },
        { onConflict: 'user_id,project_id' }
      );

    if (error) {
      console.error('Error following project:', error.message);
      return false;
    }

    // Fetch project details for notification
    const { data: proj } = await supabase
      .from('projects')
      .select('owner_id, name')
      .eq('id', projectId)
      .maybeSingle();

    if (proj && proj.owner_id && proj.owner_id !== userId) {
      await supabase.from('notifications').insert({
        recipient_id: proj.owner_id,
        actor_id: userId,
        type: 'follow_project',
        title: 'Project Starred',
        body: `starred and followed your project @${proj.name}.`,
        entity_id: projectId,
        entity_type: 'project',
        is_read: false,
      });
    }

    return true;
  },

  /**
   * Unfollow / Unstar a project
   */
  async unfollowProject(userId: string, projectId: string): Promise<boolean> {
    const { error } = await supabase
      .from('project_follows')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error unfollowing project:', error.message);
      return false;
    }

    return true;
  },

  /**
   * Check if user follows project
   */
  async isFollowingProject(userId: string, projectId: string): Promise<boolean> {
    if (!userId || !projectId) return false;

    const { data } = await supabase
      .from('project_follows')
      .select('user_id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();

    return !!data;
  },
};
