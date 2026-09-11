import { useState, useEffect, useCallback } from 'react';
import { BuildLog, CreateBuildLogInput } from '../types';
import { buildLogService } from '../services/buildLogService';
import { useAuthStore } from '../stores/authStore';

export interface BuildLogFilterParams {
  projectId?: string;
  authorId?: string;
  tech?: string;
  search?: string;
}

export function useBuildLogs(initialParams?: BuildLogFilterParams) {
  const [buildLogs, setBuildLogs] = useState<BuildLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuthStore();

  const fetchBuildLogs = useCallback(async (params?: BuildLogFilterParams) => {
    try {
      setLoading(true);
      setError(null);
      let logs: BuildLog[] = [];

      if (params?.projectId) {
        logs = await buildLogService.getBuildLogsByProject(params.projectId);
      } else if (params?.authorId) {
        logs = await buildLogService.getBuildLogsByAuthor(params.authorId);
      } else {
        logs = await buildLogService.getFeed('for-you', currentUser?.id);
      }

      // Filter in memory for search or tech if present
      if (params?.tech) {
        const queryTech = params.tech.toLowerCase();
        logs = logs.filter((b) => b.techStack.some((t) => t.toLowerCase() === queryTech));
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        logs = logs.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.summary.toLowerCase().includes(q) ||
            b.projectName.toLowerCase().includes(q)
        );
      }

      setBuildLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch build logs');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchBuildLogs(initialParams);
  }, [fetchBuildLogs, initialParams]);

  const toggleLike = async (id: string) => {
    const log = buildLogs.find((l) => l.id === id);
    if (!log) return;

    // Optimistic update
    const willLike = !log.isLiked;
    setBuildLogs((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          return {
            ...l,
            isLiked: willLike,
            fireCount: willLike ? l.fireCount + 1 : Math.max(0, l.fireCount - 1),
          };
        }
        return l;
      })
    );

    try {
      if (currentUser.id) {
        await buildLogService.toggleFire(id, currentUser.id);
      }
    } catch {
      fetchBuildLogs(initialParams);
    }
  };

  const createBuildLog = async (
    input: CreateBuildLogInput,
    _author?: { id: string; name: string; handle: string; avatar: string; projectName?: string }
  ) => {
    if (!currentUser.id) {
      throw new Error('You must be signed in to create a build log.');
    }
    const created = await buildLogService.createBuildLog(input, currentUser.id);
    setBuildLogs((prev) => [created, ...prev]);
    return created;
  };

  return {
    buildLogs,
    loading,
    error,
    refetch: () => fetchBuildLogs(initialParams),
    toggleLike,
    createBuildLog,
  };
}
