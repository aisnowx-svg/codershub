import { supabase } from '../lib/supabase';
import { Comment } from '../types';

export function mapDbCommentToDomain(row: any): Comment {
  const profile = row.profiles;
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

  return {
    id: row.id,
    buildLogId: row.build_log_id,
    authorId: row.author_id,
    authorName: profile?.full_name || profile?.username || 'Builder',
    authorHandle: profile?.username || 'builder',
    authorAvatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    content: row.content,
    createdAt: timeAgo,
  };
}

export const commentService = {
  /**
   * Retrieves comments for a build log ordered chronologically
   */
  async getComments(buildLogId: string): Promise<Comment[]> {
    const { data: rows, error } = await supabase
      .from('comments')
      .select('*, profiles:author_id(id, username, full_name, avatar_url)')
      .eq('build_log_id', buildLogId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error.message);
      return [];
    }

    return (rows || []).map(mapDbCommentToDomain);
  },

  /**
   * Adds a comment to a build log and creates notification for log author
   */
  async addComment(buildLogId: string, content: string, authorId: string): Promise<Comment> {
    const { data: row, error } = await supabase
      .from('comments')
      .insert({
        build_log_id: buildLogId,
        author_id: authorId,
        content: content.trim(),
      })
      .select('*, profiles:author_id(id, username, full_name, avatar_url)')
      .single();

    if (error) {
      throw new Error(`Error posting comment: ${error.message}`);
    }

    // Notify author if not self-comment
    const { data: log } = await supabase
      .from('build_logs')
      .select('author_id, title')
      .eq('id', buildLogId)
      .maybeSingle();

    if (log && log.author_id && log.author_id !== authorId) {
      await supabase.from('notifications').insert({
        recipient_id: log.author_id,
        actor_id: authorId,
        type: 'comment',
        title: 'New Comment',
        body: `commented on your build log: "${log.title.slice(0, 40)}"`,
        entity_id: buildLogId,
        entity_type: 'build_log',
        is_read: false,
      });
    }

    return mapDbCommentToDomain(row);
  },

  /**
   * Deletes own comment
   */
  async deleteComment(commentId: string, _buildLogId?: string): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      throw new Error(`Error deleting comment: ${error.message}`);
    }

    return true;
  },
};
