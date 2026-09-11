import { create } from 'zustand';
import { Project } from '../types';
import { projectService, ProjectFilterOptions } from '../services/projectService';
import { followService } from '../services/followService';

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  fetchProjects: (params?: ProjectFilterOptions, currentUserId?: string) => Promise<void>;
  toggleFollowProject: (projectId: string, currentUserId?: string) => Promise<void>;
  forkProject: (
    originalProjectId: string,
    forkedName: string,
    author: { id: string; name: string; handle: string; avatar: string }
  ) => Promise<Project>;
  submitJoinRequest: (projectId: string, position: string, pitch: string) => Promise<void>;
  createProject: (
    newProj: Omit<Project, 'id' | 'stars' | 'forkCount' | 'contributors' | 'buildActivityCount' | 'isFollowing'>,
    ownerId?: string
  ) => Promise<Project>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async (params, currentUserId) => {
    try {
      set({ isLoading: true, error: null });
      const list = await projectService.getProjects(params, currentUserId);
      set({ projects: list, isLoading: false });
    } catch (err: any) {
      console.error('Error loading projects:', err);
      set({ error: err.message || 'Failed to load projects', isLoading: false });
    }
  },

  toggleFollowProject: async (projectId: string, currentUserId?: string) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;

    const willFollow = !project.isFollowing;

    // Optimistic update
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              isFollowing: willFollow,
              stars: willFollow ? p.stars + 1 : Math.max(0, p.stars - 1),
            }
          : p
      ),
    }));

    if (currentUserId) {
      try {
        if (willFollow) {
          await followService.followProject(currentUserId, projectId);
        } else {
          await followService.unfollowProject(currentUserId, projectId);
        }
      } catch (err) {
        // Revert on error
        set((state) => ({
          projects: state.projects.map((p) => (p.id === projectId ? project : p)),
        }));
      }
    }
  },

  forkProject: async (originalProjectId, forkedName, author) => {
    const forked = await projectService.forkProject(originalProjectId, forkedName, author);
    set((state) => ({
      projects: [
        forked,
        ...state.projects.map((p) =>
          p.id === originalProjectId ? { ...p, forkCount: p.forkCount + 1 } : p
        ),
      ],
    }));
    return forked;
  },

  submitJoinRequest: async (_projectId, _position, _pitch) => {
    // Record application through notification / collaboration service
  },

  createProject: async (newProj, ownerId) => {
    if (!ownerId) {
      throw new Error('You must be signed in to create a project.');
    }

    const created = await projectService.createProject(
      {
        ...newProj,
        primaryTech: newProj.primaryTech || 'TypeScript',
        techStack: newProj.techStack || [newProj.primaryTech || 'TypeScript'],
        category: newProj.category || 'AI',
        status: newProj.status || 'active',
        repositoryUrl: newProj.repositoryUrl || '',
        tagline: newProj.tagline || '',
        description: newProj.description || '',
      },
      ownerId
    );

    set((state) => ({
      projects: [created, ...state.projects],
    }));

    return created;
  },
}));
