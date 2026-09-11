import { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { projectService, ProjectFilterOptions } from '../services/projectService';
import { followService } from '../services/followService';
import { useAuthStore } from '../stores/authStore';

export type ProjectFilterParams = ProjectFilterOptions;

export function useProjects(initialParams?: ProjectFilterParams) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterParams, setFilterParams] = useState<ProjectFilterParams | undefined>(initialParams);
  const { currentUser } = useAuthStore();

  const fetchProjects = useCallback(async (params?: ProjectFilterParams) => {
    try {
      setLoading(true);
      setError(null);
      const list = await projectService.getProjects(params, currentUser?.id);
      setProjects(list);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchProjects(filterParams);
  }, [fetchProjects, filterParams]);

  const toggleFollow = async (projectId: string) => {
    if (!currentUser.id) return;

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const willFollow = !p.isFollowing;
          return {
            ...p,
            isFollowing: willFollow,
            stars: willFollow ? p.stars + 1 : Math.max(0, p.stars - 1),
          };
        }
        return p;
      })
    );

    try {
      const proj = projects.find((p) => p.id === projectId);
      if (proj?.isFollowing) {
        await followService.unfollowProject(currentUser.id, projectId);
      } else {
        await followService.followProject(currentUser.id, projectId);
      }
    } catch {
      fetchProjects(filterParams);
    }
  };

  const updateFilters = (newParams: Partial<ProjectFilterParams>) => {
    setFilterParams((prev) => ({ ...prev, ...newParams }));
  };

  return {
    projects,
    loading,
    error,
    refetch: () => fetchProjects(filterParams),
    toggleFollow,
    updateFilters,
    filterParams,
  };
}
