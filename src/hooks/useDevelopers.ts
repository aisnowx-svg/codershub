import { useState, useEffect, useCallback } from 'react';
import { DeveloperProfile, DeveloperSpecialty } from '../types';
import { profileService } from '../services/profileService';
import { followService } from '../services/followService';
import { useAuthStore } from '../stores/authStore';

export interface DeveloperFilterParams {
  specialty?: DeveloperSpecialty | 'All';
  tech?: string;
  query?: string;
}

export function useDevelopers(initialParams?: DeveloperFilterParams) {
  const [developers, setDevelopers] = useState<DeveloperProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuthStore();

  const fetchDevelopers = useCallback(async (params?: DeveloperFilterParams) => {
    try {
      setLoading(true);
      setError(null);
      const list = await profileService.getProfiles({
        specialty: params?.specialty,
        tech: params?.tech,
        query: params?.query,
        currentUserId: currentUser?.id,
      });
      setDevelopers(list);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch developers');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchDevelopers(initialParams);
  }, [fetchDevelopers, initialParams]);

  const toggleFollow = async (id: string) => {
    if (!currentUser.id || currentUser.id === id) return;

    // Optimistic update
    setDevelopers((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const willFollow = !d.isFollowing;
          return {
            ...d,
            isFollowing: willFollow,
            followersCount: willFollow ? d.followersCount + 1 : Math.max(0, d.followersCount - 1),
          };
        }
        return d;
      })
    );

    try {
      const dev = developers.find((d) => d.id === id);
      if (dev?.isFollowing) {
        await followService.unfollowUser(currentUser.id, id);
      } else {
        await followService.followUser(currentUser.id, id);
      }
    } catch {
      fetchDevelopers(initialParams);
    }
  };

  return {
    developers,
    loading,
    error,
    refetch: () => fetchDevelopers(initialParams),
    toggleFollow,
  };
}
