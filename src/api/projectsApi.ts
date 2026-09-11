import { apiClient, ApiResponse } from './client';
import { Project, ProjectCategory, ProjectStatus } from '../types';
import { mockProjects } from '../data/projects';

// In-memory working copy for mock lifecycle
let projectsCache: Project[] = [...mockProjects];

export interface ProjectFilterParams {
  category?: ProjectCategory | 'All';
  status?: ProjectStatus | 'All';
  tech?: string;
  query?: string;
  hasOpenPositions?: boolean;
}

export const projectsApi = {
  async getProjects(params?: ProjectFilterParams): Promise<ApiResponse<Project[]>> {
    await apiClient.simulateLatency(60);
    let list = [...projectsCache];

    if (params) {
      if (params.category && params.category !== 'All') {
        list = list.filter((p) => p.category === params.category);
      }
      if (params.status && params.status !== 'All') {
        list = list.filter((p) => p.status === params.status);
      }
      if (params.tech) {
        const queryTech = params.tech.toLowerCase();
        list = list.filter((p) =>
          p.primaryTech.toLowerCase() === queryTech ||
          p.techStack.some((t) => t.toLowerCase() === queryTech)
        );
      }
      if (params.hasOpenPositions) {
        list = list.filter((p) => !!p.lookingForContributors && p.lookingForContributors.openPositions > 0);
      }
      if (params.query) {
        const q = params.query.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.tagline.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.techStack.some((t) => t.toLowerCase().includes(q))
        );
      }
    }

    return apiClient.wrapSuccess(list);
  },

  async getProjectById(id: string): Promise<ApiResponse<Project | null>> {
    await apiClient.simulateLatency(40);
    const project = projectsCache.find((p) => p.id === id) || null;
    return apiClient.wrapSuccess(project);
  },

  async createProject(newProject: Omit<Project, 'id' | 'stars' | 'forkCount' | 'buildActivityCount'>): Promise<ApiResponse<Project>> {
    await apiClient.simulateLatency(120);
    const project: Project = {
      ...newProject,
      id: `proj-${Date.now()}`,
      stars: 1,
      forkCount: 0,
      buildActivityCount: 1,
      isFollowing: true,
    };
    projectsCache = [project, ...projectsCache];
    return apiClient.wrapSuccess(project, 'Project created successfully');
  },

  async toggleFollowProject(id: string): Promise<ApiResponse<{ id: string; isFollowing: boolean; stars: number }>> {
    await apiClient.simulateLatency(40);
    const idx = projectsCache.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error(`Project ${id} not found`);
    }

    const current = projectsCache[idx];
    const willFollow = !current.isFollowing;
    const updated: Project = {
      ...current,
      isFollowing: willFollow,
      stars: willFollow ? current.stars + 1 : Math.max(0, current.stars - 1),
    };
    projectsCache[idx] = updated;

    return apiClient.wrapSuccess({
      id,
      isFollowing: updated.isFollowing || false,
      stars: updated.stars,
    });
  },

  async forkProject(sourceProjectId: string, newProjectName: string, author: { id: string; name: string; handle: string; avatar: string }): Promise<ApiResponse<Project>> {
    await apiClient.simulateLatency(140);
    const original = projectsCache.find((p) => p.id === sourceProjectId);
    if (!original) {
      throw new Error(`Source project ${sourceProjectId} not found`);
    }

    original.forkCount += 1;

    const forked: Project = {
      ...original,
      id: `proj-fork-${Date.now()}`,
      name: newProjectName,
      slug: newProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tagline: `Fork of ${original.name} by @${author.handle}`,
      stars: 1,
      forkCount: 0,
      buildActivityCount: 0,
      isFollowing: true,
      contributors: [
        {
          id: author.id,
          name: author.name,
          handle: author.handle,
          avatar: author.avatar,
          role: 'Fork Maintainer',
        },
      ],
      originalProject: {
        id: original.id,
        name: original.name,
        author: original.contributors[0]?.name || 'Original Author',
      },
    };

    projectsCache = [forked, ...projectsCache];
    return apiClient.wrapSuccess(forked, `Forked ${original.name} to ${newProjectName}`);
  },

  async submitJoinRequest(_projectId: string, position: string, _pitch: string): Promise<ApiResponse<boolean>> {
    await apiClient.simulateLatency(100);
    return apiClient.wrapSuccess(true, `Collaboration request submitted for ${position}`);
  },
};
