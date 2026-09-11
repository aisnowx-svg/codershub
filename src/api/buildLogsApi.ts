import { apiClient, ApiResponse } from './client';
import { BuildLog, Comment, CreateBuildLogInput } from '../types';
import { mockBuildLogs } from '../data/buildLogs';

let buildLogsCache: BuildLog[] = [...mockBuildLogs];
let commentsCache: Record<string, Comment[]> = {};

export interface BuildLogFilterParams {
  projectId?: string;
  authorId?: string;
  tech?: string;
  search?: string;
}

export const buildLogsApi = {
  async getBuildLogs(params?: BuildLogFilterParams): Promise<ApiResponse<BuildLog[]>> {
    await apiClient.simulateLatency(60);
    let list = [...buildLogsCache];

    if (params) {
      if (params.projectId) {
        list = list.filter((b) => b.projectId === params.projectId);
      }
      if (params.authorId) {
        list = list.filter((b) => b.authorId === params.authorId);
      }
      if (params.tech) {
        const queryTech = params.tech.toLowerCase();
        list = list.filter((b) => b.techStack.some((t) => t.toLowerCase() === queryTech));
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.summary.toLowerCase().includes(q) ||
            b.projectName.toLowerCase().includes(q) ||
            b.authorName.toLowerCase().includes(q) ||
            b.techStack.some((t) => t.toLowerCase().includes(q))
        );
      }
    }

    return apiClient.wrapSuccess(list);
  },

  async getBuildLogById(id: string): Promise<ApiResponse<BuildLog | null>> {
    await apiClient.simulateLatency(40);
    const item = buildLogsCache.find((b) => b.id === id) || null;
    return apiClient.wrapSuccess(item);
  },

  async createBuildLog(
    input: CreateBuildLogInput,
    author: { id: string; name: string; handle: string; avatar: string; projectName?: string }
  ): Promise<ApiResponse<BuildLog>> {
    await apiClient.simulateLatency(120);

    // Calculate next dayNumber for this project
    const projectLogs = buildLogsCache.filter((b) => b.projectId === input.projectId);
    const dayNumber = projectLogs.length + 1;

    const newLog: BuildLog = {
      id: `build-${Date.now()}`,
      projectId: input.projectId,
      projectName: author.projectName || 'Project Workspace',
      authorId: author.id,
      authorName: author.name,
      authorHandle: author.handle,
      authorAvatar: author.avatar,
      dayNumber,
      title: input.title,
      summary: input.summary,
      changes: input.changes.length > 0 ? input.changes : [input.summary],
      techStack: input.techStack,
      commitHash: input.commitHash,
      repositoryUrl: input.repositoryUrl,
      demoUrl: input.demoUrl,
      diffSnippet: input.diffSnippet,
      media: input.media,
      fireCount: 1,
      commentsCount: 0,
      forkCount: 0,
      createdAt: 'Just now',
      isLiked: true,
      isDraft: input.isDraft || false,
    };

    buildLogsCache = [newLog, ...buildLogsCache];
    return apiClient.wrapSuccess(newLog, 'Build Log published to Code Social');
  },

  async toggleLikeBuildLog(id: string): Promise<ApiResponse<{ id: string; isLiked: boolean; fireCount: number }>> {
    await apiClient.simulateLatency(30);
    const log = buildLogsCache.find((b) => b.id === id);
    if (!log) {
      throw new Error(`Build log ${id} not found`);
    }

    log.isLiked = !log.isLiked;
    log.fireCount = log.isLiked ? log.fireCount + 1 : Math.max(0, log.fireCount - 1);

    return apiClient.wrapSuccess({
      id: log.id,
      isLiked: log.isLiked,
      fireCount: log.fireCount,
    });
  },

  async getComments(buildLogId: string): Promise<ApiResponse<Comment[]>> {
    await apiClient.simulateLatency(40);
    const comments = commentsCache[buildLogId] || [];
    return apiClient.wrapSuccess(comments);
  },

  async addComment(buildLogId: string, author: { name: string; handle: string; avatar: string }, content: string): Promise<ApiResponse<Comment>> {
    await apiClient.simulateLatency(70);
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      buildLogId,
      authorName: author.name,
      authorHandle: author.handle,
      authorAvatar: author.avatar,
      content,
      createdAt: 'Just now',
    };

    if (!commentsCache[buildLogId]) {
      commentsCache[buildLogId] = [];
    }
    commentsCache[buildLogId].push(comment);

    const log = buildLogsCache.find((b) => b.id === buildLogId);
    if (log) {
      log.commentsCount += 1;
    }

    return apiClient.wrapSuccess(comment, 'Comment posted');
  },
};
