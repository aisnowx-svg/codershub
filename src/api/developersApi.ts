import { apiClient, ApiResponse } from './client';
import { DeveloperProfile, DeveloperSpecialty } from '../types';
import { mockDevelopers } from '../data/developers';

let developersCache: DeveloperProfile[] = [...mockDevelopers];

export interface DeveloperFilterParams {
  specialty?: DeveloperSpecialty | 'All';
  tech?: string;
  query?: string;
}

export const developersApi = {
  async getDevelopers(params?: DeveloperFilterParams): Promise<ApiResponse<DeveloperProfile[]>> {
    await apiClient.simulateLatency(50);
    let list = [...developersCache];

    if (params) {
      if (params.specialty && params.specialty !== 'All') {
        list = list.filter((d) => d.specialty === params.specialty);
      }
      if (params.tech) {
        const queryTech = params.tech.toLowerCase();
        list = list.filter((d) => d.techStack.some((t) => t.toLowerCase() === queryTech));
      }
      if (params.query) {
        const q = params.query.toLowerCase();
        list = list.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.handle.toLowerCase().includes(q) ||
            d.bio.toLowerCase().includes(q) ||
            d.role.toLowerCase().includes(q) ||
            d.techStack.some((t) => t.toLowerCase() === q)
        );
      }
    }

    return apiClient.wrapSuccess(list);
  },

  async getDeveloperById(id: string): Promise<ApiResponse<DeveloperProfile | null>> {
    await apiClient.simulateLatency(40);
    const dev = developersCache.find((d) => d.id === id || d.handle === id) || null;
    return apiClient.wrapSuccess(dev);
  },

  async toggleFollowDeveloper(id: string): Promise<ApiResponse<{ id: string; isFollowing: boolean; followersCount: number }>> {
    await apiClient.simulateLatency(35);
    const dev = developersCache.find((d) => d.id === id || d.handle === id);
    if (!dev) {
      throw new Error(`Developer ${id} not found`);
    }

    dev.isFollowing = !dev.isFollowing;
    dev.followersCount = dev.isFollowing ? dev.followersCount + 1 : Math.max(0, dev.followersCount - 1);

    return apiClient.wrapSuccess({
      id: dev.id,
      isFollowing: dev.isFollowing,
      followersCount: dev.followersCount,
    });
  },
};
