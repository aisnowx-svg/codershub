import { apiClient, ApiResponse } from './client';
import { DeveloperProfile } from '../types';

// Default session mock
const DEFAULT_USER: DeveloperProfile = {
  id: 'me',
  name: 'Developer',
  handle: 'developer',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Systems & Infrastructure Builder',
  specialty: 'Systems',
  bio: 'Building software tools, high-performance distributed runtimes, and local AI utilities.',
  location: 'San Francisco, CA',
  githubHandle: 'developer',
  followersCount: 142,
  followingCount: 89,
  projectsCount: 2,
  buildsCount: 14,
  proofOfWork: {
    projectsShipped: 3,
    openSourceProjects: 4,
    githubContributions: 680,
    buildLogsCount: 14,
    collaborationsCount: 5,
  },
  currentlyBuilding: {
    projectId: 'proj-nova',
    projectName: 'NovaAI',
    description: 'Async model inference queue with chunked streaming token protocol',
    progressPercentage: 45,
    latestMilestone: 'Core runtime scheduler',
  },
  techStack: ['Rust', 'Python', 'TypeScript', 'CUDA', 'FastAPI'],
  isFollowing: false,
};

export const authApi = {
  async getCurrentUser(): Promise<ApiResponse<DeveloperProfile>> {
    await apiClient.simulateLatency(50);
    return apiClient.wrapSuccess(DEFAULT_USER);
  },

  async updateProfile(partial: Partial<DeveloperProfile>): Promise<ApiResponse<DeveloperProfile>> {
    await apiClient.simulateLatency(80);
    const updated = { ...DEFAULT_USER, ...partial };
    return apiClient.wrapSuccess(updated, 'Profile updated successfully');
  },

  async login(email: string): Promise<ApiResponse<DeveloperProfile>> {
    await apiClient.simulateLatency(120);
    return apiClient.wrapSuccess(DEFAULT_USER, `Signed in as ${email}`);
  },

  async logout(): Promise<ApiResponse<boolean>> {
    await apiClient.simulateLatency(50);
    return apiClient.wrapSuccess(true, 'Logged out successfully');
  },
};
