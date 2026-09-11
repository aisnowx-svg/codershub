import { create } from 'zustand';
import { BuildLog, Comment } from '../types';
import { buildLogService } from '../services/buildLogService';
import { commentService } from '../services/commentService';

export type FeedFilter = 'for-you' | 'following' | 'projects';

interface FeedState {
  feedFilter: FeedFilter;
  buildLogs: BuildLog[];
  comments: Record<string, Comment[]>;
  isLoading: boolean;
  error: string | null;

  setFeedFilter: (filter: FeedFilter) => void;
  fetchFeed: (filter?: FeedFilter, currentUserId?: string) => Promise<void>;
  loadComments: (logId: string) => Promise<void>;
  addBuildLog: (
    log: Omit<BuildLog, 'id' | 'fireCount' | 'commentsCount' | 'forkCount' | 'createdAt' | 'isLiked'>,
    authorId?: string
  ) => Promise<BuildLog | null>;
  toggleFire: (logId: string, userId?: string) => Promise<void>;
  addComment: (
    logId: string,
    content: string,
    authorId: string,
    _authorName?: string,
    _authorHandle?: string,
    _authorAvatar?: string
  ) => Promise<void>;
  deleteComment: (commentId: string, logId: string) => Promise<void>;
  incrementFork: (logId: string) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  feedFilter: 'for-you',
  buildLogs: [],
  comments: {},
  isLoading: false,
  error: null,

  setFeedFilter: (feedFilter) => {
    set({ feedFilter });
  },

  fetchFeed: async (filter, currentUserId) => {
    try {
      set({ isLoading: true, error: null });
      const activeFilter = filter || get().feedFilter;
      const logs = await buildLogService.getFeed(activeFilter, currentUserId);
      set({ buildLogs: logs, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load feed:', err);
      set({ error: err.message || 'Failed to load feed', isLoading: false });
    }
  },

  loadComments: async (logId: string) => {
    try {
      const logComments = await commentService.getComments(logId);
      set((state) => ({
        comments: {
          ...state.comments,
          [logId]: logComments,
        },
      }));
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  },

  addBuildLog: async (newLogData, authorId) => {
    try {
      if (!authorId) {
        throw new Error('You must be signed in to publish a build log.');
      }

      const created = await buildLogService.createBuildLog(
        {
          projectId: newLogData.projectId,
          title: newLogData.title,
          summary: newLogData.summary,
          changes: newLogData.changes,
          techStack: newLogData.techStack,
          repositoryUrl: newLogData.repositoryUrl,
          commitHash: newLogData.commitHash,
          demoUrl: newLogData.demoUrl,
          diffSnippet: newLogData.diffSnippet,
          isDraft: newLogData.isDraft,
        },
        authorId
      );

      set((state) => ({
        buildLogs: [created, ...state.buildLogs],
      }));

      return created;
    } catch (err: any) {
      console.error('Error adding build log:', err);
      throw err;
    }
  },

  toggleFire: async (logId: string, userId?: string) => {
    const current = get().buildLogs.find((l) => l.id === logId);
    if (!current || !userId) return;

    // Optimistic update
    const willLike = !current.isLiked;
    set((state) => ({
      buildLogs: state.buildLogs.map((log) =>
        log.id === logId
          ? {
              ...log,
              isLiked: willLike,
              fireCount: willLike ? log.fireCount + 1 : Math.max(0, log.fireCount - 1),
            }
          : log
      ),
    }));

    try {
      const result = await buildLogService.toggleFire(logId, userId);
      set((state) => ({
        buildLogs: state.buildLogs.map((log) =>
          log.id === logId
            ? { ...log, isLiked: result.isLiked, fireCount: result.fireCount }
            : log
        ),
      }));
    } catch (err) {
      // Revert on error
      set((state) => ({
        buildLogs: state.buildLogs.map((log) => (log.id === logId ? current : log)),
      }));
    }
  },

  addComment: async (logId, content, authorId) => {
    try {
      const newComment = await commentService.addComment(logId, content, authorId);
      set((state) => {
        const existing = state.comments[logId] || [];
        return {
          comments: {
            ...state.comments,
            [logId]: [...existing, newComment],
          },
          buildLogs: state.buildLogs.map((log) =>
            log.id === logId ? { ...log, commentsCount: log.commentsCount + 1 } : log
          ),
        };
      });
    } catch (err: any) {
      console.error('Error adding comment:', err);
      throw err;
    }
  },

  deleteComment: async (commentId: string, logId: string) => {
    try {
      await commentService.deleteComment(commentId, logId);
      set((state) => {
        const existing = state.comments[logId] || [];
        return {
          comments: {
            ...state.comments,
            [logId]: existing.filter((c) => c.id !== commentId),
          },
          buildLogs: state.buildLogs.map((log) =>
            log.id === logId ? { ...log, commentsCount: Math.max(0, log.commentsCount - 1) } : log
          ),
        };
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  },

  incrementFork: (logId: string) => {
    set((state) => ({
      buildLogs: state.buildLogs.map((log) =>
        log.id === logId ? { ...log, forkCount: log.forkCount + 1 } : log
      ),
    }));
  },
}));
