/**
 * CODE SOCIAL — Canonical Domain Types
 * 
 * Core domain entities:
 * - User & DeveloperProfile
 * - Technology
 * - Project (First-class CODE SOCIAL entity)
 * - GitHubRepository & GitHubIntegration (External entity abstraction)
 * - BuildLog (Proof of work & build story)
 * - Comment
 * - Follow
 * - Notification
 * - Collaboration
 */

// ==========================================
// 1. TECHNOLOGY & TAXONOMY
// ==========================================
export type TechCategory = 
  | 'Languages' 
  | 'Frameworks' 
  | 'AI & ML' 
  | 'Systems & Low Level' 
  | 'Databases & Storage' 
  | 'Cloud & DevOps' 
  | 'Mobile';

export interface Technology {
  id: string;
  name: string;
  slug: string;
  category: TechCategory;
  icon?: string;
  color?: string;
}

// ==========================================
// 2. USER & DEVELOPER PROFILE
// ==========================================
export type DeveloperSpecialty = 
  | 'AI' 
  | 'Systems' 
  | 'Rust' 
  | 'Frontend' 
  | 'Backend' 
  | 'Open Source' 
  | 'Mobile'
  | 'DevOps';

export interface ProofOfWork {
  projectsShipped: number;
  openSourceProjects: number;
  githubContributions: number;
  buildLogsCount: number;
  collaborationsCount: number;
}

export interface CurrentlyBuilding {
  projectId: string;
  projectName: string;
  description: string;
  progressPercentage: number;
  latestMilestone: string;
}

export interface User {
  id: string;
  email?: string;
  createdAt: string;
}

export interface DeveloperProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: string;
  specialty: DeveloperSpecialty;
  bio: string;
  location: string;
  website?: string;
  githubHandle?: string;
  followersCount: number;
  followingCount: number;
  projectsCount: number;
  buildsCount: number;
  proofOfWork: ProofOfWork;
  currentlyBuilding: CurrentlyBuilding;
  techStack: string[];
  isFollowing?: boolean;
}

// Alias for convenience across UI components
export type Developer = DeveloperProfile;

// ==========================================
// 3. GITHUB INTEGRATION (External Entity)
// ==========================================
export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  isPrivate: boolean;
  defaultBranch: string;
  starsCount: number;
  forksCount: number;
  language: string | null;
  updatedAt: string;
  isLinkedToProject?: boolean;
}

export interface GitHubIntegration {
  connected: boolean;
  username: string | null;
  avatarUrl: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  repositoriesCount: number;
  linkedProjectsCount: number;
}

// ==========================================
// 4. PROJECT (First-Class CODE SOCIAL Entity)
// ==========================================
export type ProjectStatus = 'active' | 'shipped' | 'alpha' | 'beta' | 'archived';
export type ProjectCategory = 'AI' | 'Systems' | 'Web' | 'Mobile' | 'Open Source' | 'Data';

export interface Contributor {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: string;
}

export interface ContributorOpportunity {
  openPositions: number;
  requiredSkills: string[];
  description: string;
}

export interface ProjectRelease {
  version: string;
  title: string;
  description: string;
  releasedAt: string;
  downloadUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  slug?: string;
  tagline: string;
  description: string;
  stars: number;
  forkCount: number;
  // External references
  repositoryUrl: string; // GitHub repository link
  githubRepoFullName?: string; // e.g. "zaiddev/snowbrain"
  demoUrl?: string;
  websiteUrl?: string;
  primaryTech: string;
  techStack: string[];
  status: ProjectStatus;
  category: ProjectCategory;
  ownerId?: string;
  contributors: Contributor[];
  buildActivityCount: number;
  lookingForContributors?: ContributorOpportunity;
  isFollowing?: boolean;
  screenshots?: string[];
  releases?: ProjectRelease[];
  originalProject?: {
    id: string;
    name: string;
    author: string;
  };
}

// ==========================================
// 5. BUILD LOG (Stories & Proof of Work)
// ==========================================
export interface DiffSnippet {
  filename: string;
  additions: number;
  deletions: number;
  code: string;
}

export interface BuildLogMedia {
  id: string;
  type: 'image' | 'video' | 'diagram';
  url: string;
  caption?: string;
}

export interface BuildLog {
  id: string;
  projectId: string;
  projectName: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  dayNumber: number;
  title: string;
  summary: string;
  changes: string[];
  techStack: string[];
  commitHash?: string;
  repositoryUrl?: string;
  demoUrl?: string;
  diffSnippet?: DiffSnippet;
  media?: BuildLogMedia[];
  fireCount: number;
  commentsCount: number;
  forkCount: number;
  createdAt: string;
  isLiked?: boolean;
  isDraft?: boolean;
}

export interface CreateBuildLogInput {
  projectId: string;
  title: string;
  summary: string;
  changes: string[];
  techStack: string[];
  repositoryUrl?: string;
  commitHash?: string;
  demoUrl?: string;
  diffSnippet?: DiffSnippet;
  media?: BuildLogMedia[];
  isDraft?: boolean;
}

// ==========================================
// 6. COMMENT & SOCIAL GRAPH
// ==========================================
export interface Comment {
  id: string;
  buildLogId: string;
  authorId?: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface Follow {
  followerId: string;
  targetId: string;
  targetType: 'developer' | 'project';
  createdAt: string;
}

// ==========================================
// 7. COLLABORATION
// ==========================================
export interface Collaboration {
  id: string;
  projectId: string;
  developerId: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined';
  pitch: string;
  requestedAt: string;
}

// ==========================================
// 8. NOTIFICATION
// ==========================================
export type NotificationType = 
  | 'follow_project' 
  | 'follow_dev' 
  | 'fork' 
  | 'comment' 
  | 'star_milestone' 
  | 'join_request';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actor: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
  targetProject?: {
    id: string;
    name: string;
  };
  targetBuildId?: string;
  message: string;
  timestamp: string;
  read: boolean;
  joinRequestData?: {
    position: string;
    pitch: string;
    status: 'pending' | 'accepted' | 'declined';
  };
}
