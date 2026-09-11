import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem, NotificationType } from '../types';
import { useUIStore } from '../stores/uiStore';
import { GitFork, MessageSquare, Star, UserPlus, HeartHandshake, ExternalLink, Loader2 } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const NotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'forks' | 'comments' | 'collabs' | 'stars'>('all');
  const { notifications, loading, markAllAsRead, respondToJoinRequest } = useNotifications();
  const { openProjectPage, openDeveloperProfile, showToast } = useUIStore();

  const filterMap: Record<string, NotificationType[]> = {
    forks: ['fork'],
    comments: ['comment'],
    collabs: ['join_request'],
    stars: ['star_milestone', 'follow_project', 'follow_dev'],
  };

  const filteredNotifs = notifications.filter((n: NotificationItem) => {
    if (filter === 'all') return true;
    return filterMap[filter]?.includes(n.type);
  });

  const markAllRead = async () => {
    await markAllAsRead();
    showToast('All notifications marked as read');
  };

  const handleCollabAction = async (notifId: string, accept: boolean) => {
    await respondToJoinRequest(notifId, accept ? 'accept' : 'decline');
    showToast(accept ? 'Collaboration proposal accepted!' : 'Proposal declined');
  };

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'fork':
        return <GitFork className="w-4 h-4 text-blue-600" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      case 'join_request':
        return <HeartHandshake className="w-4 h-4 text-emerald-600" />;
      case 'star_milestone':
        return <Star className="w-4 h-4 text-amber-500 fill-current" />;
      case 'follow_project':
      case 'follow_dev':
        return <UserPlus className="w-4 h-4 text-purple-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="w-full text-left space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-normal">
            Real developer activity, project stars, and collaboration proposals.
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllRead}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        {[
          { id: 'all', label: 'All' },
          { id: 'forks', label: 'Forks' },
          { id: 'comments', label: 'Comments' },
          { id: 'collabs', label: 'Collaborations' },
          { id: 'stars', label: 'Follows & Stars' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === tab.id
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <span className="text-xs">Loading notifications...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.length > 0 ? (
            filteredNotifs.map((item: NotificationItem) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  item.read
                    ? 'bg-white border-slate-200/80 shadow-soft'
                    : 'bg-blue-50/40 border-blue-200/80 shadow-soft'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/60 shrink-0 mt-0.5">
                    {getNotifIcon(item.type)}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 truncate">
                        {item.actor.avatar && (
                          <img
                            src={item.actor.avatar}
                            alt={item.actor.name}
                            onClick={() => openDeveloperProfile(item.actor.id)}
                            className="w-5 h-5 rounded-full object-cover cursor-pointer"
                          />
                        )}
                        <span
                          onClick={() => openDeveloperProfile(item.actor.id)}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer truncate"
                        >
                          {item.actor.name}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          @{item.actor.handle}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 shrink-0">
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Target project context badge */}
                    {item.targetProject && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          onClick={() => openProjectPage(item.targetProject!.id)}
                          className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <span>@{item.targetProject.name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Join request proposal card */}
                    {item.joinRequestData && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">
                            Applying for: {item.joinRequestData.position}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.joinRequestData.status === 'accepted'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.joinRequestData.status === 'declined'
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {item.joinRequestData.status}
                          </span>
                        </div>

                        <p className="text-slate-600 italic">
                          "{item.joinRequestData.pitch}"
                        </p>

                        {item.joinRequestData.status === 'pending' && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleCollabAction(item.id, true)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs transition-colors cursor-pointer"
                            >
                              Accept Proposal
                            </button>
                            <button
                              onClick={() => handleCollabAction(item.id, false)}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              type="notifications"
              message="No notifications right now. Activity on your projects will appear here."
            />
          )}
        </div>
      )}
    </div>
  );
};
