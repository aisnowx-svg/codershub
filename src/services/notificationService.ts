import { supabase } from '../lib/supabase';
import { NotificationItem, NotificationType } from '../types';

export function mapDbNotificationToDomain(row: any): NotificationItem {
  const actor = row.actor;

  const createdAtDate = new Date(row.created_at);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - createdAtDate.getTime()) / 1000);
  let timeAgo = 'Just now';
  if (diffSec >= 86400) {
    timeAgo = `${Math.floor(diffSec / 86400)}d ago`;
  } else if (diffSec >= 3600) {
    timeAgo = `${Math.floor(diffSec / 3600)}h ago`;
  } else if (diffSec >= 60) {
    timeAgo = `${Math.floor(diffSec / 60)}m ago`;
  }

  // Map db type to frontend NotificationType
  let type: NotificationType = 'follow_dev';
  if (row.type === 'project_followed' || row.type === 'follow_project') type = 'follow_project';
  else if (row.type === 'comment' || row.type === 'comment_received') type = 'comment';
  else if (row.type === 'collaboration_request' || row.type === 'join_request') type = 'join_request';
  else if (row.type === 'fork') type = 'fork';

  return {
    id: row.id,
    type,
    actor: {
      id: actor?.id || row.actor_id || 'actor-id',
      name: actor?.full_name || actor?.username || 'Developer',
      handle: actor?.username || 'builder',
      avatar: actor?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    message: row.body || row.title || '',
    timestamp: timeAgo,
    read: row.is_read ?? false,
  };
}

export const notificationService = {
  /**
   * Fetches notifications for a user
   */
  async getNotifications(recipientId: string): Promise<NotificationItem[]> {
    const { data: rows, error } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(id, username, full_name, avatar_url)')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error.message);
      return [];
    }

    return (rows || []).map(mapDbNotificationToDomain);
  },

  /**
   * Marks single notification as read
   */
  async markAsRead(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    return !error;
  },

  /**
   * Marks all notifications as read for current user
   */
  async markAllAsRead(recipientId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', recipientId);

    return !error;
  },

  /**
   * Dispatches a new notification
   */
  async createNotification(
    recipientId: string,
    actorId: string,
    type: string,
    title: string,
    body: string,
    entityId?: string,
    entityType?: string
  ): Promise<void> {
    if (recipientId === actorId) return;

    await supabase.from('notifications').insert({
      recipient_id: recipientId,
      actor_id: actorId,
      type,
      title,
      body,
      entity_id: entityId || null,
      entity_type: entityType || null,
      is_read: false,
    });
  },

  /**
   * Respond to collaboration/join request
   */
  async respondToJoinRequest(id: string, _action: 'accept' | 'decline'): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    return !error;
  },
};
